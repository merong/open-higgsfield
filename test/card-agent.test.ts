import test from "node:test";
import assert from "node:assert/strict";
process.env.LOCAL_DATABASE_DIR = "memory://";
process.env.OPENAI_API_KEY = "sk-agent-fixture-not-real";
process.env.OPENAI_OUTLINE_MODEL = "gpt-5.6-terra";
process.env.OPENAI_REASONING_EFFORT = "low";
const { startCardAgent, stepCardAgent, actCardAgent, getCardAgent, activeCardAgent } = await import("../src/service/card-agent");
const { agentRequest, openAiAgentTurn } = await import("../src/service/card-agent-provider");
const { database } = await import("../src/service/db");
const { authenticate } = await import("../src/service/auth");
const { getProject } = await import("../src/service/projects");
import type { CardAgentRun } from "../src/projects/card-agent";
const db = await database();
const user = (await authenticate({ email: "agent@example.test", name: "Editor", password: "test-pass-1234" }, true)).user;
const other = (await authenticate({ email: "other-agent@example.test", name: "Other", password: "test-pass-1234" }, true)).user;
const idea = "표지: AI를 처음 쓰는 당신에게\n2장: 작은 업무 한 가지부터 시작하세요.";
let sequence = 0;
const start = () => startCardAgent(user.id, { idea, key: `agent-test-${++sequence}` });
const balance = async () => (await db.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [user.id]))[0].credits;
const plan = { intent: "초보자의 AI 활용을 돕습니다.", audience: "AI 초보자", goal: "작은 실천", assumptions: ["처음 사용하는 독자로 가정"], question: "주로 어떤 업무를 하나요?", directions: ["실천형", "비교형", "질문형"].map(title => ({ title, approach: `${title}으로 쉬운 사례를 소개합니다.`, hook: "AI를 처음 쓰는 당신에게" })) };
const review = { summary: "사용자의 문구와 흐름을 확인했습니다.", strengths: ["2장 원문 유지"], changes: ["3장에 구체적인 예시 추가"], warnings: ["외부 사실 검증은 하지 않았습니다."] };
function outline(run: CardAgentRun) {
  return { title: "AI 첫걸음", caption: "작은 일부터 시작해 보세요. #AI", slots: run.draft.slots.map((_, i) => ({ kind: i === 0 ? "cover" : i === run.draft.slots.length - 1 ? "cta" : "body", title: i === 0 ? "AI를 처음 쓰는 당신에게" : `작은 실천 ${i}`, body: i === 1 ? "작은 업무 한 가지부터 시작하세요." : run.revisionFeedback || "메일 초안으로 연습해 보세요.", kicker: "AI NOTES", prompt: "A calm desk with a notebook. Soft light. No text, no logos.", cta: i === 4 ? "저장하고 실천하기" : "" })) };
}
const provider = async (run: CardAgentRun) => run.stage === "brainstorm" ? plan : run.stage === "write" ? outline(run) : run.stage === "review" ? review : { outline: outline(run), improvements: ["3장에 메일 작성 예시를 반영했습니다."], warnings: [] };
async function ready(run: CardAgentRun) {
  run = await stepCardAgent(user.id, run.id, run.revision, provider);
  run = await actCardAgent(user.id, run.id, { action: "direction", revision: run.revision, direction: 1, feedback: "직장인 사례로 써 주세요." });
  for (let i = 0; i < 3; i++) run = await stepCardAgent(user.id, run.id, run.revision, provider);
  assert.equal(run.status, "ready"); return run;
}

