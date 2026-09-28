import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { database } from "./db";
import { ServiceError } from "./errors";
const TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
];
export async function saveAsset(userId: string, file: File, archive = false) {
  if (
    !(
      TYPES.includes(file.type) ||
      (archive && file.type === "application/zip")
    ) ||
    file.size < 1 ||
    file.size > 50 * 1024 * 1024
  )
    throw new ServiceError(
      400,
      "이미지·MP4/WebM·오디오 파일을 50MB 이내로 선택해 주세요.",
    );
  const db = await database();
  const id = randomUUID(),
    name = file.name.slice(0, 255),
    bytes = Buffer.from(await file.arrayBuffer());
  const url = await db.transaction(async (tx) => {
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
    const [storage] = await tx.query<{ bytes: string }>(
      "SELECT COALESCE(SUM(byte_size),0) AS bytes FROM assets WHERE owner_id=$1",
      [userId],
    );
    if (Number(storage.bytes) + file.size > 500 * 1024 * 1024)
      throw new ServiceError(
        413,
        "계정의 파일 보관 한도 500MB를 초과했습니다.",
      );
    let url: string | null = null;
    if (process.env.OPEN_HIGGSFIELD_READ_WRITE_TOKEN && !archive) {
      const blob = await put(
        `projects/${userId}/${id}/${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
        bytes,
        {
          access: "public",
          contentType: file.type,
          token: process.env.OPEN_HIGGSFIELD_READ_WRITE_TOKEN,
        },
      );
      url = blob.url;
    }
    await tx.query(
      "INSERT INTO assets (id,owner_id,name,mime,data,url,created_at,byte_size) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id,
        userId,
        name,
        file.type,
        url ? null : bytes,
        url,
        Date.now(),
        file.size,
      ],
    );
    return url;
  });
  return {
    id,
    name,
    mime: file.type,
    url: url || `/api/workspace/assets/${id}`,
  };
}
export async function assetList(userId: string) {
  return (await database()).query(
    "SELECT id,name,mime,COALESCE(url, '/api/workspace/assets/' || id) AS url FROM assets WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100",
    [userId],
  );
}
export async function assetFile(userId: string, id: string) {
  const [file] = await (
    await database()
  ).query<{
    data: Uint8Array | null;
    url: string | null;
    mime: string;
    name: string;
  }>("SELECT data,url,mime,name FROM assets WHERE id=$1 AND owner_id=$2", [
    id,
    userId,
  ]);
  if (!file) throw new ServiceError(404, "파일을 찾을 수 없습니다.");
  return file;
}
