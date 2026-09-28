# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace layout

This directory is a plain wrapper, not a git repository. The project is the git
repo in `open-higgsfield/` (origin: `merong/open-higgsfield`); `docs/superpowers/`
holds the specs and plans (outside git on purpose). **All paths and commands
below are relative to `open-higgsfield/`.**

`design/` (sibling of `open-higgsfield/`, also outside git) is the design-system
package `@openhiggsfield/design`: React + Vite library (`dist/index.js`,
`dist/ohf.css`) plus a showcase. Its SCSS partials are a 1:1 port of
`openhiggsfield.css`, verified by `design/test/parity.test.ts` against the
original file — **change the studio stylesheet in one place and re-run that
test**. Commands there use `corepack pnpm` (pnpm 10). See `design/README.md`.

OpenHiggsfield AI is a single-page studio for image/video generation: one prompt
bar, 38 catalog models, a gallery of finished runs. Next.js 16 App Router ·
React 19 · plain CSS · Zustand · pnpm. Deployed on Vercel.

## Commands

```bash
pnpm install
pnpm dev                  # http://localhost:3000
pnpm build                # production build (also type-checks)
pnpm start                # serve the production build
pnpm exec tsc --noEmit    # type-check only
pnpm brand                # rebuild icons + OG card in public/
```

- **There is no test runner and no linter.** `tsc` is the only static gate, and
  it is strict with `noUnusedLocals` / `noUnusedParameters` — an unused import or
  argument fails the check.
- `pnpm brand` screenshots SVG in headless Chrome. It looks for a Playwright
  Chromium under `~/Library/Caches/ms-playwright`, or whatever `CHROME_BIN`
  points at. Its outputs are committed; run it only when the mark changes.
- Use pnpm, not npm/bun: `pnpm-workspace.yaml` carries build allow-lists and
  `minimumReleaseAgeExclude` entries that the committed lockfile depends on.
- **pnpm 10+ is required.** That workspace file has settings but no `packages`
  field, which pnpm 9 rejects outright: every command, even `pnpm ls`, dies with
  `ERROR packages field missing or empty`. If you see that, the fix is a newer
  pnpm (`corepack` is available), not an edit to the workspace file.

### Environment (`.env.local`; names are listed in `.env.example`)

| Variable | Purpose |
| --- | --- |
| `HF_API_BASE_URL` | Generation API origin. Server-only. Missing → every submit/status action throws. |
| `OPEN_HIGGSFIELD_READ_WRITE_TOKEN` | Vercel Blob read-write token. Missing → `/api/blob` fails, so no media inputs. |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical origin; falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then localhost. |

The user's **platform key is not an env var**. It is typed into the key modal as
`id:secret`, validated in `src/generation/credentials.ts`, and stored by a server
action in the httpOnly cookie `api_key`. It is sent as `Authorization: Key id:secret`.

## Architecture

Three source roots: `src/app/` (routing shell — `/` is the only page, plus
`/api/blob`), `src/generation/` (requests, server actions, catalog, stores — no
UI), `src/openhiggsfield/` (the studio UI and its stylesheet).

### The generation plane

Every generate is one object, `GenerationPlane = { model, prompt, media, settings }`
(`src/generation/catalog/types.ts`). Its path through the system:

1. **`plane.ts` `assemblePlane()`** (client) snapshots the Zustand stores. It drops
   media whose role the model does not declare or that exceed the role's cap, and
   runs `parseSettings` so defaults are filled in.
2. **`actions.ts` `submitGeneration`** (server action) re-validates settings
   against the catalog, then calls **`to-platform.ts` `toPlatform()`**, which turns
   the plane into `{ path, body }` using the platform's own snake_case fields
   (`image_url`, `aspect_ratio`, `image_urls`, …).
3. **`platform.ts`** is the only HTTP client: `POST /{path}` to submit,
   `GET /requests/{id}/status` to poll. The browser never talks to the platform.
4. **`poll.ts` `watchRequest()`** (client) resolves when the status is terminal
   (`completed | failed | nsfw | canceled`).

**Polling is batched on purpose.** Next dispatches server actions one at a time
per client, so a poll per run would queue ahead of the next submit. `poll.ts` is
a module-level singleton that asks for *every* in-flight request in one
`getGenerationStatuses` call every 4s, fans out in parallel server-side, gives
up on all watches only at the 3rd consecutive failed round, and times a single
request out after 10 minutes.
Do not add per-run polling actions.

### The catalog is the source of truth

`src/generation/catalog/` — one file per model family, registered in the `MODELS`
array in `index.ts` (array order is picker order). A `ModelEntry` declares
`surface` (`image`/`video`), `roles` (media role → max count) and `settings`
(`enum` / `range` / `boolean` fields with defaults). The composer's settings
rail, the media slots, the picker's description line and server-side validation
are all derived from the entry — never add a parallel hardcoded list in the UI.

Adding a model, two routes:

- **Generic:** build it with `imageModel()` / `videoModel()` from `defaults.ts` and
  give it `paths` (`text` / `image` / `firstLast` / `reference`). `t2v(path)`
  derives the `/image-to-video` sibling from a `/text-to-video` path. The shared
  `mapByPaths` in `to-platform.ts` picks the path from which media is attached.
  No other file needs to change.
