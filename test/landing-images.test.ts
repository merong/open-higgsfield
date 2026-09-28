import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ImageBoard } from "../src/projects/landing-images";
import type { createPlatformClient } from "../src/generation/platform";
process.env.LOCAL_DATABASE_DIR = "memory://";
const { authenticate } = await import("../src/service/auth");
const { database } = await import("../src/service/db");
const { createProject, getProject, updateProject } = await import("../src/service/projects");
const { createDraft } = await import("../src/projects/outline");
const { imagePlan } = await import("../src/projects/landing-images");
const { parseProject } = await import("../src/projects/validation");
const { parseLandingPlan } = await import("../src/service/landing-workflow");
const { getImageBoard, generateBoardImages, stepBoardImages, applyBoardImages, resetBoardImages } = await import("../src/service/landing-images");
const { landingHtml } = await import("../src/render/landing");
const db = await database(), user = (await authenticate({ email: "imageboard@example.test", name: "Image QA", password: "testpass1234" }, true)).user;
const other = (await authenticate({ email: "imageboard-other@example.test", name: "Other", password: "testpass1234" }, true)).user;
await db.query("UPDATE users SET credits=100 WHERE id=$1", [user.id]);
const balance = async () => Number((await db.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [user.id]))[0].credits);
async function make() {
  const p = createDraft("landing", { topic: "작은 식물 클래스", audience: "초보자", tone: "calm", count: 5, mustInclude: "확정 문구" });
  p.slots.forEach((s, n) => { delete s.media; s.imagePlan = { enabled: n < 2, ratio: n === 0 ? "3:4" : "16:9", description: `장면 설명 ${n}` }; s.prompt = `A plant scene ${n}. No text, no logos.`; });
  return createProject(user.id, p);
}
function request(b: ImageBoard, ids = b.items.map(i => i.slotId)) { return { key: randomUUID(), revision: b.revision, credits: ids.length * 4, items: b.items.filter(i => ids.includes(i.slotId)).map(i => ({ slotId: i.slotId, model: i.model, prompt: i.prompt })) }; }
let submits = 0, complete = true;
const client = { submit: async () => ({ requestId: `landing-img-${++submits}`, status: "queued", statusUrl: "", cancelUrl: "" }), status: async (requestId: string) => ({ requestId, status: complete ? "completed" : "in_progress", ...(complete ? { images: [{ url: `https://example.test/${requestId}.png` }] } : {}) }) } as ReturnType<typeof createPlatformClient>;
const archive = async (_u: string, _p: string, url: string) => `/api/workspace/assets/${url.split("/").at(-1)!.replace(".png", "")}`;
const step = (b: ImageBoard, provider = client) => stepBoardImages(user.id, b.projectId, provider, archive);
await test("image plans survive validation and empty preview preserves ratios, alt, escaping and FAQ placement", async () => {
  const p = await make(); p.slots[1].kind = "faq"; p.slots[1].prompt = 'A <script>alert("x")</script> plant';
  assert.deepEqual(parseProject(p).slots[0].imagePlan, p.slots[0].imagePlan);
  const html = landingHtml(p, {}, "/fonts/test.woff2", true);
  assert.equal((html.match(/class="image-placeholder"/g) || []).length, 2);
  assert.match(html, /900 × 1200/); assert.match(html, /1600 × 900/); assert.match(html, /alt="A &lt;script&gt;/); assert(!html.includes('<script>'));
  assert(!landingHtml(p).includes('class="image-placeholder"'));
  assert.equal(imagePlan({ kind: "faq", title: "FAQ" }).enabled, false);
  assert.throws(() => parseProject({ ...p, slots: [{ ...p.slots[0], imagePlan: { enabled: true, ratio: "2:0", description: "bad" } }] }));
  const plan = parseLandingPlan(["hero", "faq", "cta"].map((kind, n) => ({ kind, title: "title", question: "question", message: "message", imagePlan: { enabled: n !== 1, ratio: "1:1", description: "chosen scene" } })));
  assert.equal(plan.filter(s => s.imagePlan!.enabled).length, 2);
});
await test("all-image request is durable, idempotent, owner checked and requires explicit apply", async () => {
  const p = await make(), original = JSON.parse(JSON.stringify(p.slots)), before = await balance(); let b = await getImageBoard(user.id, p.id);
  assert.equal(b.items.length, 2); await assert.rejects(getImageBoard(other.id, p.id));
  const input = request(b), startCalls = submits;
  b = await generateBoardImages(user.id, p.id, input); assert.equal((await generateBoardImages(user.id, p.id, input)).revision, b.revision);
  await Promise.all([step(b), step(b)]); b = await getImageBoard(user.id, p.id); b = await step(b);
  assert.equal(submits - startCalls, 2); assert.equal(before - await balance(), 8);
  assert.deepEqual((await getProject(user.id, p.id)).slots, original, "candidates never auto-apply");
  await assert.rejects(applyBoardImages(other.id, p.id, { revision: b.revision }));
  const { project, board } = await applyBoardImages(user.id, p.id, { revision: b.revision });
  assert.equal(project.slots.filter(s => s.media).length, 2); assert.deepEqual(project.slots.map(s => s.body), original.map((s: { body: string }) => s.body));
  assert(board.items.every(i => i.applied));
  assert((await db.query<{ review_required: boolean }>("SELECT review_required FROM generation_jobs WHERE project_id=$1", [p.id])).every(j => j.review_required));
  const input2 = request(board, [board.items[0].slotId]); input2.items[0].model = "soul-cinema"; input2.items[0].prompt = "A revised plant still life. No text.";
  b = await generateBoardImages(user.id, p.id, input2); b = await step(b);
  assert.equal(b.items[0].model, "soul-cinema"); assert.equal((await getProject(user.id, p.id)).slots[0].prompt, original[0].prompt);
  const applied = await applyBoardImages(user.id, p.id, { revision: b.revision });
  assert.equal(applied.project.slots[0].prompt, input2.items[0].prompt); assert.equal(applied.project.slots[1].media!.url, project.slots[1].media!.url);
});
await test("partial failure refunds, successes remain reviewable, retry charges only failed image", async () => {
  const p = await make(); let b = await getImageBoard(user.id, p.id), before = await balance();
  b = await generateBoardImages(user.id, p.id, request(b)); b = await step(b);
  b = await step(b, { ...client, status: async requestId => ({ requestId, status: "failed", error: "fixture failure" }) });
  assert.equal(b.items[1].state, "failed"); assert.equal(before - await balance(), 4);
  b = await generateBoardImages(user.id, p.id, request(b, [b.items[1].slotId])); b = await step(b);
  assert(b.items.every(i => i.state === "completed")); assert.equal(before - await balance(), 8);
});
await test("stale text and disabled/deleted placements cannot be overwritten by candidates", async () => {
  let p = await make(), b = await getImageBoard(user.id, p.id);
  b = await generateBoardImages(user.id, p.id, request(b)); b = await step(b); b = await step(b);
  p.slots[0].body = "사용자가 새로 확정한 문구"; p = await updateProject(user.id, p.id, p);
  await assert.rejects(applyBoardImages(user.id, p.id, { revision: b.revision }), /바뀌었/);
  assert.equal((await getProject(user.id, p.id)).slots[0].body, p.slots[0].body);
  b = await resetBoardImages(user.id, p.id, { revision: b.revision });
  assert.equal(b.items[0].state, "idle"); assert(!b.items[0].candidate);
});
await test("archive retry never re-submits or charges; pending requests resume", async () => {
  const p = await make(); let b = await getImageBoard(user.id, p.id), before = await balance();
  b = await generateBoardImages(user.id, p.id, request(b, [b.items[0].slotId]));
  const startCalls = submits; complete = false; b = await step(b); assert.equal(b.items[0].state, "pending"); complete = true;
  b = await stepBoardImages(user.id, p.id, client, async () => { throw new Error("archive unavailable"); });
  assert.equal(b.items[0].state, "pending"); b = await step(await getImageBoard(user.id, p.id));
  assert.equal(b.items[0].state, "completed"); assert.equal(submits - startCalls, 1); assert.equal(before - await balance(), 4);
});
await test("ambiguous provider submission blocks automatic retries and new generation", async () => {
  const p = await make(); let b = await getImageBoard(user.id, p.id), calls = 0;
  b = await generateBoardImages(user.id, p.id, request(b, [b.items[0].slotId]));
  const unknown = { ...client, submit: async () => { calls++; throw new Error("lost response"); } };
  b = await step(b, unknown); assert.equal(b.items[0].state, "unknown"); b = await step(b, unknown); assert.equal(calls, 1);
  await assert.rejects(generateBoardImages(user.id, p.id, request(b)), /이전 이미지/); await assert.rejects(resetBoardImages(user.id, p.id, { revision: b.revision }));
});
await test("insufficient credits, changed quote and video model submit no provider requests", async () => {
  const p = await make(), b = await getImageBoard(user.id, p.id), calls = submits;
  await assert.rejects(generateBoardImages(user.id, p.id, { ...request(b), credits: 0 }), /비용/);
  const bad = request(b); bad.items[0].model = "kling-2.6"; await assert.rejects(generateBoardImages(user.id, p.id, bad), /모델/);
  await db.query("UPDATE users SET credits=0 WHERE id=$1", [user.id]); await assert.rejects(generateBoardImages(user.id, p.id, request(b)), /크레딧/); assert.equal(submits, calls);
});
