import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { zipSync, unzipSync, strToU8 } from "fflate";
import type { ReelWorkflow } from "../src/projects/reel-workflow";
import type { ReelModel } from "../src/service/reel-model";
process.env.LOCAL_DATABASE_DIR = "memory://";
process.env.OPENAI_API_KEY = "sk-reels-test-not-real";
process.env.OPENAI_OUTLINE_MODEL = "gpt-5.6-terra";
process.env.OPENAI_REASONING_EFFORT = "low";
const { database } = await import("../src/service/db");
const { authenticate } = await import("../src/service/auth");
const { startReel, getReel, activeReel, stepReel, actReel, parseReelScenes, rebalanceReel, reelVersions } = await import("../src/service/reel-workflow");
const { reelModelRequest } = await import("../src/service/reel-model");
const { attachReelAsset, generateReelVisual, generateReelVoice, reelQuote, remoteMedia, mediaFormat, boundedReelCues } = await import("../src/service/reel-media");
const { realignReelVoice } = await import("../src/service/reel-alignment");
const { validateReelOverlays, renderReel, reviewReel, completeReel, requireReelCompletion } = await import("../src/service/reel-render");
const { reelIssues, reelTimeline, reelSubtitles, reelOverlayDescription } = await import("../src/projects/reel-workflow");
const { saveAsset } = await import("../src/service/assets");
const db = await database();
const user = (await authenticate({ email: "reel@test.example", name: "Reel QA", password: "testpass1234" }, true)).user;
const other = (await authenticate({ email: "reel-other@test.example", name: "Other", password: "testpass1234" }, true)).user;
await db.query("UPDATE users SET credits=500 WHERE id=$1", [user.id]);
const act = (r: ReelWorkflow, data: Record<string, unknown>) => actReel(user.id, r.id, { revision: r.revision, responseId: randomUUID(), ...data });
const start = (data: Record<string, unknown> = {}) => startReel(user.id, { key: randomUUID(), idea: "책상 위의 작은 초록, 가격과 구매 유도 없이 잔잔한 릴스", duration: 15, ...data });
const balance = async () => Number((await db.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [user.id]))[0].credits);
const model: ReelModel = async r => ({ value: r.stage === "understand" ? { summary: "입력 조건 해석 fixture", purpose: "branding", purposeExplicit: true, audience: "직장인", constraints: ["가격·구매 유도 제외"], needResearch: false } : r.stage === "review" ? { summary: "대본 검수 fixture", issues: [] } : { summary: "콘티 fixture", title: "책상 위의 초록", caption: "잠깐 초록을 바라봐요.", scenes: [1, 2, 3].map(i => ({ id: `scene-${i}`, role: i === 1 ? "훅" : "전개", title: `초록 ${i}`, screenText: "잠깐 바라봐요", narration: r.spec.narration ? "초록을 바라봐요." : "", prompt: "A small green plant on a desk. No text.", seconds: 5 })) } });
const step = (r: ReelWorkflow, provider = model) => stepReel(user.id, r.id, r.revision, provider);
async function ready(narration = false) { let r = await start({ narration }); r = await step(r); r = await step(r); r = await step(r); return act(r, { action: "answer", requestId: r.question!.id }); }
const cancel = (r: ReelWorkflow) => act(r, { action: "cancel" });