await test("four actual turns carry the original brief, chosen direction and artifacts; save is idempotent", async () => {
  const before = await balance();
  let run = await start();
  assert.equal(run.model, "gpt-5.6-terra"); assert.equal(run.effort, "low");
  assert.equal((await activeCardAgent(user.id))?.id, run.id);
  run = await ready(run); assert.equal(run.turns, 4); assert.equal(await balance(), before - 1);
  const request = agentRequest(run), context = JSON.parse(request.input);
  assert.equal(context.brief.mustInclude, idea); assert.equal(context.selectedDirection.title, "비교형");
  assert.equal(context.userFeedback, "직장인 사례로 써 주세요."); assert.equal(context.review.summary, review.summary);
  assert.equal(request.store, false); assert.equal(request.text.format.strict, true);
  assert.equal(run.preview?.slots[1].body, "작은 업무 한 가지부터 시작하세요.");
  const saved = await actCardAgent(user.id, run.id, { action: "save", revision: run.revision });
  assert.equal(saved.status, "completed");
  assert.equal((await actCardAgent(user.id, run.id, { action: "save", revision: run.revision })).projectId, saved.projectId);
  assert.equal((await getProject(user.id, saved.projectId!)).slots.length, 5);
  assert.equal(await activeCardAgent(user.id), null);
  const ledger = await db.query<{ kind: string }>("SELECT kind FROM credit_ledger WHERE job_id=$1", [run.id]);
  assert.deepEqual(ledger.map(l => l.kind).sort(), ["confirm", "hold"]);
});
await test("one user revision runs review and refinement again without another credit", async () => {
  const before = await balance(); let run = await ready(await start());
  run = await actCardAgent(user.id, run.id, { action: "revise", revision: run.revision, feedback: "3장은 회의록 예시로 바꿔 주세요." });
  assert.equal(run.stage, "review"); assert.equal(JSON.parse(agentRequest(run).input).revisionFeedback, run.revisionFeedback);
  for (let i = 0; i < 2; i++) run = await stepCardAgent(user.id, run.id, run.revision, provider);
  assert.equal(run.status, "ready"); assert.equal(run.turns, 6); assert.match(run.preview!.slots[2].body, /회의록/);
  await assert.rejects(() => actCardAgent(user.id, run.id, { action: "revise", revision: run.revision, feedback: "한 번 더" }), /1회/);
  assert.equal(await balance(), before - 1);
  await actCardAgent(user.id, run.id, { action: "save", revision: run.revision });
});
await test("duplicate starts and concurrent/stale steps cannot call the provider or debit twice", async () => {
  const before = await balance(); const payload = { idea, key: "agent-duplicate-start" };
  const [run, same] = await Promise.all([startCardAgent(user.id, payload), startCardAgent(user.id, payload)]);
  assert.equal(run.id, same.id); assert.equal(await balance(), before - 1);
  await assert.rejects(() => start(), /진행 중/);
  let release!: () => void, entered!: () => void, calls = 0;
  const gate = new Promise<void>(r => { release = r; }), started = new Promise<void>(r => { entered = r; });
  const first = stepCardAgent(user.id, run.id, run.revision, async () => { calls++; entered(); await gate; return plan; });
  await started;
  assert.equal((await stepCardAgent(user.id, run.id, run.revision, provider)).status, "running");
  release(); const next = await first; assert.equal(calls, 1);
  assert.equal((await stepCardAgent(user.id, run.id, run.revision, async () => { throw new Error("must not call"); })).revision, next.revision);
  await actCardAgent(user.id, run.id, { action: "cancel" }); assert.equal(await balance(), before);
});
await test("all read/write paths enforce ownership and invalid transitions cannot modify a run", async () => {
  const run = await start();
  for (const operation of [() => getCardAgent(other.id, run.id), () => stepCardAgent(other.id, run.id, run.revision, provider), () => actCardAgent(other.id, run.id, { action: "cancel" })]) await assert.rejects(operation, /찾을 수/);
  await assert.rejects(() => actCardAgent(user.id, run.id, { action: "save", revision: run.revision }), /완성된/);
  await assert.rejects(() => actCardAgent(user.id, run.id, { action: "direction", revision: run.revision, direction: 0 }), /방향/);
  const next = await stepCardAgent(user.id, run.id, run.revision, provider);
  await assert.rejects(() => actCardAgent(user.id, run.id, { action: "direction", revision: run.revision, direction: 0 }), /변경/);
  for (const direction of [-1, 3, 1.5, "1"]) await assert.rejects(() => actCardAgent(user.id, run.id, { action: "direction", revision: next.revision, direction }), /방향/);
  await actCardAgent(user.id, run.id, { action: "cancel" });
});
await test("cancel fences an in-flight response, refunds once and never saves a partial project", async () => {
  const before = await balance(), run = await start();
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(r => { release = r; }), started = new Promise<void>(r => { entered = r; });
  const request = stepCardAgent(user.id, run.id, run.revision, async () => { entered(); await gate; return plan; });
  await started; await actCardAgent(user.id, run.id, { action: "cancel" }); release();
  assert.equal((await request).status, "cancelled");
  await actCardAgent(user.id, run.id, { action: "cancel" });
  assert.equal(await balance(), before);
  assert.equal((await db.query("SELECT id FROM credit_ledger WHERE job_id=$1 AND kind='refund'", [run.id])).length, 1);
});
await test("malformed or failed provider output refunds once, returns safe errors, preserves no raw reasoning", async () => {
  const before = await balance();
  for (const bad of [null, { ...plan, directions: [] }, { ...plan, intent: "x".repeat(501) }]) {
    const run = await start(); const result = await stepCardAgent(user.id, run.id, run.revision, async () => bad);
    assert.equal(result.status, "failed"); assert.match(result.error!, /환불/);
    await stepCardAgent(user.id, run.id, run.revision, provider);
  }
  const run = await start(); const failed = await stepCardAgent(user.id, run.id, run.revision, async () => { throw new Error("sk-secret-do-not-leak"); });
  assert.ok(!JSON.stringify(failed).includes("sk-secret")); assert.equal(await balance(), before);
});
await test("expired leases fail safely, refund once and late completion cannot resurrect them", async () => {
  const before = await balance(), run = await start();
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(r => { release = r; }), started = new Promise<void>(r => { entered = r; });
  const pending = stepCardAgent(user.id, run.id, run.revision, async () => { entered(); await gate; return plan; });
  await started;
  await db.query("UPDATE card_agent_runs SET lease_until=$1 WHERE id=$2", [Date.now() - 1000, run.id]);
  assert.equal((await getCardAgent(user.id, run.id)).status, "failed");
  release(); assert.equal((await pending).status, "failed");
  assert.equal(await balance(), before);
});
await test("Responses calls use the selected model/effort, validated context and message output only", async () => {
  const run = await start();
  const result = await openAiAgentTurn(run, async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses"); assert.equal(init?.redirect, "error");
    const request = JSON.parse(String(init?.body));
    assert.equal(request.model, "gpt-5.6-terra"); assert.deepEqual(request.reasoning, { effort: "low" });
    assert.equal(request.store, false); assert.match(request.instructions, /숨겨진 사고 과정/);
    return Response.json({ status: "completed", output: [{ type: "reasoning", content: [{ type: "output_text", text: "hidden" }] }, { type: "message", content: [{ type: "output_text", text: JSON.stringify(plan) }] }] });
  });
  assert.deepEqual(result, plan);
  for (const fixture of [new Response("secret", { status: 429 }), Response.json({ status: "incomplete" }), Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] })]) await assert.rejects(() => openAiAgentTurn(run, async () => fixture), e => e instanceof Error && !e.message.includes("secret"));
  await actCardAgent(user.id, run.id, { action: "cancel" });
});
await test("invalid writing, review and refinement artifacts never reach the project table", async () => {
  const before = await balance();
  for (const stage of ["write", "review", "refine"] as const) {
    let run = await start();
    run = await stepCardAgent(user.id, run.id, run.revision, provider);
    run = await actCardAgent(user.id, run.id, { action: "direction", revision: run.revision, direction: 0 });
    while (run.stage !== stage) run = await stepCardAgent(user.id, run.id, run.revision, provider);
    const failed = await stepCardAgent(user.id, run.id, run.revision, async () => stage === "review" ? { ...review, changes: [null] } : stage === "write" ? { ...outline(run), slots: [] } : { outline: { ...outline(run), slots: outline(run).slots.map(s => ({ ...s, prompt: "" })) }, improvements: [], warnings: [] });
    assert.equal(failed.status, "failed"); assert.equal(failed.projectId, undefined);
    assert.equal((await db.query("SELECT id FROM projects WHERE id=(SELECT project_id FROM generation_jobs WHERE id=$1)", [run.id])).length, 0);
  }
  assert.equal(await balance(), before);
});
await test("idle work is recoverable then expires with one refund; insufficient credit and missing configuration never reserve", async () => {
  const before = await balance(), run = await start();
  await db.query("UPDATE card_agent_runs SET data=jsonb_set(data,'{updatedAt}',to_jsonb($1::bigint)) WHERE id=$2", [Date.now() - 8 * 86400000, run.id]);
  assert.equal((await activeCardAgent(user.id))?.status, "failed");
  assert.equal(await activeCardAgent(user.id), null); assert.equal(await balance(), before);
  await db.query("UPDATE users SET credits=0 WHERE id=$1", [user.id]);
  await assert.rejects(() => start(), /크레딧/);
  await db.query("UPDATE users SET credits=$1 WHERE id=$2", [before, user.id]);
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(() => start(), /API 키/);
  assert.equal(await balance(), before);
  process.env.OPENAI_API_KEY = "sk-agent-fixture-not-real";
});
