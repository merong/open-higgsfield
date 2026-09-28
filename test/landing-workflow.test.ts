import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { LandingWorkflow } from "../src/projects/landing-workflow";
import type { LandingModel } from "../src/service/landing-model";
process.env.LOCAL_DATABASE_DIR = "memory://";
process.env.OPENAI_API_KEY = "sk-landing-test-not-real";
process.env.OPENAI_OUTLINE_MODEL = "gpt-5.6-terra";
process.env.OPENAI_REASONING_EFFORT = "low";
const { database } = await import("../src/service/db");
const { authenticate } = await import("../src/service/auth");
const { startLanding, getLanding, activeLanding, stepLanding, actLanding, parseLandingIntent, parseLandingPlan, applyLandingCopy } = await import("../src/service/landing-workflow");
const { landingModelRequest } = await import("../src/service/landing-model");
const { landingChecks } = await import("../src/projects/landing-workflow");
const { landingHtml } = await import("../src/render/landing");
const { getProject, archiveProject } = await import("../src/service/projects");
const db = await database();
const user = (await authenticate({ email: "landing@test.example", name: "Landing QA", password: "testpass1234" }, true)).user;
const other = (await authenticate({ email: "landing-other@test.example", name: "Other", password: "testpass1234" }, true)).user;
const balance = async () => Number((await db.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [user.id]))[0].credits);
const start = (data: Record<string, unknown> = {}) => startLanding(user.id, { idea: "온라인 판매를 시작하는 1인 사업자를 위한 제품 사진 촬영 서비스. 실제 가격과 후기는 제공하지 않았습니다.", key: randomUUID(), ...data });
const act = (r: LandingWorkflow, data: Record<string, unknown>) => actLanding(user.id, r.id, { revision: r.revision, responseId: randomUUID(), ...data });
const copyFor = (r: LandingWorkflow) => (r.stage === "patch" ? r.project.slots.filter(s => s.id === r.targetId) : r.plan).map(s => ({ id: s.id, title: r.stage === "patch" ? "선택한 문구만 수정" : s.title, body: s.kind === "faq" ? "상담은 어떻게 하나요?|아래 버튼으로 문의해 주세요." : "제품의 질감과 사용 장면을 사진으로 보여 주세요.", kicker: "PRODUCT PHOTOGRAPHY", prompt: "Product photography with natural light. No text, no logos." }));
const model: LandingModel = async r => r.stage === "understand" ? { summary: "메모에서 서비스 의도 파악", brand: "", audience: "온라인 판매를 시작하는 1인 사업자", problem: "제품의 매력을 사진으로 보여주고 싶음", value: "질감과 사용 장면을 담은 사진", goal: "상담 문의", ctaLabel: "상담 문의하기", traffic: "인스타그램", explicit: ["audience", "value"] } : r.stage === "plan" ? { summary: "방문자 질문의 순서", sections: ["hero", "features", "story", "faq", "cta"].map((kind, i) => ({ kind, title: `제품 사진 ${i + 1}`, question: "어떤 도움을 받을 수 있나요?", message: "상품의 질감과 사용 장면을 전합니다." })) } : r.stage === "review" ? { summary: "원고와 제공 자료를 대조했습니다. 실제 화면과 링크 작동은 직접 확인해 주세요.", issues: [] } : { summary: "확정 흐름으로 원고 작성", title: "제품을 보여주는 사진", sections: copyFor(r) };
const step = (r: LandingWorkflow, provider = model) => stepLanding(user.id, r.id, r.revision, provider);
const cancel = (r: LandingWorkflow) => act(r, { action: "cancel" });
async function planned() { let r = await step(await start()); r = await act(r, { action: "confirm_intent", intent: { ...r.intent, ctaHref: "mailto:hello@example.test", facts: "반드시 유지할 문구: 제품의 질감" } }); return step(r); }
async function ready() { let r = await planned(); r = await act(r, { action: "confirm_plan", plan: r.plan }); r = await step(r); return step(r); }

