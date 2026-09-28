import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PRODUCT_IMAGE_BYTES, PRODUCT_EXAMPLES } from "../src/projects/product-detail";
import { type LandingWorkflow, landingChecks } from "../src/projects/landing-workflow";
import { landingHtml } from "../src/render/landing";
process.env.LOCAL_DATABASE_DIR = "memory://";
process.env.OPENAI_API_KEY = "sk-test-not-real";
process.env.OPENAI_OUTLINE_MODEL = "gpt-5.6-terra";
const { readProductUpload, uploadProductImage, resolveProductImages, productVisionImages } = await import("../src/service/product-images");
const { landingModel, landingVisionInput, landingModelRequest } = await import("../src/service/landing-model");
const { startLanding, stepLanding, actLanding, getLanding, parseLandingPlan } = await import("../src/service/landing-workflow");
const { authenticate } = await import("../src/service/auth");
const { database } = await import("../src/service/db");
const { assetFile, assetList, saveAsset } = await import("../src/service/assets");
const { getImageBoard } = await import("../src/service/landing-images");
const { getProject } = await import("../src/service/projects");
const { libraryList } = await import("../src/service/library");
const db = await database();
const user = (await authenticate({ email: "product-photos@test.example", name: "Photo QA", password: "testpass1234" }, true)).user;
const other = (await authenticate({ email: "product-photos-other@test.example", name: "Other", password: "testpass1234" }, true)).user;
const product = PRODUCT_EXAMPLES[0].product;
const png = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#d1fe17" } }).png().toBuffer();
const makeFile = (bytes: Uint8Array = png, type = "image/png", name = "product.png") => new File([new Uint8Array(bytes)], name, { type });
const first = await uploadProductImage(user.id, makeFile());
const second = await uploadProductImage(user.id, makeFile(png, "image/png", "detail.png"));
const foreign = await uploadProductImage(other.id, makeFile());
const credits = async () => (await db.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [user.id]))[0].credits;
const act = (r: LandingWorkflow, data: Record<string, unknown>) => actLanding(user.id, r.id, { revision: r.revision, responseId: randomUUID(), ...data });

await test("multipart uploads bound the streamed body even without content-length", async () => {
  const form = new FormData(); form.set("file", makeFile());
  assert.equal((await readProductUpload(new Request("http://localhost/product-images", { method: "POST", body: form }))).name, "product.png");
  await assert.rejects(readProductUpload(new Request("http://localhost/product-images", { method: "POST", body: "invalid" })), /파일 전송/);
  await assert.rejects(readProductUpload(new Request("http://localhost/product-images", { method: "POST", body: new Uint8Array(PRODUCT_IMAGE_BYTES + 65537) })), /10MB/);
  form.append("file", makeFile());
  await assert.rejects(readProductUpload(new Request("http://localhost/product-images", { method: "POST", body: form })), /한 장/);
});

await test("uploads preserve original bytes and ownership; vision uses a decoded image copy", async () => {
  assert.deepEqual({ width: first.width, height: first.height }, { width: 64, height: 32 });
  assert.deepEqual(Buffer.from((await assetFile(user.id, first.id)).data!), png);
  assert.equal(await credits(), 50);
  assert.equal((await resolveProductImages(user.id, [second.id, first.id]))[0].id, second.id);
  const vision = await productVisionImages(user.id, [first]);
  assert.equal(vision[0].id, first.id);
  const decoded = await sharp(Buffer.from(vision[0].imageUrl.split(",")[1], "base64")).metadata();
  assert.equal(decoded.format, "jpeg"); assert.equal(decoded.width, 64);
  await assert.rejects(resolveProductImages(user.id, [foreign.id]), /찾을 수 없습니다/);
  await assert.rejects(productVisionImages(other.id, [first]), /찾을 수 없습니다/);
  assert.equal((await libraryList(user.id, { feature: "files" })).total, 2);
});

