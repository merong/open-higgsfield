import test from "node:test";
import assert from "node:assert/strict";
process.env.LOCAL_DATABASE_DIR = "memory://";
const { authenticate, userForSession, revokeSession } =
  await import("../src/service/auth");
const { database } = await import("../src/service/db");
const { createProject, getProject, updateProject, archiveProject } =
  await import("../src/service/projects");
const { grantCredits, listLedger } = await import("../src/service/credits");
const { submitJob, settleJob, statusesFor } =
  await import("../src/service/generation");
const { createDraft } = await import("../src/projects/outline");
const { parseProject } = await import("../src/projects/validation");
const { planeFor } = await import("../src/projects/plane");
const { landingHtml } = await import("../src/render/landing");
const { PlatformError } = await import("../src/generation/platform");
let userId = "",
  otherId = "";
const password = "test-only-password-8472";
await test("account passwords, sessions and privilege boundaries", async () => {
  const a = await authenticate(
    { email: "creator@example.test", name: "Creator", password },
    true,
  );
  userId = a.user.id;
  assert.equal(a.user.admin, false);
  assert.equal(a.user.credits, 50);
  assert.equal((await userForSession(a.token))?.id, userId);
  const db = await database();
  const [row] = await db.query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id=$1",
    [userId],
  );
  assert.notEqual(row.password_hash, password);
  await assert.rejects(() =>
    authenticate({ email: a.user.email, password: "wrong" }, false),
  );
  const login = await authenticate({ email: a.user.email, password }, false);
  await revokeSession(login.token);
  assert.equal(await userForSession(login.token), null);
  otherId = (
    await authenticate(
      { email: "other@example.test", name: "Other", password },
      true,
    )
  ).user.id;
});
await test("all three formats validate and persist; ownership and stale updates are rejected", async () => {
  for (const format of ["card-news", "reels", "landing"] as const) {
    const draft = createDraft(format, {
      topic: "여름의 기록",
      audience: "크리에이터",
      tone: "calm",
      count: 4,
      mustInclude: "첫 번째\n두 번째",
    });
    assert.equal(parseProject(draft).format, format);
    const saved = await createProject(userId, draft);
    assert.equal((await getProject(userId, saved.id)).title, draft.title);
    await assert.rejects(() => getProject(otherId, saved.id));
    await assert.rejects(() => updateProject(otherId, saved.id, saved));
    const updated = await updateProject(userId, saved.id, {
      ...saved,
      title: "수정한 제목",
    });
    assert.equal(updated.version, 2);
    await assert.rejects(
      () => updateProject(userId, saved.id, saved),
      /다른 창/,
    );
    await archiveProject(userId, saved.id);
    await assert.rejects(() => getProject(userId, saved.id));
  }
});
await test("validation rejects unsafe links, slot duplication and out of range durations", () => {
  const p = createDraft("landing", {
    topic: "Title",
    audience: "",
    tone: "calm",
    count: 3,
    mustInclude: "",
  });
  assert.throws(() =>
    parseProject({
      ...p,
      slots: [{ ...p.slots[0], href: "javascript:alert(1)" }],
    }),
  );
  assert.throws(() => parseProject({ ...p, slots: [p.slots[0], p.slots[0]] }));
  assert.throws(() =>
    parseProject({ ...p, slots: [{ ...p.slots[0], duration: -1 }] }),
  );
  const html = landingHtml({
    ...p,
    title: "<script>unsafe</script>",
    slots: [
      {
        ...p.slots[0],
        title: '<img src=x onerror="bad()">',
        href: "javascript:bad()",
      },
    ],
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes("&lt;img"));
});
await test("credit reservation is atomic and idempotent; completion and refunds happen once", async () => {
  await grantCredits("creator@example.test", 50, "test grant");
  const p = createDraft("card-news", {
      topic: "Test",
      audience: "",
      tone: "calm",
      count: 3,
      mustInclude: "",
    }),
    plane = planeFor(p, p.slots[0]);
  let calls = 0;
  const fake = {
    submit: async () => {
      calls++;
      return {
        requestId: `test-${calls}`,
        status: "queued",
        statusUrl: "",
        cancelUrl: "",
      };
    },
    status: async (requestId: string) => ({
      requestId,
      status: "completed",
      images: [{ url: "https://example.com/image.png" }],
    }),
  };
  const jobs = await Promise.all([
    submitJob(userId, plane, "same-request-001", undefined, fake),
    submitJob(userId, plane, "same-request-001", undefined, fake),
  ]);
  assert.equal(calls, 1);
  assert.equal(jobs[0].id, jobs[1].id);
  const first = jobs.find((j) => j.request_id)!;
  await statusesFor(userId, [first.request_id!], fake);
  await statusesFor(userId, [first.request_id!], fake);
  assert.equal(
    (await listLedger(userId)).filter((r) => r.kind === "confirm").length,
    1,
  );
  const failed = await submitJob(
    userId,
    plane,
    "failed-request-002",
    undefined,
    fake,
  );
  await Promise.all([
    settleJob(userId, failed.id, {
      requestId: failed.request_id!,
      status: "failed",
    }),
    settleJob(userId, failed.id, {
      requestId: failed.request_id!,
      status: "failed",
    }),
  ]);
  const [user] = await (
    await database()
  ).query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [
    userId,
  ]);
  assert.equal(user.credits, 96);
  const denied = await statusesFor(otherId, [first.request_id!], fake);
  assert.ok("error" in denied[0]);
  for (let n = 0; n < 12; n++) await submitJob(otherId, plane, `other-image-${n}`, undefined, fake);
  await assert.rejects(
    () => submitJob(otherId, plane, "no-credits-003", undefined, fake),
    /크레딧이 부족/,
  );
});
await test("definitive provider rejection refunds; ambiguous transport failure does not resubmit", async () => {
  const p = createDraft("card-news", {
      topic: "Test",
      audience: "",
      tone: "calm",
      count: 3,
      mustInclude: "",
    }),
    plane = planeFor(p, p.slots[0]);
  let attempts = 0;
  const fake = {
    submit: async () => {
      attempts++;
      throw new Error("lost response");
    },
    status: async () => ({ status: "pending", requestId: "" }),
  };
  const job = await submitJob(userId, plane, "uncertain-004", undefined, fake);
  assert.equal(job.state, "unknown");
  await submitJob(userId, plane, "uncertain-004", undefined, fake);
  assert.equal(attempts, 1);
  const reject = {
    ...fake,
    submit: async () => {
      throw new PlatformError(400, { detail: "invalid" });
    },
  };
  await assert.rejects(
    () => submitJob(userId, plane, "rejected-005", undefined, reject),
    /환불/,
  );
  const [user] = await (
    await database()
  ).query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [
    userId,
  ]);
  assert.equal(user.credits, 92);
});
await test("AI outline validates untrusted output and credits settle once", async () => {
  const { createAiProject } = await import("../src/service/outline");
  const draft = createDraft("card-news", {
    topic: "AI 테스트",
    audience: "",
    tone: "calm",
    count: 3,
    mustInclude: "",
  });
  let calls = 0;
  const provider = async () => {
    calls++;
    return {
      caption: "검증 캡션",
      slots: draft.slots.map((s) => ({ ...s, title: "검증된 제목" })),
    };
  };
  const a = await createAiProject(userId, draft, "outline-test-006", provider),
    b = await createAiProject(userId, draft, "outline-test-006", provider);
  assert.equal(a.id, b.id);
  assert.equal(calls, 1);
  assert.equal((await getProject(userId, a.id)).slots[0].title, "검증된 제목");
  await assert.rejects(() =>
    createAiProject(userId, draft, "outline-invalid-007", async () => ({
      slots: [],
    })),
  );
  const [user] = await (
    await database()
  ).query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [
    userId,
  ]);
  assert.equal(user.credits, 91);
});

await test("assets are owned, size accounted and uploaded bytes survive storage", async () => {
  const { saveAsset, assetFile } = await import("../src/service/assets");
  const asset = await saveAsset(
    userId,
    new File(["qa-bytes"], "sample.webm", { type: "video/webm" }),
    true,
  );
  assert.equal(
    Buffer.from((await assetFile(userId, asset.id)).data!).toString(),
    "qa-bytes",
  );
  await assert.rejects(() => assetFile(otherId, asset.id));
  await assert.rejects(() =>
    saveAsset(userId, new File(["x"], "bad.html", { type: "text/html" })),
  );
  const db = await database();
  await db.query("UPDATE assets SET byte_size=$1 WHERE id=$2", [
    500 * 1024 * 1024 - 5,
    asset.id,
  ]);
  const result = await Promise.allSettled([
    saveAsset(userId, new File(["1234"], "one.webm", { type: "video/webm" })),
    saveAsset(userId, new File(["5678"], "two.webm", { type: "video/webm" })),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
});