await test("reels start/answers are owned, revision fenced and idempotent; waiting invokes no model", async () => {
  const key = randomUUID(), before = await balance(); const [a, b] = await Promise.all([start({ key }), start({ key })]); assert.equal(a.id, b.id); assert.equal(await balance(), before - 1);
  let r = await step(a, async () => ({ value: { summary: "목적 질문", purpose: "branding", purposeExplicit: false, audience: "직장인", constraints: [], needResearch: false } })); assert.equal(r.question!.kind, "purpose");
  let calls = 0; await step(r, async () => { calls++; throw new Error(); }); assert.equal(calls, 0);
  const input = { action: "answer", requestId: r.question!.id, value: "educate", revision: r.revision, responseId: randomUUID() }; r = await actReel(user.id, r.id, input); assert.equal((await actReel(user.id, r.id, input)).revision, r.revision); await assert.rejects(() => actReel(user.id, r.id, { ...input, responseId: randomUUID() }), /변경/);
  await assert.rejects(() => getReel(other.id, r.id), /찾을 수/); await assert.rejects(() => reelVersions(other.id, r.id), /찾을 수/); await cancel(r); assert.equal(await balance(), before); assert.equal(await activeReel(user.id), null);
});
await test("reels plan protects copy and duration; scoped patch and subtitle style retain audio and unrelated scenes", async () => {
  let r = await ready(true); const before = structuredClone(r.scenes); assert.ok(r.scenes.every(s => s.copyLocked)); assert.equal(reelTimeline(r.scenes).at(-1)!.end, 450);
  const s = r.scenes[1]; await assert.rejects(() => act(r, { action: "edit_scene", sceneId: s.id, scene: { title: "잠긴 원고 변경" } }), /잠겨/);
  r.targetIds = [s.id]; const patched = parseReelScenes([{ id: s.id, role: s.role, title: "모델이 바꾼 문구", screenText: "바꿈", narration: "바꿈", prompt: s.prompt, seconds: 10 }], r, true); assert.equal(patched[1].title, s.title); assert.equal(patched[1].frames, 150); assert.deepEqual(patched[0], before[0]);
  await assert.rejects(() => act(r, { action: "edit_scene", sceneId: s.id, scene: { seconds: 7 } }), /잠겨/);
  r = await act(r, { action: "edit_scene", sceneId: s.id, scene: { subtitleStyle: "emphasis", copyLocked: true } }); assert.equal(r.scenes[1].subtitleStyle, "emphasis"); assert.deepEqual(r.scenes[0], before[0]); await cancel(r);
});
await test("reels cancel fences a late model result; content cannot be marked complete without reviewed files", async () => {
  let r = await start(), release!: () => void, entered!: () => void; const gate = new Promise<void>(yes => release = yes), started = new Promise<void>(yes => entered = yes);
  const pending = step(r, async value => { entered(); await gate; return model(value); }); await started; r = await cancel(await getReel(user.id, r.id)); release(); assert.equal((await pending).status, "cancelled"); assert.throws(() => requireReelCompletion(r, {}), /영상/);
});
await test("reels measured voice timing keeps confirmed words and asks before exceeding locked duration", async () => {
  let r = await ready(true); const copy = r.scenes.map(s => s.narration);
  r.scenes.forEach(s => { s.voice = { assetId: "fixture", voice: "coral", durationMs: 6100, transcript: s.narration, matches: true, cues: [{ id: "c", startMs: 0, endMs: 6100, text: s.narration }] }; });
  assert.ok(reelIssues(r).some(i => i.layer === "timing")); assert.throws(() => rebalanceReel(r, false), /잠긴/); rebalanceReel(r, true); assert.equal(r.spec.durationLocked, false); assert.deepEqual(r.scenes.map(s => s.narration), copy); assert.ok(r.scenes.every(s => s.frames >= 191)); assert.match(reelSubtitles(r), /00:00:00,000 --> 00:00:06,100/); await cancel(await getReel(user.id, r.id));
});
await test("reels video credit policy and sample gate prevent provider calls; remote URLs cannot target private hosts", async () => {
  let r = await ready(); let calls = 0; const client = { submit: async () => { calls++; return { requestId: "fixture" }; } } as never;
  const q = await reelQuote(user.id, r.id, r.scenes[0].id);
  await assert.rejects(() => generateReelVisual(user.id, r.id, { revision: r.revision, responseId: randomUUID(), sceneId: r.scenes[1].id, kind: "image", credits: q.image }, client), /샘플/);
  await db.query("UPDATE users SET credits=50 WHERE id=$1", [user.id]); r = await generateReelVisual(user.id, r.id, { revision: r.revision, responseId: randomUUID(), sceneId: r.scenes[0].id, kind: "video", credits: q.video }, client); assert.match(r.error!, /50/); assert.equal(calls, 0); assert.equal(await balance(), 50);
  for (const url of ["https://127.0.0.1/x", "https://cloudfront.net.evil.test/a", "http://d3u0tzju9qaucj.cloudfront.net/x"]) await assert.rejects(() => remoteMedia(url), /저장소/);
  assert.throws(() => mediaFormat(Buffer.from("#EXTM3U\nfile:///etc/passwd")), /원본/); await cancel(r); await db.query("UPDATE users SET credits=500 WHERE id=$1", [user.id]);
});
function wav(seconds = 1) { const b = Buffer.alloc(44 + seconds * 24000 * 2); b.write("RIFF"); b.writeUInt32LE(b.length - 8, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(24000, 24); b.writeUInt32LE(48000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(b.length - 44, 40); return b; }
await test("reels alignment retry reuses stored audio, charges once and subtitle edits keep voice", async () => {
  let r = await ready(true); const before = await balance(), input = { revision: r.revision, responseId: randomUUID(), sceneId: r.scenes[0].id, credits: 2 }; let calls = 0;
  r = await generateReelVoice(user.id, r.id, input, async () => { calls++; return { bytes: wav(), transcript: "", cues: [], alignmentError: "fixture transcription outage" }; }); const asset = r.scenes[0].voice!.assetId; assert.ok(reelIssues(r).some(i => i.layer === "subtitles")); await generateReelVoice(user.id, r.id, input, async () => { calls++; throw new Error(); }); assert.equal(calls, 1);
  r = await realignReelVoice(user.id, r.id, { revision: r.revision, sceneId: r.scenes[0].id }, async () => ({ transcript: r.scenes[0].narration, cues: [{ id: "c", startMs: 0, endMs: 900, text: r.scenes[0].narration }] })); assert.equal(r.scenes[0].voice!.assetId, asset); assert.equal(await balance(), before - 2);
  const voice = JSON.parse(JSON.stringify(r.scenes[0].voice)); r = await act(r, { action: "edit_scene", sceneId: r.scenes[0].id, scene: { copyLocked: true, subtitleStyle: "emphasis" } }); assert.deepEqual(r.scenes[0].voice, voice); r = await act(r, { action: "edit_scene", sceneId: r.scenes[0].id, scene: { copyLocked: false, narration: "새로 허용한 원고" } }); assert.equal(r.scenes[0].voice, undefined); await cancel(r);
});
function transparentPng() { const chunk = (name: string, data: Buffer) => { const payload = Buffer.concat([Buffer.from(name), data]); let crc = 0xffffffff; for (const b of payload) { crc ^= b; for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length); payload.copy(out, 4); out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4); return out; }; const header = Buffer.alloc(13); header.writeUInt32BE(1080); header.writeUInt32BE(1920, 4); header[8] = 8; header[9] = 6; return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.alloc((1080 * 4 + 1) * 1920))), chunk("IEND", Buffer.alloc(0))]); }
const png = transparentPng();
function archive(r: ReelWorkflow, kind: "sample" | "full") { const scenes = kind === "sample" ? r.scenes.slice(0, 1) : r.scenes; const overlays = scenes.map((s, i) => ({ sceneId: s.id, name: `scene-${i}-0.png`, startMs: 0, endMs: s.frames / 30 * 1000, text: `${s.title}\n${s.screenText}`, issues: [] })); return zipSync({ ...Object.fromEntries(overlays.map(o => [o.name, png])), "manifest.json": strToU8(JSON.stringify({ version: r.contentVersion, kind, font: "Pretendard Variable", scenes: scenes.map(reelOverlayDescription), overlays })) }); }
await test("reels actual FFmpeg sample/full encode, full decode and reviewed ZIP completion (fixture overlays)", { timeout: 240000 }, async () => {
  let r = await ready(); const a = await saveAsset(user.id, new File([await readFile("public/content/pool-editorial.jpg")], "fixture.jpg", { type: "image/jpeg" }), true);
  await assert.rejects(() => attachReelAsset(other.id, r.id, { revision: r.revision, sceneId: r.scenes[0].id, assetId: a.id }), /찾을 수/);
  for (const scene of r.scenes) r = await attachReelAsset(user.id, r.id, { revision: r.revision, sceneId: scene.id, assetId: a.id });
  assert.equal(validateReelOverlays(archive(r, "sample"), r, "sample").scenes.length, 1); const stale = structuredClone(r); stale.contentVersion++; assert.throws(() => validateReelOverlays(archive(r, "sample"), stale, "sample"), /버전/);
  const render = async (value: ReelWorkflow, kind: "sample" | "full") => { const a = await saveAsset(user.id, new File([archive(value, kind).buffer as ArrayBuffer], "fixture-overlays.zip", { type: "application/zip" }), true); return renderReel(user.id, value.id, { revision: value.revision, responseId: randomUUID(), kind, overlayAssetId: a.id }); };
  r = await render(r, "sample"); assert.ok(r.sample, r.error); assert.equal(r.sample.frames, 150); r = await act(r, { action: "approve_sample", watched: true }); r = await render(r, "full"); assert.ok(r.output, r.error); assert.equal(r.output.frames, 450); assert.equal(r.output.issues.filter(i => i.severity === "error").length, 0, JSON.stringify(r.output.issues));
  await assert.rejects(() => completeReel(user.id, r.id, { revision: r.revision, watched: true, mutedChecked: true }), /검수/);
  r = await reviewReel(user.id, r.id, { revision: r.revision }, async (_r, frames) => { assert.equal(frames.length, 3); assert.ok(frames.every(f => f.startsWith("data:image/jpeg;base64,"))); return { summary: "fixture visual review; not real text validation", issues: [] }; });
  assert.throws(() => requireReelCompletion(r, { watched: true }), /무음/); const blocked = structuredClone(r); blocked.quality!.issues.push({ sceneId: "scene-1", layer: "text", severity: "error", message: "fixture clipping" }); assert.throws(() => requireReelCompletion(blocked, { watched: true, mutedChecked: true }), /필수 오류/);
  r = await completeReel(user.id, r.id, { revision: r.revision, watched: true, mutedChecked: true }); assert.equal(r.status, "completed"); assert.ok(r.artifacts?.zipId);
  const { assetFile } = await import("../src/service/assets"); const delivery = await assetFile(user.id, r.artifacts!.zipId), files = unzipSync(delivery.data!);
  assert.deepEqual(Object.keys(files).sort(), ["caption.txt", "cover.png", "project.json", "review.json", "video.mp4"]);
  assert.equal(mediaFormat(files["video.mp4"]), "mov"); assert.equal(JSON.parse(new TextDecoder().decode(files["review.json"])).renderId, r.output!.id);
  assert.equal((await completeReel(user.id, r.id, {})).revision, r.revision); assert.equal(await activeReel(user.id), null);
  const { libraryList } = await import("../src/service/library"); assert.ok((await libraryList(user.id, { feature: "reels" })).items.some(a => a.kind === "video"));
});
await test("reels model requests retain configured model/effort and have explicit output/research contracts", async () => { const r = await start(); const request = reelModelRequest(r); assert.equal(request.model, "gpt-5.6-terra"); assert.deepEqual(request.reasoning, { effort: "low" }); assert.equal(request.store, false); r.stage = "research"; assert.equal(reelModelRequest(r).tool_choice, "required"); await cancel(await getReel(user.id, r.id)); });

