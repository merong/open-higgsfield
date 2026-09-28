import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PRODUCT_EXAMPLES } from "../src/projects/product-detail";
import type { LandingWorkflow } from "../src/projects/landing-workflow";
import { imageModels, PRODUCT_REFERENCE_MODEL } from "../src/projects/landing-images";
import type { PlatformClient } from "../src/generation/platform";
process.env.LOCAL_DATABASE_DIR = "memory://";
process.env.OPENAI_API_KEY = "sk-test-not-real";
process.env.IMAGE_CREDIT_COST = "4";
const { database } = await import("../src/service/db");
const { authenticate } = await import("../src/service/auth");
const { uploadProductImage, uploadProductReference } = await import("../src/service/product-images");
const { assetFile } = await import("../src/service/assets");
const { startLanding, stepLanding, actLanding, getLanding, activeLanding } = await import("../src/service/landing-workflow");
const { getProject } = await import("../src/service/projects");
const { getImageBoard, generateBoardImages, stepBoardImages, applyBoardImages } = await import("../src/service/landing-images");
const db = await database();
const user = (await authenticate({ email: "auto-photos@example.test", name: "Auto QA", password: "testpass1234" }, true)).user;
const other = (await authenticate({ email: "auto-other@example.test", name: "Other", password: "testpass1234" }, true)).user;
await db.query("UPDATE users SET credits=200 WHERE id=$1", [user.id]);
const bytes = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#d1fe17" } }).png().toBuffer();
const photos = await Promise.all(["front.png", "detail.png"].map(name => uploadProductImage(user.id, new File([new Uint8Array(bytes)], name, { type: "image/png" }))));
const balance = async () => (await db.query<{credits:number}>("SELECT credits FROM users WHERE id=$1", [user.id]))[0].credits;
const act = (r: LandingWorkflow, data: Record<string, unknown>) => actLanding(user.id, r.id, { revision: r.revision, responseId: randomUUID(), ...data });
async function plan(withPhotos = true) {
  const active = await activeLanding(user.id, "product-detail");
  if (active) await act(active, { action: "cancel" });
  let r = await startLanding(user.id, { format: "product-detail", product: PRODUCT_EXAMPLES[0].product, idea: "머그 사진 기반 상품 상세", key: randomUUID(), referenceImageIds: withPhotos ? photos.map(p => p.id) : [] });
  r = await stepLanding(user.id, r.id, r.revision, async () => ({ summary: "상품 사진 확인", brand: "모닝", audience: "커피를 즐기는 사람", problem: "머그 선택", value: "차분한 곡선", goal: "구매·상품 보기", ctaLabel: "구매하러 가기", traffic: "검색", explicit: [] }));
  r = await act(r, { action: "confirm_intent", intent: r.intent });
  return stepLanding(user.id, r.id, r.revision, async () => ({ summary: "사진 두 장으로 상품 설명", sections: ["hero", "features", "cta"].map((kind, n) => ({ kind, title: `머그 ${kind}`, question: "어떤 상품인가요?", message: n ? "손잡이와 곡선" : "아침 커피와 함께", sourceImageId: withPhotos && n < 2 ? photos[n].id : "", imagePlan: { enabled: n < 2, ratio: n === 0 ? "1:1" : "16:9", description: n ? "손잡이를 보여주는 장면" : "책상 위 머그" } })) }));
}
async function ready(r: LandingWorkflow) {
  r = await act(r, { action: "confirm_plan", plan: r.plan, autoImages: true, imageCredits: 8 });
  r = await stepLanding(user.id, r.id, r.revision, async run => ({ title: "사진 기반 머그 소개", summary: "원고 작성", sections: run.plan.map(s => ({ id: s.id, title: s.title, body: "아침 커피를 담는 머그입니다.", kicker: "MORNING", prompt: s.imagePlan?.enabled ? "Product photo in natural light" : "" })) }));
  r = await stepLanding(user.id, r.id, r.revision, async () => ({ summary: "원고 검수", issues: [] }));
  assert.equal(r.status, "ready"); return r;
}
let uploads = 0, submissions: {path:string;input:Record<string,unknown>}[] = [];
const provider: PlatformClient = {
  upload: async (data, type) => { assert.equal(type, "image/jpeg"); assert.equal((await sharp(data).metadata()).format, "jpeg"); return `https://example.test/reference-${++uploads}.jpg`; },
  submit: async (path, input) => { submissions.push({ path, input }); return { requestId: `auto-${randomUUID()}`, status: "queued", statusUrl: "", cancelUrl: "" }; },
  status: async requestId => ({ requestId, status: "completed", images: [{ url: `https://example.test/${requestId}.png` }] }),
};
const step = (id: string, client = provider) => stepBoardImages(user.id, id, client, async (_u, _p, url) => `/api/workspace/assets/${url.split("/").at(-1)!.replace(".png", "")}`);

