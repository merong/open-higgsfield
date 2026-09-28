import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, rm, access, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
Object.assign(process.env, { NODE_ENV: "test" });
process.env.WORKFLOW_TRACE_TEST = "1";
process.env.LOCAL_DATABASE_DIR = "memory://";
delete process.env.DATABASE_URL;
process.env.OPENAI_API_KEY = "sk-trace-test-only";
process.env.OPENAI_OUTLINE_MODEL = "gpt-5.6-terra";
const dir = await mkdtemp(path.join(tmpdir(), "ohf-trace-test-"));
process.env.WORKFLOW_TRACE_DIR = dir;
const { database } = await import("../src/service/db");
const { authenticate } = await import("../src/service/auth");
const { createDraft } = await import("../src/projects/outline");
const { createProject, archiveProject } = await import("../src/service/projects");
const { startLanding, stepLanding, actLanding } = await import("../src/service/landing-workflow");
const { queueTrace, flushProjectTrace, tracedResponsesFetch } = await import("../src/service/workflow-trace");
const { traceFile, withTraceStore, projectTraceAppend, projectTraceRead } = await import("../src/service/trace-store");
const { readProjectTrace, annotateProjectTrace } = await import("../src/service/trace-access");
const { sanitizeTrace, traceEnabled } = await import("../src/service/trace-policy");
await test("workflow trace foundation", async t => {
t.after(() => rm(dir, { recursive: true, force: true }));
const db = await database();
const user = (await authenticate({ email: "trace-owner@example.test", name: "Trace QA", password: "trace-test-only-123" }, true)).user;
const other = (await authenticate({ email: "trace-other@example.test", name: "Other", password: "trace-test-only-123" }, true)).user;
const project = await createProject(user.id, createDraft("landing", { topic: "기록 검증용", audience: "제작자", tone: "calm", count: 5, mustInclude: "검증" }));
const context = { projectId: project.id, runId: randomUUID(), turnId: randomUUID(), phase: "plan" };

await t.test("creation initializes real SQLite; committed queue drains, reopens, and enforces ownership", async () => {
  await access(traceFile(project.id));
  const first = await readProjectTrace(user.id, project.id);
  assert.equal(first.coverage, "new_project"); assert.equal(first.events.length, 1); assert.equal(first.pending, 0);
  assert.equal(first.events[0].kind, "project.created");
  assert.equal(projectTraceRead(project.id, user.id).events[0].id, first.events[0].id);
  await assert.rejects(readProjectTrace(other.id, project.id), /찾을 수 없습니다/);
  assert.throws(() => withTraceStore(project.id, other.id, () => {}), /찾을 수 없습니다/);
  assert.throws(() => traceFile("../../outside"), /ID/);
  withTraceStore(project.id, user.id, store => {
    assert.equal(store.prepare("PRAGMA foreign_keys").get()!.foreign_keys, 1);
    assert.equal(store.prepare("PRAGMA user_version").get()!.user_version, 2);
    assert.equal(store.prepare("PRAGMA integrity_check").get()!.integrity_check, "ok");
  });
});
await t.test("transaction rollback creates no false apply event; at-least-once replay has no duplicates", async () => {
  await assert.rejects(db.transaction(async tx => { await queueTrace(tx, context, "workflow.state", "rolled-back", { changed: true }, "rolled-back"); throw Error("rollback"); }), /rollback/);
  await queueTrace(db, context, "model.parsed", "before apply", { result: { summary: "검증 전 모델 결과" } }, "durable-response");
  const rows = await db.query<{ envelope: Parameters<typeof projectTraceAppend>[2][number] }>("SELECT envelope FROM project_trace_outbox WHERE project_id=$1", [project.id]);
  projectTraceAppend(project.id, user.id, rows.map(r => r.envelope)); // crash before ACK
  await Promise.all([flushProjectTrace(project.id, user.id), flushProjectTrace(project.id, user.id)]);
  const s = await readProjectTrace(user.id, project.id);
  assert.equal(s.events.filter(e => e.id === "durable-response").length, 1);
  assert(!s.events.some(e => e.id === "rolled-back"));
  assert.equal(s.pending, 0);
});
await t.test("projection outage preserves outbox and read retries it", async () => {
  await queueTrace(db, context, "diagnostic", "recoverable", { outcome: "unknown" }, "recoverable");
  const blocker = path.join(dir, "not-directory"); await writeFile(blocker, "blocked");
  process.env.WORKFLOW_TRACE_DIR = blocker;
  try { const r = await flushProjectTrace(project.id, user.id); assert.equal(r.relayError, true); assert.equal(r.pending, 1); }
  finally { process.env.WORKFLOW_TRACE_DIR = dir; }
  const recovered = await readProjectTrace(user.id, project.id);
  assert.equal(recovered.pending, 0); assert(recovered.events.some(e => e.id === "recoverable"));
});
await t.test("failed outbox statements do not abort business transactions or discard provider success", async () => {
  await db.query("ALTER TABLE project_trace_outbox RENAME TO trace_outbox_unavailable");
  try {
    await db.transaction(async tx => {
      await queueTrace(tx, context, "workflow.state", "uncommitted result", { changed: true }, "must-not-project-uncommitted");
      await tx.query("UPDATE users SET credits=credits WHERE id=$1", [user.id]);
    });
    const response = await tracedResponsesFetch(context, { model: "fixture" }, async () => Response.json({ status: "completed", output: [] }));
    assert.equal((await response.json()).status, "completed");
    const local = projectTraceRead(project.id, user.id);
    assert(local.captureGaps >= 1);
    assert(!local.events.some(e => e.id === "must-not-project-uncommitted"));
    assert(local.events.some(e => e.kind === "model.response" && e.data.traceDelivery === "sqlite_fallback"));
  } finally { await db.query("ALTER TABLE trace_outbox_unavailable RENAME TO project_trace_outbox"); }
});
await t.test("transport logs actual inputs, public summaries/tools and usage, without secrets or image bytes", async () => {
  const bytes = Buffer.from("transformed-image-bytes");
  const request = { model: "fixture-model", reasoning: { effort: "high" }, input: [{ role: "user", content: [{ type: "input_image", image_url: `data:image/jpeg;base64,${bytes.toString("base64")}` }, { type: "input_text", text: JSON.stringify({ api_key: "sk-super-secret-test", url: "https://example.test/photo?token=SECRET", message: "사진에 맞춰 제작" }) }] }] };
  const response = await tracedResponsesFetch(context, request, async () => Response.json({ id: "response-fixture", status: "completed", usage: { input_tokens: 20, output_tokens: 30 }, output: [{ type: "reasoning", encrypted_content: "HIDDEN-NEVER-STORE", content: "PRIVATE", summary: [{ type: "summary_text", text: "공개 가능한 요약" }] }, { type: "web_search_call", id: "tool-fixture", status: "completed" }, { type: "message", content: [{ type: "output_text", text: "완료" }] }] }, { headers: { "x-request-id": "request-fixture" } }));
  assert.equal((await response.json()).id, "response-fixture");
  const s = await readProjectTrace(user.id, project.id), serialized = JSON.stringify(s);
  for (const secret of ["HIDDEN-NEVER-STORE", "PRIVATE", "sk-super-secret-test", "token=SECRET", bytes.toString("base64")]) assert(!serialized.includes(secret), secret);
  assert(serialized.includes(createHash("sha256").update(bytes).digest("hex")));
  assert(s.events.some(e => e.kind === "tool.result"));
  const received = s.events.findLast(e => e.kind === "model.response")!;
  assert.equal(received.data.reasoningAvailability, "returned");
  assert.equal(received.data.requestId, "request-fixture");
  assert.deepEqual((received.data.payload as { usage: unknown }).usage, { input_tokens: 20, output_tokens: 30 });
  assert.equal(s.events.findLast(e => e.kind === "model.request")!.data.reasoningAvailability, "not_requested");
  assert.equal((sanitizeTrace({ authorization: "Bearer secret", encrypted_content: "secret" }) as Record<string, string>).encrypted_content, "[redacted]");
  const protectedText = JSON.stringify(sanitizeTrace({ headers: { "x-api-key": "fixture-header-secret", token: "fixture-token", client_secret: "fixture-client-secret" }, authText: "Key fixid:fixture-auth-secret", asset: "https://abc.public.blob.vercel-storage.com/private-photo.jpg", nul: "ok\u0000tail", big: JSON.stringify({ text: "x".repeat(200000) }) }));
  for (const secret of ["fixture-header-secret", "fixture-token", "fixture-client-secret", "fixture-auth-secret", "private-photo.jpg"]) assert(!protectedText.includes(secret));
  assert(protectedText.includes("asset-reference")); assert(protectedText.includes("json_text_limit"));
});
await t.test("invalid HTTP/JSON and lost response remain visible, without inventing failure or reasoning", async () => {
  await tracedResponsesFetch(context, { model: "fixture" }, async () => new Response("bad response", { status: 502 }));
  let received = (await readProjectTrace(user.id, project.id)).events.findLast(e => e.kind === "model.response")!;
  assert.equal((received.data.payload as { body: string }).body, "bad response");
  await tracedResponsesFetch(context, { model: "fixture" }, async () => Response.json(null));
  await tracedResponsesFetch(context, { model: "fixture" }, async () => Response.json({ output: [null, "invalid", { type: "message", content: [{ type: "output_text", text: "ok\u0000tail" }] }] }));
  received = (await readProjectTrace(user.id, project.id)).events.findLast(e => e.kind === "model.response")!;
  assert(JSON.stringify(received.data).includes("ok\\\\u0000tail"));
  await assert.rejects(tracedResponsesFetch(context, {}, async () => { throw new Error("network"); }), /network/);
  const s = await readProjectTrace(user.id, project.id);
  assert.equal(s.events.findLast(e => e.kind === "model.response")!.data.reasoningAvailability, "not_requested");
  assert.equal(s.events.findLast(e => e.kind === "model.error")!.data.outcome, "unknown");
});
await t.test("landing integration links real state commits, provider results and user feedback without treating actions as satisfaction", async () => {
  let run = await startLanding(user.id, { key: randomUUID(), idea: "사진 촬영 서비스 랜딩페이지를 제작해 주세요." });
  await access(traceFile(run.projectId));
  run = await stepLanding(user.id, run.id, run.revision, async () => ({ summary: "입력한 촬영 서비스 의도를 정리했습니다.", brand: "", audience: "판매자", problem: "상품 사진", value: "촬영 서비스", goal: "문의", ctaLabel: "문의", traffic: "", explicit: ["value"] }));
  const responseId = randomUUID();
  run = await actLanding(user.id, run.id, { action: "cancel", responseId, revision: run.revision });
  await actLanding(user.id, run.id, { action: "cancel", responseId, revision: run.revision });
  const s = await readProjectTrace(user.id, run.projectId);
  assert(s.events.some(e => e.kind === "model.parsed" && e.turnId === `${run.id}:1`));
  assert(s.events.some(e => e.kind === "workflow.state" && e.data.status === "waiting_user"));
  assert.equal(s.events.filter(e => e.kind === "user.action" && e.data.action === "cancel").length, 1);
  assert.equal(s.events.find(e => e.data.action === "cancel")!.data.satisfaction, "not_inferred");
  assert.equal(s.evaluations.length, 0);
});
await t.test("evaluations validate provenance, event ownership, supersession and idempotent save", async () => {
  const base = (await readProjectTrace(user.id, project.id)).events[0].id;
  const input = { kind: "evaluation", id: randomUUID(), eventId: base, source: "developer", dimension: "intent", score: 2, effect: "degraded", note: "의도가 충분히 반영되지 않았다는 개발자 가설" };
  await annotateProjectTrace(user.id, project.id, input);
  await annotateProjectTrace(user.id, project.id, input);
  assert.equal((await readProjectTrace(user.id, project.id)).evaluations.length, 1);
  await assert.rejects(annotateProjectTrace(user.id, project.id, { ...input, dimension: "visual", score: 5 }), e => (e as { status: number }).status === 409);
  await annotateProjectTrace(user.id, project.id, { ...input, id: randomUUID(), score: 3 });
  assert.equal((await readProjectTrace(user.id, project.id)).evaluations[0].score, 3);
  withTraceStore(project.id, user.id, store => assert.equal(store.prepare("SELECT count(*) n FROM evaluations").get()!.n, 2));
  await assert.rejects(annotateProjectTrace(user.id, project.id, { ...input, dimension: "satisfaction" }), /고객 의견/);
  await assert.rejects(annotateProjectTrace(user.id, project.id, { ...input, source: "customer_report", quote: "" }), /고객 원문/);
  await assert.rejects(annotateProjectTrace(user.id, project.id, { ...input, score: 6 }), /1~5/);
  await assert.rejects(annotateProjectTrace(user.id, project.id, { ...input, eventId: "other-project-event" }), /이 프로젝트/);
  await assert.rejects(annotateProjectTrace(other.id, project.id, input), /찾을 수 없습니다/);
});
await t.test("experiment requires comparable scored evidence, preserves decision history and has no policy side effects", async () => {
  const s = await readProjectTrace(user.id, project.id), base = s.events[0].id, candidate = s.events[1].id;
  const { id } = await annotateProjectTrace(user.id, project.id, { kind: "experiment", baselineId: base, candidateId: candidate, dimension: "intent", hypothesis: "의도 확인 문구를 개선하면 일치도가 높아진다", target: "동일 기준 1점 향상", controls: "동일 입력·평가자, 샘플 1건의 수동 검토" });
  const decision = { kind: "decision", experimentId: id, verdict: "adopt", note: "두 지점의 평가에 기반한 도입 제안" };
  await assert.rejects(annotateProjectTrace(user.id, project.id, decision), /양쪽/);
  await annotateProjectTrace(user.id, project.id, { kind: "evaluation", eventId: candidate, dimension: "intent", source: "customer_report", quote: "수정 결과가 요청과 더 가까워요 · 검증용 인용", score: 4, effect: "improved", note: "출처가 달라 직접 비교할 수 없음" });
  await assert.rejects(annotateProjectTrace(user.id, project.id, decision), /출처/);
  await annotateProjectTrace(user.id, project.id, { kind: "evaluation", eventId: candidate, dimension: "intent", source: "developer", score: 4, effect: "improved", note: "같은 개발자 기준으로 확인" });
  await annotateProjectTrace(user.id, project.id, decision);
  await annotateProjectTrace(user.id, project.id, decision);
  assert.equal((await readProjectTrace(user.id, project.id)).experiments[0].decisions.length, 1);
  await annotateProjectTrace(user.id, project.id, { ...decision, verdict: "inconclusive", note: "실제 고객 표본 추가 검증 필요" });
  const experiment = (await readProjectTrace(user.id, project.id)).experiments[0];
  assert.equal(experiment.decisions.length, 2); assert.equal(experiment.decisions[0].verdict, "inconclusive");
  const preserved = experiment.decisions.find(d => d.verdict === "adopt")!.evidence;
  assert(preserved.some(e => e.eventId === candidate && e.source === "developer" && e.score === 4));
  await annotateProjectTrace(user.id, project.id, decision);
  const reconsidered = (await readProjectTrace(user.id, project.id)).experiments[0];
  assert.equal(reconsidered.decisions.length, 3); assert.equal(reconsidered.decisions[0].verdict, "adopt");
  await annotateProjectTrace(user.id, project.id, { kind: "evaluation", eventId: candidate, dimension: "intent", source: "developer", score: 1, effect: "degraded", note: "추가 관찰로 평가 수정" });
  assert.deepEqual((await readProjectTrace(user.id, project.id)).experiments[0].decisions.find(d => d.verdict === "adopt")!.evidence, preserved);
});
await t.test("v1 migration adds decision evidence without losing events; repeat opens are safe", async () => {
  const legacyId = randomUUID();
  withTraceStore(legacyId, user.id, store => {
    store.exec("ALTER TABLE experiment_decisions DROP COLUMN evidence; PRAGMA user_version=1");
  });
  for (let i = 0; i < 2; i++) withTraceStore(legacyId, user.id, store => {
    assert.equal(store.prepare("PRAGMA user_version").get()!.user_version, 2);
    assert(store.prepare("PRAGMA table_info(experiment_decisions)").all().some(r => r.name === "evidence"));
    assert.deepEqual(store.prepare("PRAGMA foreign_key_check").all(), []);
    assert.throws(() => store.prepare("INSERT INTO events(id,run_id,phase,kind,label,at,data) VALUES ('bad','r','p','invalid','x',1,'{}')").run(), /CHECK/);
    assert.throws(() => store.prepare("INSERT INTO experiment_decisions VALUES ('bad','missing','adopt','note','author',1,'[]')").run(), /FOREIGN KEY/);
  });
});
await t.test("pagination retains evidence references, production disables reads/writes and deleted projects are inaccessible", async () => {
  for (let i = 0; i < 120; i++) await queueTrace(db, context, "diagnostic", `page ${i}`, { n: i });
  const s = await readProjectTrace(user.id, project.id);
  assert(s.nextBefore); assert(s.events.some(e => e.kind === "project.created")); // referenced evidence remains resolvable
  const older = await readProjectTrace(user.id, project.id, s.nextBefore!); assert.equal(older.nextBefore, null);
  Object.assign(process.env, { NODE_ENV: "production" });
  try { assert.equal(traceEnabled(), false); await assert.rejects(readProjectTrace(user.id, project.id), e => (e as { status: number }).status === 404); }
  finally { Object.assign(process.env, { NODE_ENV: "test" }); }
  process.env.DATABASE_URL = "postgres://fixture.invalid/shared";
  try {
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.equal(traceEnabled(), false);
    await assert.rejects(readProjectTrace(user.id, project.id), e => (e as { status: number }).status === 404);
    await queueTrace(db, context, "diagnostic", "must not collect with shared PG", {}, "shared-pg-disabled");
    assert.equal((await db.query("SELECT id FROM project_trace_outbox WHERE id='shared-pg-disabled'")).length, 0);
  } finally { delete process.env.DATABASE_URL; Object.assign(process.env, { NODE_ENV: "test" }); }
  await archiveProject(user.id, project.id);
  await assert.rejects(readProjectTrace(user.id, project.id), /찾을 수 없습니다/);
});

});