await test("landing workflow reserves once, fences approvals and performs no calls while waiting", async () => {
  const key = randomUUID(), before = await balance(); const [a, b] = await Promise.all([start({ key }), start({ key })]);
  assert.equal(a.id, b.id); assert.equal(await balance(), before - 1);
  await assert.rejects(getLanding(other.id, a.id), /찾을 수 없습니다/);
  let calls = 0; let r = await step(a, async run => { calls++; return model(run); });
  r = await step(r, async run => { calls++; return model(run); }); assert.equal(calls, 1); assert.equal(r.status, "waiting_user");
  await assert.rejects(actLanding(user.id, r.id, { action: "confirm_intent", intent: r.intent, responseId: randomUUID(), revision: 1 }), /상태가 변경/);
  await assert.rejects(act(r, { action: "confirm_plan", plan: [] }), /먼저 확인/);
  const responseId = randomUUID(), revision = r.revision;
  r = await actLanding(user.id, r.id, { action: "confirm_intent", intent: r.intent, responseId, revision });
  const duplicate = await actLanding(user.id, r.id, { action: "confirm_intent", intent: r.intent, responseId, revision }); assert.equal(r.revision, duplicate.revision);
  r = await cancel(r); assert.equal(await balance(), before); assert.equal(await activeLanding(user.id), null);
});
await test("landing user intent rejects script URLs; anchors must exist; no invented CTA or dummy media", async () => {
  const r = await planned();
  assert.throws(() => parseLandingIntent({ ...r.intent, ctaHref: "javascript:alert(1)" }), /주소/);
  assert.throws(() => parseLandingIntent({ ...r.intent, ctaHref: "#made-up" }), /주소/);
  const draft = structuredClone(r); draft.intent.ctaHref = "#section-8"; assert(landingChecks(draft).some(i => i.severity === "error"));
  assert(r.project.slots.every(s => !s.media && !s.href));
  await cancel(r);
});
await test("landing plan approval preserves editable order, disallows duplicate/foreign sections and script kinds", async () => {
  let r = await planned();
  assert.throws(() => parseLandingPlan([...r.plan, r.plan[1]], r.plan), /첫 히어로|섹션/);
  assert.throws(() => parseLandingPlan(r.plan.map((s, i) => i === 1 ? { ...s, kind: "testimonial" } : s), r.plan), /역할/);
  assert.throws(() => parseLandingPlan(r.plan.map((s, i) => i === 1 ? { ...s, id: "foreign" } : s), r.plan), /ID/);
  const order = [r.plan[0], r.plan[2], r.plan[1], r.plan[4]];
  r = await act(r, { action: "confirm_plan", plan: order }); r = await step(r);
  assert.deepEqual(r.project.slots.map(s => s.id), order.map(s => s.id)); assert.equal(r.status, "pending"); assert.equal(r.stage, "review");
  assert.equal(r.project.slots[0].href, r.intent.ctaHref); assert.equal(r.project.slots.at(-1)!.cta, r.intent.ctaLabel);
  const before = await balance(); await cancel(r); assert.equal(await balance(), before, "completed copy is not refunded");
});
await test("landing scoped revision protects all other sections, CTA and invalidates review", async () => {
  let r = await ready(); const previous = structuredClone(r.project.slots), targetId = previous[1].id;
  r = await act(r, { action: "revise", sectionId: targetId, feedback: "더 명확한 말로 수정" });
  const invalid = structuredClone(r); assert.throws(() => applyLandingCopy(invalid, copyFor(r).map(c => ({ ...c, id: previous[0].id })), true), /ID/);
  r = await step(r); assert.equal(r.review, undefined); assert.equal(r.project.slots[1].title, "선택한 문구만 수정");
  assert.deepEqual(JSON.parse(JSON.stringify(r.project.slots.filter(s => s.id !== targetId))), previous.filter(s => s.id !== targetId));
  r = await step(r); assert.equal(r.review!.version, r.contentVersion);
  const saved = await getProject(user.id, r.projectId); assert.deepEqual(saved.slots, r.project.slots);
  await cancel(r);
});
await test("landing handoff is explicit, durable and never updates a completed workflow", async () => {
  let r = await ready(); await assert.rejects(act(r, { action: "handoff" }), /확인/);
  r = await act(r, { action: "handoff", acknowledged: true }); assert.equal(r.status, "completed");
  assert.equal(await activeLanding(user.id), null); assert.equal((await getLanding(user.id, r.id)).status, "completed");
  await assert.rejects(act(r, { action: "revise", sectionId: r.project.slots[0].id, feedback: "다시 수정" }), /상태가 변경/);
  assert((await db.query("SELECT version FROM landing_workflow_versions WHERE run_id=$1", [r.id])).length >= 4);
  const html = landingHtml(r.project); assert.match(html, /mailto:hello@example.test/); assert.match(html, /width=device-width/); assert(!html.includes("script>"));
});
await test("landing cancelling an in-flight call refunds once and ignores late model result", async () => {
  const before = await balance(), initial = await start();
  let started!: () => void, finish!: (value: unknown) => void;
  const hasStarted = new Promise<void>(resolve => { started = resolve; });
  const result = new Promise<unknown>(resolve => { finish = resolve; });
  const running = step(initial, async () => { started(); return result; }); await hasStarted;
  const current = await getLanding(user.id, initial.id), cancelled = await cancel(current);
  finish(await model(initial)); const late = await running; assert.equal(late.status, "cancelled"); assert.equal(late.revision, cancelled.revision);
  assert.equal(await balance(), before);
  assert.equal((await db.query("SELECT id FROM credit_ledger WHERE job_id=$1 AND kind='refund'", [initial.id])).length, 1);
});
await test("landing errors and lease expiry pause without automatic retry or extra reservation", async () => {
  let r = await start(); const before = await balance();
  r = await step(r, async () => { throw new Error("provider failed"); }); assert.equal(r.status, "paused"); assert.equal(r.calls, 1);
  r = await step(r); assert.equal(r.calls, 1); assert.equal(await balance(), before);
  r = await act(r, { action: "retry" }); r = await step(r); assert.equal(r.status, "waiting_user");
  await db.query("UPDATE landing_workflows SET lease_token='old',lease_until=1 WHERE id=$1", [r.id]); r = await getLanding(user.id, r.id); assert.equal(r.status, "paused");
  await cancel(r);
});
await test("landing model budget pauses; project CAS conflict preserves another editor's changes", async () => {
  let r = await start(); r.calls = r.maxCalls;
  await db.query("UPDATE landing_workflows SET data=$1 WHERE id=$2", [JSON.stringify(r), r.id]); r = await step(r); assert.equal(r.status, "paused");
  await assert.rejects(act(r, { action: "retry" }), /재시도/); await cancel(r);
  r = await planned(); r = await act(r, { action: "confirm_plan", plan: r.plan });
  await db.query("UPDATE projects SET version=version+1 WHERE id=$1", [r.projectId]); const original = await getProject(user.id, r.projectId);
  r = await step(r); assert.equal(r.status, "paused"); assert.match(r.error!, /다른 창/); assert.equal(r.hasDraft, false);
  assert.deepEqual(await getProject(user.id, r.projectId), original); await cancel(r);
});
await test("landing request carries saved model/effort, bounded structured schema and only summaries", async () => {
  const r = await start(), request = landingModelRequest(r);
  assert.equal(request.model, "gpt-5.6-terra"); assert.deepEqual(request.reasoning, { effort: "low" }); assert.equal(request.store, false);
  assert.equal(request.text.format.strict, true); assert.match(request.instructions, /비공개 사고 과정 대신/); assert.match(request.instructions, /절대 지어내지/);
  assert(!("tools" in request)); await cancel(r);
});
await test("archiving an unfinished landing closes its workflow and releases its reservation", async () => {
  const before = await balance(), r = await start();
  await archiveProject(user.id, r.projectId);
  assert.equal(await balance(), before); assert.equal(await activeLanding(user.id), null);
  await assert.rejects(getLanding(user.id, r.id), /찾을 수 없습니다/);
  const [job] = await db.query<{ state: string }>("SELECT state FROM generation_jobs WHERE id=$1", [r.id]); assert.equal(job.state, "failed");
});
await test("landing feature output separates headings and details without losing or executing copy", async () => {
  const r = await ready(), slot = r.project.slots.find(s => s.kind === "features")!;
  slot.body = '질감을 보여주는 사진|제품의 <질감>을 보여 주세요.\n'+ '긴 문구도 그대로 보존합니다. '.repeat(10);
  const html = landingHtml(r.project);
  assert.match(html, /<h3>질감을 보여주는 사진<\/h3><p>제품의 &lt;질감&gt;을 보여 주세요.<\/p>/);
  assert(html.includes('<p>' + '긴 문구도 그대로 보존합니다. '.repeat(10) + '</p>'));
  await cancel(r);
});

