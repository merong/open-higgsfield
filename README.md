# OpenHiggsfield AI — Open-Source Alternative to Higgsfield AI

> Self-hosted AI studio with card-news, reels and landing-page creation.
> Account-based projects, server persistence and operator-managed generation credits.

**New workspace:** `/projects` · [Setup, feature scope and operations](docs/content-workspace.md).

**Agentic page QA:** [10 reusable landing/product-detail scenarios](docs/qa/agentic-scenarios/README.md) — inputs, user feedback, fixtures and evaluation records for human or AI-guided E2E runs.

**Desktop work archive:** [Imported source and verification](docs/workspace-history/README.md) · [Design system](design/README.md) · [Ego Lite demo QA](docs/qa/demo-20260929/README.md) · [Local Cloudflare Tunnel](docs/cloudflare-tunnel.md).

**AI reels:** `/projects/new?format=reels` — approve a script and a real sample,
then refine individual scenes and render 1080×1920 MP4 with optional AI narration
and aligned subtitles. Requires `ffmpeg` and `ffprobe` on the server PATH
(`brew install ffmpeg` on macOS); optional `FFMPEG_PATH` / `FFPROBE_PATH` overrides.
OpenAI text model/effort uses administrator settings; speech uses `gpt-4o-mini-tts`
and alignment uses `whisper-1`. Higgsfield scene creation uses the existing credit
ledger. Script: 1 app credit; scene voice: `VOICE_CREDIT_COST` (default 2); media
costs are shown before generation. Re-rendering stored media costs no generation
credits. Final frame review is separate from full playback and listening approval.
[Workflow design](docs/reels-hitl-design.md) · [Implementation and QA](docs/reels-hitl-progress.md).

## 🌐 Try it Online — No Install Required

