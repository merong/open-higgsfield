# Product image gallery and recommendations — verification

Verified 2026-09-21 against the running local app at `http://127.0.0.1:3000/projects/new?format=product-detail`.

## Implemented behavior

- The left introduction image is now the upload gallery: a contained 4:3 preview, multi-file input, drag/drop handlers, thumbnail navigation, primary-image selection, and two accessible removal controls.
- Up to six JPEG/PNG/WebP files, 10 MB per file. Removal excludes a photo from the current creation; library originals remain.
- The right form offers image-based recommendations before creating a project. Uploaded image bytes and existing text reach the saved OpenAI model through the authenticated server route.
- Recommendations contain product name, category, description, observations and uncertainties. Only explicitly selected fields are applied. Existing fields are unchecked by default; price/specifications/policies are preserved.
- Changing selected image IDs/order clears old recommendations. Applied text remains. Analysis locks uploads and workflow submission, and no app credit is charged. Requests are limited to three per account per minute.

## Checks and evidence

| Check | Observed result |
| --- | --- |
| Multiple-file chooser | `isMultiple() === true`; mug PNG and still-life JPG uploaded together, two thumbnails shown |
| Thumbnail navigation | Clicking the second thumbnail changed the large preview, filename and dimensions |
| Primary photo | Selected still-life became first/primary while remaining the preview selection |
| Thumbnail X | Removed the selected still-life; mug became the preview and primary photo |
| Large-preview X | Removing the final photo restored the empty state and disabled image recommendations |
| Original preservation | Removed still-life was still listed by the live library API |
| Real model recommendation | Saved `gpt-5.6-terra` recognized the cream-colored mug and visible swatches; suggested `주방용품 > 컵·잔 > 머그컵` and a Korean product description |
| Selective application | Existing `모닝 머그` remained unchecked; category and description were selected and applied; confirmed price `28,000원` remained intact |
| Uncertainties | Result asked to confirm actual color options, material/capacity/dimensions, microwave and dishwasher use rather than claiming these from the photo |
| Account credits | Live session API returned 327 after analysis, unchanged from the pre-analysis balance |
| Mobile | At 390 × 844, document width equaled viewport width; preview and thumbnail images loaded; no captured browser warnings/errors |
| API boundaries | Anonymous request 401; foreign origin 403; empty selection 400 |

The browser tooling does not support native file drag/drop dispatch. The drag/drop event wiring uses the same uploader as the verified multi-file chooser; actual OS drag/drop was not exercised in this run. The browser rejected the unsupported dispatch before any upload occurred.

No new AI workflow, image-generation job, export or publication was requested during this verification. Only the image recommendation called the model. Test uploads remain in the local library; the creation screen retains the mug example and applied product text for inspection.

## Automated validation

- `corepack pnpm exec tsc --noEmit` — passed.
- Focused product recommendation/image/workflow tests — 14 passed.
- `LOCAL_DATABASE_DIR=memory:// corepack pnpm test` — 117 passed, 0 failed.
- `LOCAL_DATABASE_DIR=memory:// corepack pnpm build` — passed.
- Tests use an isolated memory database; live API verification uses the running server only.

Artifacts: `product-gallery-desktop.png`, `product-gallery-recommendation.png`, `product-gallery-mobile.png`, `product-gallery-api-check.json`, `product-gallery-tests-focused.log`, `product-gallery-tests-full.log`, `product-gallery-build.log`.
