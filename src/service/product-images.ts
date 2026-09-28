import sharp from "sharp";
import { assetFile, saveAsset } from "./assets";
import { ServiceError } from "./errors";
import { PRODUCT_IMAGE_LIMIT, PRODUCT_IMAGE_BYTES, type ProductImage } from "@/projects/product-detail";

const mimeFormats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
const options = { limitInputPixels: 40_000_000, failOn: "warning" as const };
export async function readProductUpload(request: Request): Promise<File> {
  const limit = PRODUCT_IMAGE_BYTES + 65536;
  if (Number(request.headers.get("content-length") || 0) > limit) throw new ServiceError(413, "사진은 한 장에 10MB 이내로 선택해 주세요.");
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError(400, "사진을 선택해 주세요.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new ServiceError(413, "사진은 한 장에 10MB 이내로 선택해 주세요."); }
      chunks.push(value);
    }
    const form = await new Response(new Uint8Array(Buffer.concat(chunks)), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || form.getAll("file").length !== 1) throw new ServiceError(400, "요청마다 사진 한 장을 전송해 주세요.");
    return file;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(400, "사진 파일 전송을 확인하지 못했어요. 파일을 다시 선택해 주세요.");
  } finally { reader.releaseLock(); }
}
async function decode(bytes: Uint8Array, mime: string) {
  if (!mimeFormats[mime]) throw new ServiceError(400, "사진은 JPG·PNG·WebP 형식을 사용해 주세요.");
  if (!bytes.length || bytes.length > PRODUCT_IMAGE_BYTES) throw new ServiceError(413, "사진은 한 장에 10MB 이내로 선택해 주세요.");
  try {
    const source = sharp(bytes, options).timeout({ seconds: 15 }), meta = await source.metadata();
    if (meta.format !== mimeFormats[mime] || !meta.width || !meta.height || meta.width > 8192 || meta.height > 8192 || (meta.pages || 1) > 1) throw new Error("unsupported image");
    // Decode every input, apply EXIF orientation only to the analysis copy, and strip metadata.
    const preview = await source.autoOrient().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
    const rotated = (meta.orientation || 0) >= 5;
    return { width: rotated ? meta.height : meta.width, height: rotated ? meta.width : meta.height, preview };
  } catch { throw new ServiceError(400, "사진을 읽을 수 없어요. 손상되지 않은 정지 이미지(JPG·PNG·WebP, 최대 8192px·4천만 화소)를 선택해 주세요."); }
}

export async function uploadProductImage(userId: string, file: File): Promise<ProductImage> {
  if (file.size > PRODUCT_IMAGE_BYTES) throw new ServiceError(413, "사진은 한 장에 10MB 이내로 선택해 주세요.");
  const meta = await decode(new Uint8Array(await file.arrayBuffer()), file.type);
  const asset = await saveAsset(userId, file, true);
  return { id: asset.id, name: asset.name, url: asset.url, width: meta.width, height: meta.height };
}
async function ownedProductImage(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ServiceError(400, "사진 ID를 확인해 주세요.");
  const file = await assetFile(userId, id);
  // This workflow accepts uploaded, account-owned bytes, never arbitrary client URLs.
  if (!file.data) throw new ServiceError(400, "사진 원본 파일을 직접 업로드해 주세요.");
  const meta = await decode(file.data, file.mime);
  return { image: { id, name: file.name, url: `/api/workspace/assets/${id}`, width: meta.width, height: meta.height } satisfies ProductImage, preview: meta.preview };
}
export async function resolveProductImages(userId: string, ids: unknown): Promise<ProductImage[]> {
  if (ids === undefined) return [];
  if (!Array.isArray(ids) || ids.length > PRODUCT_IMAGE_LIMIT || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length) throw new ServiceError(400, "서로 다른 사진을 최대 6장 선택해 주세요.");
  const images: ProductImage[] = [];
  for (const id of ids) images.push((await ownedProductImage(userId, id)).image);
  return images;
}
export async function productVisionImages(userId: string, images: ProductImage[]) {
  if (images.length > PRODUCT_IMAGE_LIMIT) throw new ServiceError(400, "사진은 최대 6장입니다.");
  const result: { id: string; imageUrl: string }[] = [];
  for (const image of images) {
    const source = await ownedProductImage(userId, image.id);
    result.push({ id: image.id, imageUrl: `data:image/jpeg;base64,${source.preview.toString("base64")}` });
  }
  return result;
}