await test("reels alignment bounds only the final ASR endpoint without losing words", () => {
  const cues = [{ id: "c", startMs: 0, endMs: 8000, text: "보호한 원고" }];
  assert.deepEqual(boundedReelCues(cues, 4950), [{ ...cues[0], endMs: 4950 }]);
  assert.deepEqual(boundedReelCues([{ ...cues[0], startMs: 5000 }], 4950), []);
  assert.deepEqual(boundedReelCues([...cues, { ...cues[0], id: "next", startMs: 2000 }], 4950), []);
});
await test("reels ambiguous voice requests never auto-retry; explicit scoped retry keeps the prior ledger", async () => {
  let r = await ready(true); const before = await balance(), key = randomUUID();
  r = await generateReelVoice(user.id, r.id, { revision: r.revision, responseId: key, sceneId: r.scenes[0].id, credits: 2 }, async () => { throw new Error("fixture transport interruption"); });
  const priorJob = r.task!.jobId; assert.equal(r.task!.state, "unknown"); assert.equal(await balance(), before - 2);
  const retry = { revision: r.revision, responseId: randomUUID(), sceneId: r.scenes[0].id, credits: 2 };
  await assert.rejects(() => generateReelVoice(user.id, r.id, retry), /불명확/);
  await assert.rejects(() => generateReelVoice(user.id, r.id, { ...retry, sceneId: r.scenes[1].id, acknowledgeUnknown: true }), /불명확/);
  r = await generateReelVoice(user.id, r.id, { ...retry, acknowledgeUnknown: true }, async s => ({ bytes: wav(), transcript: s.narration, cues: [{ id: "c", startMs: 0, endMs: 900, text: s.narration }] }));
  assert.equal(r.task!.state, "completed"); assert.equal(await balance(), before - 4);
  assert.equal((await db.query<{ state: string }>("SELECT state FROM generation_jobs WHERE id=$1", [priorJob]))[0].state, "unknown"); await cancel(r);
});
