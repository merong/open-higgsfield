import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { emptyProduct } from "../src/projects/product-detail";
import { applyProductRecommendation } from "../src/projects/product-recommendation";
process.env.LOCAL_DATABASE_DIR = "memory://";
process.env.OPENAI_API_KEY = "sk-test-not-real";
process.env.OPENAI_OUTLINE_MODEL = "gpt-5.6-terra";
const { recommendProduct, parseProductRecommendation, productRecommendationModel } = await import("../src/service/product-recommendation");
const { uploadProductImage } = await import("../src/service/product-images");
const { authenticate } = await import("../src/service/auth");
const { database } = await import("../src/service/db");
const db = await database();
const createUser = async () => (await authenticate({ email: `${randomUUID()}@photo-recommend.test`, name: "Photo Recommendation QA", password: "testpass1234" }, true)).user;
const user = await createUser(), other = await createUser();
const bytes = await sharp({ create: { width: 80, height: 60, channels: 3, background: "white" } }).png().toBuffer();
const image = await uploadProductImage(user.id, new File([new Uint8Array(bytes)], "item.png", { type: "image/png" }));
const suggestion = { name: "곡선 손잡이 머그", category: "주방·컵", description: "둥근 입구와 곡선 손잡이가 보이는 밝은 색상의 머그입니다.", observations: ["둥근 입구와 곡선형 손잡이"], uncertainties: ["재질·용량·가격은 확인이 필요합니다."] };

await test("photo-only recommendation supplies owned bytes and does not create a project or spend credits", async () => {
  const before = await db.query("SELECT credits FROM users WHERE id=$1", [user.id]);
  const result = await recommendProduct(user.id, { referenceImageIds: [image.id] }, async (images, context) => {
    assert.equal(images.length, 1); assert.equal(images[0].id, image.id);
    assert(images[0].imageUrl.startsWith("data:image/jpeg;base64,"));
    assert.deepEqual(context, { name: "", category: "", description: "" });
    return suggestion;
  });
  assert.deepEqual(result, suggestion);
  assert.deepEqual(await db.query("SELECT credits FROM users WHERE id=$1", [user.id]), before);
  assert.equal((await db.query("SELECT id FROM projects WHERE owner_id=$1", [user.id])).length, 0);
  assert.equal((await db.query("SELECT id FROM generation_jobs WHERE user_id=$1", [user.id])).length, 0);
});

await test("missing, forged, foreign and duplicate images are rejected before model invocation", async () => {
  let calls = 0; const provider = async () => { calls++; return suggestion; };
  await assert.rejects(recommendProduct(user.id, {}, provider), /한 장/);
  await assert.rejects(recommendProduct(user.id, { referenceImageIds: [] }, provider), /한 장/);
  await assert.rejects(recommendProduct(other.id, { referenceImageIds: [image.id] }, provider), /찾을 수 없습니다/);
  await assert.rejects(recommendProduct(other.id, { referenceImageIds: [randomUUID()] }, provider), /찾을 수 없습니다/);
  await assert.rejects(recommendProduct(user.id, { referenceImageIds: [image.id, image.id] }, provider), /서로 다른/);
  await assert.rejects(recommendProduct(user.id, { referenceImageIds: [image.id], name: "x".repeat(91) }, provider), /상품명/);
  assert.equal(calls, 0);
});

await test("Responses transport carries all images, saved context and a strict recommendation schema", async () => {
  const images = [{ id: "first", imageUrl: "data:image/jpeg;base64,first" }, { id: "second", imageUrl: "data:image/jpeg;base64,second" }];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const request = JSON.parse(String(init?.body));
    assert.equal(request.store, false);
    assert(request.model); assert.equal(request.text.format.strict, true);
    assert.deepEqual(request.input[0].content.filter((c: { type: string }) => c.type === "input_image").map((c: { image_url: string }) => c.image_url), images.map(i => i.imageUrl));
    assert.equal(JSON.parse(request.input[0].content[0].text).existing.name, "확정 상품명");
    assert(!Object.hasOwn(request.text.format.schema.properties, "price"));
    return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(suggestion) }] }] });
  }) as typeof fetch;
  assert.deepEqual(await productRecommendationModel(images, { name: "확정 상품명", category: "", description: "기존 메모" }, fetchImpl), suggestion);
  await assert.rejects(productRecommendationModel(images, { name: "", category: "", description: "" }, async () => Response.json({}, { status: 403 })), /HTTP 403/);
  await assert.rejects(productRecommendationModel(images, { name: "", category: "", description: "" }, async () => Response.json({ status: "incomplete", output: [] })), /완성되지/);
});

await test("malformed model output is never applied; explicit field selection preserves factual inputs", () => {
  assert.throws(() => parseProductRecommendation({ ...suggestion, name: "x".repeat(91) }), /형식/);
  assert.throws(() => parseProductRecommendation({ ...suggestion, observations: Array(6).fill("observation") }), /형식/);
  assert.throws(() => parseProductRecommendation({ ...suggestion, description: null }), /형식/);
  const original = { ...emptyProduct(), name: "확정 이름", price: "30,000원", specs: "용량 | 300 ml", shipping: "별도 정책", options: "단품", returns: "확정 반품 안내", usage: "손세척" };
  const safe = parseProductRecommendation({ ...suggestion, price: "0원", specs: "가짜 규격" });
  const result = applyProductRecommendation(original, "기존 설명", safe, ["category"]);
  assert.deepEqual(result, { product: { ...original, category: suggestion.category }, description: "기존 설명" });
  const changed = applyProductRecommendation(original, "기존 설명", safe, ["name", "description"]);
  assert.equal(changed.product.name, suggestion.name); assert.equal(changed.description, suggestion.description);
  assert.equal(changed.product.price, original.price); assert.equal(changed.product.specs, original.specs);
  assert.equal(original.name, "확정 이름");
});

await test("recommendations have an account rate limit without extra generation charges", async () => {
  const actor = await createUser();
  const asset = await uploadProductImage(actor.id, new File([new Uint8Array(bytes)], "item.png", { type: "image/png" }));
  for (let i = 0; i < 3; i++) await recommendProduct(actor.id, { referenceImageIds: [asset.id] }, async () => suggestion);
  await assert.rejects(recommendProduct(actor.id, { referenceImageIds: [asset.id] }, async () => suggestion), /잠시|요청/);
  assert.equal((await db.query<{credits:number}>("SELECT credits FROM users WHERE id=$1", [actor.id]))[0].credits, 50);
});