**Hosted version:** [openhiggsfield.ai](https://openhiggsfield.ai)

The upstream hosted version may differ from this local account-based workspace.
This checkout uses server-side operator credentials and PostgreSQL persistence.

---

**Why OpenHiggsfield AI instead of Higgsfield AI?**

- **Free & open-source** — no studio subscription, no vendor lock-in
- **Self-hosted** — clone it, run it, change it
- **Managed generation** — server-side operator key and account credit ledger
- **38 models** — 8 image, 30 video, one catalog, one composer

---

Next.js 16 App Router with a custom Node server · React 19 · plain CSS · Zustand · pnpm

---

## Features

### Generate

- **One composer for Image and Video.** A single prompt bar drives both; the
  model you pick decides image or video. `⌘/Ctrl + Enter` submits.
- **38 models in the catalog** — 8 image, 30 video: Soul 2, Soul Cinema, Seedance
  2.5 (Edit / Extend), Seedance 2.0 (Fast / Mini), Kling 3 (Turbo / Std / Pro / 4K / Motion), Wan, Flux,
  Ideogram, Recraft, LTX, MiniMax, PixVerse, Grok, Qwen and more. Searchable
  picker.
- **Per-model settings.** Aspect ratio, resolution, duration, output format,
  audio, batch size, prompt enhancement — each model declares its own allow-list
  and the studio renders exactly that. No parallel hardcoded list.
- **Media inputs by role.** Start frame, end frame, references, video and audio,
  each with the per-role cap the model declares. Files upload to Vercel Blob and
  become public URLs the generate request can carry.
- **Asset picker.** Attach from your uploads library or from any finished run in
  history — two tabs over one library, filtered to the role's kind.
- **Batch.** Up to 4 results per press. Models with a native count setting use it;
  the rest are submitted once per result, each clearing its own tile.
- **Live run lifecycle.** Skeletons open in the grid on submit, the request is
  polled every 4s until a terminal status (10-minute deadline), and each finished
  result blooms into place on its own clock.

### Gallery

- **Four scopes** — Image, Video, Assets (every finished run) and Favorites —
  as an arrow-key-navigable tab rail.
- **Masonry grid** of real runs at their true aspect ratio, newest first, with a
  generated photographic preview while media loads.
- **Per-tile actions**: reuse, favorite, delete, select.
- **Reuse restores model, settings and prompt**, so the same run can be
  re-rendered, not just re-typed.
- **Viewer.** Full-size media with prompt (copy in one click), model, resolved
  settings, timestamp, download, favorite and Recreate.
- **Selection mode.** Click a tile's checkbox to enter; shift-click extends a
  range. Bulk download (sequential, with progress and a report of any files the
  CDN refused), bulk favorite/unfavorite, bulk delete. `Esc` exits.
- **Undo.** Deletion is reversible for 6 seconds via a bar with a draining
  hairline, in the strip the composer already reserves.
- **Empty states** that hand you a starter prompt instead of a blank grid.

### State and errors

- **History persists** in IndexedDB in this browser (60 records). Favorites are
  a deliberate keep and never age out of the cap. Result URLs belong to the
  generation platform, so old history can outlive its CDN lifetime and show gaps.
- **Failed, NSFW and canceled runs** are recorded as failed tiles carrying the
  reason and a retry that restores the prompt and model.
- **Account and operator credentials.** Generation requires login and credits.
  The server key is never sent to the browser. Projects and billing history are
  server-owned; the original studio gallery remains browser-local.

---

## Architecture

Each generate is one object: `{ model, prompt, media, settings }`.

- **The UI builds that object** and hands it to a server action. The action
  resolves it against the catalog and maps it to the generation API's own
  fields (`image_urls`, `aspect_ratio`, …).
- **Server actions are the only caller.** The browser never talks to the
  generation API. Submit is `POST /{model}`; status is
  `GET /requests/{id}/status`. Auth is `Authorization: Key <api_key>`.
- **The catalog is the source of truth** (`src/generation/catalog/`). A new entry
  appears in the picker, brings its own settings rail and media roles, and needs
  no studio changes.
- **Five small Zustand stores** — shared image/video prompt, shared image/video
  media, `settings[modelId]`, and a tiny `active` store. No store per model.
- **Uploads** go client-direct to Vercel Blob through `/api/blob`, which issues
  scoped tokens. `blob:` URLs are preview-only.

---

## Getting started

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Copy `.env.example` to `.env.local`, open `/projects`, and create an account.
Local editing and exports need no provider key. See the [workspace guide](docs/content-workspace.md)
for PostgreSQL, operator keys, AI outlines and administrator credit grants.
See [admin settings and demo accounts](docs/admin-settings.md) for `/admin`, `/settings`, and local-IP access restrictions.

### Environment

```bash
DATABASE_URL=                        # required in production; local PGlite in dev
HF_OPERATOR_API_KEY=                  # operator key, server only
HF_API_BASE_URL=                      # generation API origin, server only
OPEN_HIGGSFIELD_READ_WRITE_TOKEN=     # Vercel Blob read-write token
```

### Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm demo:seed` | Create nine demo users and the admin; stop local PGlite server first |
| `pnpm test` | Run service, authorization, credit and thumbnail tests |
| `pnpm brand` | Rebuild the icons and OG card in `public/` |

---

## Layout

```
src/
  app/          / studio; /projects, /login, /account, /admin, /settings and workspace API
                /api/blob issues upload tokens
                base.css owns the document canvas
  generation/   generate requests, server actions, API mapping, catalog, stores
  openhiggsfield/
                the studio surface: composer, gallery, viewer, model picker,
                settings, asset picker, selection bar — and openhiggsfield.css
```

---

## Design principles

Dark studio ground, a single lime accent `#d1fe17`, Pretendard UI typography. The chrome
stays neutral so the generated work is the only color on the surface.

1. **The tool disappears into the task** — expression never obscures state or
   affordance.
2. **Accent is state, not decoration** — selection, primary action, liveness only.
3. **Data is data** — settings, counts and durations read in tabular numerals.
   One typeface throughout; no monospace anywhere.
4. **Motion conveys state** — the generation lifecycle, the arrival of a run.
   Nothing loops decoratively.
5. **Every control ships all its states** — hover, focus, active, disabled,
   loading, error, empty.
6. **The catalog is the source of truth** — the studio renders what the model
   declares, never a parallel hardcoded list.

Built for people who work in long sessions, iterating on prompts, inputs and
settings.

### 기본 크레딧 정책

신규 가입·데모 계정(관리자 포함)의 기본 지급량과 관리자 지급 폼의 초기 입력값은 50입니다. 동영상은 각 요청 직전 잔액이 50을 초과하고 견적 비용을 충당할 수 있어야 생성할 수 있습니다. 이미지 생성은 견적 비용만 검사합니다. 거절된 요청은 공급자 호출이나 크레딧 예약을 만들지 않습니다.

기존 계정의 잔액을 50으로 맞추는 일회성 운영 명령은 `node --import tsx scripts/reset-default-credits.ts`입니다. 로컬 PGlite 사용 시 반드시 서버를 먼저 종료하세요. 차액은 `adjustment` 원장에 보존하며, 재실행은 추가 조정 없이 종료합니다. 이후 관리자의 지급과 사용으로 변경된 잔액은 다시 초기화하지 않습니다.
