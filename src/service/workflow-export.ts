import { createHash, randomUUID } from "node:crypto";
import { inflateSync } from "node:zlib";
import { isDeepStrictEqual } from "node:util";
import { unzipSync, strFromU8 } from "fflate";
import { DIMENSIONS } from "@/projects/formats";
import type { CardWorkflow } from "@/projects/card-workflow";
import { database } from "./db";
import { contentIssues, persistWorkflow, workflowEvent, workflowRow } from "./card-workflow";
import { object, ServiceError, text } from "./errors";
import { ledger } from "./credits";
const invalid = (message: string): never => { throw new ServiceError(400, `출력 검증 실패: ${message}`); };
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function validatePng(bytes: Uint8Array, width: number, height: number) {
  const data = Buffer.from(bytes);
  if (data.length < 57 || !data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) invalid("PNG 형식이 아닙니다.");
  let offset = 8, channels = 0, ended = false; const compressed: Buffer[] = [];
  while (offset + 12 <= data.length) {
    const size = data.readUInt32BE(offset), type = data.toString("ascii", offset + 4, offset + 8), end = offset + 12 + size;
    if (end > data.length || crc32(data.subarray(offset + 4, end - 4)) !== data.readUInt32BE(end - 4)) invalid("PNG 데이터가 손상되었습니다.");
    if (offset === 8 && type !== "IHDR") invalid("PNG 헤더가 없습니다.");
    if (type === "IHDR") {
      if (offset !== 8 || size !== 13 || data.readUInt32BE(offset + 8) !== width || data.readUInt32BE(offset + 12) !== height) invalid("카드의 출력 규격이 맞지 않습니다.");
      if (data[offset+16] !== 8 || ![2,6].includes(data[offset+17]) || data[offset+18] || data[offset+19] || data[offset+20]) invalid("지원하지 않는 PNG 인코딩입니다.");
      channels = data[offset+17] === 6 ? 4 : 3;
    } else if (type === "IDAT") compressed.push(data.subarray(offset + 8, end - 4));
    else if (type === "IEND") { if (size || end !== data.length) invalid("PNG 종료 데이터가 잘못되었습니다."); ended = true; break; }
    offset = end;
  }
  if (!ended || !channels || !compressed.length) invalid("PNG가 완성되지 않았습니다.");
  const stride = width * channels + 1, expected = height * stride;
  try {
    const raw = inflateSync(Buffer.concat(compressed), { maxOutputLength: expected });
    if (raw.length !== expected) invalid("PNG 픽셀 데이터가 부족합니다.");
    for (let row = 0; row < height; row++) if (raw[row * stride] > 4) invalid("PNG 필터가 잘못되었습니다.");
  } catch { invalid("PNG 픽셀 데이터를 읽지 못했습니다."); }
}
export function validateWorkflowZip(bytes: Uint8Array, r: CardWorkflow) {
  if (bytes.length > 50 * 1024 * 1024) invalid("ZIP은 50MB 이내여야 합니다.");
  let files: Record<string, Uint8Array>; let expanded = 0, entries = 0;
  try {
    files = unzipSync(bytes, { filter: file => {
      expanded += file.originalSize; entries++;
      if (expanded > 120 * 1024 * 1024 || entries > 12) invalid("압축을 푼 파일의 크기나 개수가 너무 큽니다.");
      return true;
    } });
  } catch { return invalid("ZIP 파일을 읽지 못했습니다."); }
  const names = r.project.slots.map((_, i) => `${String(i + 1).padStart(2, "0")}.png`);
  if (Object.keys(files).length !== names.length + 2 || !names.every(n => files[n]) || !files["project.json"] || !files["caption.txt"]) invalid("카드 장수 또는 필수 파일이 일치하지 않습니다.");
  try { if (!isDeepStrictEqual(JSON.parse(strFromU8(files["project.json"])), r.project)) invalid("제작 내용이 바뀌었습니다. 최신 카드로 파일을 다시 준비해 주세요."); }
  catch { invalid("프로젝트 문서가 현재 버전과 일치하지 않습니다."); }
  if (strFromU8(files["caption.txt"]) !== r.project.caption) invalid("캡션이 현재 버전과 일치하지 않습니다.");
  const [width, height] = DIMENSIONS[r.project.ratio];
  for (const name of names) validatePng(files[name], width, height);
  return { names, files, width, height };
}
export async function finalizeWorkflow(userId: string, id: string, input: unknown) {
  const data = object(input), db = await database();
  return db.transaction(async tx => {
    const { data: r } = await workflowRow(tx, userId, id);
    if (r.status === "completed") return r;
    if (r.status !== "ready" || r.revision !== data.revision) throw new ServiceError(409, "최신 결과가 준비된 뒤 파일을 만들어 주세요.");
    const issues = contentIssues(r);
    if (issues.length) invalid(issues[0].message);
    if (r.review?.issues.length) invalid("검수에서 지적된 문구를 수정해 주세요.");
    if (r.project.slots[0].kind !== "cover" || r.project.slots.at(-1)?.kind !== "cta") invalid("첫 장은 표지, 마지막 장은 마무리 카드로 정렬해 주세요.");
    const [project] = await tx.query<{ version: number }>("SELECT version FROM projects WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL FOR UPDATE", [r.projectId, userId]);
    if (!project || project.version !== r.project.version) throw new ServiceError(409, "편집기에서 변경된 프로젝트입니다. 최신 결과를 확인해 주세요.");
    const assetId = text(data.assetId, "ZIP 파일", 100, 1);
    const [asset] = await tx.query<{ data: Uint8Array; mime: string }>("SELECT data,mime FROM assets WHERE id=$1 AND owner_id=$2", [assetId, userId]);
    if (!asset || asset.mime !== "application/zip" || !asset.data) invalid("계정에 보관된 ZIP을 찾지 못했습니다.");
    const { names, files, width, height } = validateWorkflowZip(asset.data, r);
    if (!r.quality) throw new ServiceError(400, "출력 검증 실패: 최신 출력물을 먼저 검수해 주세요.");
    const q = r.quality;
    if (!q || q.state !== "ready" || q.projectVersion !== r.project.version || q.assetId !== assetId || q.zipHash !== createHash("sha256").update(asset.data).digest("hex")) invalid("최신 출력물을 먼저 검수해 주세요.");
    if (q.cards?.some(c => c.findings.some(f => f.status === "fail"))) invalid("수정 필요 항목을 해결한 뒤 출력물을 다시 검수해 주세요.");
    if (data.acknowledged !== true) invalid("검수 결과와 확인 필요 항목을 확인해 주세요.");
    if (r.project.slots.some(s => s.media?.kind !== "image")) q.imageException = text(data.imageException, "이미지 없는 카드의 예외 사유", 300, 5);
    q.acknowledged = true;
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
    const [storage] = await tx.query<{ bytes: string }>("SELECT COALESCE(SUM(byte_size),0) AS bytes FROM assets WHERE owner_id=$1", [userId]);
    if (Number(storage.bytes) + names.reduce((sum, name) => sum + files[name].length, 0) > 500 * 1024 * 1024) throw new ServiceError(413, "보관 한도 500MB를 초과했습니다.");
    const downloads: { name: string; url: string }[] = [];
    for (const name of names) {
      const fileId = randomUUID(), fileName = `${r.project.title.slice(0, 80)}-${name}`;
      await tx.query("INSERT INTO assets (id,owner_id,name,mime,data,created_at,byte_size,project_id) VALUES ($1,$2,$3,'image/png',$4,$5,$6,$7)", [fileId, userId, fileName, Buffer.from(files[name]), Date.now(), files[name].length, r.projectId]);
      downloads.push({ name, url: `/api/workspace/exports/${fileId}` });
    }
    await tx.query("UPDATE assets SET project_id=$1 WHERE id=$2 AND owner_id=$3", [r.projectId, assetId, userId]);
    r.artifacts = { projectVersion: r.project.version, zipUrl: `/api/workspace/exports/${assetId}`, files: downloads, width, height }; r.status = "completed";
    await tx.query("UPDATE generation_jobs SET state='completed',result=$1 WHERE id=$2 AND state='submitting'", [JSON.stringify({ status: "completed", projectId: r.projectId, images: downloads.map(f => ({ url: f.url })), zipUrl: r.artifacts.zipUrl }), id]);
    await ledger(tx, userId, 0, "confirm", "참여형 카드뉴스 파일 검증 완료", id);
    workflowEvent(r, "run.completed", "카드뉴스가 완성됐어요", `${names.length}장의 ${width} × ${height} PNG와 ZIP을 확인하고 보관했습니다.`);
    await persistWorkflow(tx, r, "파일 검증 완료"); return r;
  });
}