await test("corrupt, disguised, oversized, empty, animated and too-large pixel inputs do not persist", async () => {
  const count = (await assetList(user.id)).length;
  await assert.rejects(uploadProductImage(user.id, makeFile(Buffer.from("not a photo"))), /사진을 읽을 수/);
  await assert.rejects(uploadProductImage(user.id, makeFile(png, "image/jpeg")), /사진을 읽을 수/);
  await assert.rejects(uploadProductImage(user.id, makeFile(png, "image/svg+xml")), /JPG/);
  await assert.rejects(uploadProductImage(user.id, makeFile(new Uint8Array(0))), /10MB/);
  await assert.rejects(uploadProductImage(user.id, makeFile(new Uint8Array(PRODUCT_IMAGE_BYTES + 1))), /10MB/);
  const wide = await sharp({ create: { width: 8193, height: 1, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(uploadProductImage(user.id, makeFile(wide)), /8192px/);
  const animated = await sharp(Buffer.from([255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0]), { raw: { width: 2, height: 2, channels: 3, pageHeight: 1 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  await assert.rejects(uploadProductImage(user.id, makeFile(animated, "image/webp")), /정지 이미지/);
  assert.equal((await assetList(user.id)).length, count);
});

await test("EXIF orientation is respected and AI images are bounded without modifying originals", async () => {
  const jpeg = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "white" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const asset = await uploadProductImage(user.id, makeFile(jpeg, "image/jpeg", "rotated.jpg"));
  assert.equal(asset.width, 1000); assert.equal(asset.height, 2000);
  const [vision] = await productVisionImages(user.id, [asset]);
  const meta = await sharp(Buffer.from(vision.imageUrl.split(",")[1], "base64")).metadata();
  assert.equal(meta.width, 800); assert.equal(meta.height, 1600); assert(!meta.exif);
  assert.deepEqual(Buffer.from((await assetFile(user.id, asset.id)).data!), jpeg);
});

await test("invalid reference selections reject before reserving credits or creating a workflow", async () => {
  const before = await credits();
  for (const refs of [[foreign.id], [randomUUID()], [first.id, first.id], Array.from({ length: 7 }, () => randomUUID()), ["https://example.com/photo.png"], "invalid"]) {
    await assert.rejects(startLanding(user.id, { format: "product-detail", product, idea: "상품 사진 기반 소개", key: randomUUID(), referenceImageIds: refs }));
  }
  const fake = await saveAsset(user.id, makeFile(Buffer.from("corrupt")), true);
  await assert.rejects(startLanding(user.id, { format: "product-detail", product, idea: "상품 소개", key: randomUUID(), referenceImageIds: [fake.id] }), /사진을 읽을 수/);
  assert.equal(await credits(), before);
});

await test("multimodal request, approved source mapping, refresh, copy revision, image board and handoff", async () => {
  const before = await credits(), key = randomUUID();
  let r = await startLanding(user.id, { format: "product-detail", product, idea: "곡선이 있는 머그. 사진을 사용해 주세요.", key, referenceImageIds: [second.id, first.id] });
  assert.equal(r.referenceImages?.[0].id, second.id);
  assert.equal((await startLanding(user.id, { format: "product-detail", product, idea: "수정된 메모", key, referenceImageIds: [foreign.id] })).id, r.id);
  const vision = await productVisionImages(user.id, r.referenceImages!);
  const input = landingVisionInput(r, vision); assert(Array.isArray(input));
  assert.equal(input[0].content.filter(c => c.type === "input_image").length, 2);
  assert(input[0].content.some(c => "text" in c && c.text?.includes(second.id)));
  const base = landingModelRequest(r); assert(JSON.parse(base.input).referenceImages[0].isPrimary);
  const originalFetch = globalThis.fetch;
  const understanding = { summary: "사진의 곡선과 밝은 색상을 확인했습니다.", brand: "모닝", audience: "커피를 즐기는 사람", problem: "일상에 맞는 머그 찾기", value: "차분한 곡선", goal: "구매·상품 보기", ctaLabel: "구매하러 가기", traffic: "검색", explicit: [] };
  try {
    globalThis.fetch = async (_url, init) => {
      const sent = JSON.parse(String(init?.body));
      assert.equal(sent.input[0].content.filter((c: { type: string }) => c.type === "input_image").length, 2);
      assert(sent.input[0].content.some((c: { image_url?: string }) => c.image_url?.startsWith("data:image/jpeg;base64,")));
      return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(understanding) }] }] });
    };
    assert.deepEqual(await landingModel(r, user.id), understanding);
  } finally { globalThis.fetch = originalFetch; }
  r = await stepLanding(user.id, r.id, r.revision, async () => understanding);
  r = await act(r, { action: "confirm_intent", intent: r.intent });
  r = await stepLanding(user.id, r.id, r.revision, async () => ({ summary: "원본 2장과 텍스트로 기획", sections: ["hero", "features", "cta"].map(kind => ({ kind, sourceImageId: kind === "features" ? first.id : "", title: "상품 소개", question: "어떤 상품인가요?", message: "원본 사진으로 설명", imagePlan: { enabled: kind !== "cta", ratio: "1:1", description: "실제 머그 사진" } })) }));
  assert.equal(r.plan[0].sourceImageId, second.id);
  assert.throws(() => parseLandingPlan(r.plan.map((s, i) => i === 1 ? { ...s, sourceImageId: foreign.id } : s), r.plan, "product-detail", r.referenceImages), /업로드한 상품 사진/);
  assert.equal(parseLandingPlan(r.plan.map((s, i) => i === 0 ? { ...s, sourceImageId: "" } : s), r.plan, "product-detail", r.referenceImages)[0].sourceImageId, "");
  assert.equal(parseLandingPlan(r.plan.map((s, i) => i === 1 ? { ...s, imagePlan: { ...s.imagePlan!, enabled: false } } : s), r.plan, "product-detail", r.referenceImages)[1].sourceImageId, "");
  r = await act(r, { action: "confirm_plan", plan: r.plan });
  const copy = async (run: LandingWorkflow) => ({ title: "사진에서 시작한 상품 페이지", summary: "승인한 사진과 문구를 적용", sections: (run.stage === "patch" ? run.project.slots.filter(s => s.id === run.targetId) : run.plan).map(s => ({ id: s.id, title: "아침을 위한 머그", body: "차분한 일상을 함께해요.", kicker: "MORNING", prompt: "" })) });
  r = await stepLanding(user.id, r.id, r.revision, copy);
  r = await stepLanding(user.id, r.id, r.revision, async () => ({ summary: "원고·원본 대조 완료", issues: [] }));
  assert.equal(r.status, "ready");
  assert.equal(r.project.slots[0].media?.url, second.url); assert.equal(r.project.slots[1].media?.url, first.url);
  assert.equal(r.project.slots[0].appliedJobId, undefined);
  assert(!landingChecks(r).some(i => i.message.includes("장이 비어")));
  const board = await getImageBoard(user.id, r.projectId);
  assert.equal(board.items.length, 2); assert(board.items.every(i => i.applied && i.candidate));
  r = await getLanding(user.id, r.id); assert.deepEqual(r.referenceImages, [second, first]);
  r = await act(r, { action: "revise", sectionId: r.project.slots[0].id, feedback: "문구만 다듬어 주세요." });
  r = await stepLanding(user.id, r.id, r.revision, copy);
  r = await stepLanding(user.id, r.id, r.revision, async () => ({ summary: "수정 원고 검수", issues: [] }));
  assert.equal(r.project.slots[0].media?.url, second.url);
  r = await act(r, { action: "handoff", acknowledged: true });
  const saved = await getProject(user.id, r.projectId), html = landingHtml(saved);
  assert(html.includes(second.url)); assert(html.includes(first.url)); assert(!html.includes('class="image-placeholder"'));
  assert.equal((await libraryList(user.id, { feature: "product-detail" })).total, 2);
  assert.equal(await credits(), before - 1);
});
