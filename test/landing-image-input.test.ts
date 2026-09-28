import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { LandingWorkflow } from "../src/projects/landing-workflow";
import { landingRecommendedPrompt } from "../src/projects/landing-recommendation";
import { landingHtml } from "../src/render/landing";
process.env.LOCAL_DATABASE_DIR = "memory://";
process.env.OPENAI_API_KEY = "sk-test-not-real";
process.env.OPENAI_OUTLINE_MODEL = "gpt-5.6-terra";
const { authenticate } = await import("../src/service/auth");
const { database } = await import("../src/service/db");
const { uploadProductImage, productVisionImages } = await import("../src/service/product-images");
const { startLanding, stepLanding, actLanding, getLanding, parseLandingPlan } = await import("../src/service/landing-workflow");
const { landingModel, landingModelRequest } = await import("../src/service/landing-model");
const { recommendLanding, parseLandingRecommendation, landingRecommendationRequest, landingRecommendationModel } = await import("../src/service/landing-recommendation");
const { getImageBoard } = await import("../src/service/landing-images");
const { libraryList } = await import("../src/service/library");
const db = await database();
const user = (await authenticate({ email: "landing-photo@test.example", name: "Landing QA", password: "testpass1234" }, true)).user;
const other = (await authenticate({ email: "landing-other@test.example", name: "Other", password: "testpass1234" }, true)).user;
const bytes = await sharp({ create: { width: 120, height: 80, channels: 3, background: "green" } }).png().toBuffer();
const file = (name: string) => new File([new Uint8Array(bytes)], name, { type: "image/png" });
const first = await uploadProductImage(user.id, file("space.png")), second = await uploadProductImage(user.id, file("details.png")), foreign = await uploadProductImage(other.id, file("private.png"));
const balance = async () => (await db.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [user.id]))[0].credits;
const act = (r: LandingWorkflow, data: Record<string, unknown>) => actLanding(user.id, r.id, { revision: r.revision, responseId: randomUUID(), ...data });
const suggestion = { idea: "이미지의 초록 공간을 소개하는 차분한 페이지. 위치·가격은 만들지 마세요.", sections: [{ sourceImageId: first.id, title: "공간의 첫인상", purpose: "전체 분위기 전달" }, { sourceImageId: second.id, title: "가까이에서 보기", purpose: "시각적 디테일 소개" }], observations: ["초록색 공간"], uncertainties: ["실제 장소와 운영 정보 확인"] };
let run: LandingWorkflow;

await test("landing recommendation uses owned decoded images and current intent without charging", async () => {
  const before = await balance();
  const result = await recommendLanding(user.id, { referenceImageIds: [first.id, second.id], idea: "가격과 위치 추정 금지" }, async (images, context) => {
    assert.equal(images.length, 2); assert.equal(context.idea, "가격과 위치 추정 금지");
    assert(images.every(image => image.imageUrl.startsWith("data:image/jpeg;base64,")));
    return suggestion;
  });
  assert.deepEqual(result, suggestion); assert.equal(await balance(), before);
  const prompt = landingRecommendedPrompt(result, [second, first]);
  assert.match(prompt, /사진 2 · 공간의 첫인상/); assert(prompt.length < 3000);
  await assert.rejects(recommendLanding(other.id, { referenceImageIds: [first.id] }, async () => { throw new Error("provider must not run"); }), /찾을 수 없습니다/);
  await assert.rejects(recommendLanding(user.id, { referenceImageIds: [] }), /한 장/);
});

await test("recommendation rejects foreign, duplicate, missing, oversized and incomplete output", async () => {
  const ids = [first.id, second.id];
  for (const result of [
    { ...suggestion, sections: [suggestion.sections[0]] },
    { ...suggestion, sections: [suggestion.sections[0], suggestion.sections[0]] },
    { ...suggestion, sections: [suggestion.sections[0], { ...suggestion.sections[1], sourceImageId: foreign.id }] },
    { ...suggestion, idea: "가".repeat(1201) },
    { ...suggestion, observations: Array(6).fill("내용") },
  ]) assert.throws(() => parseLandingRecommendation(result, ids), /연결/);
  const images = [{ id: first.id, imageUrl: "data:image/jpeg;base64,AAA=" }], context = { idea: "입력 보존" };
  const request = landingRecommendationRequest("gpt-5.6-terra", "low", images, context);
  assert.equal(request.model, "gpt-5.6-terra"); assert.deepEqual(request.reasoning, { effort: "low" });
  assert.equal(request.store, false); assert.equal(request.text.format.strict, true);
  assert.match(JSON.stringify(request.input), /data:image\/jpeg;base64,/);
  await assert.rejects(landingRecommendationModel(images, context, async () => Response.json({ status: "incomplete", output: [] })), /완성/);
  await assert.rejects(landingRecommendationModel(images, context, async () => new Response(null, { status: 401 })), /HTTP 401/);
  await assert.rejects(landingRecommendationModel(images, context, async () => { throw new Error("network"); }), /현재 메모와 사진은 유지/);
});

await test("landing photo references are validated before reserving a credit; photo-only start persists order", async () => {
  const before = await balance();
  for (const ids of [[foreign.id], [first.id, first.id], ["https://example.com/x.jpg"], Array.from({ length: 7 }, () => randomUUID())]) {
    await assert.rejects(startLanding(user.id, { key: randomUUID(), format: "landing", referenceImageIds: ids }));
  }
  await assert.rejects(startLanding(user.id, { key: randomUUID(), idea: "", format: "landing" }), /소개/);
  assert.equal(await balance(), before);
  const key = randomUUID();
  run = await startLanding(user.id, { key, format: "landing", referenceImageIds: [second.id, first.id] });
  assert.match(run.idea, /업로드한 이미지/); assert.deepEqual(run.referenceImages, [second, first]);
  assert.equal(await balance(), before - 1);
  assert.equal((await startLanding(user.id, { key, format: "landing", referenceImageIds: [foreign.id] })).id, run.id);
  assert.equal(await balance(), before - 1); assert(run.events.some(e => e.title === "참고 이미지를 함께 읽어요"));
});

