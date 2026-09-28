import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
process.env.LOCAL_DATABASE_DIR = "memory://";
const { CARD_TEMPLATES, cardTemplatePreview, createCardTemplateProject } = await import("../src/projects/card-templates");
const { parseProject, mediaUrl } = await import("../src/projects/validation");
const { authenticate } = await import("../src/service/auth");
const { createProject, getProject, updateProject } = await import("../src/service/projects");
const { database } = await import("../src/service/db");
const { listLedger } = await import("../src/service/credits");

await test("nine complete templates validate and ship all sample artwork", async () => {
  assert.equal(CARD_TEMPLATES.length, 9);
  assert.equal(new Set(CARD_TEMPLATES.map(t => t.id)).size, 9);
  for (const template of CARD_TEMPLATES) {
    const preview = cardTemplatePreview(template);
    const copy = parseProject(createCardTemplateProject(template.id));
    assert.equal(copy.slots.length, 5);
    assert.equal(copy.slots[0].kind, "cover");
    assert.equal(copy.slots.at(-1)?.kind, "cta");
    assert.equal(copy.ratio, "4:5");
    assert.equal(copy.format, "card-news");
    assert.deepEqual(copy.slots.map(({ id: _id, ...s }) => s), parseProject(preview).slots.map(({ id: _id, ...s }) => s));
    for (const slot of copy.slots) {
      assert.ok(slot.title && slot.body && slot.prompt);
      if (slot.media) await access(path.join(process.cwd(), "public", slot.media.url));
    }
  }
  assert.throws(() => createCardTemplateProject("missing"), /찾을 수/);
  assert.throws(() => mediaUrl("/content/thumbnails/../../secret.png"));
  assert.throws(() => mediaUrl("/content/thumbnails/file.html"));
});
await test("template copies have independent ids and editable content without changing the source", () => {
  for (const template of CARD_TEMPLATES) {
    const original = JSON.stringify(template);
    const first = createCardTemplateProject(template.id, "나의 프로젝트");
    const second = createCardTemplateProject(template.id);
    assert.equal(first.title, "나의 프로젝트");
    assert.notEqual(first.id, second.id);
    assert.ok(first.slots.every(s => !second.slots.some(other => other.id === s.id)));
    first.slots[0].title = "편집한 제목";
    first.slots[0].media!.url = "/content/sage-still-life.jpg";
    first.brief.topic = "새 주제";
    assert.equal(JSON.stringify(template), original);
    assert.notEqual(second.slots[0].title, first.slots[0].title);
  }
});
await test("AI news copies retain dated official sources in their exportable captions", () => {
  const news = CARD_TEMPLATES.filter(t => t.news);
  assert.deepEqual(news.map(t => t.id), ["github-trending", "openai-gpt-update", "claude-update", "ai-news-briefing"]);
  for (const template of news) {
    const copy = parseProject(JSON.parse(JSON.stringify(createCardTemplateProject(template.id))));
    assert.equal(template.news!.verifiedAt, "2026-09-20");
    assert.ok(copy.caption.includes(template.news!.verifiedAt));
    assert.ok(copy.caption.includes("자동 갱신되지"));
    assert.ok(copy.slots[0].body.includes("2026.09.20"));
    assert.ok(copy.slots.at(-1)!.body.includes("출처:"));
    assert.ok(template.news!.sources.length);
    for (const source of template.news!.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(["github.com", "help.openai.com", "www.anthropic.com", "blog.google"].includes(url.hostname));
      assert.ok(copy.caption.includes(source.url));
      assert.ok(copy.caption.includes(source.label));
    }
  }
});
await test("all nine templates save and reopen under their owner without using credits", async () => {
  const user = (await authenticate({email:"templates@example.test",name:"Template QA",password:"test-password-1234"}, true)).user;
  const before = await listLedger(user.id);
  for (const template of CARD_TEMPLATES) {
    const draft = createCardTemplateProject(template.id);
    const saved = await createProject(user.id, draft);
    const reopened = await getProject(user.id, saved.id);
    assert.deepEqual(parseProject(reopened).slots, saved.slots);
    assert.equal(reopened.caption, draft.caption);
    const edited = await updateProject(user.id, saved.id, {...reopened, slots: reopened.slots.map((s,i) => i ? s : {...s,title:"나의 표지"})});
    assert.equal(edited.slots[0].title, "나의 표지");
    await assert.rejects(() => getProject("another-user",saved.id), /찾을 수/);
  }
  assert.deepEqual(await listLedger(user.id), before);
  const [balance] = await (await database()).query("SELECT credits FROM users WHERE id=$1", [user.id]);
  assert.equal(balance.credits, 50);
});