await test("a finished draft never generates automatically; the click validates references and the current quote", async () => {
  let r = await ready(await plan()); const before = await balance();
  assert.equal(r.autoImages, undefined, "even a plan checkbox cannot authorize generation");
  assert.equal((await db.query("SELECT project_id FROM project_image_boards WHERE project_id=$1", [r.projectId])).length, 0);
  await assert.rejects(act(r, { action: "auto_images", imageCredits: 4 }), /비용/);
  assert.equal((await getLanding(user.id, r.id)).autoImages, undefined);
  assert.equal(await balance(), before);
  assert.deepEqual(r.project.slots.slice(0, 2).map(s => s.media?.url), photos.map(p => p.url));
  r = await ready(await plan(false));
  await assert.rejects(act(r, { action: "auto_images", imageCredits: 8 }), /사진/);
  r = await plan();
  await assert.rejects(act(r, { action: "auto_images", imageCredits: 8 }), /초안/);
  r.plan = r.plan.map(p => ({ ...p, imagePlan: { ...p.imagePlan!, enabled: false } }));
  r = await ready(r);
  await assert.rejects(act(r, { action: "auto_images", imageCredits: 0 }), /비용/);
});
await test("approved queue resumes idempotently, uploads owned references, preserves section ratios and originals until apply", async () => {
  let r = await ready(await plan()), before = await balance();
  await assert.rejects(actLanding(other.id, r.id, { revision: r.revision, responseId: randomUUID(), action: "auto_images", imageCredits: 8 }), /찾을 수 없습니다/);
  r = await act(r, { action: "auto_images", imageCredits: 8 }); assert.equal(r.autoImages?.state, "queued");
  let b = await getImageBoard(user.id, r.projectId), revision = b.revision;
  assert.deepEqual(b.items.map(i => i.referenceImageIds), photos.map(p => [p.id]));
  assert.deepEqual(b.items.map(i => i.plan.ratio), ["1:1", "16:9"]);
  r = await act(r, { action: "auto_images", imageCredits: 8 }); assert.equal((await getImageBoard(user.id, r.projectId)).revision, revision);
  await Promise.all([step(r.projectId), step(r.projectId)]); b = await step(r.projectId);
  assert.equal(uploads, 2); assert.equal(submissions.length, 2); assert.equal(before - await balance(), 8);
  for (const [n, req] of submissions.entries()) {
    assert.equal(req.path, "marketing-studio/image"); assert.deepEqual(req.input.image_urls, [`https://example.test/reference-${n + 1}.jpg`]);
    assert.equal(req.input.aspect_ratio, n ? "16:9" : "1:1"); assert.equal(req.input.resolution, "1k"); assert.match(String(req.input.prompt), /Preserve the exact product/);
  }
  assert.deepEqual((await getProject(user.id, r.projectId)).slots.slice(0, 2).map(s => s.media?.url), photos.map(p => p.url));
  await step(r.projectId); assert.equal(submissions.length, 2);
  const applied = await applyBoardImages(user.id, r.projectId, { revision: b.revision });
  assert(applied.board.items.every(i => i.applied)); assert.notEqual(applied.project.slots[0].media?.url, photos[0].url);
  assert.deepEqual(Buffer.from((await assetFile(user.id, photos[0].id)).data!), bytes);
  b = await generateBoardImages(user.id, r.projectId, { revision: applied.board.revision, key: randomUUID(), useReferences: true, credits: 4, items: [{ slotId: b.items[1].slotId, model: PRODUCT_REFERENCE_MODEL, prompt: "Closer view of the handle" }] });
  assert.deepEqual(b.items[1].referenceImageIds, [photos[1].id], "retry keeps the approved detail photo");
  b = await step(r.projectId); assert.equal(b.items[1].state, "completed"); assert.equal(submissions.length, 3);
  assert.match(String(submissions[2].input.prompt), /Preserve the exact product/);
});
await test("reference upload/ownership and changed unit price fail before provider submission or debit", async () => {
  await assert.rejects(uploadProductReference(other.id, photos[0].id, provider), /찾을 수 없습니다/);
  let r = await act(await ready(await plan()), { action: "auto_images", imageCredits: 8 }), before = await balance(), calls = submissions.length;
  let b = await step(r.projectId, { ...provider, upload: async () => { throw new Error("upload failed"); } });
  assert.equal(b.items[0].state, "failed"); assert.match(b.items[0].error!, /접수하지 않았/);
  assert.equal(await balance(), before); assert.equal(submissions.length, calls);
  process.env.IMAGE_CREDIT_COST = "5";
  try { b = await step(r.projectId); assert.equal(b.items[1].state, "failed"); assert.match(b.items[1].error!, /단가/); }
  finally { process.env.IMAGE_CREDIT_COST = "4"; }
  assert.equal(submissions.length, calls); assert.equal(await balance(), before);
  assert(imageModels("1:1", true).some(m => m.id === PRODUCT_REFERENCE_MODEL));
  assert(!imageModels("1:1", true).some(m => m.id === "soul-2"));
});
await test("insufficient credits do not enqueue; an inspected original-only board can start but unreviewed candidates are protected", async () => {
  let r = await ready(await plan()); const before = await balance();
  await db.query("UPDATE users SET credits=0 WHERE id=$1", [user.id]);
  await assert.rejects(act(r, { action: "auto_images", imageCredits: 8 }), /크레딧/);
  assert.equal((await getLanding(user.id, r.id)).autoImages, undefined);
  await db.query("UPDATE users SET credits=$1 WHERE id=$2", [before, user.id]);
  const board = await getImageBoard(user.id, r.projectId);
  r = await act(r, { action: "auto_images", imageCredits: 8 });
  assert((await getImageBoard(user.id, r.projectId)).items.every(i => i.state === "queued"));
  assert(board.items.every(i => i.applied));
  r = await ready(await plan());
  let b = await getImageBoard(user.id, r.projectId);
  b = await generateBoardImages(user.id, r.projectId, { revision: b.revision, key: randomUUID(), credits: 4, useReferences: true, items: [{ slotId: b.items[1].slotId, model: PRODUCT_REFERENCE_MODEL, prompt: "Handle detail" }] });
  assert.deepEqual(b.items[1].referenceImageIds, [photos[1].id]);
  b = await step(r.projectId);
  await assert.rejects(act(r, { action: "auto_images", imageCredits: 8 }), /미적용 후보/);
  assert.deepEqual((await getImageBoard(user.id, r.projectId)).items, b.items);
});
await test("managed provider credentials survive reference upload and status polling", async () => {
  const { saveProviderSettings, removeProviderSettings } = await import("../src/service/provider-settings");
  process.env.PROVIDER_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  await db.query("UPDATE users SET is_admin=TRUE WHERE id=$1", [user.id]);
  await saveProviderSettings(user.id, { apiKey: "fixture-id:fixture-secret" });
  const r = await act(await ready(await plan()), { action: "auto_images", imageCredits: 8 });
  const originalFetch = globalThis.fetch, before = await balance();
  let submits = 0, uploads = 0, polls = 0;
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/files/generate-upload-url")) return Response.json({ upload_url: "https://qa.higgsfield.ai/upload", public_url: "https://qa.higgsfield.ai/reference.jpg" });
      if (url.endsWith("/upload")) { uploads++; return new Response(null, { status: 200 }); }
      if (url.endsWith("/marketing-studio/image")) { submits++; return Response.json({ request_id: `managed-${submits}`, status: "queued" }); }
      assert.match(url, /\/requests\/managed-\d\/status$/);
      assert.match(String(new Headers(init?.headers).get("authorization")), /fixture-id/);
      polls++; return Response.json({ request_id: "managed-1", status: "completed", images: [{ url: "https://qa.higgsfield.ai/output.png" }] });
    };
    const b = await stepBoardImages(user.id, r.projectId, undefined, async () => `/api/workspace/assets/${randomUUID()}`);
    assert.equal(b.items[0].state, "completed"); assert.equal(submits, 1); assert.equal(uploads, 1); assert.equal(polls, 1);
    const [job] = await db.query<{provider_credential:string;provider_origin:string}>("SELECT provider_credential,provider_origin FROM generation_jobs WHERE id=$1", [b.items[0].jobId]);
    assert(job.provider_credential.startsWith("v1.")); assert.equal(job.provider_origin, "https://api.higgsfield.ai");
    assert.equal(before - await balance(), 4);
  } finally { globalThis.fetch = originalFetch; await removeProviderSettings(user.id); }
});
