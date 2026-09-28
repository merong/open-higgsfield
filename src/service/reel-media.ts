import { uploadReelSource } from "./reel-source";
import { videoCreditBlocked, VIDEO_CREDIT_MESSAGE } from "@/projects/credit-policy";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { database } from "./db";
import { assetFile, saveAsset } from "./assets";
import { ServiceError, object, text } from "./errors";
import { getReel, reelRow, reelEvent, saveReel, requireReelRevision } from "./reel-workflow";
import { quote, ledger } from "./credits";
import { submitJob, statusesFor, validatePlane } from "./generation";
import { resolveOpenAi } from "./openai-settings";
import type { Job } from "@/projects/types";
import { reelSourceImageId, reelTerminal, type ReelWorkflow, type ReelScene, type ReelCue } from "@/projects/reel-workflow";
import type { createPlatformClient } from "@/generation/platform";
const exec = promisify(execFile);
export async function mediaCommand(command: "ffmpeg" | "ffprobe", args: string[], timeout = 120000) {
  try { return await exec(process.env[command === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH"] || command, args, { timeout, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, AV_LOG_FORCE_NOCOLOR: "1" } }); }
  catch (e) { console.error(`[reels:${command}]`, String((e as { stderr?: string }).stderr || (e as Error).message).slice(-1200)); throw new ServiceError(502, `${command === "ffmpeg" ? "영상 합성·디코딩" : "미디어 정보 확인"}에 실패했습니다. 파일과 서버 FFmpeg 설치를 확인해 주세요.`); }
}
export function mediaFormat(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  if (b.subarray(1, 4).toString() === "PNG") return "png_pipe";
  if (b[0] === 255 && b[1] === 216) return "jpeg_pipe";
  if (b.subarray(8, 12).toString() === "WEBP") return "webp_pipe";
  if (b.subarray(8, 12).toString() === "WAVE") return "wav";
  if (b.subarray(4, 8).toString() === "ftyp") return "mov";
  if (b.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))) return "matroska";
  if (b.subarray(0, 3).toString() === "ID3" || b[0] === 255 && (b[1] & 224) === 224) return "mp3";
  if (b.subarray(0, 4).toString() === "OggS") return "ogg";
  throw new ServiceError(400, "PNG·JPEG·WebP·MP4·WebM·WAV·MP3·OGG 원본 파일을 사용해 주세요.");
}
export async function remoteMedia(url: string) {
  let u: URL;
  try { u = new URL(url); } catch { throw new ServiceError(400, "생성 파일 주소가 올바르지 않습니다."); }
  if (u.protocol !== "https:" || u.port || u.username || u.password || ![".cloudfront.net", ".higgsfield.ai", ".fal.media", ".public.blob.vercel-storage.com"].some(host => u.hostname.endsWith(host))) throw new ServiceError(400, "지원되는 생성 저장소가 아닙니다. 파일을 직접 업로드해 주세요.");
  const res = await fetch(u, { redirect: "error", signal: AbortSignal.timeout(45000) });
  if (!res.ok || Number(res.headers.get("content-length")) > 50 * 1024 * 1024 || !res.body) throw new ServiceError(502, "생성 파일을 내려받지 못했습니다.");
  const reader = res.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 50 * 1024 * 1024) { await reader.cancel(); throw new ServiceError(413, "생성 파일은 50MB 이내로 보관합니다."); } chunks.push(value); }
  return Buffer.concat(chunks);
}
export async function ownedMedia(userId: string, id: string) { const a = await assetFile(userId, id); return { ...a, bytes: a.data ? Buffer.from(a.data) : await remoteMedia(a.url!) }; }
export async function probeMedia(bytes: Uint8Array) {
  const dir = await mkdtemp(path.join(tmpdir(), "ohf-reel-probe-"));
  try {
    const file = path.join(dir, "source"), format = mediaFormat(bytes); await writeFile(file, bytes);
    const result = JSON.parse((await mediaCommand("ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe", "-f", format, "-show_streams", "-show_format", "-of", "json", file], 20000)).stdout);
    const video = result.streams.find((s: { codec_type: string }) => s.codec_type === "video"), audio = result.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
    const duration = Number(result.format.duration || video?.duration || audio?.duration || 0);
    if (!video && !audio || !Number.isFinite(duration) || duration > 180 || video && (video.width > 8192 || video.height > 8192 || video.width * video.height > 40_000_000)) throw new ServiceError(400, "미디어 크기 또는 길이를 확인해 주세요. 원본은 3분 이내를 지원합니다.");
    return { width: video?.width || 0, height: video?.height || 0, duration, audio: !!audio, kind: video ? (format.endsWith("_pipe") ? "image" : "video") as "image" | "video" : "audio" as const, format };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
export function reelPlane(_r: ReelWorkflow, scene: ReelScene, kind: "image" | "video", sourceUrl?: string) {
  const sourceId = kind === "video" ? reelSourceImageId(scene) : undefined;
  return validatePlane({ model: kind === "image" ? "soul-2" : sourceId ? "kling-3-turbo" : "kling-2.6", prompt: { text: `${kind === "image" ? "ONE single full-bleed photograph of ONE instant. Translate all action and camera motion into a frozen photographic moment. Absolutely no storyboard, panels, collage, split-screen, caption, subtitles, letters or typography. " : sourceId ? "Animate the provided start image. Preserve the exact subject, color, shape and identity; do not replace it or introduce extra subjects. " : ""}${scene.prompt}. Vertical cinematic composition, maintain subject identity and natural proportions. Keep important subject in upper central frame, leave lower area for captions. No added captions, typography, logos or watermarks. Books or notebooks are allowed when requested as actual scene props; incidental writing should be indistinct.` }, settings: kind === "image" ? { aspectRatio: "3:4", resolution: "720p", batchSize: "1", enhancePrompt: false } : { aspectRatio: "9:16", resolution: "720p", duration: sourceId ? Math.max(3, Math.min(15, Math.ceil(scene.frames / 30))) : Math.max(4, Math.min(10, Math.ceil(scene.frames / 30))) }, media: sourceUrl && sourceId ? { start: [{ id: sourceId, role: "start", url: sourceUrl }] } : {} });
}
export async function reelQuote(userId: string, id: string, sceneId: string) {
  const r = await getReel(userId, id), s = r.scenes.find(s => s.id === sceneId);
  if (!s) throw new ServiceError(404, "장면을 찾을 수 없습니다.");
  return { image: quote(reelPlane(r, s, "image")), video: quote(reelPlane(r, s, "video")), voice: voiceCost() };
}
export function voiceCost() { const value = Number(process.env.VOICE_CREDIT_COST || 2); if (!Number.isSafeInteger(value) || value < 1 || value > 1000) throw new ServiceError(500, "음성 크레딧 단가를 확인해 주세요."); return value; }
export async function attachReelAsset(userId: string, id: string, input: unknown) {
  const d = object(input), assetId = text(d.assetId, "에셋", 100, 1), a = await ownedMedia(userId, assetId), meta = await probeMedia(a.bytes);
  if (meta.kind === "audio") throw new ServiceError(400, "장면에는 이미지 또는 영상을 선택해 주세요.");
  return (await database()).transaction(async tx => { const { data: r } = await reelRow(tx, userId, id); requireReelRevision(r, d); if (r.status !== "ready" && !(r.status === "waiting_user" && r.question?.kind === "plan")) throw new ServiceError(409, "현재 작업을 마친 뒤 에셋을 추가해 주세요."); const s = r.scenes.find(s => s.id === d.sceneId); if (!s) throw new ServiceError(404, "장면을 찾을 수 없습니다."); s.asset = { id: assetId, name: a.name, ...meta, kind: meta.kind as "image" | "video" }; s.sourceImageId = meta.kind === "image" ? assetId : undefined; s.version++; if (s.id === r.scenes[0].id) r.sampleApproved = false; reelEvent(r, "장면 에셋을 연결했어요", "원본 문구와 음성을 유지했습니다."); await saveReel(tx, r, "장면 에셋 연결", true); return r; });
}
type Client = ReturnType<typeof createPlatformClient>;
export async function generateReelVisual(userId: string, id: string, input: unknown, client?: Client) {
  const d = object(input), key = text(d.responseId, "생성 요청 ID", 100, 8), kind = d.kind === "video" ? "video" : "image", db = await database();
  const claim = await db.transaction(async tx => {
    const { data: r } = await reelRow(tx, userId, id);
    if (r.responses.includes(key) || r.task?.key === key) return { r, fresh: false };
    requireReelRevision(r, d);
    if (r.status !== "ready" || !r.planApproved) throw new ServiceError(409, "대본 승인 후 생성할 수 있어요.");
    if (r.task?.state === "unknown" && r.task.kind !== "render") throw new ServiceError(409, "접수가 확인되지 않은 작업을 먼저 확인해 주세요.");
    const s = r.scenes.find(s => s.id === d.sceneId); if (!s) throw new ServiceError(404, "장면을 찾을 수 없습니다.");
    if (s.id !== r.scenes[0].id && !r.sampleApproved) throw new ServiceError(409, "대표 샘플을 먼저 승인해 주세요.");
    if (kind === "video" && !reelSourceImageId(s) && s.frames > 300) throw new ServiceError(400, "생성 영상은 장면당 최대 10초입니다. 이미지 모션이나 업로드 영상을 사용해 주세요.");
    if (r.budget.generations >= r.budget.maxGenerations) throw new ServiceError(400, "이번 제작의 이미지·영상 생성 한도에 도달했습니다. 업로드 에셋을 사용할 수 있어요.");
    if (d.credits !== quote(reelPlane(r, s, kind))) throw new ServiceError(409, "생성 비용이 바뀌었습니다. 최신 비용을 확인해 주세요.");
    const [balance] = await tx.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [userId]);
    if (kind === "video" && reelSourceImageId(s)) {
      if (videoCreditBlocked("video", balance.credits)) throw new ServiceError(402, VIDEO_CREDIT_MESSAGE);
      if (balance.credits < Number(d.credits)) throw new ServiceError(402, "영상 생성 크레딧이 부족합니다.");
    }
    r.task = { key, kind, sceneId: s.id, sceneVersion: s.version, version: r.contentVersion, state: "submitting", startedAt: Date.now() }; r.status = "waiting_tool"; r.budget.generations++;
    r.responses.push(key); reelEvent(r, kind === "image" ? "장면 이미지를 만들고 있어요" : "장면 영상을 만들고 있어요", "접수한 작업을 확인합니다. 새로고침해도 요청 ID를 복원합니다."); await saveReel(tx, r, "장면 생성 접수"); return { r, fresh: true };
  });
  if (claim.fresh) {
    try {
      const s = claim.r.scenes.find(s => s.id === claim.r.task!.sceneId)!, sourceId = kind === "video" ? reelSourceImageId(s) : undefined;
      const sourceUrl = sourceId ? await uploadReelSource(userId, sourceId, client) : undefined;
      const latest = await getReel(userId, id);
      if (reelTerminal(latest) || latest.task?.key !== key) return latest;
      await submitJob(userId, reelPlane(claim.r, s, kind, sourceUrl), key, { projectId: claim.r.projectId, slotId: s.id }, client);
    }
    catch (e) {
      if (!(await db.query("SELECT id FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2", [userId, key])).length) return db.transaction(async tx => { const { data: r } = await reelRow(tx, userId, id); if (r.task?.key !== key) return r; r.task.state = "failed"; r.error = e instanceof ServiceError ? e.message : "생성 요청을 시작하지 못했습니다."; if (!reelTerminal(r)) r.status = "ready"; await saveReel(tx, r, "생성 접수 실패"); return r; });
    }
  }
  return pollReelVisual(userId, id, client);
}
export async function pollReelVisual(userId: string, id: string, client?: Client): Promise<ReelWorkflow> {
  const r = await getReel(userId, id), task = r.task, db = await database();
  if (!task || !["image", "video"].includes(task.kind) || ["completed", "failed", "discarded"].includes(task.state)) return r;
  const lookup = async () => (await db.query<Job>("SELECT id,request_id,state,result FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2", [userId, task.key]))[0];
  let job = await lookup();
  if (job?.request_id && ["pending", "submitting", "unknown"].includes(job.state)) { await statusesFor(userId, [job.request_id], client); job = await lookup(); }
  if (!job && Date.now() - task.startedAt < 120000) return r;
  const state = job?.state || "unknown";
  if (["pending", "submitting"].includes(state) && Date.now() - task.startedAt < 15 * 60_000) return r;
  if (state === "completed" && !reelTerminal(r)) {
    const url = task.kind === "image" ? job.result?.images?.[0]?.url : job.result?.video?.url;
    if (!url) throw new ServiceError(502, "생성된 파일이 없습니다.");
    // Download once under a lease; a second poll observes importing and does no duplicate I/O.
    const token = randomUUID();
    const claimed = await db.transaction(async tx => { const row = await reelRow(tx, userId, id); if (row.data.task?.key !== task.key || ["importing", "completed", "failed", "discarded"].includes(row.data.task.state) || reelTerminal(row.data)) return false; row.data.task.state = "importing"; await saveReel(tx, row.data, "생성 파일 보관", false, token); return true; });
    if (!claimed) return getReel(userId, id);
    try {
      const bytes = await remoteMedia(url), meta = await probeMedia(bytes); if (meta.kind !== task.kind) throw new ServiceError(502, "생성된 파일 종류가 요청과 다릅니다.");
      const asset = await saveAsset(userId, new File([bytes], `scene-${task.sceneId}.${task.kind === "image" ? (meta.format === "jpeg_pipe" ? "jpg" : meta.format === "webp_pipe" ? "webp" : "png") : "mp4"}`, { type: task.kind === "image" ? (meta.format === "jpeg_pipe" ? "image/jpeg" : meta.format === "webp_pipe" ? "image/webp" : "image/png") : "video/mp4" }), true);
      return db.transaction(async tx => { const row = await reelRow(tx, userId, id), current = row.data; await tx.query("UPDATE assets SET project_id=$1 WHERE id=$2", [current.projectId, asset.id]); if (row.lease_token !== token || current.task?.key !== task.key || reelTerminal(current)) return current; const scene = current.scenes.find(s => s.id === task.sceneId)!; if (scene.version !== task.sceneVersion || current.contentVersion !== task.version) { current.task.state = "discarded"; current.status = "ready"; await saveReel(tx, current, "이전 버전 생성 분리"); return current; } scene.asset = { id: asset.id, name: asset.name, kind: meta.kind as "image" | "video", width: meta.width, height: meta.height, duration: meta.duration }; if (task.kind === "image") scene.sourceImageId = asset.id; else scene.sourceImageId = reelSourceImageId(r.scenes.find(s => s.id === task.sceneId)!); scene.version++; if (scene.id === current.scenes[0].id) current.sampleApproved = false; current.task.state = "completed"; current.status = "ready"; reelEvent(current, "장면 자산을 보관했어요", "문구와 음성을 유지하고 이 장면의 배경을 적용했습니다."); await saveReel(tx, current, "장면 생성 완료", true); return current; });
    } catch (e) { return db.transaction(async tx => { const row = await reelRow(tx, userId, id), current = row.data; if (row.lease_token !== token) return current; current.task!.state = "unknown"; current.status = "ready"; current.error = e instanceof ServiceError ? e.message : "생성 파일을 보관하지 못했습니다. 상태 확인으로 다시 내려받을 수 있어요."; await saveReel(tx, current, "생성 파일 보관 실패"); return current; }); }
  }
  return db.transaction(async tx => { const { data: current } = await reelRow(tx, userId, id); if (current.task?.key !== task.key) return current; current.task.state = state === "completed" ? "discarded" : state === "failed" ? "failed" : "unknown"; if (!reelTerminal(current)) current.status = "ready"; current.error = state === "failed" ? "생성에 실패해 크레딧이 환불되었습니다. 다시 생성하거나 파일을 업로드해 주세요." : "접수 상태를 확인해 주세요. 새 작업을 자동 결제하지 않습니다."; await saveReel(tx, current, "생성 상태 확인"); return current; });
}
export type VoiceProvider = (scene: ReelScene, voice: string) => Promise<{ bytes: Uint8Array; transcript: string; cues: ReelCue[]; alignmentError?: string }>;
export const speechProvider: VoiceProvider = async (scene, voice) => {
  const config = await resolveOpenAi();
  const res = await fetch("https://api.openai.com/v1/audio/speech", { method: "POST", redirect: "error", signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: scene.narration, instructions: "Speak natural Korean, calm and warm. Preserve every word. Do not add commentary. Speak clearly, with short natural pauses. No background music.", response_format: "wav" }) });
  if (!res.ok) throw new ServiceError(res.status >= 400 && res.status < 500 ? 400 : 502, `음성 생성 실패 (HTTP ${res.status}). 관리자 API 설정을 확인해 주세요.`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > 20 * 1024 * 1024) throw new ServiceError(502, "음성 파일이 너무 큽니다.");
  try { return { bytes, ...await transcribeReelAudio(bytes) }; }
  catch { return { bytes, transcript: "", cues: [], alignmentError: "음성은 보관했습니다. 실제 자막 정렬만 다시 시도해 주세요." }; }
};
export async function transcribeReelAudio(bytes: Uint8Array) {
  const config = await resolveOpenAi();
  const form = new FormData(); form.set("file", new File([bytes as Uint8Array<ArrayBuffer>], "voice.wav", { type: "audio/wav" })); form.set("model", "whisper-1"); form.set("language", "ko"); form.set("response_format", "verbose_json"); form.append("timestamp_granularities[]", "segment");
  const transcription = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", redirect: "error", signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${config.apiKey}` }, body: form });
  if (!transcription.ok) throw new ServiceError(502, `실제 음성 정렬 실패 (HTTP ${transcription.status}). 생성 접수를 확인한 후 재시도해 주세요.`);
  const data = await transcription.json();
  const cues: ReelCue[] = (data.segments || []).map((s: { start: number; end: number; text: string }, i: number) => ({ id: `cue-${i + 1}`, startMs: Math.round(s.start * 1000), endMs: Math.round(s.end * 1000), text: s.text.trim() }));
  return { transcript: String(data.text || ""), cues };
}
// Whisper may place its final segment beyond EOF. Trim only that last endpoint;
// retain the original audio and retry alignment if timestamps are otherwise invalid.
export function boundedReelCues(cues: ReelCue[], durationMs: number): ReelCue[] {
  if (!cues.length || cues.length > 30 || cues.some((c, i) => !Number.isFinite(c.startMs) || !Number.isFinite(c.endMs) || c.startMs < 0 || c.endMs <= c.startMs || c.startMs >= durationMs || i < cues.length - 1 && c.endMs > durationMs || i > 0 && c.startMs < cues[i - 1].endMs)) return [];
  return cues.map(c => ({ ...c, endMs: Math.min(durationMs, c.endMs) }));
}
export const normalizedSpeech = (v: string) => v.normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
export async function generateReelVoice(userId: string, id: string, input: unknown, provider: VoiceProvider = speechProvider) {
  const d = object(input), key = text(d.responseId, "음성 요청 ID", 100, 8), token = randomUUID(), db = await database();
  const claim = await db.transaction(async tx => {
    const { data: r } = await reelRow(tx, userId, id);
    if (r.responses.includes(key)) return { r, fresh: false };
    requireReelRevision(r, d);
    if (r.status !== "ready" || !r.spec.narration || !r.planApproved) throw new ServiceError(409, "음성 사용과 대본 승인을 확인해 주세요.");
    if (r.task?.state === "unknown" && r.task.kind !== "render" && !(r.task.kind === "voice" && r.task.sceneId === d.sceneId && d.acknowledgeUnknown === true)) throw new ServiceError(409, "접수가 불명확한 작업을 먼저 확인해 주세요.");
    const s = r.scenes.find(s => s.id === d.sceneId); if (!s?.narration) throw new ServiceError(400, "발화 대본이 없습니다.");
    if (!r.sampleApproved && s.id !== r.scenes[0].id) throw new ServiceError(409, "대표 샘플을 먼저 승인해 주세요.");
    const cost = voiceCost(); if (d.credits !== cost) throw new ServiceError(409, "음성 비용을 다시 확인해 주세요.");
    if (r.budget.voiceCalls >= r.budget.maxVoiceCalls) throw new ServiceError(400, "음성 생성 한도에 도달했습니다.");
    const [user] = await tx.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1 FOR UPDATE", [userId]); if (!user || user.credits < cost) throw new ServiceError(402, "음성 생성 크레딧이 부족합니다.");
    const jobId = randomUUID(); await tx.query("UPDATE users SET credits=credits-$1 WHERE id=$2", [cost, userId]);
    await tx.query("INSERT INTO generation_jobs (id,user_id,idempotency_key,state,cost,plane,project_id,slot_id,created_at) VALUES ($1,$2,$3,'submitting',$4,$5,$6,$7,$8)", [jobId, userId, key, cost, JSON.stringify({ type: "voice", model: "gpt-4o-mini-tts", voice: r.spec.voice, text: s.narration }), r.projectId, s.id, Date.now()]);
    await ledger(tx, userId, -cost, "hold", "AI 음성·실제 발화 정렬 예약", jobId);
    r.task = { key, kind: "voice", sceneId: s.id, sceneVersion: s.version, version: r.contentVersion, state: "running", startedAt: Date.now(), jobId }; r.responses.push(key); r.budget.voiceCalls++; r.status = "waiting_tool"; r.error = undefined;
    reelEvent(r, "목소리와 자막을 만들고 있어요", "AI 음성을 생성한 뒤 실제 발화 길이와 자막 시간을 확인합니다."); await saveReel(tx, r, "음성 생성", false, token, 150000); return { r, fresh: true };
  });
  if (!claim.fresh) return claim.r;
  try {
    const task = claim.r.task!, s = claim.r.scenes.find(s => s.id === task.sceneId)!, result = await provider(s, claim.r.spec.voice), meta = await probeMedia(result.bytes);
    if (meta.kind !== "audio" || !meta.duration || meta.duration > 30) throw new ServiceError(502, "생성된 음성의 길이와 형식을 확인하지 못했습니다.");
    result.cues = boundedReelCues(result.cues, Math.round(meta.duration * 1000));
    if (!result.cues.length) result.alignmentError = "음성은 보관했습니다. 자막 정렬만 다시 시도해 주세요.";
    const a = await saveAsset(userId, new File([result.bytes as Uint8Array<ArrayBuffer>], `${s.id}-voice.wav`, { type: "audio/wav" }), true);
    return db.transaction(async tx => { const row = await reelRow(tx, userId, id), r = row.data; await tx.query("UPDATE assets SET project_id=$1 WHERE id=$2", [r.projectId, a.id]); await tx.query("UPDATE generation_jobs SET state='completed',result=$1 WHERE id=$2", [JSON.stringify({ status: "completed", audio: { url: `/api/workspace/assets/${a.id}` } }), task.jobId]); await ledger(tx, userId, 0, "confirm", "AI 음성 생성 완료", task.jobId); if (row.lease_token !== token || reelTerminal(r)) return r; const scene = r.scenes.find(s => s.id === task.sceneId)!; if (scene.version !== task.sceneVersion) { r.task!.state = "discarded"; r.status = "ready"; await saveReel(tx, r, "이전 음성 분리"); return r; } scene.voice = { assetId: a.id, durationMs: Math.round(meta.duration * 1000), transcript: result.transcript, cues: result.cues, matches: normalizedSpeech(scene.narration) === normalizedSpeech(result.transcript), voice: r.spec.voice, alignmentError: result.alignmentError }; scene.version++; if (scene.id === r.scenes[0].id) r.sampleApproved = false; r.status = "ready"; r.task!.state = "completed"; reelEvent(r, "실제 음성과 자막을 보관했어요", `${(meta.duration).toFixed(2)}초 · 대본과 전사를 대조했습니다. 발음과 말끝은 샘플에서 들어 주세요.`); await saveReel(tx, r, "음성·정렬 완료", true); return r; });
  } catch (e) {
    console.error("[reels:voice]", { name: (e as Error).name, message: (e as Error).message?.slice(0, 250), code: (e as { cause?: { code?: string } }).cause?.code });
    return db.transaction(async tx => { const row = await reelRow(tx, userId, id), r = row.data, task = claim.r.task!, definite = e instanceof ServiceError && e.status === 400; const jobs = await tx.query<{ cost: number }>("UPDATE generation_jobs SET state=$1 WHERE id=$2 AND state='submitting' RETURNING cost", [definite ? "failed" : "unknown", task.jobId]); if (definite && jobs.length) { await tx.query("UPDATE users SET credits=credits+$1 WHERE id=$2", [jobs[0].cost, userId]); await ledger(tx, userId, jobs[0].cost, "refund", "음성 요청 거절 · 환불", task.jobId); } if (row.lease_token !== token) return r; r.status = "ready"; r.task!.state = definite ? "failed" : "unknown"; r.error = e instanceof ServiceError ? e.message : "음성 접수 결과를 확인하지 못했습니다. 중복 생성 없이 관리자 확인이 필요합니다."; await saveReel(tx, r, "음성 실패"); return r; });
  }
}
