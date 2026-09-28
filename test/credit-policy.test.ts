import test from "node:test";
import assert from "node:assert/strict";
process.env.LOCAL_DATABASE_DIR = "memory://";
const { authenticate } = await import("../src/service/auth");
const { database } = await import("../src/service/db");
const { grantCredits, listLedger, quote } = await import("../src/service/credits");
const { submitJob } = await import("../src/service/generation");
const { applyDefaultCreditBalances } = await import("../src/service/default-credit-migration");
const { createDraft } = await import("../src/projects/outline");
const { planeFor } = await import("../src/projects/plane");
const { videoCreditBlocked } = await import("../src/projects/credit-policy");
let calls = 0;
const fake = {
  submit: async () => ({ requestId: `policy-${++calls}`, status: "queued", statusUrl: "", cancelUrl: "" }),
  status: async () => ({ requestId: "", status: "pending" }),
};
const draft = createDraft("reels", { topic: "Video", audience: "", tone: "calm", count: 3, mustInclude: "" });
const video = planeFor(draft, draft.slots[0]);
const imageDraft = createDraft("card-news", { topic: "Image", audience: "", tone: "calm", count: 3, mustInclude: "" });
const image = planeFor(imageDraft, imageDraft.slots[0]);
const account = async (name: string) => (await authenticate({ email: `${name}@policy.test`, name, password: "test-password-1234" }, true)).user;

await test("signup grants 50 once and writes the matching ledger", async () => {
  const user = await account("signup");
  assert.equal(user.credits, 50);
  assert.equal((await listLedger(user.id))[0].amount, 50);
  assert.equal((await listLedger(user.id))[0].kind, "signup");
  await assert.rejects(() => account("signup"));
  assert.equal((await listLedger(user.id)).length, 1);
  assert.equal((await authenticate({ email: user.email, password: "test-password-1234" }, false)).user.credits, 50);
});
await test("video at 50 or below is denied without provider calls, jobs or debits; images still work", async () => {
  const user = await account("denied");
  const startCalls = calls;
  for (const balance of [50, 49, 0]) {
    await (await database()).query("UPDATE users SET credits=$1 WHERE id=$2", [balance, user.id]);
    await assert.rejects(() => submitJob(user.id, video, `denied-${balance}`, undefined, fake), /50 크레딧을 초과/);
    const [stored] = await (await database()).query("SELECT credits FROM users WHERE id=$1", [user.id]);
    assert.equal(stored.credits, balance);
    assert.equal(videoCreditBlocked("video", balance), true);
  }
  assert.equal(calls, startCalls);
  assert.equal((await listLedger(user.id)).length, 1);
  assert.equal((await (await database()).query("SELECT id FROM generation_jobs WHERE user_id=$1", [user.id])).length, 0);
  await grantCredits(user.email, 50, "image boundary fixture");
  await submitJob(user.id, image, "image-at-fifty", undefined, fake);
  assert.equal(calls, startCalls + 1);
  assert.equal(videoCreditBlocked("image", 50), false);
});
await test("51 permits an affordable video, retries remain idempotent below the floor, and higher costs still fail", async () => {
  const user = await account("boundary");
  await grantCredits(user.email, 1, "boundary");
  assert.ok(quote(video) <= 51);
  assert.equal(videoCreditBlocked("video", 51), false);
  const before = calls;
  const job = await submitJob(user.id, video, "video-at-fiftyone", undefined, fake);
  assert.equal((await submitJob(user.id, video, "video-at-fiftyone", undefined, fake)).id, job.id);
  assert.equal(calls, before + 1);
  await assert.rejects(() => submitJob(user.id, video, "next-below-floor", undefined, fake), /50 크레딧을 초과/);
  const costly = await account("costly");
  await grantCredits(costly.email, 1, "boundary");
  process.env.VIDEO_CREDIT_COST_PER_SECOND = "100";
  try { await assert.rejects(() => submitJob(costly.id, video, "insufficient-cost", undefined, fake), /크레딧이 부족/); }
  finally { delete process.env.VIDEO_CREDIT_COST_PER_SECOND; }
  assert.equal(calls, before + 1);
});
await test("concurrent video requests serialize the eligibility check", async () => {
  const user = await account("concurrent");
  await grantCredits(user.email, 1, "boundary");
  const before = calls;
  const results = await Promise.allSettled([submitJob(user.id, video, "concurrent-one", undefined, fake), submitJob(user.id, video, "concurrent-two", undefined, fake)]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(calls, before + 1);
});
await test("existing balance adjustment preserves history, reconciles differences and runs only once", async () => {
  const high = await account("high"), low = await account("low");
  await grantCredits(high.email, 150, "earlier grant");
  await submitJob(low.id, image, "earlier-image", undefined, fake);
  const before = await listLedger(high.id);
  assert.equal((await applyDefaultCreditBalances()).alreadyApplied, false);
  const rows = await (await database()).query<{ credits: number }>("SELECT credits FROM users");
  assert.ok(rows.every(row => row.credits === 50));
  const entries = await listLedger(high.id);
  assert.ok(before.every(old => entries.some(row => row.id === old.id)));
  assert.equal(entries.find(row => row.kind === "adjustment")?.amount, -150);
  assert.equal((await listLedger(low.id)).find(row => row.kind === "adjustment")?.amount, quote(image));
  await grantCredits(high.email, 7, "later grant");
  assert.equal((await applyDefaultCreditBalances()).alreadyApplied, true);
  const [balance] = await (await database()).query("SELECT credits FROM users WHERE id=$1", [high.id]);
  assert.equal(balance.credits, 57);
});