await test("landing image confirmation updates active workflow and protects copy review and subsequent patch", async () => {
  const { getImageBoard, generateBoardImages, stepBoardImages, applyBoardImages } = await import("../src/service/landing-images");
  let r = await ready(); const original = structuredClone(r.project.slots), version = r.contentVersion, review = r.review!.summary;
  let b = await getImageBoard(user.id, r.projectId); const i = b.items[0];
  b = await generateBoardImages(user.id, r.projectId, { key: randomUUID(), revision: b.revision, credits: 4, items: [{ slotId: i.slotId, model: i.model, prompt: i.prompt }] });
  const client = { submit: async () => ({ requestId: randomUUID(), status: "queued", statusUrl: "", cancelUrl: "" }), status: async (requestId: string) => ({ requestId, status: "completed", images: [{ url: "https://example.test/plant.png" }] }) } as ReturnType<typeof import("../src/generation/platform").createPlatformClient>;
  b = await stepBoardImages(user.id, r.projectId, client, async () => "/api/workspace/assets/landing-fixture-image");
  assert.equal((await getLanding(user.id, r.id)).contentVersion, version);
  await applyBoardImages(user.id, r.projectId, { revision: b.revision }); r = await getLanding(user.id, r.id);
  assert.equal(r.contentVersion, version + 1); assert.equal(r.review!.summary, review); assert.equal(r.review!.version, r.contentVersion);
  assert.deepEqual(r.project.slots.map(s => s.body), original.map(s => s.body)); assert(r.project.slots[0].media);
  r = await act(r, { action: "revise", sectionId: r.project.slots[1].id, feedback: "조금 더 쉽게 설명" }); r = await step(r);
  assert(r.project.slots[0].media); assert.equal(r.status, "pending"); await cancel(r);
});

await test("text-only planned sections accept empty image prompts without blocking the draft", async () => {
  const r = await ready();
  const copy = r.plan.map(s => ({ id: s.id, title: s.title, body: s.kind === "faq" ? "질문|답변" : "확정 내용", kicker: "", prompt: s.imagePlan?.enabled ? "A plant in a window. No text." : "" }));
  applyLandingCopy(r, copy, false);
  assert.equal(r.project.slots.find(s => s.kind === "faq")!.prompt, "");
  assert(r.project.slots.filter(s => s.imagePlan?.enabled).every(s => !!s.prompt));
  await cancel(await getLanding(user.id, r.id));
});