const understanding = { summary: "초록 공간을 관찰했고 차분한 소개 페이지를 제안합니다.", brand: "", audience: "초록 공간에 관심 있는 방문자", problem: "공간 분위기를 알고 싶음", value: "사진으로 분위기 살펴보기", goal: "브랜드·서비스 소개", ctaLabel: "더 알아보기", traffic: "", explicit: [] };
await test("landing model sends actual images at every stage and limits section roles to landing", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => {
      const sent = JSON.parse(String(init?.body));
      assert.equal(sent.input[0].content.filter((item: { type: string }) => item.type === "input_image").length, 2);
      assert.match(JSON.stringify(sent.input), /data:image\/jpeg;base64,/);
      assert.match(sent.instructions, /참고 이미지/);
      return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(understanding) }] }] });
    };
    for (const stage of ["understand", "plan", "write", "review", "patch"] as const) assert.deepEqual(await landingModel({ ...run, stage }, user.id), understanding);
  } finally { globalThis.fetch = originalFetch; }
  assert.equal((await productVisionImages(user.id, run.referenceImages!)).length, 2);
  const request = landingModelRequest({ ...run, stage: "plan" });
  assert.equal(JSON.parse(request.input).referenceImages[0].isPrimary, true);
  const sectionSchema = request.text.format.schema.properties.sections as { items: { properties: Record<string, { enum?: string[] }> } };
  assert.deepEqual(sectionSchema.items.properties.kind.enum, ["hero", "features", "story", "faq", "cta"]);
  assert(sectionSchema.items.properties.sourceImageId);
  run = await stepLanding(user.id, run.id, run.revision, async () => understanding);
  run = await act(run, { action: "confirm_intent", intent: run.intent });
});

await test("landing plan selects primary, validates sources and allows replacing or omitting an image", async () => {
  run = await stepLanding(user.id, run.id, run.revision, async () => ({ summary: "참고 이미지 2장을 배치", sections: ["hero", "story", "cta"].map(kind => ({ kind, sourceImageId: kind === "story" ? first.id : "", title: "공간의 분위기", question: "무엇을 볼 수 있나요?", message: "원본으로 소개합니다", imagePlan: { enabled: kind !== "cta", ratio: "16:9", description: "초록 공간 사진" } })) }));
  assert.equal(run.plan[0].sourceImageId, second.id); assert.equal(run.plan[1].sourceImageId, first.id);
  assert.throws(() => parseLandingPlan(run.plan.map((s, i) => i === 1 ? { ...s, sourceImageId: foreign.id } : s), run.plan, "landing", run.referenceImages), /참고 이미지/);
  const changed = parseLandingPlan(run.plan.map((s, i) => i === 0 ? { ...s, sourceImageId: first.id } : s), run.plan, "landing", run.referenceImages);
  assert.equal(changed[0].sourceImageId, first.id);
  assert.equal(parseLandingPlan(run.plan.map((s, i) => i === 0 ? { ...s, sourceImageId: "" } : s), run.plan, "landing", run.referenceImages)[0].sourceImageId, "");
  assert.equal(parseLandingPlan(run.plan.map((s, i) => i === 1 ? { ...s, imagePlan: { ...s.imagePlan!, enabled: false } } : s), run.plan, "landing", run.referenceImages)[1].sourceImageId, "");
  run = await act(run, { action: "confirm_plan", plan: run.plan });
});

await test("approved photos reach draft, image board, library and HTML; copy edits and reload keep them", async () => {
  const copy = async (r: LandingWorkflow) => ({ title: "초록 공간의 페이지", summary: "승인한 사진을 적용했습니다", sections: (r.stage === "patch" ? r.project.slots.filter(s => s.id === r.targetId) : r.plan).map(s => ({ id: s.id, title: "사진 속 여유", body: "공간의 모습을 천천히 살펴보세요.", kicker: "GREEN", prompt: "" })) });
  run = await stepLanding(user.id, run.id, run.revision, copy);
  run = await stepLanding(user.id, run.id, run.revision, async () => ({ summary: "원고를 검수했습니다", issues: [] }));
  assert.equal(run.status, "ready"); assert.equal(run.project.slots[0].media?.url, second.url); assert.equal(run.project.slots[1].media?.url, first.url);
  const board = await getImageBoard(user.id, run.projectId);
  assert.equal(board.items.length, 2); assert(board.items.every(i => i.applied && i.candidate));
  run = await getLanding(user.id, run.id); assert.deepEqual(run.referenceImages, [second, first]);
  run = await act(run, { action: "revise", sectionId: run.project.slots[0].id, feedback: "문구만 수정해 주세요." });
  run = await stepLanding(user.id, run.id, run.revision, copy);
  run = await stepLanding(user.id, run.id, run.revision, async () => ({ summary: "수정 검수", issues: [] }));
  assert.equal(run.project.slots[0].media?.url, second.url);
  run = await act(run, { action: "handoff", acknowledged: true });
  const html = landingHtml(run.project); assert(html.includes(first.url)); assert(html.includes(second.url));
  assert.equal((await libraryList(user.id, { feature: "landing" })).total, 2);
  assert.equal(await balance(), 49);
});
