import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { SAMPLES } from "../src/openhiggsfield/data";
import { thumbnailFor, THUMBNAIL_IDS } from "../src/openhiggsfield/thumbnails";
import { HISTORY_KEY, loadHistory, type RunRecord } from "../src/openhiggsfield/history";
import { memoryKv } from "../src/openhiggsfield/idb";
import { FORMATS } from "../src/projects/formats";

test("every shuffled starter and project format has a shipped thumbnail", async () => {
  for (const surface of ["image", "video"] as const) {
    assert.equal(THUMBNAIL_IDS[surface].length, SAMPLES[surface].length);
    const urls = SAMPLES[surface].slice().reverse().map(prompt => thumbnailFor(surface, prompt));
    assert.equal(new Set(urls).size, SAMPLES[surface].length);
    for (const url of urls) await access(new URL(`../public${url}`, import.meta.url));
  }
  for (const format of FORMATS) await access(new URL(`../public${format.thumbnail}`, import.meta.url));
});

test("legacy artwork migrates without changing saved media or favorites", async () => {
  const kv = memoryKv();
  const record: RunRecord = {
    id: "kept", surface: "image", modelId: "model", modelLabel: "Model",
    prompt: SAMPLES.image[0], ratio: "1 / 1", meta: "", kind: "image",
    urls: ["/user-image.png"], status: "completed", favorite: true,
    art: "radial-gradient(red, blue)", createdAt: 1,
  };
  await kv.set(HISTORY_KEY, [record, { ...record, id: "existing", art: "url(/custom.png)" }, { ...record, id: "missing", art: undefined }]);
  const records = await loadHistory(kv);
  assert.deepEqual(records[0], { ...record, art: `url("${thumbnailFor("image", record.prompt)}") center / cover no-repeat #151719` });
  assert.equal(records[1].art, "url(/custom.png)");
  assert.ok(records[2].art.includes("beekeeper.webp"));
});
