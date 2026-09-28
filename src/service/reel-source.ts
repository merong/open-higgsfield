import sharp from "sharp";
import { createPlatformClient } from "@/generation/platform";
import { assetFile } from "./assets";
import { resolveProvider } from "./provider-settings";
import { ServiceError } from "./errors";

export async function reelSourceFrame(userId: string, id: string) {
  const image = await assetFile(userId, id);
  if (!image.mime.startsWith("image/") || !image.data) throw new ServiceError(400, "영상으로 만들 사진의 원본 파일을 업로드해 주세요.");
  try {
    const source = sharp(image.data, { limitInputPixels: 40_000_000, failOn: "warning" }).timeout({ seconds: 15 });
    const meta = await source.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format || "") || (meta.pages || 1) > 1) throw new Error();
    return await source.autoOrient().resize(720, 1280, { fit: "contain", background: "#101315" }).flatten({ background: "#101315" }).jpeg({ quality: 92 }).toBuffer();
  } catch { throw new ServiceError(400, "영상의 시작 사진을 읽지 못했어요. JPG·PNG·WebP 원본을 다시 선택해 주세요."); }
}
export async function uploadReelSource(userId: string, id: string, client?: ReturnType<typeof createPlatformClient>) {
  const bytes = await reelSourceFrame(userId, id);
  const provider = client || createPlatformClient(await resolveProvider(userId));
  try { if (!provider.upload) throw new Error("Upload capability unavailable"); return await provider.upload(bytes, "image/jpeg"); }
  catch { throw new ServiceError(502, "영상 제작에 사용할 원본 사진을 전달하지 못했어요. 사진은 유지되며 영상은 접수하지 않았습니다. API 연결을 확인한 뒤 다시 시도해 주세요."); }
}