- **Custom:** write the `settings` by hand and add a mapper keyed by model id to
  `MAP` in `to-platform.ts` (Soul, Kling 3 and Seedance do this).

Things that hang off catalog keys by name:

- `src/openhiggsfield/data.ts` — `SETTING_LABELS` (unknown keys fall back to a
  split of the camelCase name), `COUNT_KEYS`, role labels/accept strings.
- `COUNT_KEYS` (`numImages`, `batchSize`) mean "results per request". Such a key
  is claimed by the composer's single batch control and is never drawn as a
  settings pill. Models without one are submitted once per result, up to
  `MAX_BATCH` (4) — each a real platform request.
- `settings.tsx` `glyphFor` — icon per known setting key.
- `model-icon.tsx` — brand icon chosen by model-id **prefix** →
  `public/model-icons/*.svg`.
- `resolution` enum values must be listed ascending (`describeModel` reads the
  last one as the ceiling).

### State and persistence

Two separate mechanisms — don't conflate them:

- **Composer state = five Zustand stores** in `src/generation/stores/`: `active`
  (surface, model, batch), image/video `prompt`, image/video `media`, and
  `settings.byModel[modelId]`. All use `persist` → localStorage through
  `browserStorage()` (SSR-safe) under versioned keys `openhiggsfield.*.vN`.
  `surface` is never set directly; `setModel` derives it from the model. Prompt
  and media are shared per surface, not per model. `blob:` preview URLs are
  filtered out before persisting.
- **Run history and the uploads library = React state** (in `OpenHiggsfieldApp`
  and `useMediaTray`), persisted to IndexedDB via the tiny kv in `idb.ts`, with
  a mirrored write to legacy localStorage keys. Both follow load-then-save: a
  `historyLoaded` / `uploadsLoaded` gate stops the empty initial state from
  overwriting the store, and `mergeHistory` lets rows created before the load
  finished win. History caps at 60 (favorites and running rows are exempt);
  uploads at 40. `loadHistory`/`saveHistory` take injectable `Kv`/`LegacyStore`
  (see `memoryKv`) so they can run without a browser.

Run rows: a platform request that returns N media becomes N `RunRecord`s with ids
`requestId#0…`; a single result uses the bare `requestId`. Running rows persist
their `requestId`, so after a reload `OpenHiggsfieldApp` groups them and resumes
the watch with the original deadline. `replaceRequest` is a no-op if the user
already deleted the in-flight tiles. Result URLs belong to the platform's CDN —
history can outlive them, and downloads depend on that CDN's CORS (`download.ts`).

### Uploads

`generation/upload.ts` asks `POST /api/blob` for a client token, then `put`s the
file straight to Vercel Blob. The route namespaces the pathname with a device id
from the `ohf_device` cookie, minted either by `src/proxy.ts` (Next 16's name for
middleware; its matcher skips `/api`) or lazily by the route itself. The
content-type allow-list in `src/app/api/blob/route.ts` is mirrored by
`ROLE_ACCEPT` in `data.ts` — change both together. The route is unauthenticated.

### UI layer

`OpenHiggsfieldApp` (client component) owns history, in-flight skeletons
(`ActiveRun`), selection, the viewer, the key modal and the undo window. Presses
of Generate never lock the composer: each press snapshots its own plane, opens
its own skeletons and keeps its own watch. `Composer` owns the popovers; errors,
the undo bar and the bulk-selection toolbar all share the composer's strip
rather than adding floating layers. The gallery is a virtualized masonry
(`@tanstack/react-virtual`).

Styling is one scoped stylesheet, `src/openhiggsfield/openhiggsfield.css`: every
rule lives under `.ohf`, classes are prefixed `ohf-`, and colors/shadows/easing
are custom properties declared on `.ohf`. No Tailwind, CSS modules or component
library; icons are hand-drawn in `icons.tsx`. `src/app/base.css` owns only the
`html`/`body` canvas, and its literal `#0a0a0b` must match `--bg` and `STUDIO_BG`
in `src/site.ts`.

`src/site.ts` is server-only by intent (it reads a Vercel env var the browser
doesn't have) — keep it out of `"use client"` files. Route-level Open Graph /
Twitter overrides must go through `openGraphFor()` / `twitterFor()`, because Next
replaces the whole object rather than merging.

## Design principles (from the README — they constrain UI changes)

- Dark studio ground, a single lime accent `#d1fe17`. **Accent is state, not
  decoration**: selection, primary action, liveness only.
- Inter throughout, no monospace anywhere; settings, counts and durations use
  tabular numerals.
- Motion conveys state (run lifecycle, arrival of a result). Nothing loops
  decoratively.
- Every control ships all its states: hover, focus, active, disabled, loading,
  error, empty.

## Code conventions

- Import alias `@/*` → `src/*`.
- Comments are `/* … */` blocks that explain *why* a decision was made (a race, a
  browser quirk, a UX rule), not what the code does. Match that when editing.
- Server-side logging uses `console.info` with `[platform]` / `[blob]` prefixes;
  request bodies are logged, the auth header is not.
