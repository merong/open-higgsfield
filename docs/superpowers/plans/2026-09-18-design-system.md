# OpenHiggsfield 디자인 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 스튜디오 CSS를 SCSS로 옮겨 토큰화하고, 그 위에 React 컴포넌트·조립 요소·슬라이드 층·쇼케이스를 갖춘 패키지 `@openhiggsfield/design`을 래퍼 루트 `design/`에 만든다.

**Architecture:** Vite 7 라이브러리 빌드(`dist/index.js` + `dist/index.d.ts` + `dist/ohf.css`)와 쇼케이스 앱을 한 패키지가 겸한다. 스타일은 SCSS 맵 → `.ohf { --토큰 }` emit → 컴포넌트는 `var()`만 쓰는 3층이고, 기존 3,736줄 CSS는 20개 파셜로 1:1 이식한 뒤 parity 테스트(컴파일 결과 vs 원본, `var()` 치환 후 선언 단위 비교)로 어긋남 0을 유지한다. 컴포넌트는 스튜디오가 이미 그리는 클래스를 그대로 쓰고 새 변형·상태만 SCSS로 더한다.

**Tech Stack:** React 19, Vite 7, sass-embedded, TypeScript 5.9(strict, noUnusedLocals/Parameters), Vitest 5 + jsdom + Testing Library, vite-plugin-dts, pnpm 10(corepack).

**Spec:** `docs/superpowers/specs/2026-09-18-design-system-design.md` — 실행자는 기획서와 이 계획을 함께 읽는다.

## Global Constraints

- 패키지 위치는 `/Users/brian/works/agent/openhigsfield/design/`. **git 저장소 밖**이다(`open-higgsfield/`는 건드리지 않는다). 이 계획에는 커밋 단계가 없다. 이력이 필요하면 사용자 승인 뒤 `design/`에서 `git init`한다.
- 원본 스타일시트: `../open-higgsfield/src/openhiggsfield/openhiggsfield.css`(3,736줄). 원본 아이콘: `../open-higgsfield/src/openhiggsfield/icons.tsx`. 원본 `ui.tsx`, `data.ts`. 읽기만 한다.
- pnpm은 **10.33.2**(`packageManager` 필드). 이 머신의 전역 `pnpm`은 9.10이므로 모든 명령은 `corepack pnpm …`으로 실행한다. 아래에서 `pnpm`이라고 쓴 것은 전부 `corepack pnpm`을 뜻한다.
- 기존 토큰 31개(`--bg … --danger-line`)는 이름·값을 바꾸지 않는다. `--font-ui` 값은 `var(--font-ohf-inter), ui-sans-serif, system-ui, sans-serif` 그대로.
- 토큰은 `.ohf` 스코프에 선언한다(`:root` 아님). 모든 클래스는 `ohf-` 접두어. 쇼케이스 전용 클래스는 `sc-` 접두어.
- 컴포넌트 SCSS(`src/components`, `src/composites`)는 토큰 값 리터럴을 쓰지 않고 `var()`만 쓴다(반지름 4/6/8/10/14/15/24/999px, 높이 28/32/36/38/46px, 글자 크기 10.5/11.5/12.5/13/14/15/22px, 굵기 500/550/600/620, 자간 −0.005/−0.015/0.16em, 지속 0.12/0.15/0.2/0.34s, 색·그림자 값). `src/slides` SCSS는 앱 토큰을 참조하지 않고(`var(--sl-*)`만) 앱 색·그림자 값을 쓰지 않는다.
- 컴포넌트에 문구를 넣지 않는다. 모든 글자는 props. 아이콘만 있는 버튼은 `aria-label` 필수(타입으로 강제).
- 진짜 요소를 쓴다: `<button>`, `<a href>`, `<input>`+`<label>`, `<dialog>`. `aria-pressed`(토글), `aria-selected`(탭), `role="switch"`.
- `ref`는 React 19의 일반 prop. `className`과 native 속성은 그대로 전달.
- 라이브러리 코드(`src/`)는 `react-dom`을 import하지 않는다(`dist/index.js`에 react-dom 코드 없음).
- 주석은 `/* … */`로 "왜"만 적는다. 한국어 응답, 코드 식별자는 영문.
- 각 Task는 `corepack pnpm test && corepack pnpm typecheck`가 통과해야 끝난다.

## 공통 규약

**스튜디오 클래스 재사용 규칙.** 스튜디오 파셜이 이미 그리는 클래스는 컴포넌트가 그대로 쓴다: `ohf-chip`, `ohf-ctl(-glyph/-value)`, `ohf-kbd`, `ohf-spinner`, `ohf-tabs/ohf-tab/ohf-thumb`, `ohf-icon-btn(--ghost)`, `ohf-field(-row/-label/-value)`, `ohf-input`, `ohf-batch(-step/-value/-max)`, `ohf-slider`, `ohf-opts/ohf-opt(-label/-check/-ratio/-box)`, `ohf-skeleton(-label/-clock)`, `ohf-popover(--setting/--list/--picker/--menu/--assets)`, `ohf-pop-head`, `ohf-menu(-row/-ic/-label/-count)`, `ohf-dialog-panel`, `ohf-alert(-ic/-text)`, `ohf-undo(-drain/-text/-act)`, `ohf-tip(--start/--end)`. 이런 컴포넌트의 SCSS는 **새 변형·상태만** 추가한다(특히 쇼케이스가 상태를 고정하는 `[data-state="hover"]`, `[data-state="active"]`). 스튜디오에 없는 것(Button, Tag, Switch, Avatar, CreditBadge, Thumb(`ohf-frame`), 조립 요소, 슬라이드)은 컴포넌트 SCSS가 전부를 정의한다. 새 클래스 이름은 스튜디오와 겹치지 않는다(확인됨: `ohf-btn`, `ohf-tag`, `ohf-switch`, `ohf-avatar`, `ohf-credit`, `ohf-frame`, `ohf-appbar`, `ohf-phead`, `ohf-brief`, `ohf-sb-*`, `ohf-astrip`, `ohf-canvas`, `ohf-pcard`, `ohf-fcard`, `ohf-scard`, `ohf-slide*`).

**컴포넌트 폴더.** `src/components/<Name>/{<Name>.tsx, <Name>.scss, index.ts, <Name>.test.tsx}`. 추가할 규칙이 하나도 없으면 `.scss`는 만들지 않는다(Kbd, Spinner, Slider, OptionList, Skeleton, Alert, UndoBar). `index.ts`는 `export * from "./<Name>";` 한 줄.

**상태 고정.** 모든 인터랙티브 컴포넌트는 `:hover`와 `[data-state="hover"]`, `:active`와 `[data-state="active"]`를 같은 규칙으로 묶는다. 쇼케이스는 `data-state`로 상태를 고정해 보여 준다.

**테스트.** Vitest + jsdom + `@testing-library/react`. 컴포넌트 테스트는 렌더 → 역할(role) → 상태 클래스/속성 확인. SCSS는 테스트에서 컴파일하지 않는다(`css: false`).

**검증 명령.** `corepack pnpm test`(Vitest), `corepack pnpm typecheck`(tsc), `corepack pnpm build`(라이브러리 + dist 검사), `corepack pnpm build:showcase`, `corepack pnpm tokens`.

## 파일 구조

```
design/
├─ package.json  pnpm-workspace.yaml  tsconfig.json  vite.config.ts  vitest.config.ts  index.html  README.md  .gitignore
├─ scripts/
│  ├─ export-tokens.mjs (+ export-tokens.d.mts)   _emit.scss → tokens.json
│  ├─ tokenize-studio.mjs                          스튜디오 파셜 토큰화(1회, 멱등)
│  └─ check-dist.mjs                               dist 3파일 존재, react-dom 없음, d.ts에 "@/" 없음, tokens.json 복사
├─ src/
│  ├─ index.ts                공개 API
│  ├─ vite-env.d.ts
│  ├─ lib/{cx.ts, ratio.ts}
│  ├─ styles/{index.scss, _mixins.scss, tokens/_maps.scss, tokens/_emit.scss, base/_reset.scss, base/_keyframes.scss, studio/_*.scss ×19}
│  ├─ tokens/{tokens.json, index.ts, tokens.test.ts}
│  ├─ icons/{index.tsx, icons.test.tsx}
│  ├─ components/<Name>/…  (17)
│  ├─ composites/<Name>/…  (9)
│  └─ slides/{styles.ts, SlideFrame.tsx, templates.tsx, slides.scss, index.ts, slides.test.tsx}
├─ showcase/{main.tsx, App.tsx, showcase.scss, data.ts, lib/{contrast.ts, slide.tsx}, sections/{Tokens,Components,Slides,Screens}.tsx, screens/*.tsx}
└─ test/{setup.ts, package.test.ts, lib/flatten.ts, lib/flatten.test.ts, parity.test.ts, token-rules.test.ts, tokens-sync.test.ts}
```

---

### Task 1: 스캐폴딩과 라이브러리 빌드

**Files:**
- Create: `design/package.json`, `design/pnpm-workspace.yaml`, `design/tsconfig.json`, `design/vite.config.ts`, `design/vitest.config.ts`, `design/index.html`, `design/.gitignore`, `design/README.md`
- Create: `design/src/index.ts`, `design/src/vite-env.d.ts`, `design/showcase/main.tsx`
- Create: `design/scripts/check-dist.mjs`
- Test: `design/test/setup.ts`, `design/test/package.test.ts`

**Interfaces:**
- Produces: 명령 `pnpm dev / build / build:showcase / tokens / test / typecheck`; 별칭 `@/*` → `src/*`(TS와 Vite 둘 다); `dist/index.js`, `dist/index.d.ts`, `dist/ohf.css`.

- [ ] **Step 1: 패키지 파일 작성**

`design/package.json`:

```json
{
  "name": "@openhiggsfield/design",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.33.2",
  "files": ["dist"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./ohf.css": "./dist/ohf.css"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build --mode lib && node scripts/check-dist.mjs",
    "build:showcase": "vite build --outDir dist-showcase",
    "tokens": "node scripts/export-tokens.mjs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@types/node": "^24.0.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^5.2.0",
    "jsdom": "^30.1.0",
    "pretendard": "^1.3.9",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "sass-embedded": "^1.104.1",
    "typescript": "^5.9.2",
    "vite": "^7.3.6",
    "vite-plugin-dts": "^5.1.0",
    "vitest": "^5.0.1"
  }
}
```

`design/pnpm-workspace.yaml`(pnpm 10은 허용 목록에 없는 빌드 스크립트를 건너뛴다. esbuild만 허용):

```yaml
onlyBuiltDependencies:
  - esbuild
```

`design/.gitignore`:

```
node_modules
dist
dist-showcase
```

`design/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "showcase", "test", "vite.config.ts", "vitest.config.ts"]
}
```

`design/vite.config.ts`:

```ts
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const src = fileURLToPath(new URL("./src", import.meta.url));

/* One config, two modes: `--mode lib` emits the package (index.js + index.d.ts
   + ohf.css), anything else serves or builds the showcase. */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === "lib"
      ? [dts({ include: ["src"], exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"] })]
      : []),
  ],
  resolve: { alias: { "@": src } },
  build:
    mode === "lib"
      ? {
          lib: {
            entry: `${src}/index.ts`,
            formats: ["es"],
            fileName: "index",
            cssFileName: "ohf",
          },
          rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] },
          cssCodeSplit: false,
          sourcemap: true,
        }
      : { outDir: "dist-showcase" },
}));
```

`design/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.ts"],
    /* Component tests assert roles and classes, never computed style, so the
       SCSS is not compiled here; parity compiles it on its own. */
    css: false,
  },
});
```

`design/index.html`(쇼케이스 진입점. Pretendard는 `showcase/main.tsx`가 npm 패키지에서 import하고, Google Fonts 3종과 `--font-ohf-inter`는 여기서만 정의):

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenHiggsfield Design</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Gowun+Dodum&family=Noto+Serif+KR:wght@700&display=swap"
    />
    <style>
      :root {
        --font-ohf-inter: "Pretendard Variable";
      }
      html,
      body {
        margin: 0;
        background: #0a0a0b;
        color-scheme: dark;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/showcase/main.tsx"></script>
  </body>
</html>
```

`design/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`design/src/index.ts`(빈 진입점. Task 3부터 채운다):

```ts
export {};
```

`design/showcase/main.tsx`(임시. Task 11에서 교체):

```tsx
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(<div className="ohf">OpenHiggsfield Design</div>);
```

`design/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`design/README.md`(뼈대. Task 13에서 완성):

```markdown
# @openhiggsfield/design

OpenHiggsfield 스튜디오의 디자인 시스템. React + Vite, SCSS → `ohf.css`.

- `corepack pnpm dev` — 쇼케이스
- `corepack pnpm build` — `dist/index.js`, `dist/index.d.ts`, `dist/ohf.css`
- `corepack pnpm test && corepack pnpm typecheck`
```

`design/scripts/check-dist.mjs`:

```js
import { cpSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

for (const name of ["index.js", "index.d.ts", "ohf.css"]) {
  if (!existsSync(join(dist, name))) throw new Error(`dist/${name} is missing`);
}

/* The consuming app ships its own React; a second copy would break hooks. */
const js = readFileSync(join(dist, "index.js"), "utf8");
if (js.includes("react-dom")) throw new Error("dist/index.js bundles react-dom");

/* Declarations must not leak the "@/" alias — consumers cannot resolve it. */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
for (const file of walk(dist).filter((f) => f.endsWith(".d.ts"))) {
  if (readFileSync(file, "utf8").includes('"@/')) throw new Error(`${file} references the @/ alias`);
}

/* tokens/index.d.ts imports the JSON by relative path; ship it next to it. */
const json = join(root, "src/tokens/tokens.json");
if (existsSync(json)) cpSync(json, join(dist, "tokens/tokens.json"));

console.log("dist ok");
```

- [ ] **Step 2: 실패하는 패키지 테스트 작성**

`design/test/package.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import pkg from "../package.json";

describe("package.json", () => {
  it("exposes the library entry and the stylesheet", () => {
    expect(pkg.exports["."]).toEqual({ types: "./dist/index.d.ts", import: "./dist/index.js" });
    expect(pkg.exports["./ohf.css"]).toBe("./dist/ohf.css");
  });

  it("leaves React to the consuming app", () => {
    expect(Object.keys(pkg.peerDependencies)).toEqual(["react", "react-dom"]);
  });
});
```

- [ ] **Step 3: 설치하고 테스트가 (의존성 설치 전) 실패하는지 확인**

Run: `cd /Users/brian/works/agent/openhigsfield/design && corepack pnpm install`
Expected: 설치 성공. `Ignored build scripts` 경고가 esbuild 이외에 나오면 그 이름을 `pnpm-workspace.yaml`의 `onlyBuiltDependencies`에 추가한다. 최신 버전이 `minimumReleaseAge`에 걸려 조금 낮은 버전이 잡히는 것은 문제없다.

Run: `corepack pnpm test`
Expected: PASS (2 tests). 설치 전에는 `vitest`가 없어 실패했을 것이고, 이 시점에 통과해야 한다.

- [ ] **Step 4: 타입 검사와 라이브러리 빌드**

Run: `corepack pnpm typecheck`
Expected: 오류 없음.

Run: `corepack pnpm build`
Expected: `dist/index.js`, `dist/index.d.ts`, `dist/ohf.css`가 생기고 `dist ok`가 출력된다. 진입점이 비어 있어 `ohf.css`는 비어 있거나 매우 작다.

확인 항목(기획서 9장):
- `cssFileName: "ohf"`가 무시되어 `dist/design.css`나 `dist/style.css`가 나오면 `build.rollupOptions.output.assetFileNames = (info) => info.names?.[0]?.endsWith(".css") ? "ohf.css" : "[name][extname]"`로 대체한다.
- `vite-plugin-dts`가 Vite 7에서 실패하면 `dts()`를 빼고 `"build"` 스크립트를 `vite build --mode lib && tsc -p tsconfig.build.json && node scripts/check-dist.mjs`로 바꾼다. 이때 `tsconfig.build.json`은 `{"extends": "./tsconfig.json", "compilerOptions": {"noEmit": false, "emitDeclarationOnly": true, "declaration": true, "outDir": "dist", "rootDir": "src"}, "include": ["src"], "exclude": ["src/**/*.test.*"]}`.
- `sass-embedded`가 arm64 바이너리를 못 받으면 `sass`(JS)로 바꾼다(API 동일).

Run: `corepack pnpm build:showcase`
Expected: `dist-showcase/index.html` 생성.

- [ ] **Step 5: 마무리 검증**

Run: `corepack pnpm test && corepack pnpm typecheck`
Expected: 둘 다 통과.

---

### Task 2: 토큰 맵 → emit → tokens.json

**Files:**
- Create: `design/src/styles/tokens/_maps.scss`, `design/src/styles/tokens/_emit.scss`
- Create: `design/scripts/export-tokens.mjs`, `design/scripts/export-tokens.d.mts`
- Create: `design/src/tokens/tokens.json`(생성물), `design/src/tokens/index.ts`
- Test: `design/test/tokens-sync.test.ts`, `design/src/tokens/tokens.test.ts`

**Interfaces:**
- Produces: SCSS 맵 `maps.$legacy`(31개), `$radius`, `$height`, `$font-size`, `$font-weight`, `$letter-spacing`, `$space`, `$duration`, `$z`, `$bp`; `collectTokens(): Record<string, string>`; `tokens`(71개, 키는 `--` 없는 커스텀 프로퍼티 이름), `type Token`, `cssVar(name: Token): string`.

- [ ] **Step 1: 실패하는 동기화 테스트 작성**

`design/test/tokens-sync.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { collectTokens } from "../scripts/export-tokens.mjs";
import onDisk from "../src/tokens/tokens.json";

const LEGACY = [
  "bg", "rail", "s1", "s2", "s3", "s4", "line", "line-2", "tx", "tx2", "tx3", "tx4", "tx-off",
  "accent", "accent-strong", "accent-ink", "accent-08", "accent-14", "accent-32", "plate", "plate-ink",
  "shadow-1", "shadow-2", "shadow-3", "glint", "ease", "ease-slide", "font-ui", "danger", "danger-bg", "danger-line",
];
const ADDED = [
  ...["xs", "sm", "md", "ctl", "lg", "bar", "xl", "pill"].map((k) => `radius-${k}`),
  ...["xs", "sm", "md", "lg", "bar"].map((k) => `h-${k}`),
  ...["2xs", "xs", "sm", "md", "base", "lg", "title"].map((k) => `fs-${k}`),
  ...["medium", "strong", "bold", "display"].map((k) => `fw-${k}`),
  ...["tight", "heading", "caps"].map((k) => `ls-${k}`),
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => `sp-${k}`),
  ...["fast", "base", "slow", "slide"].map((k) => `dur-${k}`),
];

describe("tokens.json", () => {
  it("is what export-tokens.mjs produces from the SCSS maps", () => {
    expect(onDisk).toEqual(collectTokens());
  });

  it("declares the 31 legacy tokens and the 40 added ones, in that order", () => {
    expect(Object.keys(onDisk)).toEqual([...LEGACY, ...ADDED]);
  });

  it("keeps the legacy values byte-for-byte", () => {
    expect(onDisk.bg).toBe("#0a0a0b");
    expect(onDisk.accent).toBe("#d1fe17");
    expect(onDisk.line).toBe("rgba(255, 255, 255, 0.06)");
    expect(onDisk["shadow-2"]).toBe("0 4px 12px rgba(0, 0, 0, 0.3), 0 16px 40px rgba(0, 0, 0, 0.35)");
    expect(onDisk["font-ui"]).toBe("var(--font-ohf-inter), ui-sans-serif, system-ui, sans-serif");
    expect(onDisk.ease).toBe("cubic-bezier(0.2, 0, 0, 1)");
  });

  it("uses the agreed values for the added tokens", () => {
    expect(onDisk["radius-ctl"]).toBe("10px");
    expect(onDisk["radius-pill"]).toBe("999px");
    expect(onDisk["h-bar"]).toBe("46px");
    expect(onDisk["fs-sm"]).toBe("12.5px");
    expect(onDisk["fw-display"]).toBe("620");
    expect(onDisk["ls-caps"]).toBe("0.16em");
    expect(onDisk["sp-8"]).toBe("32px");
    expect(onDisk["dur-slide"]).toBe("0.34s");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `corepack pnpm test test/tokens-sync.test.ts`
Expected: FAIL — `scripts/export-tokens.mjs`를 찾지 못한다.

- [ ] **Step 3: 맵과 emit 작성**

`design/src/styles/tokens/_maps.scss`:

```scss
// Source of truth for every runtime token. `_emit.scss` turns these maps into
// custom properties on `.ohf`; `scripts/export-tokens.mjs` turns the same
// output into tokens.json. The legacy map is copied from openhiggsfield.css and
// must not change: 424 var() uses and the parity test depend on it.

$legacy: (
  bg: #0a0a0b,
  rail: #101112,
  s1: #151719,
  s2: #1a1d1f,
  s3: #222629,
  s4: #2b3033,
  line: rgba(255, 255, 255, 0.06),
  line-2: rgba(255, 255, 255, 0.11),
  tx: #edefef,
  tx2: #a8aeaf,
  tx3: #878e90,
  tx4: #7d8486,
  tx-off: #5c6365,
  accent: #d1fe17,
  accent-strong: #ddfe51,
  accent-ink: #141a02,
  accent-08: rgba(209, 254, 23, 0.08),
  accent-14: rgba(209, 254, 23, 0.14),
  accent-32: rgba(209, 254, 23, 0.32),
  plate: rgba(6, 9, 8, 0.7),
  plate-ink: rgba(246, 250, 248, 0.9),
  shadow-1: (0 1px 2px rgba(0, 0, 0, 0.4)),
  shadow-2: (0 4px 12px rgba(0, 0, 0, 0.3), 0 16px 40px rgba(0, 0, 0, 0.35)),
  shadow-3: (0 8px 24px rgba(0, 0, 0, 0.4), 0 32px 88px rgba(0, 0, 0, 0.52)),
  glint: (inset 0 1px 0 rgba(255, 255, 255, 0.045)),
  ease: cubic-bezier(0.2, 0, 0, 1),
  ease-slide: cubic-bezier(0.16, 1, 0.3, 1),
  font-ui: (var(--font-ohf-inter), ui-sans-serif, system-ui, sans-serif),
  danger: #ff8d78,
  danger-bg: rgba(255, 141, 120, 0.1),
  danger-line: rgba(255, 141, 120, 0.28),
);

// Added tokens. Values are the ones the studio already uses as literals.
$radius: (xs: 4px, sm: 6px, md: 8px, ctl: 10px, lg: 14px, bar: 15px, xl: 24px, pill: 999px);
$height: (xs: 28px, sm: 32px, md: 36px, lg: 38px, bar: 46px);
// "2xs" is quoted: unquoted, Sass would read it as the number 2 with unit xs.
$font-size: ("2xs": 10.5px, xs: 11.5px, sm: 12.5px, md: 13px, base: 14px, lg: 15px, title: 22px);
$font-weight: (medium: 500, strong: 550, bold: 600, display: 620);
$letter-spacing: (tight: -0.005em, heading: -0.015em, caps: 0.16em);
$space: (0: 2px, 1: 4px, 2: 6px, 3: 8px, 4: 12px, 5: 16px, 6: 20px, 7: 24px, 8: 32px);
$duration: (fast: 0.12s, base: 0.15s, slow: 0.2s, slide: 0.34s);

// SCSS-only. Never emitted: z-order and breakpoints are structure, not theme.
$z: (base: 1, raised: 2, float: 3, bar: 30, overlay: 40);
$bp: (md: 900px, sm: 760px, xs: 640px, xxs: 560px, tiny: 400px, min: 360px);
```

`design/src/styles/tokens/_emit.scss`:

```scss
@use "maps";

.ohf {
  @each $k, $v in maps.$legacy {
    --#{$k}: #{$v};
  }
  @each $k, $v in maps.$radius {
    --radius-#{$k}: #{$v};
  }
  @each $k, $v in maps.$height {
    --h-#{$k}: #{$v};
  }
  @each $k, $v in maps.$font-size {
    --fs-#{$k}: #{$v};
  }
  @each $k, $v in maps.$font-weight {
    --fw-#{$k}: #{$v};
  }
  @each $k, $v in maps.$letter-spacing {
    --ls-#{$k}: #{$v};
  }
  @each $k, $v in maps.$space {
    --sp-#{$k}: #{$v};
  }
  @each $k, $v in maps.$duration {
    --dur-#{$k}: #{$v};
  }
}
```

- [ ] **Step 4: 내보내기 스크립트 작성**

`design/scripts/export-tokens.mjs`:

```js
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import * as sass from "sass-embedded";

const root = fileURLToPath(new URL("..", import.meta.url));

/* Compiles _emit.scss on its own and reads the `.ohf { --x: y }` block back.
   The JSON is therefore derived from the same Sass output the stylesheet
   ships, never from a second parse of the maps. */
export function collectTokens() {
  const css = sass.compile(`${root}src/styles/tokens/_emit.scss`, { style: "expanded" }).css;
  const block = /\.ohf\s*\{([^}]*)\}/.exec(css);
  if (!block) throw new Error("_emit.scss produced no .ohf block");
  const tokens = {};
  for (const line of block[1].split(";")) {
    const m = /^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(line);
    if (m) tokens[m[1]] = m[2].replace(/\s+/g, " ");
  }
  return tokens;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = `${root}src/tokens/tokens.json`;
  writeFileSync(out, `${JSON.stringify(collectTokens(), null, 2)}\n`);
  console.log(`wrote ${out}`);
}
```

`design/scripts/export-tokens.d.mts`:

```ts
export function collectTokens(): Record<string, string>;
```

- [ ] **Step 5: tokens.json 생성과 `tokens/index.ts`**

Run: `corepack pnpm tokens`
Expected: `src/tokens/tokens.json` 생성, 71개 키. `head -5 src/tokens/tokens.json`에 `"bg": "#0a0a0b"`.

`design/src/tokens/index.ts`:

```ts
import raw from "./tokens.json";

export type Token = keyof typeof raw;

/* Frozen so a consumer cannot mutate the shared table by accident. */
export const tokens: Readonly<Record<Token, string>> = Object.freeze({ ...raw });

export function cssVar(name: Token): string {
  return `var(--${name})`;
}
```

`design/src/tokens/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cssVar, tokens } from "./index";

describe("tokens", () => {
  it("wraps a token name as a custom property reference", () => {
    expect(cssVar("radius-ctl")).toBe("var(--radius-ctl)");
  });

  it("is frozen", () => {
    expect(Object.isFrozen(tokens)).toBe(true);
  });
});
```

- [ ] **Step 6: 통과 확인**

Run: `corepack pnpm test`
Expected: PASS — tokens-sync 4개, tokens 2개, package 2개.

Run: `corepack pnpm typecheck`
Expected: 오류 없음. `tokens.json` import가 오류면 `resolveJsonModule`이 켜져 있는지 확인.

---

### Task 3: 스타일시트 1:1 이식과 parity 테스트

**Files:**
- Create: `design/test/lib/flatten.ts`, `design/test/lib/flatten.test.ts`, `design/test/parity.test.ts`
- Create: `design/src/styles/base/_reset.scss`, `design/src/styles/base/_keyframes.scss`, `design/src/styles/studio/_*.scss`(19개), `design/src/styles/index.scss`
- Modify: `design/src/index.ts`

**Interfaces:**
- Consumes: Task 2의 `tokens/_emit.scss`.
- Produces: `flatten(css): Decl[]`, `resolveVars(decls): Decl[]`, `normalize(value): string`(`test/lib/flatten.ts`); `src/styles/index.scss`가 스튜디오 전체 CSS를 내놓는다; `dist/ohf.css`에 스튜디오 규칙 포함.

원본 섹션 경계(줄 번호는 `grep -n "^/\* ---------- " openhiggsfield.css`로 확인한 값):

| 파셜 | 원본 줄 |
| --- | --- |
| `base/_reset.scss` | 1–136 (토큰 블록 8–43은 제외하고 손으로 작성) |
| `base/_keyframes.scss` | 137–340 |
| `studio/_shell.scss` | 341–349 |
| `studio/_topbar.scss` | 350–387 |
| `studio/_tabs.scss` | 388–462 |
| `studio/_lamp.scss` | 463–518 |
| `studio/_main.scss` | 519–527 |
| `studio/_gallery.scss` | 528–708 |
| `studio/_picking.scss` | 709–1062 |
| `studio/_empty.scss` | 1063–1176 |
| `studio/_composer.scss` | 1177–1288 |
| `studio/_attached.scss` | 1289–1424 (`.ohf-composer { --ctl-r: 10px }`는 1399–1417, 이 파셜에 있다) |
| `studio/_dock.scss` | 1425–2011 |
| `studio/_tooltips.scss` | 2012–2083 |
| `studio/_popovers.scss` | 2084–2609 |
| `studio/_asset-picker.scss` | 2610–2894 |
| `studio/_dialogs.scss` | 2895–2990 |
| `studio/_viewer.scss` | 2991–3472 |
| `studio/_entrance.scss` | 3473–3486 |
| `studio/_responsive.scss` | 3487–3710 |
| `studio/_reduced-motion.scss` | 3711–3736 |

- [ ] **Step 1: 평탄화 도우미의 실패하는 테스트**

`design/test/lib/flatten.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { flatten, normalize, resolveVars, stripComments } from "./flatten";

describe("stripComments", () => {
  it("removes block comments but not comment-like text inside strings", () => {
    const css = `a { content: "/* keep */"; /* drop */ color: red; }`;
    expect(stripComments(css)).toBe(`a { content: "/* keep */";  color: red; }`);
  });
});

describe("flatten", () => {
  it("keeps declarations in order with their selector as context", () => {
    expect(flatten(`.a { color: red; margin: 0 }\n.b { color: blue; }`)).toEqual([
      { ctx: ".a", prop: "color", value: "red" },
      { ctx: ".a", prop: "margin", value: "0" },
      { ctx: ".b", prop: "color", value: "blue" },
    ]);
  });

  it("nests at-rules into the context", () => {
    expect(flatten(`@media (max-width: 900px) { .a { gap: 4px; } }`)).toEqual([
      { ctx: "@media (max-width: 900px) > .a", prop: "gap", value: "4px" },
    ]);
  });

  it("drops statements outside any block", () => {
    expect(flatten(`@charset "UTF-8"; .a { x: 1; }`)).toEqual([{ ctx: ".a", prop: "x", value: "1" }]);
  });

  it("does not split on braces or semicolons inside strings", () => {
    const css = `.a { background: url("data:image/svg+xml,%3Csvg%3E{;}%3C/svg%3E"); }`;
    expect(flatten(css)).toEqual([
      { ctx: ".a", prop: "background", value: `url("data:image/svg+xml,%3Csvg%3E{;}%3C/svg%3E")` },
    ]);
  });
});

describe("resolveVars", () => {
  it("substitutes var() from custom properties declared anywhere in the sheet, transitively", () => {
    const decls = flatten(`.ohf { --radius-ctl: 10px; } .c { --ctl-r: var(--radius-ctl); } .d { border-radius: var(--ctl-r); }`);
    const resolved = resolveVars(decls);
    expect(resolved.at(-1)?.value).toBe("10px");
    expect(resolved[1]?.value).toBe("10px");
  });

  it("leaves names the sheet never declares alone, fallback included", () => {
    const [d] = resolveVars(flatten(`.a { left: var(--ohf-pop-x, calc(100% + 10px)); }`));
    expect(d?.value).toBe("var(--ohf-pop-x, calc(100% + 10px))");
  });
});

describe("normalize", () => {
  it("ignores whitespace around separators and letter case", () => {
    expect(normalize("rgba(255, 255, 255, 0.06)")).toBe("rgba(255,255,255,0.06)");
    expect(normalize("4 / 3")).toBe("4/3");
    expect(normalize("#EDEFEF")).toBe("#edefef");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `corepack pnpm test test/lib/flatten.test.ts`
Expected: FAIL — `./flatten` 모듈 없음.

- [ ] **Step 3: 평탄화 도우미 작성**

`design/test/lib/flatten.ts`:

```ts
export interface Decl {
  ctx: string;
  prop: string;
  value: string;
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/* Removes block comments while leaving quoted strings intact: a "/*" inside a
   data: URL must not open a comment. */
export function stripComments(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const ch = css[i]!;
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch) {
        if (css[j] === "\\") j++;
        j++;
      }
      out += css.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 2;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/* Walks the braces once. Every "prop: value" becomes a triple whose context is
   the chain of enclosing selectors and at-rules, so the same declaration under
   two media queries stays two entries. Statements outside any block, such as
   @charset, are dropped. */
export function flatten(css: string): Decl[] {
  const out: Decl[] = [];
  const stack: string[] = [];
  let buf = "";
  const push = () => {
    const text = squash(buf);
    buf = "";
    if (!text || stack.length === 0) return;
    const colon = text.indexOf(":");
    if (colon < 0) return;
    out.push({
      ctx: stack.join(" > "),
      prop: text.slice(0, colon).trim(),
      value: text.slice(colon + 1).trim(),
    });
  };
  const src = stripComments(css);
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) {
        if (src[j] === "\\") j++;
        j++;
      }
      buf += src.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "{") {
      stack.push(squash(buf));
      buf = "";
      i++;
    } else if (ch === "}") {
      push();
      stack.pop();
      i++;
    } else if (ch === ";") {
      push();
      i++;
    } else {
      buf += ch;
      i++;
    }
  }
  return out;
}

const VAR = /var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g;

/* Substitutes var() with the value declared for that name anywhere in the same
   sheet (first declaration wins) until nothing changes. Names the sheet never
   declares — the ones JS sets inline, like --thumb-x — stay as written. */
export function resolveVars(decls: Decl[]): Decl[] {
  const table = new Map<string, string>();
  for (const d of decls) {
    if (d.prop.startsWith("--") && !table.has(d.prop)) table.set(d.prop, d.value);
  }
  const resolve = (value: string) => {
    let v = value;
    for (let n = 0; n < 20; n++) {
      const next = v.replace(VAR, (m, name: string) => table.get(name) ?? m);
      if (next === v) break;
      v = next;
    }
    return v;
  };
  return decls.map((d) => ({ ...d, value: resolve(d.value) }));
}

export function normalize(value: string): string {
  return squash(value)
    .replace(/\s*([,/()])\s*/g, "$1")
    .toLowerCase();
}
```

Run: `corepack pnpm test test/lib/flatten.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 4: 실패하는 parity 테스트 작성**

`design/test/parity.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import * as sass from "sass-embedded";
import { describe, expect, it } from "vitest";

import { flatten, normalize, resolveVars, type Decl } from "./lib/flatten";

const ORIGINAL = fileURLToPath(
  new URL("../../open-higgsfield/src/openhiggsfield/openhiggsfield.css", import.meta.url),
);
const ENTRY = fileURLToPath(new URL("../src/styles/index.scss", import.meta.url));

const isCustom = (d: Decl) => d.prop.startsWith("--");
const line = (d: Decl) => `${d.ctx} | ${d.prop}: ${normalize(d.value)}`;

/* Both sheets go through Dart Sass, so its own formatting (number and colour
   serialisation, list spacing) cancels out and only real differences remain. */
function sheets() {
  const ours = sass.compile(ENTRY, { style: "expanded", logger: sass.Logger.silent }).css;
  const theirs = sass.compileString(readFileSync(ORIGINAL, "utf8"), {
    syntax: "css",
    style: "expanded",
    logger: sass.Logger.silent,
  }).css;
  return { ours: resolveVars(flatten(ours)), theirs: resolveVars(flatten(theirs)) };
}

function firstMismatch(a: string[], b: string[]): string | null {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) continue;
    const ctx = (list: string[]) => list.slice(Math.max(0, i - 2), i + 3).join("\n    ");
    return `first difference at #${i} (ours ${a.length} vs original ${b.length} declarations)\n  ours:\n    ${ctx(a)}\n  original:\n    ${ctx(b)}`;
  }
  return null;
}

describe("parity with openhiggsfield.css", () => {
  it("has the original stylesheet to compare against", () => {
    expect(existsSync(ORIGINAL), `missing ${ORIGINAL}`).toBe(true);
  });

  it("emits every declaration of the original, in order, with the same resolved value", () => {
    const { ours, theirs } = sheets();
    const diff = firstMismatch(ours.filter((d) => !isCustom(d)).map(line), theirs.filter((d) => !isCustom(d)).map(line));
    expect(diff, diff ?? "").toBeNull();
  });

  it("keeps every custom property the original declares, resolving to the same value", () => {
    const { ours, theirs } = sheets();
    const mine = ours.filter(isCustom);
    for (const d of theirs.filter(isCustom)) {
      const match = mine.find((m) => m.ctx === d.ctx && m.prop === d.prop);
      expect(match, `${d.ctx} { ${d.prop} } is missing`).toBeDefined();
      expect(normalize(match!.value), `${d.ctx} { ${d.prop} }`).toBe(normalize(d.value));
    }
  });
});
```

Run: `corepack pnpm test test/parity.test.ts`
Expected: FAIL — `src/styles/index.scss` 없음(첫 테스트는 통과).

- [ ] **Step 5: 베이스 파셜을 손으로 작성**

`design/src/styles/base/_reset.scss`(원본 1–136줄에서 토큰 블록 8–43줄만 뺀 것. 나머지 선언과 주석은 원본 그대로):

```scss
/* OpenHiggsfield AI — scoped design system.
   Identity: near-black studio, one lime accent reserved for selection,
   primary action and liveness. Structure = hairline borders; elevation =
   offset shadows. One face throughout: Inter, with tabular numerals where the
   type carries measurement. Tokens are emitted from tokens/_emit.scss. */

.ohf {
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.45;
  color: var(--tx);
  background: var(--bg);
  color-scheme: dark;
  caret-color: var(--accent);
  accent-color: var(--accent);
  -webkit-font-smoothing: antialiased;
}

.ohf *,
.ohf *::before,
.ohf *::after {
  box-sizing: border-box;
}

/* Element defaults are zeroed rather than overridden one rule at a time: every
   size, weight and gap in this file is stated by the component that owns it,
   so a leftover UA margin only ever fights it. :where() keeps the whole reset
   at zero specificity, so those component rules win without qualification. */
:where(.ohf *, .ohf *::before, .ohf *::after) {
  margin: 0;
  padding: 0;
}
:where(.ohf :is(h1, h2, h3, h4, h5, h6)) {
  font-size: inherit;
  font-weight: inherit;
}
:where(.ohf :is(ul, ol)) {
  list-style: none;
}
:where(.ohf :is(img, svg, video)) {
  display: block;
}
:where(.ohf :is(img, video)) {
  max-width: 100%;
  height: auto;
}

.ohf ::selection {
  background: rgba(209, 254, 23, 0.28);
  color: #fbfef1;
}

/* :where() keeps the reset at zero extra specificity so component classes win. */
.ohf :where(button) {
  font-family: inherit;
  border: 0;
  background: none;
  color: inherit;
  padding: 0;
  cursor: pointer;
}
.ohf :where(button:disabled) {
  cursor: default;
}
.ohf input,
.ohf textarea {
  font-family: inherit;
  color: inherit;
}
.ohf :focus-visible {
  outline: 2px solid var(--accent-32);
  outline-offset: 2px;
  border-radius: 6px;
}

/* Themed browser scroll surfaces */
.ohf ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.ohf ::-webkit-scrollbar-thumb {
  background: var(--s3);
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.ohf ::-webkit-scrollbar-thumb:hover {
  background: var(--s4);
  background-clip: padding-box;
  border: 2px solid transparent;
}
.ohf ::-webkit-scrollbar-track {
  background: transparent;
}
.ohf .ohf-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--s3) transparent;
}
```

- [ ] **Step 6: 나머지 파셜을 줄 범위로 잘라 내기**

Run (한 번에):

```bash
cd /Users/brian/works/agent/openhigsfield/design
SRC=../open-higgsfield/src/openhiggsfield/openhiggsfield.css
mkdir -p src/styles/base src/styles/studio
sed -n '137,340p'  "$SRC" > src/styles/base/_keyframes.scss
sed -n '341,349p'  "$SRC" > src/styles/studio/_shell.scss
sed -n '350,387p'  "$SRC" > src/styles/studio/_topbar.scss
sed -n '388,462p'  "$SRC" > src/styles/studio/_tabs.scss
sed -n '463,518p'  "$SRC" > src/styles/studio/_lamp.scss
sed -n '519,527p'  "$SRC" > src/styles/studio/_main.scss
sed -n '528,708p'  "$SRC" > src/styles/studio/_gallery.scss
sed -n '709,1062p' "$SRC" > src/styles/studio/_picking.scss
sed -n '1063,1176p' "$SRC" > src/styles/studio/_empty.scss
sed -n '1177,1288p' "$SRC" > src/styles/studio/_composer.scss
sed -n '1289,1424p' "$SRC" > src/styles/studio/_attached.scss
sed -n '1425,2011p' "$SRC" > src/styles/studio/_dock.scss
sed -n '2012,2083p' "$SRC" > src/styles/studio/_tooltips.scss
sed -n '2084,2609p' "$SRC" > src/styles/studio/_popovers.scss
sed -n '2610,2894p' "$SRC" > src/styles/studio/_asset-picker.scss
sed -n '2895,2990p' "$SRC" > src/styles/studio/_dialogs.scss
sed -n '2991,3472p' "$SRC" > src/styles/studio/_viewer.scss
sed -n '3473,3486p' "$SRC" > src/styles/studio/_entrance.scss
sed -n '3487,3710p' "$SRC" > src/styles/studio/_responsive.scss
sed -n '3711,3736p' "$SRC" > src/styles/studio/_reduced-motion.scss
wc -l src/styles/base/*.scss src/styles/studio/*.scss | tail -1
```

Expected: 마지막 줄 합계가 `3600 + _reset 줄 수` 근처(원본 3,736 − 토큰 블록 36 = 3,700 안팎). 각 파일의 첫 줄이 `/* ---------- <이름> ---------- */`인지 `head -1 src/styles/studio/*.scss`로 확인한다.

`design/src/styles/index.scss`:

```scss
// Order matters: tokens first, then the reset, then the studio in its original
// section order. Component and slide SCSS are imported by their own .tsx.
@use "tokens/emit";
@use "base/reset";
@use "base/keyframes";
@use "studio/shell";
@use "studio/topbar";
@use "studio/tabs";
@use "studio/lamp";
@use "studio/main";
@use "studio/gallery";
@use "studio/picking";
@use "studio/empty";
@use "studio/composer";
@use "studio/attached";
@use "studio/dock";
@use "studio/tooltips";
@use "studio/popovers";
@use "studio/asset-picker";
@use "studio/dialogs";
@use "studio/viewer";
@use "studio/entrance";
@use "studio/responsive";
@use "studio/reduced-motion";
```

- [ ] **Step 7: parity 통과시키기**

Run: `corepack pnpm test test/parity.test.ts`
Expected: PASS (3 tests). 실패하면 메시지의 `first difference at #N`을 보고 해당 파셜을 고친다. 알려진 함정과 처방:
- Sass 컴파일 오류: SCSS 문법에서 잘못 해석되는 원본 구문(예: 문자열 밖의 `//`). 해당 줄만 SCSS가 받아들이는 형태로 고친다. 값은 바꾸지 않는다.
- 값 차이가 `a / b` 꼴이면 SCSS가 나눗셈으로 계산한 것. 그 자리를 `#{"a / b"}`로 감싼다.
- `calc()`/`min()` 값이 계산된 형태로 나오면 같은 방식으로 `#{"…"}` 처리.
- 선언 수가 다르면 `sed` 범위 실수(줄 누락·중복). 표의 줄 번호와 대조한다.

- [ ] **Step 8: 진입점 연결과 빌드**

`design/src/index.ts`:

```ts
import "./styles/index.scss";

export { cssVar, tokens } from "./tokens";
export type { Token } from "./tokens";
```

Run: `corepack pnpm build && grep -c "ohf-generate" dist/ohf.css`
Expected: `dist ok`, 그다음 1 이상의 숫자.

- [ ] **Step 9: 마무리 검증**

Run: `corepack pnpm test && corepack pnpm typecheck`
Expected: 둘 다 통과.

---

### Task 4: 믹스인, 스튜디오 토큰화 패스, token-rules 테스트

**Files:**
- Create: `design/src/styles/_mixins.scss`, `design/scripts/tokenize-studio.mjs`
- Modify: `design/src/styles/base/_reset.scss`, `design/src/styles/studio/_*.scss`(스크립트가 고침)
- Test: `design/test/token-rules.test.ts`

**Interfaces:**
- Produces: 믹스인 `m.hover`, `m.active`, `m.disabled`, `m.control-states($hover-bg, $hover-color)`, `m.focus-ring`, `m.press`, `m.tabular`, `m.truncate`, `m.bp($name)`, 함수 `m.z($name)`. 컴포넌트 SCSS는 `@use "@/styles/mixins" as m;`로 쓴다.

- [ ] **Step 1: 믹스인 작성**

`design/src/styles/_mixins.scss`:

```scss
@use "sass:map";
@use "tokens/maps";

// The showcase pins a state with data-state, so every state rule is written
// for the real pseudo-class and for the pinned attribute at once.
@mixin hover {
  &:hover:not(:disabled):not([aria-disabled="true"]),
  &[data-state="hover"] {
    @content;
  }
}

@mixin active {
  &:active:not(:disabled):not([aria-disabled="true"]),
  &[data-state="active"] {
    @content;
  }
}

@mixin disabled {
  &:disabled,
  &[aria-disabled="true"],
  &[data-state="disabled"] {
    @content;
  }
}

@mixin control-states($hover-bg, $hover-color) {
  transition:
    background var(--dur-base) ease,
    border-color var(--dur-base) ease,
    color var(--dur-base) ease,
    transform var(--dur-base) var(--ease);
  @include hover {
    background: $hover-bg;
    color: $hover-color;
  }
  @include active {
    transform: scale(0.96);
  }
  @include disabled {
    color: var(--tx-off);
    cursor: default;
    transform: none;
  }
}

@mixin focus-ring {
  &:focus-visible {
    outline: 2px solid var(--accent-32);
    outline-offset: 2px;
  }
}

@mixin press {
  transition: transform var(--dur-base) var(--ease);
  &:active {
    transform: scale(0.96);
  }
}

@mixin tabular {
  font-variant-numeric: tabular-nums;
}

@mixin truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@mixin bp($name) {
  @media (max-width: map.get(maps.$bp, $name)) {
    @content;
  }
}

@function z($name) {
  @return map.get(maps.$z, $name);
}
```

- [ ] **Step 2: 실패하는 token-rules 테스트 작성**

`design/test/token-rules.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import tokens from "../src/tokens/tokens.json";

const root = fileURLToPath(new URL("..", import.meta.url));
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function scssFiles(dir: string): string[] {
  const abs = join(root, dir);
  try {
    statSync(abs);
  } catch {
    return [];
  }
  return readdirSync(abs).flatMap((name) => {
    const path = join(abs, name);
    return statSync(path).isDirectory() ? scssFiles(join(dir, name)) : path.endsWith(".scss") ? [path] : [];
  });
}

const byPrefix = (prefix: string) =>
  Object.entries(tokens)
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => norm(v));

const RULES: Record<string, string[]> = {
  "border-radius": byPrefix("radius-"),
  height: byPrefix("h-"),
  "font-size": byPrefix("fs-"),
  "font-weight": byPrefix("fw-"),
  "letter-spacing": byPrefix("ls-"),
};
const DURATIONS = byPrefix("dur-");
const NON_COLOR = /^(radius|h|fs|fw|ls|sp|dur|shadow)-|^(glint|ease|ease-slide|font-ui)$/;
const COLORS = Object.entries(tokens)
  .filter(([k]) => !NON_COLOR.test(k))
  .map(([, v]) => norm(v));
const SHADOWS = [...byPrefix("shadow-"), norm(tokens.glint)];

interface Violation {
  file: string;
  line: number;
  text: string;
}

function declarations(file: string) {
  return readFileSync(file, "utf8")
    .split("\n")
    .map((text, i) => ({ text, line: i + 1, m: /^\s*([a-z-]+)\s*:\s*([^;{]+);?\s*$/.exec(text) }))
    .filter((d) => d.m && !d.text.trim().startsWith("//"))
    .map((d) => ({ line: d.line, prop: d.m![1]!, value: norm(d.m![2]!) }));
}

/* Component SCSS may only reach a token through var(); the literal value of a
   token in a property is the drift this test exists to stop. */
function strictViolations(file: string): Violation[] {
  const out: Violation[] = [];
  for (const d of declarations(file)) {
    const rel = relative(root, file);
    if (RULES[d.prop]?.includes(d.value)) out.push({ file: rel, line: d.line, text: `${d.prop}: ${d.value}` });
    if (/^(transition|animation)(-duration)?$/.test(d.prop) && DURATIONS.some((t) => new RegExp(`(^|[\\s,])${t.replace(".", "\\.")}([\\s,]|$)`).test(d.value))) {
      out.push({ file: rel, line: d.line, text: `${d.prop}: ${d.value}` });
    }
    if ([...COLORS, ...SHADOWS].some((t) => d.value.includes(t))) out.push({ file: rel, line: d.line, text: `${d.prop}: ${d.value}` });
  }
  return out;
}

/* Slides are the customer's content: they must not borrow the app palette,
   and the only custom properties they may read are their own --sl-* ones. */
function slideViolations(file: string): Violation[] {
  const out: Violation[] = [];
  const rel = relative(root, file);
  for (const d of declarations(file)) {
    if ([...COLORS, ...SHADOWS].some((t) => d.value.includes(t))) out.push({ file: rel, line: d.line, text: `${d.prop}: ${d.value}` });
    for (const m of d.value.matchAll(/var\(--([\w-]+)/g)) {
      if (!m[1]!.startsWith("sl-")) out.push({ file: rel, line: d.line, text: `var(--${m[1]}) is an app token` });
    }
  }
  return out;
}

/* Skipped, not passed, while a directory is still empty: a green run must
   never come from checking nothing. */
const strictFiles = [...scssFiles("src/components"), ...scssFiles("src/composites")];
const slideFiles = scssFiles("src/slides");

describe("token rules", () => {
  it.skipIf(strictFiles.length === 0)(
    "components and composites use tokens through var(), never their literal values",
    () => {
      expect(strictFiles.flatMap(strictViolations)).toEqual([]);
    },
  );

  it.skipIf(slideFiles.length === 0)("slides reference only --sl-* custom properties and no app colours", () => {
    expect(slideFiles.flatMap(slideViolations)).toEqual([]);
  });

  it("recognises a literal token value", () => {
    expect(RULES["border-radius"]).toContain("10px");
    expect(COLORS).toContain("#d1fe17");
    expect(DURATIONS).toContain("0.15s");
  });
});
```

Run: `corepack pnpm test test/token-rules.test.ts`
Expected: 1 passed, 2 skipped(컴포넌트·슬라이드 SCSS가 아직 없다). Task 6과 Task 9에서 파일이 생기면 규칙 검사가 실제로 돈다.

- [ ] **Step 3: 토큰화 스크립트 작성**

`design/scripts/tokenize-studio.mjs`:

```js
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/* Rewrites literals that equal a token to var(--token), property by property,
   inside the studio partials. Runs once but is idempotent: a value already
   written as var() matches nothing here. Spacing literals stay literal on
   purpose (spec 4.6), as do 7px/9px/12px concentric corrections. */
const root = fileURLToPath(new URL("..", import.meta.url));
const DIRS = ["src/styles/base", "src/styles/studio"];

const RADIUS = { "4px": "xs", "6px": "sm", "8px": "md", "10px": "ctl", "14px": "lg", "15px": "bar", "24px": "xl", "999px": "pill" };
const HEIGHT = { "28px": "xs", "32px": "sm", "36px": "md", "38px": "lg", "46px": "bar" };
const FS = { "10.5px": "2xs", "11.5px": "xs", "12.5px": "sm", "13px": "md", "14px": "base", "15px": "lg", "22px": "title" };
const FW = { 500: "medium", 550: "strong", 600: "bold", 620: "display" };
const LS = { "-0.005em": "tight", "-0.015em": "heading", "0.16em": "caps" };
const DUR = { "0.12s": "fast", "0.15s": "base", "0.2s": "slow", "0.34s": "slide" };

function tokenizeBlock(body) {
  /* A square control (width equal to its height) keeps both literals: a height
     token next to a literal width would read as two different decisions. */
  const widths = [...body.matchAll(/(?:^|\n)\s*width:\s*([\d.]+px);/g)].map((m) => m[1]);
  let out = body;
  out = out.replace(/(\n\s*)border-radius:\s*([\d.]+px);/g, (m, ws, v) => (RADIUS[v] ? `${ws}border-radius: var(--radius-${RADIUS[v]});` : m));
  out = out.replace(/(\n\s*)height:\s*([\d.]+px);/g, (m, ws, v) => (HEIGHT[v] && !widths.includes(v) ? `${ws}height: var(--h-${HEIGHT[v]});` : m));
  out = out.replace(/(\n\s*)font-size:\s*([\d.]+px);/g, (m, ws, v) => (FS[v] ? `${ws}font-size: var(--fs-${FS[v]});` : m));
  out = out.replace(/(\n\s*)font-weight:\s*(\d+);/g, (m, ws, v) => (FW[v] ? `${ws}font-weight: var(--fw-${FW[v]});` : m));
  out = out.replace(/(\n\s*)letter-spacing:\s*(-?[\d.]+em);/g, (m, ws, v) => (LS[v] ? `${ws}letter-spacing: var(--ls-${LS[v]});` : m));
  out = out.replace(/(\n\s*)(transition|animation)(:[^;]*;)/g, (m, ws, prop, rest) =>
    `${ws}${prop}${rest.replace(/(?<=\s)(0\.12s|0\.15s|0\.2s|0\.34s)(?=[\s,;])/g, (d) => `var(--dur-${DUR[d]})`)}`,
  );
  out = out.replace(/--ctl-r:\s*10px;/g, "--ctl-r: var(--radius-ctl);");
  return out;
}

function tokenize(src) {
  /* Innermost blocks only: a rule inside @media is matched by itself, and the
     @media block, which contains braces, is left alone. */
  return src.replace(/\{([^{}]*)\}/g, (m, body) => `{${tokenizeBlock(body)}}`);
}

let changed = 0;
for (const dir of DIRS) {
  for (const name of readdirSync(join(root, dir)).filter((n) => n.endsWith(".scss"))) {
    const file = join(root, dir, name);
    const before = readFileSync(file, "utf8");
    const after = tokenize(before);
    if (after !== before) {
      writeFileSync(file, after);
      changed++;
    }
  }
}
console.log(`tokenized ${changed} partials`);
```

- [ ] **Step 4: 스크립트 실행과 parity 유지 확인**

Run: `cd /Users/brian/works/agent/openhigsfield/design && node scripts/tokenize-studio.mjs`
Expected: `tokenized N partials`(N ≥ 15).

Run: `grep -c "var(--radius-\|var(--h-\|var(--fs-\|var(--fw-\|var(--ls-\|var(--dur-" src/styles/studio/*.scss src/styles/base/*.scss | tail -3 && grep -n "ctl-r" src/styles/studio/_attached.scss`
Expected: 파셜마다 치환 수가 보이고, `_attached.scss`에 `--ctl-r: var(--radius-ctl);`.

Run: `corepack pnpm test test/parity.test.ts`
Expected: PASS — 토큰화는 값을 바꾸지 않으므로 어긋남 0. 실패하면 메시지의 선언을 보고 해당 치환을 되돌린다(스크립트를 고친 뒤 파셜을 Task 3 Step 6으로 다시 만들고 재실행한다).

Run: `node scripts/tokenize-studio.mjs`
Expected: `tokenized 0 partials`(멱등).

- [ ] **Step 5: 믹스인이 컴파일되는지 확인**

Run: `cd /Users/brian/works/agent/openhigsfield/design && node -e 'import("sass-embedded").then(s => console.log(s.compileString(`@use "src/styles/mixins" as m; .x { @include m.control-states(var(--s3), var(--tx)); @include m.bp(sm) { gap: 0; } z-index: m.z(overlay); }`, { loadPaths: ["."] }).css))'`
Expected: `.x:hover:not(:disabled)…`, `@media (max-width: 760px)`, `z-index: 40`이 포함된 CSS가 출력된다.

- [ ] **Step 6: 마무리 검증**

Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build`
Expected: 전부 통과(token-rules 2건은 skipped), `dist ok`.

---

### Task 5: 아이콘 42개

**Files:**
- Create: `design/src/icons/index.tsx`, `design/src/icons/icons.test.tsx`
- Modify: `design/src/index.ts`

**Interfaces:**
- Produces: 기존 30개(`ImageIcon`, `VideoIcon`, `AudioIcon`, `AssetsIcon`, `KeyIcon`, `CaretDownIcon`, `CloseIcon`, `CheckIcon`, `SearchIcon`, `ShuffleIcon`, `RetryIcon`, `WarningIcon`, `ArrowRightIcon`, `PlusIcon`, `MinusIcon`, `GemIcon`, `ClockIcon`, `FormatIcon`, `PlayIcon`, `PlayBadgeIcon`, `DownloadIcon`, `OpenOutIcon`, `UploadIcon`, `CopyIcon`, `SlidersIcon`, `ArrowUpIcon`, `HeartIcon`, `TrashIcon`, `UndoIcon`, `WaveBadgeIcon`) + 신규 12개(`SparkleIcon`, `PaletteIcon`, `GripIcon`, `UserIcon`, `FilmIcon`, `LayoutIcon`, `LayersIcon`, `PhoneIcon`, `TextIcon`, `WalletIcon`, `ChevronLeftIcon`, `ChevronRightIcon`). 모두 `({ size?: number }) => JSX`, `HeartIcon`만 `filled?` 추가. `export type { IconProps }`.

- [ ] **Step 1: 실패하는 테스트 작성**

`design/src/icons/icons.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import * as icons from "./index";

const NEW = [
  "SparkleIcon", "PaletteIcon", "GripIcon", "UserIcon", "FilmIcon", "LayoutIcon",
  "LayersIcon", "PhoneIcon", "TextIcon", "WalletIcon", "ChevronLeftIcon", "ChevronRightIcon",
];

describe("icons", () => {
  const names = Object.keys(icons).filter((k) => k.endsWith("Icon"));

  it("exports 30 studio icons plus 12 new ones", () => {
    expect(names).toHaveLength(42);
    for (const n of NEW) expect(names).toContain(n);
  });

  it("draws every icon on the 16 grid, stroked in currentColor, hidden from readers", () => {
    for (const name of names) {
      const Icon = icons[name as keyof typeof icons] as (p: { size?: number }) => React.JSX.Element;
      const { container, unmount } = render(<Icon size={20} />);
      const svg = container.querySelector("svg");
      expect(svg, name).not.toBeNull();
      expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("width", "20");
      unmount();
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `corepack pnpm test src/icons`
Expected: FAIL — `./index` 없음.

- [ ] **Step 3: 기존 30개를 옮기고 12개를 추가**

Run: `cd /Users/brian/works/agent/openhigsfield/design && mkdir -p src/icons && cp ../open-higgsfield/src/openhiggsfield/icons.tsx src/icons/index.tsx`

그다음 `src/icons/index.tsx`를 열어:
1. 4번째 줄 `interface IconProps {`를 `export interface IconProps {`로 바꾼다.
2. 파일 끝에 아래를 덧붙인다(같은 16격자, 1.5px 획, `base(size)` 재사용):

```tsx

/* ---- content studio additions. Same grid, same stroke, same caps. ---- */

/* A four-point star for "write this again": the LLM's mark, never the
   generator's. */
export function SparkleIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 2.2 9.4 6.6 13.8 8 9.4 9.4 8 13.8 6.6 9.4 2.2 8 6.6 6.6Z" />
      <path d="M12.6 2.2v2.2M11.5 3.3h2.2" />
    </svg>
  );
}

export function PaletteIcon({ size = 15 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 2.2a5.8 5.8 0 1 0 0 11.6c.8 0 1.3-.6 1.3-1.3 0-.4-.2-.7-.4-1-.2-.3-.3-.6-.3-.9 0-.7.6-1.2 1.3-1.2h1a2.9 2.9 0 0 0 2.9-2.9c0-2.5-2.6-4.3-5.8-4.3Z" />
      <circle cx="5.2" cy="7.6" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="6.8" cy="5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="9.8" cy="5" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* Six dots, not three bars: a handle you drag, not a menu you open. */
export function GripIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      {[4, 8, 12].map((y) => (
        <g key={y}>
          <circle cx="6" cy={y} r="0.9" fill="currentColor" stroke="none" />
          <circle cx="10" cy={y} r="0.9" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  );
}

export function UserIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="5.4" r="2.6" />
      <path d="M2.9 13.6c.4-2.6 2.5-4.1 5.1-4.1s4.7 1.5 5.1 4.1" />
    </svg>
  );
}

export function FilmIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="1.75" y="2.4" width="12.5" height="11.2" rx="2.2" />
      <path d="M1.75 5.8h12.5M1.75 10.2h12.5M5.4 2.4v11.2M10.6 2.4v11.2" />
    </svg>
  );
}

export function LayoutIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="1.75" y="2.4" width="12.5" height="11.2" rx="2.2" />
      <path d="M1.75 6.4h12.5M6.4 6.4v7.2" />
    </svg>
  );
}

export function LayersIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 2.4 13.8 5.3 8 8.2 2.2 5.3Z" />
      <path d="M2.2 8.3 8 11.2l5.8-2.9M2.2 11.1 8 14l5.8-2.9" />
    </svg>
  );
}

export function PhoneIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="4.4" y="1.75" width="7.2" height="12.5" rx="1.8" />
      <path d="M7.2 11.8h1.6" />
    </svg>
  );
}

export function TextIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3.2 3.6h9.6M8 3.6v9M5.6 12.6h4.8" />
    </svg>
  );
}

export function WalletIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="1.75" y="3.6" width="12.5" height="9.2" rx="2" />
      <path d="M1.75 6.6h12.5M10.4 9.6h1.6" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9.8 3.4 5.4 8l4.4 4.6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6.2 3.4 10.6 8l-4.4 4.6" />
    </svg>
  );
}
```

`design/src/index.ts`에 한 줄 추가:

```ts
export * from "./icons";
```

- [ ] **Step 4: 통과 확인**

Run: `corepack pnpm test src/icons`
Expected: PASS (2 tests).

Run: `corepack pnpm test && corepack pnpm typecheck`
Expected: 둘 다 통과. `tsc`가 `React` 네임스페이스를 못 찾으면 테스트 파일 상단에 `import type { JSX } from "react";`를 넣고 `React.JSX.Element`를 `JSX.Element`로 바꾼다.

---

### Task 6: 기본 요소 1묶음 — cx, Spinner, Kbd, Tag, Button, IconButton, Chip, Pill, Segment

**Files:**
- Create: `design/src/lib/cx.ts`, `design/src/lib/cx.test.ts`, `design/src/lib/ratio.ts`, `design/src/lib/ratio.test.ts`
- Create: `design/src/components/{Spinner,Kbd,Tag,Button,IconButton,Chip,Pill,Segment}/…`
- Modify: `design/src/index.ts`

**Interfaces:**
- Consumes: Task 4 믹스인, Task 5 아이콘(`CaretDownIcon`).
- Produces:
  - `cx(...parts: Array<string | false | null | undefined>): string`
  - `ratioBox(value: string): { width: number; height: number } | null`, `ratioToCss(value: unknown, fallback: string): string`
  - `Spinner({ label?, className? })` → `.ohf-spinner`
  - `Kbd({ children })` → `<kbd class="ohf-kbd">`
  - `Tag({ tone?: "default"|"accent"|"muted" })` → `.ohf-tag`
  - `Button({ variant?: "primary"|"secondary"|"model"|"ghost"|"danger", size?: "sm"|"md"|"lg", icon?, kbd?, busy?, loading?, href?, disabled?, type?, ref? })` → `.ohf-btn.ohf-btn--<variant>.ohf-btn--<size>`; `href`가 있으면 `<a>`
  - `IconButton({ icon, "aria-label", size?: 28|30|36, ghost?, spin? })` → `.ohf-icon-btn.ohf-icon-btn--<size>`
  - `Chip({ pressed?, dot?, ratio?, disabled? })` → `.ohf-chip[aria-pressed]`
  - `Pill({ glyph?, label?, value, expanded?, caret? })` → `.ohf-ctl[aria-expanded]`
  - `Segment({ items: {id,label,icon?,"aria-label"?}[], value, onChange, size?: "sm"|"md", plate?, "aria-label" })` → `[role=tablist].ohf-tabs`, `SegmentItem`, `SegmentProps`

- [ ] **Step 1: 도우미 테스트와 구현**

`design/src/lib/cx.test.ts`:

```ts
import { expect, it } from "vitest";

import { cx } from "./cx";

it("joins truthy class names with one space", () => {
  expect(cx("a", false, "b", null, undefined, "c")).toBe("a b c");
  expect(cx()).toBe("");
});
```

`design/src/lib/cx.ts`:

```ts
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
```

`design/src/lib/ratio.test.ts`:

```ts
import { expect, it } from "vitest";

import { ratioBox, ratioToCss } from "./ratio";

it("draws a ratio as a box that fits 14px on its long side", () => {
  expect(ratioBox("16:9")).toEqual({ width: 14, height: 8 });
  expect(ratioBox("1:1")).toEqual({ width: 14, height: 14 });
  expect(ratioBox("auto")).toBeNull();
});

it("turns a ratio into an aspect-ratio value", () => {
  expect(ratioToCss("4:5", "1 / 1")).toBe("4 / 5");
  expect(ratioToCss(undefined, "1 / 1")).toBe("1 / 1");
});
```

`design/src/lib/ratio.ts`(원본 `data.ts`의 `RATIO`, `ratioBox`, `ratioToCss` 그대로):

```ts
const RATIO = /^(\d+):(\d+)$/;

/* A fixed optical box: the long side is always 14px, so 21:9 and 1:1 leave
   their labels on the same rail. */
export function ratioBox(value: string): { width: number; height: number } | null {
  const match = RATIO.exec(value);
  if (!match) return null;
  const w = Number(match[1]);
  const h = Number(match[2]);
  const scale = 14 / Math.max(w, h);
  return { width: Math.max(5, Math.round(w * scale)), height: Math.max(5, Math.round(h * scale)) };
}

export function ratioToCss(value: unknown, fallback: string): string {
  const match = RATIO.exec(String(value ?? ""));
  return match ? `${match[1]} / ${match[2]}` : fallback;
}
```

Run: `corepack pnpm test src/lib`
Expected: PASS (3 tests).

- [ ] **Step 2: Spinner, Kbd, Tag — 실패하는 테스트**

`design/src/components/Spinner/Spinner.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Spinner } from "./Spinner";

it("is decorative unless given a label", () => {
  const { container } = render(<Spinner />);
  expect(container.firstChild).toHaveClass("ohf-spinner");
  expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
});

it("announces itself when labelled", () => {
  render(<Spinner label="생성 중" />);
  expect(screen.getByRole("status", { name: "생성 중" })).toBeInTheDocument();
});
```

`design/src/components/Kbd/Kbd.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { Kbd } from "./Kbd";

it("renders a kbd element with the studio class", () => {
  const { container } = render(<Kbd>⌘↵</Kbd>);
  expect(container.querySelector("kbd")).toHaveClass("ohf-kbd");
  expect(container.querySelector("kbd")).toHaveTextContent("⌘↵");
});
```

`design/src/components/Tag/Tag.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { Tag } from "./Tag";

it("renders tones as modifiers", () => {
  const { container, rerender } = render(<Tag>카드뉴스</Tag>);
  expect(container.firstChild).toHaveClass("ohf-tag");
  expect(container.firstChild).not.toHaveClass("ohf-tag--accent");
  rerender(<Tag tone="accent">기본값</Tag>);
  expect(container.firstChild).toHaveClass("ohf-tag--accent");
});
```

Run: `corepack pnpm test src/components`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Spinner, Kbd, Tag 구현**

`design/src/components/Spinner/Spinner.tsx`:

```tsx
import { cx } from "@/lib/cx";

export interface SpinnerProps {
  /* With a label the spinner is a live region; without one it is decoration
     next to text that already says what is happening. */
  label?: string;
  className?: string;
}

export function Spinner({ label, className }: SpinnerProps) {
  return label ? (
    <span className={cx("ohf-spinner", className)} role="status" aria-label={label} />
  ) : (
    <span className={cx("ohf-spinner", className)} aria-hidden="true" />
  );
}
```

`design/src/components/Spinner/index.ts`: `export * from "./Spinner";`

`design/src/components/Kbd/Kbd.tsx`:

```tsx
import type { HTMLAttributes } from "react";

import { cx } from "@/lib/cx";

export function Kbd({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <kbd className={cx("ohf-kbd", className)} {...rest} />;
}
```

`design/src/components/Kbd/index.ts`: `export * from "./Kbd";`

`design/src/components/Tag/Tag.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./Tag.scss";

export type TagTone = "default" | "accent" | "muted";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  children: ReactNode;
}

export function Tag({ tone = "default", className, children, ...rest }: TagProps) {
  return (
    <span className={cx("ohf-tag", tone !== "default" && `ohf-tag--${tone}`, className)} {...rest}>
      {children}
    </span>
  );
}
```

`design/src/components/Tag/Tag.scss`:

```scss
.ohf-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: var(--radius-sm);
  background: var(--s3);
  color: var(--tx3);
  font-size: 11px;
  font-weight: var(--fw-strong);
  white-space: nowrap;

  &--accent {
    background: var(--accent-14);
    color: var(--accent);
  }
  &--muted {
    background: var(--s2);
    color: var(--tx4);
  }
}
```

`design/src/components/Tag/index.ts`: `export * from "./Tag";`

Run: `corepack pnpm test src/components`
Expected: PASS (4 tests).

- [ ] **Step 4: Button — 실패하는 테스트**

`design/src/components/Button/Button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("is a real button of type button by default", () => {
    render(<Button>생성</Button>);
    const el = screen.getByRole("button", { name: "생성" });
    expect(el).toHaveAttribute("type", "button");
    expect(el).toHaveClass("ohf-btn", "ohf-btn--secondary", "ohf-btn--md");
  });

  it("renders variant and size as modifiers", () => {
    render(<Button variant="primary" size="lg">생성</Button>);
    expect(screen.getByRole("button")).toHaveClass("ohf-btn--primary", "ohf-btn--lg");
  });

  it("becomes a link when given href", () => {
    render(<Button href="/projects">프로젝트</Button>);
    expect(screen.getByRole("link", { name: "프로젝트" })).toHaveAttribute("href", "/projects");
  });

  it("is disabled while busy and says so with data-busy", () => {
    render(<Button busy>생성 중</Button>);
    const el = screen.getByRole("button");
    expect(el).toBeDisabled();
    expect(el).toHaveAttribute("data-busy", "true");
  });

  it("swaps the icon for a spinner while loading", () => {
    const { container } = render(<Button loading icon={<svg data-testid="ic" />}>저장</Button>);
    expect(container.querySelector(".ohf-spinner")).not.toBeNull();
    expect(screen.queryByTestId("ic")).toBeNull();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows a keyboard hint", () => {
    render(<Button kbd="⌘↵">생성</Button>);
    expect(screen.getByRole("button").querySelector("kbd")).toHaveTextContent("⌘↵");
  });
});
```

Run: `corepack pnpm test src/components/Button`
Expected: FAIL — 모듈 없음.

- [ ] **Step 5: Button 구현**

`design/src/components/Button/Button.tsx`:

```tsx
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode, Ref } from "react";

import { Kbd } from "@/components/Kbd";
import { Spinner } from "@/components/Spinner";
import { cx } from "@/lib/cx";

import "./Button.scss";

export type ButtonVariant = "primary" | "secondary" | "model" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  kbd?: string;
  /* Busy is a run in flight: still lime, still disabled. Loading is the
     control's own wait: the icon becomes a spinner. */
  busy?: boolean;
  loading?: boolean;
  disabled?: boolean;
  href?: string;
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  kbd,
  busy = false,
  loading = false,
  disabled = false,
  href,
  type,
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  const cls = cx("ohf-btn", `ohf-btn--${variant}`, `ohf-btn--${size}`, className);
  const body = (
    <>
      {loading ? <Spinner /> : icon ? <span className="ohf-btn-icon">{icon}</span> : null}
      {children !== undefined && <span className="ohf-btn-label">{children}</span>}
      {kbd && <Kbd>{kbd}</Kbd>}
    </>
  );
  if (href !== undefined) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        className={cls}
        href={href}
        aria-disabled={disabled || undefined}
        data-busy={busy || undefined}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {body}
      </a>
    );
  }
  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type={type ?? "button"}
      className={cls}
      disabled={disabled || busy || loading}
      data-busy={busy || undefined}
      data-loading={loading || undefined}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {body}
    </button>
  );
}
```

`design/src/components/Button/Button.scss`(값은 `.ohf-generate`, `.ohf-ctl`, `.ohf-ctl--model`, `.ohf-btn-quiet`에서):

```scss
@use "@/styles/mixins" as m;

.ohf-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  height: var(--h-md);
  padding: 0 13px;
  border: 1px solid var(--line-2);
  border-radius: var(--radius-ctl);
  background: transparent;
  color: var(--tx2);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  letter-spacing: var(--ls-tight);
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  @include m.tabular;
  @include m.control-states(var(--s3), var(--tx));

  &[aria-expanded="true"] {
    background: var(--s3);
    border-color: var(--accent-32);
    color: var(--tx);
  }

  &--sm {
    height: var(--h-sm);
    padding: 0 12px;
    border-radius: var(--radius-md);
  }
  &--lg {
    height: var(--h-lg);
    padding: 0 14px;
  }

  /* The one lime button on a screen. Same face as .ohf-generate. */
  &--primary {
    border-color: transparent;
    background: linear-gradient(180deg, #d9fe3e, var(--accent));
    color: var(--accent-ink);
    font-size: var(--fs-md);
    font-weight: var(--fw-display);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
    @include m.hover {
      background: linear-gradient(180deg, #d9fe3e, var(--accent));
      color: var(--accent-ink);
      filter: brightness(1.06);
    }
    @include m.disabled {
      background: var(--s3);
      color: var(--tx4);
      box-shadow: var(--shadow-1);
    }
    /* Busy is not dead: a run in flight keeps the accent. */
    &[data-busy="true"] {
      background: var(--accent-14);
      color: var(--accent);
      box-shadow: inset 0 0 0 1px var(--accent-32);
    }
  }
  &--model {
    background: var(--s3);
    color: var(--tx);
    box-shadow: var(--shadow-1);
    @include m.hover {
      background: var(--s4);
    }
  }
  &--ghost {
    border-color: transparent;
  }
  &--danger {
    background: var(--danger-bg);
    border-color: var(--danger-line);
    color: var(--danger);
    @include m.hover {
      background: var(--danger-line);
      color: var(--danger);
    }
  }
}
.ohf-btn-icon {
  display: flex;
  flex-shrink: 0;
}
.ohf-btn-label {
  position: relative;
}
.ohf-btn[data-loading="true"] .ohf-btn-label {
  opacity: 0.7;
}
```

`design/src/components/Button/index.ts`: `export * from "./Button";`

Run: `corepack pnpm test src/components/Button`
Expected: PASS (6 tests).

- [ ] **Step 6: IconButton, Chip, Pill — 실패하는 테스트**

`design/src/components/IconButton/IconButton.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { IconButton } from "./IconButton";

it("requires a name and renders size and ghost as modifiers", () => {
  render(<IconButton icon={<svg />} aria-label="닫기" size={28} ghost />);
  const el = screen.getByRole("button", { name: "닫기" });
  expect(el).toHaveClass("ohf-icon-btn", "ohf-icon-btn--28", "ohf-icon-btn--ghost");
  expect(el).toHaveAttribute("type", "button");
});

it("defaults to 30px", () => {
  render(<IconButton icon={<svg />} aria-label="복제" />);
  expect(screen.getByRole("button")).toHaveClass("ohf-icon-btn--30");
});
```

`design/src/components/Chip/Chip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Chip } from "./Chip";

it("is a toggle when pressed is given", () => {
  const { rerender } = render(<Chip pressed>전체</Chip>);
  expect(screen.getByRole("button", { name: "전체", pressed: true })).toHaveClass("ohf-chip");
  rerender(<Chip pressed={false}>전체</Chip>);
  expect(screen.getByRole("button", { pressed: false })).toBeInTheDocument();
});

it("is a plain button without pressed", () => {
  render(<Chip>PNG</Chip>);
  expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
});

it("draws a dot or a ratio box before the label", () => {
  const { container, rerender } = render(<Chip dot>생성 중</Chip>);
  expect(container.querySelector(".ohf-chip-dot")).not.toBeNull();
  rerender(<Chip ratio="4:5">피드</Chip>);
  const box = container.querySelector<HTMLElement>(".ohf-chip-ratio");
  expect(box?.style.width).toBe("11px");
  expect(box?.style.height).toBe("14px");
});
```

`design/src/components/Pill/Pill.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Pill } from "./Pill";

it("shows label and value on the studio control pill", () => {
  render(<Pill label="장수" value="8" glyph={<svg data-testid="g" />} />);
  const el = screen.getByRole("button");
  expect(el).toHaveClass("ohf-ctl");
  expect(el.querySelector(".ohf-ctl-label")).toHaveTextContent("장수");
  expect(el.querySelector(".ohf-ctl-value")).toHaveTextContent("8");
  expect(screen.getByTestId("g").closest(".ohf-ctl-glyph")).not.toBeNull();
  expect(el).not.toHaveAttribute("aria-expanded");
});

it("reports an open panel", () => {
  render(<Pill value="최근 수정" expanded />);
  expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
});
```

Run: `corepack pnpm test src/components`
Expected: FAIL — 세 모듈 없음.

- [ ] **Step 7: IconButton, Chip, Pill 구현**

`design/src/components/IconButton/IconButton.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cx } from "@/lib/cx";

import "./IconButton.scss";

export type IconButtonSize = 28 | 30 | 36;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  icon: ReactNode;
  "aria-label": string;
  size?: IconButtonSize;
  ghost?: boolean;
  /* One turn of the glyph, fired from the press — the studio's retry mark. */
  spin?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({ icon, size = 30, ghost = false, spin = false, className, type, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cx("ohf-icon-btn", `ohf-icon-btn--${size}`, ghost && "ohf-icon-btn--ghost", className)}
      data-spin={spin || undefined}
      {...rest}
    >
      {icon}
    </button>
  );
}
```

`design/src/components/IconButton/IconButton.scss`:

```scss
@use "@/styles/mixins" as m;

/* Doubled class so a size wins over the studio's 34px default and over the
   28px the ghost modifier sets, whatever order the sheets land in. */
.ohf-icon-btn.ohf-icon-btn--28 {
  width: var(--h-xs);
  height: var(--h-xs);
}
.ohf-icon-btn.ohf-icon-btn--30 {
  width: 30px;
  height: 30px;
}
.ohf-icon-btn.ohf-icon-btn--36 {
  width: var(--h-md);
  height: var(--h-md);
}

.ohf-icon-btn {
  &[data-state="hover"] {
    background: var(--s3);
    color: var(--tx);
    border-color: var(--line-2);
  }
  &[data-state="active"] {
    transform: scale(0.96);
  }
  @include m.disabled {
    color: var(--tx-off);
    background: var(--s1);
    border-color: var(--line);
    transform: none;
  }
  &--ghost {
    @include m.hover {
      background: var(--s3);
      border-color: transparent;
    }
    @include m.disabled {
      background: transparent;
      border-color: transparent;
    }
  }
}
```

`design/src/components/IconButton/index.ts`: `export * from "./IconButton";`

`design/src/components/Chip/Chip.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cx } from "@/lib/cx";
import { ratioBox } from "@/lib/ratio";

import "./Chip.scss";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /* Given (true or false) the chip is a toggle; left out it is a plain button. */
  pressed?: boolean;
  dot?: boolean;
  ratio?: string;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Chip({ pressed, dot = false, ratio, className, type, children, ...rest }: ChipProps) {
  const box = ratio ? ratioBox(ratio) : null;
  return (
    <button type={type ?? "button"} className={cx("ohf-chip", className)} aria-pressed={pressed} {...rest}>
      {dot && <span className="ohf-chip-dot" aria-hidden="true" />}
      {ratio && <span className="ohf-chip-ratio" aria-hidden="true" style={box ?? undefined} />}
      <span className="ohf-chip-label">{children}</span>
    </button>
  );
}
```

`design/src/components/Chip/Chip.scss`:

```scss
@use "@/styles/mixins" as m;

.ohf-chip {
  &[data-state="hover"] {
    background: var(--s3);
    color: var(--tx);
  }
  &[data-state="active"] {
    transform: scale(0.96);
  }
  @include m.disabled {
    background: transparent;
    border-color: var(--line);
    color: var(--tx-off);
    transform: none;
  }
}
.ohf-chip-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
.ohf-chip-ratio {
  display: block;
  flex-shrink: 0;
  border: 1.5px solid currentColor;
  border-radius: 2px;
  opacity: 0.9;
}
```

`design/src/components/Chip/index.ts`: `export * from "./Chip";`

`design/src/components/Pill/Pill.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { CaretDownIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./Pill.scss";

export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "value"> {
  glyph?: ReactNode;
  label?: ReactNode;
  value: ReactNode;
  /* Given, the pill opens a panel and says whether it is open. */
  expanded?: boolean;
  caret?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Pill({ glyph, label, value, expanded, caret = true, className, type, ...rest }: PillProps) {
  return (
    <button type={type ?? "button"} className={cx("ohf-ctl", className)} aria-expanded={expanded} {...rest}>
      {glyph && <span className="ohf-ctl-glyph">{glyph}</span>}
      {label !== undefined && <span className="ohf-ctl-label">{label}</span>}
      <span className="ohf-ctl-value">{value}</span>
      {caret && (
        <span className="ohf-ctl-caret" aria-hidden="true">
          <CaretDownIcon />
        </span>
      )}
    </button>
  );
}
```

`design/src/components/Pill/Pill.scss`:

```scss
@use "@/styles/mixins" as m;

.ohf-ctl {
  &[data-state="hover"] {
    background: var(--s3);
    color: var(--tx);
  }
  &[data-state="active"] {
    transform: scale(0.96);
  }
  @include m.disabled {
    color: var(--tx-off);
    border-color: var(--line);
    background: transparent;
    transform: none;
  }
}
.ohf-ctl-label {
  color: var(--tx3);
}
.ohf-ctl-caret {
  display: flex;
  color: var(--tx3);
  margin-left: 1px;
}
```

`design/src/components/Pill/index.ts`: `export * from "./Pill";`

Run: `corepack pnpm test src/components`
Expected: PASS.

- [ ] **Step 8: Segment — 실패하는 테스트**

`design/src/components/Segment/Segment.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Segment } from "./Segment";

const items = [
  { id: "studio", label: "Studio" },
  { id: "projects", label: "Projects" },
];

it("renders a tablist with one selected tab and a travelling thumb", () => {
  const { container } = render(<Segment items={items} value="projects" onChange={() => {}} aria-label="구역" />);
  expect(screen.getByRole("tablist", { name: "구역" })).toHaveClass("ohf-tabs");
  expect(screen.getByRole("tab", { name: "Projects" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "Studio" })).toHaveAttribute("aria-selected", "false");
  expect(container.querySelector(".ohf-thumb")).not.toBeNull();
});

it("changes on click and on arrow keys", () => {
  const onChange = vi.fn();
  render(<Segment items={items} value="studio" onChange={onChange} aria-label="구역" />);
  fireEvent.click(screen.getByRole("tab", { name: "Projects" }));
  expect(onChange).toHaveBeenCalledWith("projects");
  fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
  expect(onChange).toHaveBeenLastCalledWith("projects");
});

it("wraps in a plate and shrinks on request", () => {
  const { container } = render(<Segment items={items} value="studio" onChange={() => {}} size="sm" plate aria-label="구역" />);
  expect(container.firstChild).toHaveClass("ohf-tabs-plate");
  expect(screen.getByRole("tablist")).toHaveClass("ohf-tabs--sm");
});
```

Run: `corepack pnpm test src/components/Segment`
Expected: FAIL — 모듈 없음.

- [ ] **Step 9: Segment 구현**

`design/src/components/Segment/Segment.tsx`(측정 로직은 원본 `topbar.tsx`와 같다):

```tsx
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./Segment.scss";

export interface SegmentItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  "aria-label"?: string;
}

export interface SegmentProps {
  items: readonly SegmentItem[];
  value: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
  /* A plate of its own for use outside the studio's floating bar. */
  plate?: boolean;
  "aria-label": string;
  className?: string;
}

export function Segment({ items, value, onChange, size = "md", plate = false, className, "aria-label": ariaLabel }: SegmentProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  /* The indicator is measured rather than derived from equal columns, so it
     morphs to each label's real width instead of padding the short ones. */
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    let live = true;
    const measure = () => {
      const active = tabs.querySelector<HTMLElement>('[aria-selected="true"]');
      if (live && active) setThumb({ x: active.offsetLeft, w: active.offsetWidth });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(tabs);
    // The face swaps in after first paint and the labels resize under it.
    void document.fonts?.ready.then(measure);
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [value]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = items.findIndex((item) => item.id === value);
    const to =
      event.key === "ArrowRight"
        ? (from + 1) % items.length
        : event.key === "ArrowLeft"
          ? (from - 1 + items.length) % items.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : -1;
    if (to < 0) return;
    event.preventDefault();
    onChange(items[to]!.id);
    tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
  };

  const list = (
    <div
      ref={tabsRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cx("ohf-tabs", size === "sm" && "ohf-tabs--sm", !plate && className)}
      onKeyDown={onKeyDown}
    >
      <span
        className="ohf-thumb"
        data-ready={thumb !== null}
        aria-hidden="true"
        style={{ "--thumb-x": `${thumb?.x ?? 0}px`, "--thumb-w": `${thumb?.w ?? 0}px` } as CSSProperties}
      />
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={item["aria-label"]}
            tabIndex={selected ? 0 : -1}
            className="ohf-tab"
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            <span className="ohf-tab-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
  return plate ? <div className={cx("ohf-tabs-plate", className)}>{list}</div> : list;
}
```

`design/src/components/Segment/Segment.scss`:

```scss
.ohf-tabs--sm .ohf-tab {
  height: var(--h-xs);
  padding: 0 12px;
  font-size: 12px;
  border-radius: 9px;
}
.ohf-tabs--sm .ohf-thumb {
  border-radius: 9px;
}
/* 13 = the tab's 10px radius plus the plate's 3px inset, so the corners stay
   concentric. */
.ohf-tabs-plate {
  display: inline-flex;
  padding: 3px;
  border-radius: 13px;
  background: var(--s1);
  border: 1px solid var(--line);
}
.ohf-tab[data-state="hover"] {
  color: var(--tx);
  background: rgba(255, 255, 255, 0.035);
}
.ohf-tab[data-state="hover"] svg {
  color: var(--tx2);
}
```

`design/src/components/Segment/index.ts`: `export * from "./Segment";`

Run: `corepack pnpm test src/components/Segment`
Expected: PASS (3 tests).

- [ ] **Step 10: 공개 API에 추가하고 검증**

`design/src/index.ts`에 추가:

```ts
export * from "./components/Button";
export * from "./components/Chip";
export * from "./components/IconButton";
export * from "./components/Kbd";
export * from "./components/Pill";
export * from "./components/Segment";
export * from "./components/Spinner";
export * from "./components/Tag";
export { cx } from "./lib/cx";
export { ratioBox, ratioToCss } from "./lib/ratio";
```

Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build`
Expected: 전부 통과. token-rules의 컴포넌트 검사가 이제 실제로 돌며 통과한다(skip이 아니다). `dist/ohf.css`에 `.ohf-btn--primary`가 있다(`grep -c "ohf-btn--primary" dist/ohf.css` ≥ 1).

알려진 처방:
- Vite가 `@use "@/styles/mixins"`를 못 찾으면 각 SCSS의 `@use` 경로를 `../../styles/mixins`로 바꾼다(모든 컴포넌트에 같은 규칙 적용, README에 기록).
- `check-dist.mjs`가 "references the @/ alias"로 실패하면 `vite.config.ts`의 `dts({ … })`에 `pathsToAliases: true`를 명시한다. 그래도 남으면 `src/` 안의 TS/TSX import를 상대 경로로 바꾼다(`@/`는 SCSS `@use`에만 남긴다).

---

### Task 7: 기본 요소 2묶음 — Field, Input, Textarea, Stepper, Switch, Slider, OptionList, Avatar, CreditBadge

**Files:**
- Create: `design/src/components/{Field,Input,Textarea,Stepper,Switch,Slider,OptionList,Avatar,CreditBadge}/…`
- Modify: `design/src/index.ts`

**Interfaces:**
- Consumes: `cx`, `ratioBox`, 아이콘 `CheckIcon`, `MinusIcon`, `PlusIcon`, `GemIcon`.
- Produces:
  - `Field({ label, hint?, required?: ReactNode, optional?: ReactNode, counter?: {value,max}, error?, value?, htmlFor?, children })` → `.ohf-field(.ohf-field--error)`
  - `Input({ invalid?, ...input })` → `.ohf-input[aria-invalid]`; `Textarea({ invalid?, ...textarea })` → `.ohf-input.ohf-input--area`
  - `Stepper({ value, min, max, onChange, suffix?, decrementLabel, incrementLabel })` → `.ohf-batch`
  - `Switch({ checked, onChange, "aria-label", disabled? })` → `[role=switch].ohf-switch`
  - `Slider({ min, max, step?, value, onChange, "aria-label" })` → `.ohf-slider`(원본 `ui.tsx`)
  - `OptionList({ options, value, onChange, ratio? })` → `.ohf-opts`(원본 `ui.tsx`)
  - `Avatar({ initials?, src?, alt?, size?: 28|32|44 })` → `.ohf-avatar`
  - `CreditBadge({ amount, unit?, icon?, locale? })` → `.ohf-credit`

- [ ] **Step 1: 실패하는 테스트 작성(9개 파일)**

`design/src/components/Field/Field.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Field } from "./Field";

it("labels its control and shows marks, counter and hint", () => {
  render(
    <Field label="주제" htmlFor="t" required="필수" counter={{ value: 16, max: 120 }} hint="한 줄이면 됩니다">
      <input id="t" />
    </Field>,
  );
  expect(screen.getByLabelText(/주제/)).toHaveAttribute("id", "t");
  expect(screen.getByText("필수")).toHaveClass("ohf-field-mark--req");
  expect(screen.getByText("16 / 120")).toHaveClass("ohf-field-counter");
  expect(screen.getByText("한 줄이면 됩니다")).toHaveClass("ohf-field-hint");
});

it("turns red past the limit and on error", () => {
  const { container, rerender } = render(
    <Field label="본문" counter={{ value: 96, max: 90 }}>
      <textarea />
    </Field>,
  );
  expect(container.firstChild).toHaveClass("ohf-field--error");
  expect(screen.getByText("96 / 90")).toHaveClass("ohf-field-counter--over");
  rerender(
    <Field label="본문" error="90자를 넘었습니다">
      <textarea />
    </Field>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("90자를 넘었습니다");
});
```

`design/src/components/Input/Input.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Input } from "./Input";

it("is a native input with the studio class and an invalid state", () => {
  render(<Input aria-label="대상 독자" invalid />);
  const el = screen.getByRole("textbox", { name: "대상 독자" });
  expect(el).toHaveClass("ohf-input");
  expect(el).toHaveAttribute("aria-invalid", "true");
});
```

`design/src/components/Textarea/Textarea.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Textarea } from "./Textarea";

it("is a native textarea wearing the input face", () => {
  render(<Textarea aria-label="꼭 넣을 내용" rows={3} />);
  const el = screen.getByRole("textbox", { name: "꼭 넣을 내용" });
  expect(el.tagName).toBe("TEXTAREA");
  expect(el).toHaveClass("ohf-input", "ohf-input--area");
});
```

`design/src/components/Stepper/Stepper.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Stepper } from "./Stepper";

it("steps within bounds and disables the edge buttons", () => {
  const onChange = vi.fn();
  render(<Stepper value={10} min={4} max={10} onChange={onChange} suffix="장" decrementLabel="한 장 줄이기" incrementLabel="한 장 늘리기" />);
  expect(screen.getByRole("button", { name: "한 장 늘리기" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "한 장 줄이기" }));
  expect(onChange).toHaveBeenCalledWith(9);
  expect(screen.getByText("10")).toHaveClass("ohf-batch-value");
  expect(screen.getByText("장")).toHaveClass("ohf-batch-max");
});
```

`design/src/components/Switch/Switch.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Switch } from "./Switch";

it("is a switch that flips on click", () => {
  const onChange = vi.fn();
  render(<Switch checked={false} onChange={onChange} aria-label="쪽 번호 표시" />);
  const el = screen.getByRole("switch", { name: "쪽 번호 표시" });
  expect(el).toHaveAttribute("aria-checked", "false");
  fireEvent.click(el);
  expect(onChange).toHaveBeenCalledWith(true);
});
```

`design/src/components/Slider/Slider.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Slider } from "./Slider";

it("is a range input whose fill follows the value", () => {
  const onChange = vi.fn();
  render(<Slider min={0} max={100} value={40} onChange={onChange} aria-label="어둡게" />);
  const el = screen.getByRole("slider", { name: "어둡게" });
  expect(el).toHaveClass("ohf-slider");
  expect(el.style.getPropertyValue("--fill")).toBe("40.0%");
  fireEvent.change(el, { target: { value: "75" } });
  expect(onChange).toHaveBeenCalledWith(75);
});
```

`design/src/components/OptionList/OptionList.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { OptionList } from "./OptionList";

const options = [
  { value: "auto", label: "Auto" },
  { value: "4:5", label: "4:5" },
];

it("lists options as pressed buttons and reports a pick", () => {
  const onChange = vi.fn();
  render(<OptionList options={options} value="4:5" onChange={onChange} ratio />);
  expect(screen.getByRole("button", { name: "4:5", pressed: true })).toHaveClass("ohf-opt");
  fireEvent.click(screen.getByRole("button", { name: "Auto" }));
  expect(onChange).toHaveBeenCalledWith("auto");
  expect(document.querySelector(".ohf-opt-box--auto")).not.toBeNull();
});
```

`design/src/components/Avatar/Avatar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Avatar } from "./Avatar";

it("shows initials or a picture at a fixed size", () => {
  const { container, rerender } = render(<Avatar initials="BK" size={44} />);
  expect(container.firstChild).toHaveClass("ohf-avatar", "ohf-avatar--44");
  expect(screen.getByText("BK")).toBeInTheDocument();
  rerender(<Avatar src="/me.png" alt="내 사진" />);
  expect(screen.getByRole("img", { name: "내 사진" })).toHaveClass("ohf-avatar-img");
});
```

`design/src/components/CreditBadge/CreditBadge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { CreditBadge } from "./CreditBadge";

it("formats the amount with thousands separators and takes a unit", () => {
  const { container } = render(<CreditBadge amount={1240} unit="크레딧" />);
  expect(container.firstChild).toHaveClass("ohf-credit");
  expect(screen.getByText("1,240")).toHaveClass("ohf-credit-amount");
  expect(screen.getByText("크레딧")).toHaveClass("ohf-credit-unit");
});
```

Run: `corepack pnpm test src/components`
Expected: 새 9개 파일 모두 FAIL(모듈 없음).

- [ ] **Step 2: Field, Input, Textarea 구현**

`design/src/components/Field/Field.tsx`:

```tsx
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./Field.scss";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /* Marks are copy, so they arrive as nodes ("필수", "선택"), never booleans. */
  required?: ReactNode;
  optional?: ReactNode;
  counter?: { value: number; max: number };
  error?: ReactNode;
  /* A value shown on the label's row, as the studio's setting popovers do. */
  value?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, required, optional, counter, error, value, htmlFor, children, className }: FieldProps) {
  const over = counter !== undefined && counter.value > counter.max;
  return (
    <div className={cx("ohf-field", (error || over) && "ohf-field--error", className)}>
      <div className="ohf-field-row">
        <label className="ohf-field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ohf-field-mark ohf-field-mark--req">{required}</span>}
          {optional && <span className="ohf-field-mark">{optional}</span>}
        </label>
        {value !== undefined && <span className="ohf-field-value">{value}</span>}
        {counter && (
          <span className={cx("ohf-field-counter", over && "ohf-field-counter--over")}>
            {counter.value} / {counter.max}
          </span>
        )}
      </div>
      {children}
      {hint !== undefined && !error && <div className="ohf-field-hint">{hint}</div>}
      {error !== undefined && (
        <div className="ohf-field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
```

`design/src/components/Field/Field.scss`:

```scss
@use "@/styles/mixins" as m;

.ohf-field-mark {
  margin-left: 6px;
  font-size: 11px;
  font-weight: var(--fw-medium);
  color: var(--tx4);
  &--req {
    color: var(--accent);
  }
}
.ohf-field-counter {
  font-size: var(--fs-xs);
  color: var(--tx4);
  @include m.tabular;
  &--over {
    color: var(--danger);
  }
}
.ohf-field-hint,
.ohf-field-error {
  font-size: var(--fs-xs);
  line-height: 1.45;
  color: var(--tx4);
}
.ohf-field-error {
  color: var(--danger);
}
.ohf-field--error .ohf-input {
  border-color: var(--danger-line);
}
```

`design/src/components/Field/index.ts`: `export * from "./Field";`

`design/src/components/Input/Input.tsx`:

```tsx
import type { InputHTMLAttributes, Ref } from "react";

import { cx } from "@/lib/cx";

import "./Input.scss";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return <input className={cx("ohf-input", className)} aria-invalid={invalid || undefined} {...rest} />;
}
```

`design/src/components/Input/Input.scss`(Textarea도 이 파일을 쓴다):

```scss
.ohf-input {
  color: var(--tx);
  &::placeholder {
    color: var(--tx4);
  }
  &[data-state="focus"] {
    border-color: var(--accent-32);
    box-shadow: 0 0 0 3px var(--accent-08);
  }
  &[aria-invalid="true"] {
    border-color: var(--danger-line);
    &:focus {
      box-shadow: 0 0 0 3px var(--danger-bg);
    }
  }
  &:disabled {
    color: var(--tx-off);
    background: transparent;
    border-color: var(--line);
  }
}
.ohf-input--area {
  resize: none;
  min-height: 72px;
  padding: 10px 12px;
  line-height: 1.5;
}
```

`design/src/components/Input/index.ts`: `export * from "./Input";`

`design/src/components/Textarea/Textarea.tsx`:

```tsx
import type { Ref, TextareaHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

import "../Input/Input.scss";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ invalid = false, className, ...rest }: TextareaProps) {
  return <textarea className={cx("ohf-input", "ohf-input--area", className)} aria-invalid={invalid || undefined} {...rest} />;
}
```

`design/src/components/Textarea/index.ts`: `export * from "./Textarea";`

- [ ] **Step 3: Stepper, Switch 구현**

`design/src/components/Stepper/Stepper.tsx`:

```tsx
import type { ReactNode } from "react";

import { MinusIcon, PlusIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./Stepper.scss";

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  suffix?: ReactNode;
  decrementLabel: string;
  incrementLabel: string;
  className?: string;
}

export function Stepper({ value, min, max, onChange, suffix, decrementLabel, incrementLabel, className }: StepperProps) {
  return (
    <div className={cx("ohf-batch", className)} role="group">
      <button
        type="button"
        className="ohf-batch-step"
        aria-label={decrementLabel}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <MinusIcon />
      </button>
      <span className="ohf-batch-value" aria-live="polite">
        {value}
        {suffix !== undefined && <span className="ohf-batch-max">{suffix}</span>}
      </span>
      <button
        type="button"
        className="ohf-batch-step"
        aria-label={incrementLabel}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
```

`design/src/components/Stepper/Stepper.scss`:

```scss
.ohf-batch[data-state="hover"] {
  background: var(--s3);
}
.ohf-batch-step[data-state="hover"] {
  background: var(--s4);
  color: var(--tx);
}
.ohf-batch-step[data-state="active"] {
  transform: scale(0.9);
}
.ohf-batch-max {
  margin-left: 2px;
}
```

`design/src/components/Stepper/index.ts`: `export * from "./Stepper";`

`design/src/components/Switch/Switch.tsx`:

```tsx
import { cx } from "@/lib/cx";

import "./Switch.scss";

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  "aria-label": string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, disabled = false, className, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx("ohf-switch", className)}
      onClick={() => onChange(!checked)}
    >
      <span className="ohf-switch-knob" aria-hidden="true" />
    </button>
  );
}
```

`design/src/components/Switch/Switch.scss`:

```scss
.ohf-switch {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--s4);
  transition: background var(--dur-base) ease;

  /* On is a state, so it is the one place this control takes the accent. */
  &[aria-checked="true"] {
    background: var(--accent);
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}
.ohf-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--tx);
  box-shadow: var(--shadow-1);
  transition:
    translate var(--dur-slow) var(--ease),
    background var(--dur-base) ease;
}
.ohf-switch[aria-checked="true"] .ohf-switch-knob {
  translate: 16px 0;
  background: var(--bg);
}
```

`design/src/components/Switch/index.ts`: `export * from "./Switch";`

- [ ] **Step 4: Slider, OptionList 구현(원본 `ui.tsx` 이식)**

`design/src/components/Slider/Slider.tsx`:

```tsx
import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (next: number) => void;
  "aria-label": string;
  className?: string;
}

export function Slider({ min, max, step = 1, value, onChange, className, "aria-label": ariaLabel }: SliderProps) {
  const fill = `${(((value - min) / (max - min || 1)) * 100).toFixed(1)}%`;
  return (
    <input
      type="range"
      className={cx("ohf-slider", className)}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      style={{ "--fill": fill } as CSSProperties}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
```

`design/src/components/Slider/index.ts`: `export * from "./Slider";`

`design/src/components/OptionList/OptionList.tsx`:

```tsx
import { useLayoutEffect, useRef } from "react";

import { CheckIcon } from "@/icons";
import { ratioBox } from "@/lib/ratio";

/** One value of an enum, on its own line: the frame the ratio is about to
    make on the left, the mark of the value in force on the right. */
function Option({
  value,
  label,
  active,
  onSelect,
  ratio,
}: {
  value: string;
  label: string;
  active: boolean;
  onSelect: () => void;
  ratio?: boolean;
}) {
  const box = ratio ? ratioBox(value) : null;
  return (
    <button type="button" className="ohf-opt" aria-pressed={active} onClick={onSelect}>
      {/* Every line of a ratio list reserves the glyph box, so the labels of
          "Auto" and "16:9" sit on the same rail. */}
      {ratio && (
        <span className="ohf-opt-ratio" aria-hidden>
          <span className={`ohf-opt-box${box ? "" : " ohf-opt-box--auto"}`} style={box ?? undefined} />
        </span>
      )}
      <span className="ohf-opt-label">{label}</span>
      {active && (
        <span className="ohf-opt-check" aria-hidden>
          <CheckIcon size={12} />
        </span>
      )}
    </button>
  );
}

export interface OptionListProps {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
  ratio?: boolean;
}

/** The values of one enum, listed down a single column. */
export function OptionList({ options, value, onChange, ratio }: OptionListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  /* A long list opens scrolled to the top, so the value in force is carried
     into view before the panel is painted. */
  useLayoutEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !current) return;
    list.scrollTop = Math.max(0, current.offsetTop - (list.clientHeight - current.offsetHeight) / 2);
  }, []);

  return (
    <div className="ohf-opts ohf-scroll" role="group" ref={listRef}>
      {options.map((option) => (
        <Option
          key={option.value}
          value={option.value}
          label={option.label}
          active={option.value === value}
          ratio={ratio}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}
```

`design/src/components/OptionList/index.ts`: `export * from "./OptionList";`

- [ ] **Step 5: Avatar, CreditBadge 구현**

`design/src/components/Avatar/Avatar.tsx`:

```tsx
import type { HTMLAttributes } from "react";

import { cx } from "@/lib/cx";

import "./Avatar.scss";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  initials?: string;
  src?: string;
  alt?: string;
  size?: 28 | 32 | 44;
}

export function Avatar({ initials, src, alt = "", size = 32, className, ...rest }: AvatarProps) {
  return (
    <span className={cx("ohf-avatar", `ohf-avatar--${size}`, className)} {...rest}>
      {src ? <img className="ohf-avatar-img" src={src} alt={alt} /> : initials}
    </span>
  );
}
```

`design/src/components/Avatar/Avatar.scss`:

```scss
.ohf-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
  background: var(--s3);
  border: 1px solid var(--line-2);
  color: var(--tx2);
  font-size: 11px;
  font-weight: var(--fw-bold);
  letter-spacing: 0.02em;
  text-transform: uppercase;

  &--28 {
    width: var(--h-xs);
    height: var(--h-xs);
    font-size: 10px;
  }
  &--32 {
    width: var(--h-sm);
    height: var(--h-sm);
  }
  &--44 {
    width: 44px;
    height: 44px;
    font-size: var(--fs-base);
  }
}
.ohf-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

`design/src/components/Avatar/index.ts`: `export * from "./Avatar";`

`design/src/components/CreditBadge/CreditBadge.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";

import { GemIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./CreditBadge.scss";

export interface CreditBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  amount: number;
  unit?: ReactNode;
  icon?: ReactNode;
  locale?: string;
}

export function CreditBadge({ amount, unit, icon, locale = "ko-KR", className, ...rest }: CreditBadgeProps) {
  return (
    <span className={cx("ohf-credit", className)} {...rest}>
      <span className="ohf-credit-icon">{icon ?? <GemIcon />}</span>
      <span className="ohf-credit-amount">{amount.toLocaleString(locale)}</span>
      {unit !== undefined && <span className="ohf-credit-unit">{unit}</span>}
    </span>
  );
}
```

`design/src/components/CreditBadge/CreditBadge.scss`:

```scss
@use "@/styles/mixins" as m;

.ohf-credit {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: var(--h-sm);
  padding: 0 11px;
  border-radius: var(--radius-md);
  background: var(--s1);
  border: 1px solid var(--line);
  color: var(--tx2);
  font-size: 12px;
  white-space: nowrap;
  @include m.tabular;
}
.ohf-credit-icon {
  display: flex;
  color: var(--tx3);
}
.ohf-credit-amount {
  font-weight: var(--fw-bold);
  color: var(--tx);
}
```

`design/src/components/CreditBadge/index.ts`: `export * from "./CreditBadge";`

- [ ] **Step 6: 공개 API와 검증**

`design/src/index.ts`에 추가:

```ts
export * from "./components/Avatar";
export * from "./components/CreditBadge";
export * from "./components/Field";
export * from "./components/Input";
export * from "./components/OptionList";
export * from "./components/Slider";
export * from "./components/Stepper";
export * from "./components/Switch";
export * from "./components/Textarea";
```

Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build`
Expected: 전부 통과, `dist ok`.

---

### Task 8: 기본 요소 3묶음 — Skeleton, Thumb, Popover/Menu/MenuRow, Dialog, Alert, UndoBar, Tooltip

**Files:**
- Create: `design/src/components/{Skeleton,Thumb,Popover,Dialog,Alert,UndoBar,Tooltip}/…`
- Modify: `design/src/index.ts`

**Interfaces:**
- Consumes: `cx`, `ratioToCss`, `IconButton`, 아이콘 `WarningIcon`, `CloseIcon`, `UndoIcon`.
- Produces:
  - `Skeleton({ label?, clock?, ratio? })` → `[role=status].ohf-skeleton`
  - `Thumb({ state: "image"|"pending"|"failed"|"empty"|"flat", src?, alt?, size?, ratio?, flatColor?, flatAccent?, icon? })` → `.ohf-frame.ohf-frame--<state>`; `ThumbState`, `ThumbProps`
  - `Popover({ variant: "setting"|"list"|"picker"|"menu"|"assets", placement?: "up"|"down"|"static", head?, x?, y? })` → `.ohf-popover.ohf-popover--<variant>`; `Menu` → `[role=menu].ohf-menu`; `MenuRow({ icon?, label, count? })` → `[role=menuitem].ohf-menu-row`
  - `Dialog({ open, title, onClose, width?, closeLabel, head?, inline?, children })` → `<dialog>` + `.ohf-dialog-panel`
  - `Alert({ icon?, action?, children })` → `[role=alert].ohf-alert`
  - `UndoBar({ text, actionLabel, onAction, durationMs, icon? })` → `.ohf-undo`
  - `Tooltip({ label, align?: "start"|"end", children })` → `.ohf-tip[data-tip]`

- [ ] **Step 1: 실패하는 테스트 작성(7개 파일)**

`design/src/components/Skeleton/Skeleton.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Skeleton } from "./Skeleton";

it("is a status plate with a label and a clock", () => {
  render(<Skeleton label="생성 중" clock="0:42" ratio="4:5" />);
  const el = screen.getByRole("status");
  expect(el).toHaveClass("ohf-skeleton");
  expect(el.style.aspectRatio).toBe("4 / 5");
  expect(screen.getByText("생성 중")).toHaveClass("ohf-skeleton-label");
  expect(screen.getByText("0:42")).toHaveClass("ohf-skeleton-clock");
});
```

`design/src/components/Thumb/Thumb.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { Thumb } from "./Thumb";

it("renders each of the five states as a modifier", () => {
  for (const state of ["image", "pending", "failed", "empty", "flat"] as const) {
    const { container, unmount } = render(<Thumb state={state} src="/a.png" size={56} />);
    expect(container.firstChild).toHaveClass("ohf-frame", `ohf-frame--${state}`);
    unmount();
  }
});

it("shows the picture only in the image state and sizes itself by width and ratio", () => {
  const { container } = render(<Thumb state="image" src="/a.png" alt="표지" size={80} ratio="1:1" />);
  const el = container.firstChild as HTMLElement;
  expect(el.querySelector("img")).toHaveAttribute("alt", "표지");
  expect(el.style.width).toBe("80px");
  expect(el.style.aspectRatio).toBe("1 / 1");
});
```

`design/src/components/Popover/Popover.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Menu, MenuRow, Popover } from "./Popover";

it("wears the variant and placement as modifiers and a head", () => {
  const { container } = render(
    <Popover variant="menu" placement="static" head="정렬">
      <Menu>
        <MenuRow icon={<svg />} label="최근 수정" count={5} />
      </Menu>
    </Popover>,
  );
  expect(container.firstChild).toHaveClass("ohf-popover", "ohf-popover--menu", "ohf-popover--static");
  expect(container.querySelector(".ohf-pop-head")).toHaveTextContent("정렬");
  expect(screen.getByRole("menu")).toHaveClass("ohf-menu");
  expect(screen.getByRole("menuitem", { name: /최근 수정/ })).toHaveClass("ohf-menu-row");
  expect(container.querySelector(".ohf-menu-count")).toHaveTextContent("5");
});

it("positions itself through the studio's custom properties", () => {
  const { container } = render(<Popover variant="setting" x={120} y={48} />);
  const el = container.firstChild as HTMLElement;
  expect(el.style.getPropertyValue("--ohf-pop-x")).toBe("120px");
  expect(el.style.getPropertyValue("--ohf-pop-y")).toBe("48px");
});
```

`design/src/components/Dialog/Dialog.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Dialog } from "./Dialog";

it("opens as a modal dialog with a title and a close button", () => {
  const onClose = vi.fn();
  render(
    <Dialog open title="내보내기" onClose={onClose} closeLabel="닫기" width={600}>
      <p>8장</p>
    </Dialog>,
  );
  const dialog = screen.getByRole("dialog", { name: "내보내기" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog.querySelector<HTMLElement>(".ohf-dialog-panel")?.style.width).toBe("600px");
  fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("renders inline as a plain dialog box when asked", () => {
  const { container } = render(
    <Dialog open inline title="크레딧 부족" onClose={() => {}} closeLabel="닫기">
      <p>12</p>
    </Dialog>,
  );
  expect(container.querySelector("dialog")).toBeNull();
  expect(screen.getByRole("dialog", { name: "크레딧 부족" })).toHaveClass("ohf-dialog-panel");
});
```

`design/src/components/Alert/Alert.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Alert } from "./Alert";

it("is an alert strip with an icon, text and an optional action", () => {
  render(<Alert action={<button type="button">다시 시도</button>}>생성 실패</Alert>);
  const el = screen.getByRole("alert");
  expect(el).toHaveClass("ohf-alert");
  expect(el.querySelector(".ohf-alert-ic svg")).not.toBeNull();
  expect(el.querySelector(".ohf-alert-text")).toHaveTextContent("생성 실패");
  expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
});
```

`design/src/components/UndoBar/UndoBar.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { UndoBar } from "./UndoBar";

it("drains over the given window and offers the undo", () => {
  const onAction = vi.fn();
  const { container } = render(<UndoBar text="슬라이드 5를 지웠습니다" actionLabel="되돌리기" onAction={onAction} durationMs={6000} />);
  expect(container.firstChild).toHaveClass("ohf-undo");
  expect(container.querySelector<HTMLElement>(".ohf-undo-drain")?.style.animationDuration).toBe("6000ms");
  fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
  expect(onAction).toHaveBeenCalledTimes(1);
});
```

`design/src/components/Tooltip/Tooltip.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { Tooltip } from "./Tooltip";

it("carries the label in data-tip and the alignment as a modifier", () => {
  const { container } = render(
    <Tooltip label="복제" align="end">
      <button type="button">c</button>
    </Tooltip>,
  );
  expect(container.firstChild).toHaveClass("ohf-tip", "ohf-tip--end");
  expect(container.firstChild).toHaveAttribute("data-tip", "복제");
});
```

Run: `corepack pnpm test src/components`
Expected: 새 7개 파일 FAIL(모듈 없음).

- [ ] **Step 2: Skeleton, Thumb 구현**

`design/src/components/Skeleton/Skeleton.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";
import { ratioToCss } from "@/lib/ratio";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  clock?: ReactNode;
  ratio?: string;
}

export function Skeleton({ label, clock, ratio, className, style, ...rest }: SkeletonProps) {
  return (
    <div
      className={cx("ohf-skeleton", className)}
      role="status"
      style={ratio ? { ...style, aspectRatio: ratioToCss(ratio, "4 / 3") } : style}
      {...rest}
    >
      {label !== undefined && <span className="ohf-skeleton-label">{label}</span>}
      {clock !== undefined && <span className="ohf-skeleton-clock">{clock}</span>}
    </div>
  );
}
```

`design/src/components/Skeleton/index.ts`: `export * from "./Skeleton";`

`design/src/components/Thumb/Thumb.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";

import { WarningIcon } from "@/icons";
import { cx } from "@/lib/cx";
import { ratioToCss } from "@/lib/ratio";

import "./Thumb.scss";

export type ThumbState = "image" | "pending" | "failed" | "empty" | "flat";

export interface ThumbProps extends HTMLAttributes<HTMLDivElement> {
  state: ThumbState;
  src?: string;
  alt?: string;
  /* Width in px; the height follows the ratio. */
  size?: number;
  ratio?: string;
  /* The flat state stands in for a slide with no picture: the deck's own
     background and accent, so they arrive from the slide style, not from here. */
  flatColor?: string;
  flatAccent?: string;
  icon?: ReactNode;
}

export function Thumb({
  state,
  src,
  alt = "",
  size = 56,
  ratio = "4:5",
  flatColor = "#1d2a44",
  flatAccent = "#ffd54a",
  icon,
  className,
  style,
  ...rest
}: ThumbProps) {
  return (
    <div
      className={cx("ohf-frame", `ohf-frame--${state}`, className)}
      style={{
        ...style,
        width: size,
        aspectRatio: ratioToCss(ratio, "4 / 5"),
        ...(state === "flat" ? { background: flatColor, color: flatAccent } : null),
      }}
      {...rest}
    >
      {state === "image" && src && <img className="ohf-frame-img" src={src} alt={alt} />}
      {state === "pending" && (
        <>
          <span className="ohf-frame-lamp" aria-hidden="true" />
          <span className="ohf-frame-line ohf-frame-line--1" aria-hidden="true" />
          <span className="ohf-frame-line ohf-frame-line--2" aria-hidden="true" />
        </>
      )}
      {state === "failed" && <span className="ohf-frame-icon">{icon ?? <WarningIcon size={18} />}</span>}
      {state === "flat" && (
        <>
          <span className="ohf-frame-bar ohf-frame-bar--1" aria-hidden="true" />
          <span className="ohf-frame-bar ohf-frame-bar--2" aria-hidden="true" />
          <span className="ohf-frame-bar ohf-frame-bar--pill" aria-hidden="true" />
        </>
      )}
    </div>
  );
}
```

`design/src/components/Thumb/Thumb.scss`:

```scss
.ohf-frame {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  border-radius: 5px;
  background: var(--s3);

  &--pending {
    background: var(--s2);
    border: 1px solid var(--line-2);
  }
  &--failed {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--danger-bg);
    border: 1px solid var(--danger-line);
    color: var(--danger);
  }
  &--empty {
    background: transparent;
    border: 1px dashed var(--line-2);
  }
  &--flat {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 18% 14%;
  }
}
.ohf-frame-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* The pending lamp is the same pulse the platform lamp carries. */
.ohf-frame-lamp {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-14);
  animation: ohf-pulse 2.4s ease-in-out infinite;
}
.ohf-frame-line {
  position: absolute;
  left: 14%;
  height: 5px;
  border-radius: 3px;
  background: var(--s4);
  &--1 {
    right: 14%;
    bottom: 20%;
  }
  &--2 {
    right: 40%;
    bottom: 36%;
  }
}
.ohf-frame-icon {
  display: flex;
}
.ohf-frame-bar {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.85);
  &--1 {
    width: 70%;
  }
  &--2 {
    width: 55%;
  }
  &--pill {
    width: 40%;
    height: 6px;
    margin-top: 2px;
    border-radius: 3px;
    background: transparent;
    border: 1px solid currentColor;
  }
}
```

`design/src/components/Thumb/index.ts`: `export * from "./Thumb";`

- [ ] **Step 3: Popover, Menu, MenuRow 구현**

`design/src/components/Popover/Popover.tsx`:

```tsx
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";

import { cx } from "@/lib/cx";

import "./Popover.scss";

export type PopoverVariant = "setting" | "list" | "picker" | "menu" | "assets";

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  variant: PopoverVariant;
  /* "up" is the studio's own (anchored above the composer). "static" takes the
     panel out of the flow of positioning, for previews. */
  placement?: "up" | "down" | "static";
  head?: ReactNode;
  x?: number;
  y?: number;
  ref?: Ref<HTMLDivElement>;
}

export function Popover({ variant, placement = "up", head, x, y, className, style, children, ...rest }: PopoverProps) {
  const pos = {
    ...(x !== undefined ? { "--ohf-pop-x": `${x}px` } : null),
    ...(y !== undefined ? { "--ohf-pop-y": `${y}px` } : null),
  } as CSSProperties;
  return (
    <div
      className={cx("ohf-popover", `ohf-popover--${variant}`, placement !== "up" && `ohf-popover--${placement}`, className)}
      style={{ ...pos, ...style }}
      {...rest}
    >
      {head !== undefined && <div className="ohf-pop-head">{head}</div>}
      {children}
    </div>
  );
}

export function Menu({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div role="menu" className={cx("ohf-menu", className)} {...rest} />;
}

export interface MenuRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon?: ReactNode;
  label: ReactNode;
  count?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function MenuRow({ icon, label, count, className, type, ...rest }: MenuRowProps) {
  return (
    <button type={type ?? "button"} role="menuitem" className={cx("ohf-menu-row", className)} {...rest}>
      {icon && <span className="ohf-menu-ic">{icon}</span>}
      <span className="ohf-menu-label">{label}</span>
      {count !== undefined && <span className="ohf-menu-count">{count}</span>}
    </button>
  );
}
```

`design/src/components/Popover/Popover.scss`:

```scss
.ohf-popover--down {
  bottom: auto;
  top: var(--ohf-pop-y, calc(100% + 10px));
  transform-origin: top left;
}
.ohf-popover--static {
  position: relative;
  top: auto;
  bottom: auto;
  left: auto;
  animation: none;
}
.ohf-menu-row[data-state="hover"] {
  background: var(--s3);
  color: var(--tx);
  .ohf-menu-ic {
    color: var(--accent);
  }
}
```

`design/src/components/Popover/index.ts`: `export * from "./Popover";`

- [ ] **Step 4: Dialog 구현**

`design/src/components/Dialog/Dialog.tsx`:

```tsx
import { useEffect, useId, useRef, type ReactNode } from "react";

import { IconButton } from "@/components/IconButton";
import { CloseIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./Dialog.scss";

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  width?: number;
  closeLabel: string;
  /* Extra head content between the title and the close button. */
  head?: ReactNode;
  /* Inline draws the panel in the flow with no <dialog> around it — for
     previews and the showcase, where a modal would take over the page. */
  inline?: boolean;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, title, onClose, width = 480, closeLabel, head, inline = false, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  /* The element owns its modality: showModal() traps focus and paints the
     backdrop. Where the runtime lacks it (jsdom), the open attribute stands in. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === "function") el.showModal();
      if (!el.open) el.setAttribute("open", "");
    } else if (!open && el.open) {
      if (typeof el.close === "function") el.close();
      el.removeAttribute("open");
    }
  }, [open]);

  const panel = (
    <div
      className={cx("ohf-dialog-panel", inline && className)}
      style={{ width }}
      tabIndex={-1}
      role={inline ? "dialog" : undefined}
      aria-labelledby={inline ? titleId : undefined}
    >
      <div className="ohf-dialog-head">
        <div className="ohf-dialog-title" id={titleId}>
          {title}
        </div>
        {head}
        <IconButton ghost size={28} icon={<CloseIcon />} aria-label={closeLabel} onClick={onClose} />
      </div>
      <div className="ohf-dialog-body">{children}</div>
    </div>
  );

  if (inline) return open ? panel : null;
  return (
    <dialog
      ref={ref}
      className={className}
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {panel}
    </dialog>
  );
}
```

`design/src/components/Dialog/Dialog.scss`:

```scss
.ohf-dialog-panel {
  max-width: calc(100vw - 32px);
}
.ohf-dialog-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 0;
}
.ohf-dialog-title {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: var(--fw-display);
  letter-spacing: -0.02em;
}
.ohf-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 18px 18px;
}
```

`design/src/components/Dialog/index.ts`: `export * from "./Dialog";`

- [ ] **Step 5: Alert, UndoBar, Tooltip 구현**

`design/src/components/Alert/Alert.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";

import { WarningIcon } from "@/icons";
import { cx } from "@/lib/cx";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function Alert({ icon, action, className, children, ...rest }: AlertProps) {
  return (
    <div role="alert" className={cx("ohf-alert", className)} {...rest}>
      <span className="ohf-alert-ic">{icon ?? <WarningIcon />}</span>
      <div className="ohf-alert-text">{children}</div>
      {action}
    </div>
  );
}
```

`design/src/components/Alert/index.ts`: `export * from "./Alert";`

`design/src/components/UndoBar/UndoBar.tsx`:

```tsx
import type { ReactNode } from "react";

import { UndoIcon } from "@/icons";
import { cx } from "@/lib/cx";

export interface UndoBarProps {
  text: ReactNode;
  actionLabel: ReactNode;
  onAction: () => void;
  /* The window to change your mind, drawn by the drain bar from the same
     number that clears the record. */
  durationMs: number;
  icon?: ReactNode;
  className?: string;
}

export function UndoBar({ text, actionLabel, onAction, durationMs, icon, className }: UndoBarProps) {
  return (
    <div className={cx("ohf-undo", className)} role="status">
      <span className="ohf-undo-drain" style={{ animationDuration: `${durationMs}ms` }} aria-hidden="true" />
      <span className="ohf-undo-text">{text}</span>
      <button type="button" className="ohf-undo-act" onClick={onAction}>
        {icon ?? <UndoIcon />}
        {actionLabel}
      </button>
    </div>
  );
}
```

`design/src/components/UndoBar/index.ts`: `export * from "./UndoBar";`

`design/src/components/Tooltip/Tooltip.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./Tooltip.scss";

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
  align?: "start" | "end";
  children: ReactNode;
}

export function Tooltip({ label, align, className, children, ...rest }: TooltipProps) {
  return (
    <span className={cx("ohf-tip", align && `ohf-tip--${align}`, className)} data-tip={label} {...rest}>
      {children}
    </span>
  );
}
```

`design/src/components/Tooltip/Tooltip.scss`:

```scss
.ohf-tip[data-state="hover"][data-tip]::after {
  opacity: 1;
  translate: -50% 0;
}
.ohf-tip--start[data-state="hover"][data-tip]::after,
.ohf-tip--end[data-state="hover"][data-tip]::after {
  translate: 0 0;
}
```

`design/src/components/Tooltip/index.ts`: `export * from "./Tooltip";`

- [ ] **Step 6: 공개 API와 검증**

`design/src/index.ts`에 추가:

```ts
export * from "./components/Alert";
export * from "./components/Dialog";
export * from "./components/Popover";
export * from "./components/Skeleton";
export * from "./components/Thumb";
export * from "./components/Tooltip";
export * from "./components/UndoBar";
```

Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build`
Expected: 전부 통과, `dist ok`. jsdom이 `HTMLDialogElement.showModal` 미구현 경고를 콘솔에 찍어도 테스트는 통과한다(`open` 속성 대체). 경고가 실패로 바뀌면 Dialog의 `typeof el.showModal === "function"` 분기를 `try { el.showModal(); } catch { /* jsdom */ }`로 바꾼다.

---

### Task 9: 슬라이드 층

**Files:**
- Create: `design/src/slides/styles.ts`, `design/src/slides/SlideFrame.tsx`, `design/src/slides/templates.tsx`, `design/src/slides/slides.scss`, `design/src/slides/index.ts`, `design/src/slides/slides.test.tsx`
- Modify: `design/src/index.ts`

**Interfaces:**
- Consumes: `cx`, `ratioToCss`.
- Produces:
  - `SLIDE_STYLES: Record<SlidePreset, SlideStyle>`, `SLIDE_PRESETS`, `type SlidePreset = "basic"|"editorial"|"impact"|"soft"`, `type SlideStyle`
  - `SlideFrame({ preset, ratio?: "4:5"|"3:4"|"1:1"|"9:16", image?, dim?: number|"grad", handle?, page?, showFooter?, position?: "start"|"mid"|"end", children })` → `.ohf-slide[data-preset]`. 기획서는 `position`을 템플릿 props에 두었지만 세로 정렬은 프레임의 레이아웃이므로 프레임이 갖는다(README에 적는다).
  - 템플릿: `CoverSlide({ kicker?, title, sub?, titleSize?: "md"|"lg" })`, `BodySlide({ title, body })`, `ListSlide({ title, items: {label, value?}[], numbered? })`, `QuoteSlide({ quote, source? })`, `CtaSlide({ title, sub?, pill? })`
  - 슬라이드 토큰(`.ohf-slide` 인라인): `--sl-bg --sl-tx --sl-acc --sl-acc-ink --sl-head --sl-head-weight --sl-head-ls --sl-head-lh --sl-body --sl-dim`

- [ ] **Step 1: 실패하는 테스트 작성**

`design/src/slides/slides.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SlideFrame } from "./SlideFrame";
import { SLIDE_PRESETS, SLIDE_STYLES } from "./styles";
import { BodySlide, CoverSlide, CtaSlide, ListSlide, QuoteSlide } from "./templates";

describe("SlideFrame", () => {
  it("carries the preset as custom properties and the ratio as aspect-ratio", () => {
    const { container } = render(
      <SlideFrame preset="editorial" ratio="1:1" handle="@sunny" page="1 / 8">
        <CoverSlide title="제목" />
      </SlideFrame>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("ohf-slide", "ohf-slide--end");
    expect(el.dataset.preset).toBe("editorial");
    expect(el.style.getPropertyValue("--sl-bg")).toBe(SLIDE_STYLES.editorial.bg);
    expect(el.style.getPropertyValue("--sl-head")).toBe(SLIDE_STYLES.editorial.head.family);
    expect(el.style.aspectRatio).toBe("1 / 1");
    expect(el.querySelector(".ohf-slide-foot")).toHaveTextContent("@sunny");
  });

  it("switches to white text over a picture and draws the dim layer", () => {
    const { container, rerender } = render(
      <SlideFrame preset="basic" image="/p.png" dim={0.58}>
        <BodySlide title="t" body="b" />
      </SlideFrame>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("ohf-slide--photo");
    expect(el.style.getPropertyValue("--sl-tx")).toBe("#ffffff");
    expect(el.style.getPropertyValue("--sl-dim")).toBe("0.58");
    expect(container.querySelector(".ohf-slide-dim")).not.toHaveClass("ohf-slide-dim--grad");
    rerender(
      <SlideFrame preset="basic" image="/p.png" dim="grad">
        <BodySlide title="t" body="b" />
      </SlideFrame>,
    );
    expect(container.querySelector(".ohf-slide-dim")).toHaveClass("ohf-slide-dim--grad");
  });

  it("has four presets", () => {
    expect(SLIDE_PRESETS).toEqual(["basic", "editorial", "impact", "soft"]);
  });
});

describe("templates", () => {
  it("render their parts", () => {
    render(
      <SlideFrame preset="basic">
        <CoverSlide kicker="가이드" title="표지" sub="부제" />
        <ListSlide title="목록" items={[{ label: "출퇴근", value: "SPF30" }, { label: "야외" }]} numbered />
        <QuoteSlide quote="인용" source="출처" />
        <CtaSlide title="CTA" pill="팔로우" />
      </SlideFrame>,
    );
    expect(screen.getByText("가이드")).toHaveClass("ohf-slide-kicker");
    expect(screen.getByRole("heading", { name: "표지" })).toHaveClass("ohf-slide-title");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("01")).toHaveClass("ohf-slide-num");
    expect(screen.getByText("인용").tagName).toBe("BLOCKQUOTE");
    expect(screen.getByText("팔로우")).toHaveClass("ohf-slide-pill");
  });
});
```

Run: `corepack pnpm test src/slides`
Expected: FAIL — 모듈 없음.

- [ ] **Step 2: 프리셋과 프레임 구현**

`design/src/slides/styles.ts`:

```ts
export type SlidePreset = "basic" | "editorial" | "impact" | "soft";

export interface SlideStyle {
  bg: string;
  tx: string;
  acc: string;
  /* Ink on the accent (kicker pill). */
  accInk: string;
  head: { family: string; weight: number; letterSpacing: string; lineHeight: number };
  body: { family: string };
}

/* The showcase loads Pretendard; the studio will map --font-ohf-inter to it at
   integration. Slides state the face by name because they are exported as
   pictures, not themed by the app. */
const SANS = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", system-ui, sans-serif';

export const SLIDE_STYLES: Record<SlidePreset, SlideStyle> = {
  basic: {
    bg: "#1d2a44",
    tx: "#ffffff",
    acc: "#ffd54a",
    accInk: "#1a1a1a",
    head: { family: SANS, weight: 800, letterSpacing: "-0.02em", lineHeight: 1.22 },
    body: { family: SANS },
  },
  editorial: {
    bg: "#f3ece0",
    tx: "#2a2320",
    acc: "#b5482f",
    accInk: "#ffffff",
    head: { family: '"Noto Serif KR", serif', weight: 700, letterSpacing: "-0.03em", lineHeight: 1.26 },
    body: { family: SANS },
  },
  impact: {
    bg: "#0f0f10",
    tx: "#ffffff",
    acc: "#ff5a3c",
    accInk: "#1a1a1a",
    head: { family: `"Black Han Sans", ${SANS}`, weight: 400, letterSpacing: "0", lineHeight: 1.18 },
    body: { family: SANS },
  },
  soft: {
    bg: "#e6efe6",
    tx: "#22332b",
    acc: "#3f7d5d",
    accInk: "#1a1a1a",
    head: { family: `"Gowun Dodum", ${SANS}`, weight: 400, letterSpacing: "-0.01em", lineHeight: 1.26 },
    body: { family: `"Gowun Dodum", ${SANS}` },
  },
};

export const SLIDE_PRESETS = Object.keys(SLIDE_STYLES) as SlidePreset[];
```

`design/src/slides/SlideFrame.tsx`:

```tsx
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";
import { ratioToCss } from "@/lib/ratio";

import { SLIDE_STYLES, type SlidePreset } from "./styles";

import "./slides.scss";

export type SlideRatio = "4:5" | "3:4" | "1:1" | "9:16";
export type SlidePosition = "start" | "mid" | "end";

export interface SlideFrameProps extends HTMLAttributes<HTMLDivElement> {
  preset: SlidePreset;
  ratio?: SlideRatio;
  image?: string;
  /* A number is a flat scrim (0–1); "grad" darkens toward the bottom. */
  dim?: number | "grad";
  handle?: ReactNode;
  page?: ReactNode;
  showFooter?: boolean;
  position?: SlidePosition;
  children: ReactNode;
}

export function SlideFrame({
  preset,
  ratio = "4:5",
  image,
  dim,
  handle,
  page,
  showFooter = true,
  position = "end",
  className,
  style,
  children,
  ...rest
}: SlideFrameProps) {
  const s = SLIDE_STYLES[preset];
  /* Over a picture the type is always white: the scrim, not the preset,
     carries the contrast. */
  const vars = {
    "--sl-bg": s.bg,
    "--sl-tx": image ? "#ffffff" : s.tx,
    "--sl-acc": s.acc,
    "--sl-acc-ink": s.accInk,
    "--sl-head": s.head.family,
    "--sl-head-weight": s.head.weight,
    "--sl-head-ls": s.head.letterSpacing,
    "--sl-head-lh": s.head.lineHeight,
    "--sl-body": s.body.family,
    ...(typeof dim === "number" ? { "--sl-dim": dim } : null),
  } as CSSProperties;
  return (
    <div
      className={cx("ohf-slide", `ohf-slide--${position}`, image && "ohf-slide--photo", className)}
      data-preset={preset}
      style={{ ...vars, aspectRatio: ratioToCss(ratio, "4 / 5"), ...style }}
      {...rest}
    >
      {image && <img className="ohf-slide-img" src={image} alt="" />}
      {image && dim !== undefined && (
        <div className={cx("ohf-slide-dim", dim === "grad" && "ohf-slide-dim--grad")} aria-hidden="true" />
      )}
      <div className="ohf-slide-body">{children}</div>
      {showFooter && (handle !== undefined || page !== undefined) && (
        <div className="ohf-slide-foot">
          <span>{handle}</span>
          <span>{page}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 템플릿과 SCSS 구현**

`design/src/slides/templates.tsx`:

```tsx
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export interface CoverSlideProps {
  kicker?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  titleSize?: "md" | "lg";
}

export function CoverSlide({ kicker, title, sub, titleSize = "lg" }: CoverSlideProps) {
  return (
    <>
      {kicker !== undefined && <span className="ohf-slide-kicker">{kicker}</span>}
      <h2 className={cx("ohf-slide-title", titleSize === "md" && "ohf-slide-title--md")}>{title}</h2>
      {sub !== undefined && <p className="ohf-slide-sub">{sub}</p>}
    </>
  );
}

export interface BodySlideProps {
  title: ReactNode;
  body: ReactNode;
}

export function BodySlide({ title, body }: BodySlideProps) {
  return (
    <>
      <h2 className="ohf-slide-h">{title}</h2>
      <p className="ohf-slide-text">{body}</p>
    </>
  );
}

export interface ListSlideProps {
  title: ReactNode;
  items: readonly { label: ReactNode; value?: ReactNode }[];
  numbered?: boolean;
}

export function ListSlide({ title, items, numbered = true }: ListSlideProps) {
  return (
    <>
      <h2 className="ohf-slide-h">{title}</h2>
      <ol className="ohf-slide-list">
        {items.map((item, i) => (
          <li key={i} className="ohf-slide-item">
            {numbered && <em className="ohf-slide-num">{String(i + 1).padStart(2, "0")}</em>}
            <span className="ohf-slide-item-label">{item.label}</span>
            {item.value !== undefined && <span className="ohf-slide-item-value">{item.value}</span>}
          </li>
        ))}
      </ol>
    </>
  );
}

export interface QuoteSlideProps {
  quote: ReactNode;
  source?: ReactNode;
}

export function QuoteSlide({ quote, source }: QuoteSlideProps) {
  return (
    <>
      <span className="ohf-slide-qmark" aria-hidden="true">
        “
      </span>
      <blockquote className="ohf-slide-quote">{quote}</blockquote>
      {source !== undefined && <p className="ohf-slide-src">{source}</p>}
    </>
  );
}

export interface CtaSlideProps {
  title: ReactNode;
  sub?: ReactNode;
  pill?: ReactNode;
}

export function CtaSlide({ title, sub, pill }: CtaSlideProps) {
  return (
    <>
      <h2 className="ohf-slide-h">{title}</h2>
      {sub !== undefined && <p className="ohf-slide-sub">{sub}</p>}
      {pill !== undefined && <span className="ohf-slide-pill">{pill}</span>}
    </>
  );
}
```

`design/src/slides/slides.scss`(cqw는 1080px 원판 기준 비율. 앱 토큰을 쓰지 않는다):

```scss
// Slides are the customer's picture, not the app's chrome: every size is a
// fraction of the slide's own width (cqw) and every colour comes from the
// preset through --sl-*, never from the app palette.
.ohf-slide {
  --sl-rule: rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
  width: 100%;
  container-type: inline-size;
  background: var(--sl-bg);
  color: var(--sl-tx);
  font-family: var(--sl-body);
  word-break: keep-all;
  overflow-wrap: break-word;

  &--photo {
    --sl-rule: rgba(255, 255, 255, 0.22);
  }
}
.ohf-slide-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ohf-slide-dim {
  position: absolute;
  inset: 0;
  background: rgba(12, 18, 32, var(--sl-dim, 0.5));
  &--grad {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.05) 35%, rgba(0, 0, 0, 0.72));
  }
}
.ohf-slide-body {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 8cqw 8cqw 12cqw;
}
.ohf-slide--start .ohf-slide-body {
  justify-content: flex-start;
}
.ohf-slide--mid .ohf-slide-body {
  justify-content: center;
}
.ohf-slide--end .ohf-slide-body {
  justify-content: flex-end;
}

.ohf-slide-kicker {
  align-self: flex-start;
  margin-bottom: 3.2cqw;
  padding: 1.1cqw 2.8cqw;
  border-radius: 100cqw;
  background: var(--sl-acc);
  color: var(--sl-acc-ink);
  font-size: 3.4cqw;
  font-weight: 700;
}
.ohf-slide-title,
.ohf-slide-h {
  font-family: var(--sl-head);
  font-weight: var(--sl-head-weight);
  letter-spacing: var(--sl-head-ls);
  line-height: var(--sl-head-lh);
  text-wrap: balance;
}
.ohf-slide-title {
  font-size: 10.4cqw;
  &--md {
    font-size: 8.4cqw;
  }
}
.ohf-slide-h {
  font-size: 7.4cqw;
}
.ohf-slide-sub {
  margin-top: 2.6cqw;
  font-size: 4.2cqw;
  font-weight: 500;
  opacity: 0.9;
}
.ohf-slide-text {
  margin-top: 4cqw;
  font-size: 4.5cqw;
  line-height: 1.6;
  font-weight: 500;
  opacity: 0.95;
}
.ohf-slide-list {
  margin-top: 5cqw;
}
.ohf-slide-item {
  display: flex;
  align-items: baseline;
  gap: 3.4cqw;
  padding: 3.3cqw 0;
  border-top: 0.3cqw solid var(--sl-rule);
  font-size: 4.5cqw;
  font-weight: 600;
  &:last-child {
    border-bottom: 0.3cqw solid var(--sl-rule);
  }
}
.ohf-slide-num {
  font-style: normal;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--sl-acc);
}
.ohf-slide-item-label {
  flex: 1;
  min-width: 0;
}
.ohf-slide-item-value {
  margin-left: auto;
  font-size: 3.8cqw;
  font-weight: 500;
  opacity: 0.75;
}
.ohf-slide-qmark {
  display: block;
  height: 11cqw;
  font-family: var(--sl-head);
  font-size: 22cqw;
  font-weight: 800;
  line-height: 0.7;
  color: var(--sl-acc);
}
.ohf-slide-quote {
  font-family: var(--sl-head);
  font-size: 6.8cqw;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.ohf-slide-src {
  margin-top: 4cqw;
  font-size: 3.8cqw;
  opacity: 0.8;
}
.ohf-slide-pill {
  align-self: flex-start;
  margin-top: 6cqw;
  padding: 1.8cqw 4.4cqw;
  border: 0.4cqw solid var(--sl-acc);
  border-radius: 100cqw;
  color: var(--sl-acc);
  font-size: 4cqw;
  font-weight: 700;
}
.ohf-slide-foot {
  position: absolute;
  left: 8cqw;
  right: 8cqw;
  bottom: 5cqw;
  display: flex;
  justify-content: space-between;
  font-size: 3.1cqw;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}
```

`design/src/slides/index.ts`:

```ts
export * from "./SlideFrame";
export * from "./styles";
export * from "./templates";
```

`design/src/index.ts`에 추가: `export * from "./slides";`

- [ ] **Step 4: 검증**

Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build`
Expected: 전부 통과. token-rules의 슬라이드 검사가 이제 실제로 돌며 통과한다(앱 색 없음, `var(--sl-*)`만).

---

### Task 10: 조립 요소 9개

**Files:**
- Create: `design/src/composites/{TopBar,ProjectHeader,BriefBar,StoryboardRow,ActionStrip,CanvasPanel,ProjectCard,FormatCard,StyleCard}/…`
- Modify: `design/src/index.ts`

**Interfaces:**
- Consumes: Task 6–8 기본 요소, 아이콘, 믹스인.
- Produces:
  - `TopBar({ brand, brandHref?, brandLabel, nav: SegmentProps, credits?, creditsUnit?, topUp?, avatar? })` → `header.ohf-appbar`
  - `ProjectHeader({ back: { href?, onClick?, label }, title, tags?, status?, actions? })` → `.ohf-phead`
  - `BriefBar({ label, topic, pills?, action? })` → `.ohf-brief`
  - `StoryboardRow({ index, thumb: ThumbProps, tag?, title, sub?, counter?, prompt?, promptIcon?, status?, statusTone?: "default"|"live"|"danger", statusAction?, actions?, selected?, editing?, dragging?, onSelect? })` → `.ohf-sb-row(--selected/--editing/--dragging)`
  - `ActionStrip({ status?, actions?, notice? })` → `.ohf-astrip`
  - `CanvasPanel({ mode: SegmentProps, index, total, onPrev, onNext, prevLabel, nextLabel, stage, templates?: {label, chips}, options?: {label, pills}, actions?, hint? })` → `aside.ohf-canvas`
  - `ProjectCard({ href?, onClick?, deck, title, meta, status?, statusTone?: "done"|"live"|"draft" })` → `.ohf-pcard`
  - `FormatCard({ icon, name, description, pressed?, soon? })` → `button.ohf-fcard[aria-pressed]`
  - `StyleCard({ preview, name, description, pressed? })` → `button.ohf-scard[aria-pressed]`

- [ ] **Step 1: 실패하는 테스트 작성(9개 파일)**

`design/src/composites/TopBar/TopBar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { TopBar } from "./TopBar";

it("holds brand, scope tabs, credits and account", () => {
  render(
    <TopBar
      brand="OpenHiggsfield"
      brandLabel="홈"
      nav={{ items: [{ id: "studio", label: "Studio" }, { id: "projects", label: "Projects" }], value: "projects", onChange: () => {}, "aria-label": "구역" }}
      credits={1240}
      creditsUnit="크레딧"
      topUp={<button type="button">충전</button>}
      avatar={<span data-testid="avatar" />}
    />,
  );
  expect(screen.getByRole("banner")).toHaveClass("ohf-appbar");
  expect(screen.getByRole("link", { name: "홈" })).toHaveClass("ohf-appbar-brand");
  expect(screen.getByRole("tab", { name: "Projects" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("1,240")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "충전" })).toBeInTheDocument();
  expect(screen.getByTestId("avatar")).toBeInTheDocument();
});
```

`design/src/composites/ProjectHeader/ProjectHeader.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { ProjectHeader } from "./ProjectHeader";

it("has a back link, a heading, tags, status and actions", () => {
  render(
    <ProjectHeader
      back={{ href: "/projects", label: "프로젝트 목록으로" }}
      title="여름 자외선 차단제"
      tags={<span>카드뉴스</span>}
      status="저장됨"
      actions={<button type="button">내보내기</button>}
    />,
  );
  expect(screen.getByRole("link", { name: "프로젝트 목록으로" })).toHaveAttribute("href", "/projects");
  expect(screen.getByRole("heading", { level: 1, name: "여름 자외선 차단제" })).toHaveClass("ohf-phead-title");
  expect(screen.getByText("저장됨")).toHaveClass("ohf-phead-status");
  expect(screen.getByRole("button", { name: "내보내기" })).toBeInTheDocument();
});

it("uses a button when back has no href", () => {
  render(<ProjectHeader back={{ onClick: () => {}, label: "뒤로" }} title="t" />);
  expect(screen.getByRole("button", { name: "뒤로" })).toBeInTheDocument();
});
```

`design/src/composites/BriefBar/BriefBar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { BriefBar } from "./BriefBar";

it("shows the topic with its label and slots", () => {
  const { container } = render(<BriefBar label="주제" topic="여름철 자외선 차단제" pills={<span>8장</span>} action={<button type="button">다시</button>} />);
  expect(container.firstChild).toHaveClass("ohf-brief");
  expect(screen.getByText("주제")).toHaveClass("ohf-brief-label");
  expect(screen.getByText("여름철 자외선 차단제")).toHaveClass("ohf-brief-topic");
  expect(screen.getByRole("button", { name: "다시" })).toBeInTheDocument();
});
```

`design/src/composites/StoryboardRow/StoryboardRow.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StoryboardRow } from "./StoryboardRow";

const base = { index: 3, thumb: { state: "image" as const, src: "/a.png" }, tag: "목록", title: "상황별 추천 지수", sub: "출퇴근 · 야외" };

describe("StoryboardRow", () => {
  it("lays out number, thumb, text, prompt and actions", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <StoryboardRow {...base} prompt="도심 출근길" actions={<button type="button">복제</button>} onSelect={onSelect} />,
    );
    const row = container.firstChild as HTMLElement;
    expect(row).toHaveClass("ohf-sb-row");
    expect(row.querySelector(".ohf-sb-num")).toHaveTextContent("3");
    expect(row.querySelector(".ohf-frame--image")).not.toBeNull();
    expect(row.querySelector(".ohf-sb-title")).toHaveTextContent("상황별 추천 지수");
    expect(row.querySelector(".ohf-sb-prompt-text")).toHaveTextContent("도심 출근길");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("marks selected, editing and dragging", () => {
    const { container, rerender } = render(<StoryboardRow {...base} selected />);
    expect(container.firstChild).toHaveClass("ohf-sb-row--selected");
    expect(container.firstChild).toHaveAttribute("aria-current", "true");
    rerender(<StoryboardRow {...base} editing dragging />);
    expect(container.firstChild).toHaveClass("ohf-sb-row--editing", "ohf-sb-row--dragging");
  });

  it("shows a status instead of the prompt, with a tone and an action", () => {
    const { container } = render(
      <StoryboardRow {...base} thumb={{ state: "failed" }} status="생성 실패" statusTone="danger" statusAction={<button type="button">다시 시도</button>} />,
    );
    expect(container.querySelector(".ohf-sb-status")).toHaveClass("ohf-sb-status--danger");
    expect(container.querySelector(".ohf-sb-prompt")).toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("turns the counter red past the limit", () => {
    const { container } = render(<StoryboardRow {...base} counter={{ value: 96, max: 90 }} />);
    expect(container.querySelector(".ohf-sb-counter")).toHaveClass("ohf-sb-counter--over");
  });
});
```

`design/src/composites/ActionStrip/ActionStrip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { ActionStrip } from "./ActionStrip";

it("puts status left, actions right and a notice above", () => {
  const { container } = render(
    <ActionStrip status="7장 생성 대기" actions={<button type="button">생성</button>} notice={<div role="alert">오류</div>} />,
  );
  expect(container.firstChild).toHaveClass("ohf-astrip");
  expect(screen.getByText("7장 생성 대기").closest(".ohf-astrip-status")).not.toBeNull();
  expect(screen.getByRole("alert").closest(".ohf-astrip-notice")).not.toBeNull();
  expect(screen.getByRole("button", { name: "생성" })).toBeInTheDocument();
});
```

`design/src/composites/CanvasPanel/CanvasPanel.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { CanvasPanel } from "./CanvasPanel";

it("pages through slides and hosts the stage and its rows", () => {
  const onNext = vi.fn();
  render(
    <CanvasPanel
      mode={{ items: [{ id: "slide", label: "슬라이드" }, { id: "phone", label: "휴대폰" }], value: "slide", onChange: () => {}, "aria-label": "보기" }}
      index={1}
      total={8}
      onPrev={() => {}}
      onNext={onNext}
      prevLabel="이전 슬라이드"
      nextLabel="다음 슬라이드"
      stage={<div data-testid="stage" />}
      templates={{ label: "템플릿", chips: <button type="button">표지</button> }}
      options={{ label: "옵션", pills: <span>위치</span> }}
      actions={<button type="button">PNG</button>}
      hint="힌트"
    />,
  );
  expect(screen.getByRole("complementary")).toHaveClass("ohf-canvas");
  expect(screen.getByRole("button", { name: "이전 슬라이드" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "다음 슬라이드" }));
  expect(onNext).toHaveBeenCalledTimes(1);
  expect(screen.getByText("1 / 8")).toHaveClass("ohf-canvas-pager");
  expect(screen.getByTestId("stage").closest(".ohf-canvas-stage")).not.toBeNull();
  expect(screen.getByText("힌트")).toHaveClass("ohf-canvas-hint");
});
```

`design/src/composites/ProjectCard/ProjectCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { ProjectCard } from "./ProjectCard";

it("is a link card with a deck, title, meta and a status tone", () => {
  render(<ProjectCard href="/p/1" deck={<span data-testid="deck" />} title="아침 루틴" meta="카드뉴스 · 6장" status="3장 생성 중" statusTone="live" />);
  const card = screen.getByRole("link", { name: /아침 루틴/ });
  expect(card).toHaveClass("ohf-pcard");
  expect(card.querySelector(".ohf-pcard-status")).toHaveClass("ohf-pcard-status--live");
  expect(screen.getByTestId("deck").closest(".ohf-pcard-deck")).not.toBeNull();
});

it("is a button without href", () => {
  render(<ProjectCard onClick={() => {}} deck={null} title="t" meta="m" />);
  expect(screen.getByRole("button")).toHaveClass("ohf-pcard");
});
```

`design/src/composites/FormatCard/FormatCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { FormatCard } from "./FormatCard";

it("is a pressed toggle with icon, name and description", () => {
  render(<FormatCard icon={<svg />} name="카드뉴스" description="캐러셀" pressed />);
  expect(screen.getByRole("button", { pressed: true })).toHaveClass("ohf-fcard");
});

it("is disabled and tagged when coming soon", () => {
  render(<FormatCard icon={<svg />} name="릴스" description="세로 영상" soon="준비 중" />);
  const el = screen.getByRole("button");
  expect(el).toBeDisabled();
  expect(el).toHaveClass("ohf-fcard--soon");
  expect(screen.getByText("준비 중")).toHaveClass("ohf-tag");
});
```

`design/src/composites/StyleCard/StyleCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { StyleCard } from "./StyleCard";

it("shows a preview, a name and a check when pressed", () => {
  const { container } = render(<StyleCard preview={<span data-testid="pv" />} name="기본 고딕" description="남색과 노랑" pressed />);
  expect(screen.getByRole("button", { pressed: true })).toHaveClass("ohf-scard");
  expect(screen.getByTestId("pv").closest(".ohf-scard-preview")).not.toBeNull();
  expect(container.querySelector(".ohf-scard-check")).not.toBeNull();
});
```

Run: `corepack pnpm test src/composites`
Expected: 9개 파일 FAIL(모듈 없음).

- [ ] **Step 2: TopBar, ProjectHeader, BriefBar 구현**

`design/src/composites/TopBar/TopBar.tsx`:

```tsx
import type { ReactNode } from "react";

import { CreditBadge } from "@/components/CreditBadge";
import { Segment, type SegmentProps } from "@/components/Segment";
import { cx } from "@/lib/cx";

import "./TopBar.scss";

export interface TopBarProps {
  brand: ReactNode;
  brandHref?: string;
  brandLabel: string;
  nav: SegmentProps;
  credits?: number;
  creditsUnit?: ReactNode;
  topUp?: ReactNode;
  avatar?: ReactNode;
  className?: string;
}

export function TopBar({ brand, brandHref = "/", brandLabel, nav, credits, creditsUnit, topUp, avatar, className }: TopBarProps) {
  return (
    <header className={cx("ohf-appbar", className)}>
      <a className="ohf-appbar-brand" href={brandHref} aria-label={brandLabel}>
        <span className="ohf-appbar-mark" aria-hidden="true">
          <span />
        </span>
        <span className="ohf-appbar-name">{brand}</span>
      </a>
      <Segment {...nav} size="sm" plate />
      <span className="ohf-appbar-spacer" />
      {credits !== undefined && <CreditBadge amount={credits} unit={creditsUnit} />}
      {topUp}
      {avatar}
    </header>
  );
}
```

`design/src/composites/TopBar/TopBar.scss`:

```scss
.ohf-appbar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 56px;
  padding: 0 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.ohf-appbar-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--tx);
  text-decoration: none;
}
.ohf-appbar-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  > span {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--accent-ink);
  }
}
.ohf-appbar-name {
  font-size: 13.5px;
  font-weight: var(--fw-display);
  letter-spacing: -0.01em;
}
.ohf-appbar-spacer {
  flex: 1 1 auto;
  min-width: 0;
}
```

`design/src/composites/TopBar/index.ts`: `export * from "./TopBar";`

`design/src/composites/ProjectHeader/ProjectHeader.tsx`:

```tsx
import type { ReactNode } from "react";

import { IconButton } from "@/components/IconButton";
import { ChevronLeftIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./ProjectHeader.scss";

export interface ProjectHeaderProps {
  back: { href?: string; onClick?: () => void; label: string };
  title: ReactNode;
  tags?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ProjectHeader({ back, title, tags, status, actions, className }: ProjectHeaderProps) {
  return (
    <div className={cx("ohf-phead", className)}>
      {back.href ? (
        <a className="ohf-phead-back" href={back.href} aria-label={back.label}>
          <ChevronLeftIcon size={18} />
        </a>
      ) : (
        <IconButton ghost size={30} icon={<ChevronLeftIcon size={18} />} aria-label={back.label} onClick={back.onClick} />
      )}
      <h1 className="ohf-phead-title">{title}</h1>
      {tags}
      {status !== undefined && <span className="ohf-phead-status">{status}</span>}
      <span className="ohf-phead-spacer" />
      {actions}
    </div>
  );
}
```

`design/src/composites/ProjectHeader/ProjectHeader.scss`:

```scss
@use "@/styles/mixins" as m;

.ohf-phead {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 20px 0 12px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.ohf-phead-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--h-sm);
  height: var(--h-sm);
  border-radius: var(--radius-md);
  color: var(--tx3);
  @include m.control-states(var(--s3), var(--tx));
}
.ohf-phead-title {
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  letter-spacing: -0.01em;
  color: var(--tx);
  white-space: nowrap;
}
.ohf-phead-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
  color: var(--tx4);
  font-size: var(--fs-xs);
}
.ohf-phead-spacer {
  flex: 1 1 auto;
  min-width: 0;
}
```

`design/src/composites/ProjectHeader/index.ts`: `export * from "./ProjectHeader";`

`design/src/composites/BriefBar/BriefBar.tsx`:

```tsx
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./BriefBar.scss";

export interface BriefBarProps {
  label: ReactNode;
  topic: ReactNode;
  pills?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function BriefBar({ label, topic, pills, action, className }: BriefBarProps) {
  return (
    <div className={cx("ohf-brief", className)}>
      <span className="ohf-brief-label">{label}</span>
      <span className="ohf-brief-topic">{topic}</span>
      {pills}
      {action}
    </div>
  );
}
```

`design/src/composites/BriefBar/BriefBar.scss`:

```scss
@use "@/styles/mixins" as m;

/* The composer's own card: same plate, same hairline, same glint. */
.ohf-brief {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 14px;
  border-radius: var(--radius-lg);
  background: var(--s2);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-2), var(--glint);
}
.ohf-brief-label {
  flex-shrink: 0;
  font-size: var(--fs-xs);
  font-weight: var(--fw-strong);
  color: var(--tx3);
}
.ohf-brief-topic {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  color: var(--tx);
  @include m.truncate;
}
```

`design/src/composites/BriefBar/index.ts`: `export * from "./BriefBar";`

- [ ] **Step 3: StoryboardRow, ActionStrip 구현**

`design/src/composites/StoryboardRow/StoryboardRow.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from "react";

import { Tag } from "@/components/Tag";
import { Thumb, type ThumbProps } from "@/components/Thumb";
import { GripIcon, ImageIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./StoryboardRow.scss";

export interface StoryboardRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  index: number;
  thumb: ThumbProps;
  tag?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  counter?: { value: number; max: number };
  /* The right column is either the prompt or a status line; a status wins. */
  prompt?: ReactNode;
  promptIcon?: ReactNode;
  status?: ReactNode;
  statusTone?: "default" | "live" | "danger";
  statusAction?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  editing?: boolean;
  dragging?: boolean;
  onSelect?: () => void;
}

export function StoryboardRow({
  index,
  thumb,
  tag,
  title,
  sub,
  counter,
  prompt,
  promptIcon,
  status,
  statusTone = "default",
  statusAction,
  actions,
  selected = false,
  editing = false,
  dragging = false,
  onSelect,
  className,
  ...rest
}: StoryboardRowProps) {
  const over = counter !== undefined && counter.value > counter.max;
  return (
    <div
      className={cx(
        "ohf-sb-row",
        selected && "ohf-sb-row--selected",
        editing && "ohf-sb-row--editing",
        dragging && "ohf-sb-row--dragging",
        className,
      )}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      {...rest}
    >
      <div className="ohf-sb-num">
        <span className="ohf-sb-grip" aria-hidden="true">
          <GripIcon size={14} />
        </span>
        <span>{index}</span>
      </div>
      <Thumb {...thumb} />
      <div className="ohf-sb-text">
        {tag !== undefined && <Tag>{tag}</Tag>}
        <div className="ohf-sb-title">{title}</div>
        {(sub !== undefined || counter) && (
          <div className="ohf-sb-sub">
            <span className="ohf-sb-sub-text">{sub}</span>
            {counter && (
              <span className={cx("ohf-sb-counter", over && "ohf-sb-counter--over")}>
                {counter.value} / {counter.max}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="ohf-sb-side">
        {status !== undefined ? (
          <span className={cx("ohf-sb-status", statusTone !== "default" && `ohf-sb-status--${statusTone}`)}>
            {statusTone === "live" && <span className="ohf-sb-lamp" aria-hidden="true" />}
            {status}
          </span>
        ) : prompt !== undefined ? (
          <span className="ohf-sb-prompt">
            <span className="ohf-sb-prompt-ic">{promptIcon ?? <ImageIcon size={13} />}</span>
            <span className="ohf-sb-prompt-text">{prompt}</span>
          </span>
        ) : null}
        {statusAction}
      </div>
      <div className="ohf-sb-actions">{actions}</div>
    </div>
  );
}
```

`design/src/composites/StoryboardRow/StoryboardRow.scss`:

```scss
@use "@/styles/mixins" as m;

.ohf-sb-row {
  display: grid;
  grid-template-columns: 28px 56px minmax(0, 1.15fr) minmax(0, 1fr) 92px;
  gap: 12px;
  align-items: center;
  height: 90px;
  padding: 0 16px 0 12px;
  border-left: 2px solid transparent;
  border-bottom: 1px solid var(--line);
  transition: background var(--dur-base) ease;

  &:hover,
  &[data-state="hover"] {
    background: var(--rail);
  }
  /* Selection is the one place the row takes the accent: a bar, not a fill. */
  &--selected {
    background: var(--s1);
    border-left-color: var(--accent);
  }
  &--editing {
    background: var(--s1);
    box-shadow: inset 0 0 0 1px var(--accent-32);
  }
  &--dragging {
    opacity: 0.6;
    background: var(--s2);
    box-shadow: var(--shadow-2);
  }
}
.ohf-sb-num {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: var(--fw-medium);
  color: var(--tx3);
  @include m.tabular;
}
.ohf-sb-row--selected .ohf-sb-num {
  color: var(--tx);
  font-weight: var(--fw-bold);
}
.ohf-sb-grip {
  display: flex;
  color: transparent;
}
.ohf-sb-row--selected .ohf-sb-grip,
.ohf-sb-row:hover .ohf-sb-grip,
.ohf-sb-row[data-state="hover"] .ohf-sb-grip,
.ohf-sb-row--dragging .ohf-sb-grip {
  color: var(--tx4);
}
.ohf-sb-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 0;
}
.ohf-sb-title {
  max-width: 100%;
  font-size: 13.5px;
  font-weight: var(--fw-bold);
  letter-spacing: var(--ls-tight);
  color: var(--tx);
  @include m.truncate;
}
.ohf-sb-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  font-size: 12px;
  color: var(--tx3);
}
.ohf-sb-sub-text {
  @include m.truncate;
}
.ohf-sb-counter {
  flex-shrink: 0;
  @include m.tabular;
  &--over {
    color: var(--danger);
  }
}
.ohf-sb-side {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ohf-sb-prompt {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  background: var(--s1);
  border: 1px solid var(--line);
  color: var(--tx2);
  font-size: 12px;
}
.ohf-sb-row--selected .ohf-sb-prompt {
  background: var(--s2);
}
.ohf-sb-prompt-ic {
  display: flex;
  flex-shrink: 0;
  color: var(--tx4);
}
.ohf-sb-prompt-text {
  @include m.truncate;
}
.ohf-sb-status {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  color: var(--tx4);
  @include m.truncate;
  &--live {
    color: var(--tx3);
  }
  &--danger {
    color: var(--danger);
  }
}
.ohf-sb-lamp {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: ohf-pulse 2.4s ease-in-out infinite;
}
.ohf-sb-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}
```

`design/src/composites/StoryboardRow/index.ts`: `export * from "./StoryboardRow";`

`design/src/composites/ActionStrip/ActionStrip.tsx`:

```tsx
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./ActionStrip.scss";

export interface ActionStripProps {
  status?: ReactNode;
  actions?: ReactNode;
  /* An Alert or UndoBar rides above the row, in the strip's own space —
     the studio gains no second floating layer. */
  notice?: ReactNode;
  className?: string;
}

export function ActionStrip({ status, actions, notice, className }: ActionStripProps) {
  return (
    <div className={cx("ohf-astrip", className)}>
      {notice !== undefined && <div className="ohf-astrip-notice">{notice}</div>}
      <div className="ohf-astrip-row">
        <div className="ohf-astrip-status">{status}</div>
        <span className="ohf-astrip-spacer" />
        {actions}
      </div>
    </div>
  );
}
```

`design/src/composites/ActionStrip/ActionStrip.scss`:

```scss
.ohf-astrip {
  flex-shrink: 0;
  padding: 0 20px;
  border-top: 1px solid var(--line);
  background: var(--rail);
}
.ohf-astrip-notice {
  padding-top: 10px;
}
.ohf-astrip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
}
.ohf-astrip-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: var(--fs-sm);
  color: var(--tx2);
}
.ohf-astrip-spacer {
  flex: 1 1 auto;
  min-width: 0;
}
```

`design/src/composites/ActionStrip/index.ts`: `export * from "./ActionStrip";`

- [ ] **Step 4: CanvasPanel, ProjectCard 구현**

`design/src/composites/CanvasPanel/CanvasPanel.tsx`:

```tsx
import type { ReactNode } from "react";

import { IconButton } from "@/components/IconButton";
import { Segment, type SegmentProps } from "@/components/Segment";
import { ChevronLeftIcon, ChevronRightIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./CanvasPanel.scss";

export interface CanvasPanelProps {
  mode: SegmentProps;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  stage: ReactNode;
  templates?: { label: ReactNode; chips: ReactNode };
  options?: { label: ReactNode; pills: ReactNode };
  actions?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export function CanvasPanel({ mode, index, total, onPrev, onNext, prevLabel, nextLabel, stage, templates, options, actions, hint, className }: CanvasPanelProps) {
  return (
    <aside className={cx("ohf-canvas", className)}>
      <div className="ohf-canvas-head">
        <Segment {...mode} size="sm" plate />
        <span className="ohf-canvas-spacer" />
        <IconButton ghost size={30} icon={<ChevronLeftIcon />} aria-label={prevLabel} onClick={onPrev} disabled={index <= 1} />
        <span className="ohf-canvas-pager">
          {index} / {total}
        </span>
        <IconButton ghost size={30} icon={<ChevronRightIcon />} aria-label={nextLabel} onClick={onNext} disabled={index >= total} />
      </div>
      <div className="ohf-canvas-stage">{stage}</div>
      <div className="ohf-canvas-foot">
        {templates && (
          <div className="ohf-canvas-row">
            <span className="ohf-canvas-label">{templates.label}</span>
            {templates.chips}
          </div>
        )}
        {options && (
          <div className="ohf-canvas-row">
            <span className="ohf-canvas-label">{options.label}</span>
            {options.pills}
          </div>
        )}
        {actions !== undefined && <div className="ohf-canvas-actions">{actions}</div>}
        {hint !== undefined && <div className="ohf-canvas-hint">{hint}</div>}
      </div>
    </aside>
  );
}
```

`design/src/composites/CanvasPanel/CanvasPanel.scss`:

```scss
@use "@/styles/mixins" as m;

.ohf-canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 16px 20px;
  background: var(--rail);
  border-left: 1px solid var(--line);
}
.ohf-canvas-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.ohf-canvas-spacer {
  flex: 1 1 auto;
}
.ohf-canvas-pager {
  font-size: var(--fs-sm);
  color: var(--tx2);
  @include m.tabular;
}
/* The stage frames the slide with the app's radius and depth; the slide
   itself knows nothing of the app. */
.ohf-canvas-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  .ohf-slide {
    width: min(100%, 448px);
    border-radius: var(--radius-ctl);
    box-shadow: var(--shadow-3);
  }
}
.ohf-canvas-foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}
.ohf-canvas-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ohf-canvas-label {
  width: 44px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-strong);
  color: var(--tx3);
}
.ohf-canvas-actions {
  display: flex;
  gap: 8px;
  > * {
    flex: 1;
  }
}
.ohf-canvas-hint {
  font-size: var(--fs-xs);
  color: var(--tx4);
}
```

`design/src/composites/CanvasPanel/index.ts`: `export * from "./CanvasPanel";`

`design/src/composites/ProjectCard/ProjectCard.tsx`:

```tsx
import type { ReactNode } from "react";

import { CheckIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./ProjectCard.scss";

export interface ProjectCardProps {
  href?: string;
  onClick?: () => void;
  deck: ReactNode;
  title: ReactNode;
  meta: ReactNode;
  status?: ReactNode;
  statusTone?: "done" | "live" | "draft";
  className?: string;
}

export function ProjectCard({ href, onClick, deck, title, meta, status, statusTone = "done", className }: ProjectCardProps) {
  const body = (
    <>
      <div className="ohf-pcard-deck">{deck}</div>
      <div className="ohf-pcard-body">
        <div className="ohf-pcard-title">{title}</div>
        <div className="ohf-pcard-meta">
          <span>{meta}</span>
          <span className="ohf-pcard-spacer" />
          {status !== undefined && (
            <span className={cx("ohf-pcard-status", `ohf-pcard-status--${statusTone}`)}>
              {statusTone === "live" && <span className="ohf-pcard-lamp" aria-hidden="true" />}
              {statusTone === "done" && <CheckIcon size={13} />}
              {status}
            </span>
          )}
        </div>
      </div>
    </>
  );
  const cls = cx("ohf-pcard", className);
  return href !== undefined ? (
    <a className={cls} href={href}>
      {body}
    </a>
  ) : (
    <button type="button" className={cls} onClick={onClick}>
      {body}
    </button>
  );
}
```

`design/src/composites/ProjectCard/ProjectCard.scss`:

```scss
@use "@/styles/mixins" as m;

.ohf-pcard {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--s1);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-1), var(--glint);
  color: var(--tx);
  text-decoration: none;
  text-align: left;
  transition:
    border-color var(--dur-base) ease,
    background var(--dur-base) ease;
  &:hover,
  &[data-state="hover"] {
    border-color: var(--line-2);
    background: var(--s2);
  }
}
.ohf-pcard-deck {
  display: flex;
  gap: 6px;
  padding: 12px 12px 0;
}
.ohf-pcard-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 14px;
}
.ohf-pcard-title {
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  letter-spacing: var(--ls-tight);
  @include m.truncate;
}
.ohf-pcard-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--tx3);
  @include m.tabular;
}
.ohf-pcard-spacer {
  flex: 1;
}
.ohf-pcard-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-xs);
  color: var(--tx2);
  &--live {
    color: var(--accent);
  }
  &--draft {
    color: var(--tx3);
  }
}
.ohf-pcard-lamp {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}
```

`design/src/composites/ProjectCard/index.ts`: `export * from "./ProjectCard";`

- [ ] **Step 5: FormatCard, StyleCard 구현**

`design/src/composites/FormatCard/FormatCard.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Tag } from "@/components/Tag";
import { CheckIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./FormatCard.scss";

export interface FormatCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: ReactNode;
  name: ReactNode;
  description: ReactNode;
  pressed?: boolean;
  /* Copy for the "coming soon" tag; its presence disables the card. */
  soon?: ReactNode;
}

export function FormatCard({ icon, name, description, pressed = false, soon, className, type, disabled, ...rest }: FormatCardProps) {
  return (
    <button
      type={type ?? "button"}
      className={cx("ohf-fcard", soon !== undefined && "ohf-fcard--soon", className)}
      aria-pressed={pressed}
      disabled={disabled || soon !== undefined}
      {...rest}
    >
      <span className="ohf-fcard-head">
        <span className="ohf-fcard-icon">{icon}</span>
        <span className="ohf-fcard-name">{name}</span>
        <span className="ohf-fcard-spacer" />
        {soon !== undefined ? (
          <Tag tone="muted">{soon}</Tag>
        ) : pressed ? (
          <span className="ohf-fcard-check">
            <CheckIcon size={15} />
          </span>
        ) : null}
      </span>
      <span className="ohf-fcard-desc">{description}</span>
    </button>
  );
}
```

`design/src/composites/FormatCard/FormatCard.scss`:

```scss
.ohf-fcard {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  text-align: left;
  background: var(--s1);
  border: 1px solid var(--line);
  color: var(--tx);
  transition:
    background var(--dur-base) ease,
    border-color var(--dur-base) ease;

  &:hover:not(:disabled),
  &[data-state="hover"] {
    background: var(--s2);
    border-color: var(--line-2);
  }
  &[aria-pressed="true"] {
    background: var(--accent-08);
    border-color: var(--accent-32);
    .ohf-fcard-icon {
      color: var(--accent);
    }
  }
  &:disabled {
    background: transparent;
    color: var(--tx-off);
    cursor: default;
    .ohf-fcard-icon,
    .ohf-fcard-desc {
      color: var(--tx-off);
    }
  }
}
.ohf-fcard-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.ohf-fcard-icon {
  display: flex;
  color: var(--tx2);
}
.ohf-fcard-name {
  font-size: 13.5px;
  font-weight: var(--fw-bold);
}
.ohf-fcard-spacer {
  flex: 1;
}
.ohf-fcard-check {
  display: flex;
  color: var(--accent);
}
.ohf-fcard-desc {
  font-size: 12px;
  line-height: 1.45;
  color: var(--tx3);
}
```

`design/src/composites/FormatCard/index.ts`: `export * from "./FormatCard";`

`design/src/composites/StyleCard/StyleCard.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { CheckIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./StyleCard.scss";

export interface StyleCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /* Two mini slides (a cover over a photo and a flat CTA), drawn by the caller. */
  preview: ReactNode;
  name: ReactNode;
  description: ReactNode;
  pressed?: boolean;
}

export function StyleCard({ preview, name, description, pressed = false, className, type, ...rest }: StyleCardProps) {
  return (
    <button type={type ?? "button"} className={cx("ohf-scard", className)} aria-pressed={pressed} {...rest}>
      <span className="ohf-scard-preview">{preview}</span>
      <span className="ohf-scard-row">
        <span className="ohf-scard-name">{name}</span>
        <span className="ohf-scard-spacer" />
        {pressed && (
          <span className="ohf-scard-check">
            <CheckIcon size={14} />
          </span>
        )}
      </span>
      <span className="ohf-scard-desc">{description}</span>
    </button>
  );
}
```

`design/src/composites/StyleCard/StyleCard.scss`:

```scss
.ohf-scard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  text-align: left;
  background: var(--s1);
  border: 1px solid var(--line);
  color: var(--tx);
  transition:
    background var(--dur-base) ease,
    border-color var(--dur-base) ease;

  &:hover,
  &[data-state="hover"] {
    border-color: var(--line-2);
  }
  &[aria-pressed="true"] {
    background: var(--accent-08);
    border-color: var(--accent-32);
  }
}
.ohf-scard-preview {
  display: flex;
  gap: 6px;
  > * {
    flex: 1;
    min-width: 0;
  }
  .ohf-slide {
    border-radius: var(--radius-sm);
  }
}
.ohf-scard-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px;
}
.ohf-scard-name {
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
}
.ohf-scard-spacer {
  flex: 1;
}
.ohf-scard-check {
  display: flex;
  color: var(--accent);
}
.ohf-scard-desc {
  padding: 0 2px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--tx3);
}
```

`design/src/composites/StyleCard/index.ts`: `export * from "./StyleCard";`

- [ ] **Step 6: 공개 API와 검증**

`design/src/index.ts`에 추가:

```ts
export * from "./composites/ActionStrip";
export * from "./composites/BriefBar";
export * from "./composites/CanvasPanel";
export * from "./composites/FormatCard";
export * from "./composites/ProjectCard";
export * from "./composites/ProjectHeader";
export * from "./composites/StoryboardRow";
export * from "./composites/StyleCard";
export * from "./composites/TopBar";
```

Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build`
Expected: 전부 통과, `dist ok`. `grep -c "ohf-sb-row--selected" dist/ohf.css` ≥ 1.

---

### Task 11: 쇼케이스 — 뼈대, 토큰·컴포넌트·슬라이드 섹션

**Files:**
- Modify: `design/showcase/main.tsx`
- Create: `design/showcase/App.tsx`, `design/showcase/showcase.scss`, `design/showcase/data.ts`, `design/showcase/lib/contrast.ts`, `design/showcase/lib/slide.tsx`, `design/showcase/sections/Tokens.tsx`, `design/showcase/sections/Components.tsx`, `design/showcase/sections/Slides.tsx`, `design/showcase/sections/Screens.tsx`(자리만; Task 12에서 채움)
- Test: `design/test/contrast.test.ts`

**Interfaces:**
- Consumes: 공개 API `@/index` 전부.
- Produces: 해시 라우팅(`#tokens`, `#components`, `#slides`, `#screens/<id>`); `PHOTOS`, `DECK: DeckSlide[]`, `TOPIC`, `HANDLE`, `PROJECTS`, `PACKS`, `LEDGER`, `TEMPLATES`; `renderSlide(slide, page, preset, ratio?, withImage?, extra?)`; `contrast(fg, bg): number | null`.

- [ ] **Step 1: 대비비 도우미의 실패하는 테스트**

`design/test/contrast.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { contrast } from "../showcase/lib/contrast";
import tokens from "../src/tokens/tokens.json";

describe("contrast", () => {
  it("computes WCAG contrast for hex colours and refuses anything else", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrast("rgba(0,0,0,0.5)", "#000000")).toBeNull();
  });

  /* The studio's own floor: small metadata type (tx4) holds 4.5:1 on the rail. */
  it("keeps the palette's body-text floor", () => {
    expect(contrast(tokens.tx4, tokens.rail)!).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens.tx, tokens.bg)!).toBeGreaterThanOrEqual(7);
    expect(contrast(tokens["accent-ink"], tokens.accent)!).toBeGreaterThanOrEqual(7);
  });
});
```

Run: `corepack pnpm test test/contrast.test.ts`
Expected: FAIL — 모듈 없음.

`design/showcase/lib/contrast.ts`:

```ts
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/* WCAG 2 contrast ratio. Translucent tokens have no single ratio, so null. */
export function contrast(fg: string, bg: string): number | null {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a === null || b === null) return null;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
```

Run: `corepack pnpm test test/contrast.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 2: 표본 데이터와 슬라이드 도우미**

`design/showcase/data.ts`:

```ts
import type { SlidePosition, ThumbState } from "@/index";

/* Offline stand-ins for photographs: two-tone gradients as SVG data URLs, so
   the showcase needs no network and no binary assets. */
function svgPhoto(a: string, b: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="800" height="1000" fill="url(#g)"/>` +
    `<circle cx="560" cy="300" r="180" fill="${a}" opacity="0.35"/>` +
    `<circle cx="220" cy="760" r="260" fill="${b}" opacity="0.45"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PHOTOS = {
  sand: svgPhoto("#f3c58f", "#7a4a2a"),
  bottle: svgPhoto("#dfe6ea", "#4f6b7a"),
  tile: svgPhoto("#c9d2c0", "#405040"),
  beach: svgPhoto("#8fc7e8", "#1f4b6e"),
  sunrise: svgPhoto("#f6a65b", "#5b2a4a"),
} as const;

export type PhotoKey = keyof typeof PHOTOS;

export interface DeckSlide {
  kind: "cover" | "body" | "list" | "quote" | "cta";
  label: string;
  title: string;
  sub?: string;
  kicker?: string;
  body?: string;
  items?: { label: string; value?: string }[];
  source?: string;
  prompt: string;
  photo?: PhotoKey;
  dim?: number | "grad";
  position: SlidePosition;
}

export const TOPIC = "여름 자외선 차단제 고르는 법";
export const HANDLE = "@sunny.skin.lab";
export const TEMPLATES = ["표지", "본문", "목록", "인용", "CTA"] as const;

export const DECK: DeckSlide[] = [
  { kind: "cover", label: "표지", title: "SPF 숫자, 높을수록 좋을까?", sub: "자외선 차단제 고르는 법", kicker: "여름 피부 가이드", prompt: "한여름 해변, 강한 역광, 파라솔 그림자, 필름 톤", photo: "sand", dim: "grad", position: "end" },
  { kind: "body", label: "본문", title: "SPF와 PA는 다른 것을 막아요", body: "SPF는 피부를 태우는 UVB를, PA는 노화를 부르는 UVA를 막아요. 숫자 하나만 보고 고르면 절반만 막는 셈이에요.", prompt: "화장대 위 선크림 두 개, 부드러운 창가 빛, 얕은 심도", photo: "bottle", dim: 0.58, position: "end" },
  { kind: "list", label: "목록", title: "상황별 추천 지수", items: [{ label: "출퇴근·실내", value: "SPF30 · PA++" }, { label: "야외 활동", value: "SPF50+ · PA+++" }, { label: "물놀이", value: "워터프루프" }, { label: "민감성 피부", value: "무기자차" }], prompt: "도심 출근길, 아침 햇살, 얕은 심도", photo: "tile", dim: 0.78, position: "mid" },
  { kind: "quote", label: "인용", title: "얼마나 센 걸 바르느냐보다, 2시간마다 덧바르느냐가 핵심입니다", source: "— 피부과 전문의 인터뷰 중", prompt: "손등에 선크림을 짜는 클로즈업, 따뜻한 빛", photo: "beach", dim: 0.6, position: "mid" },
  { kind: "body", label: "본문", title: "흐린 날에도 발라야 하는 이유", body: "구름은 UVA를 거의 막지 못해요. 흐린 날의 자외선은 맑은 날의 80%까지 피부에 닿습니다.", prompt: "흐린 하늘 아래 도심 옥상, 확산광", photo: "sunrise", dim: 0.55, position: "end" },
  { kind: "body", label: "본문", title: "덧바르기, 이렇게 하면 쉬워요", body: "외출 전 15분, 그리고 2시간마다. 스틱형이나 쿠션형은 화장 위에도 덧바를 수 있어요.", prompt: "가방 속 스틱 선크림, 밝은 카페 테이블", photo: "bottle", dim: 0.55, position: "end" },
  { kind: "list", label: "목록", title: "성분표에서 확인할 것", items: [{ label: "무기자차", value: "징크옥사이드" }, { label: "유기자차", value: "아보벤존" }, { label: "혼합", value: "둘 다 표기" }], prompt: "선크림 뒷면 성분표 클로즈업, 매크로", photo: "sand", dim: 0.75, position: "mid" },
  { kind: "cta", label: "CTA", title: "저장해 두고 여름 내내 꺼내 보세요", sub: "다음 편: 선크림, 제대로 지우는 법", prompt: "", position: "mid" },
];

export function subline(s: DeckSlide): string {
  if (s.kind === "body") return s.body ?? "";
  if (s.kind === "list") return (s.items ?? []).map((i) => i.label).join(" · ");
  if (s.kind === "quote") return s.source ?? "";
  return s.sub ?? "";
}

export interface ProjectSample {
  title: string;
  meta: string;
  status: string;
  tone: "done" | "live" | "draft";
  deck: { state: ThumbState; photo?: PhotoKey }[];
}

export const PROJECTS: ProjectSample[] = [
  { title: "여름 자외선 차단제 고르는 법", meta: "카드뉴스 · 4:5 · 8장 · 12분 전", status: "3장 생성 중", tone: "live", deck: [{ state: "image", photo: "sand" }, { state: "image", photo: "bottle" }, { state: "pending" }, { state: "empty" }] },
  { title: "아침 루틴 5가지", meta: "카드뉴스 · 1:1 · 6장 · 어제", status: "내보냄", tone: "done", deck: [{ state: "image", photo: "sunrise" }, { state: "image", photo: "tile" }, { state: "image", photo: "beach" }, { state: "flat" }] },
  { title: "카페 신메뉴 소개", meta: "카드뉴스 · 4:5 · 6장 · 2일 전", status: "구성안", tone: "draft", deck: [{ state: "flat" }, { state: "empty" }, { state: "empty" }, { state: "empty" }] },
  { title: "헬스장 첫 달 가이드", meta: "카드뉴스 · 4:5 · 10장 · 지난주", status: "완성", tone: "done", deck: [{ state: "image", photo: "tile" }, { state: "image", photo: "sand" }, { state: "image", photo: "bottle" }, { state: "flat" }] },
  { title: "제주 3박 4일 코스", meta: "카드뉴스 · 4:5 · 8장 · 2주 전", status: "내보냄", tone: "done", deck: [{ state: "image", photo: "beach" }, { state: "image", photo: "sunrise" }, { state: "image", photo: "sand" }, { state: "flat" }] },
];

export const PACKS = [
  { name: "스타터", credits: "1,000", price: "₩[가격]", best: false },
  { name: "크리에이터", credits: "3,000", price: "₩[가격] · 장당 [할인율] 저렴", best: true },
  { name: "스튜디오", credits: "10,000", price: "₩[가격]", best: false },
];

export const LEDGER: { when: string; what: string; detail: string; amount: string; tone: "minus" | "plus" | "refund" }[] = [
  { when: "오늘 14:02", what: "이미지 생성 4장", detail: "여름 자외선 차단제 고르는 법 · Flux 2", amount: "16", tone: "minus" },
  { when: "오늘 14:02", what: "실패 환불", detail: "슬라이드 5 · 생성 실패", amount: "4", tone: "refund" },
  { when: "오늘 13:51", what: "구성안 생성", detail: "여름 자외선 차단제 고르는 법", amount: "1", tone: "minus" },
  { when: "어제 21:10", what: "이미지 생성 6장", detail: "아침 루틴 5가지 · Flux 2", amount: "24", tone: "minus" },
  { when: "9월 15일", what: "크레딧 충전", detail: "스타터 · 카드 결제", amount: "1,000", tone: "plus" },
  { when: "9월 12일", what: "가입 보너스", detail: "", amount: "300", tone: "plus" },
];
```

`design/showcase/lib/slide.tsx`:

```tsx
import {
  BodySlide,
  CoverSlide,
  CtaSlide,
  ListSlide,
  QuoteSlide,
  SlideFrame,
  type SlideFrameProps,
  type SlidePreset,
  type SlideRatio,
} from "@/index";

import { DECK, HANDLE, PHOTOS, type DeckSlide } from "../data";

export function renderSlide(
  s: DeckSlide,
  page: number,
  preset: SlidePreset,
  ratio: SlideRatio = "4:5",
  withImage = true,
  extra?: Partial<Omit<SlideFrameProps, "children" | "preset">>,
) {
  const image = withImage && s.photo ? PHOTOS[s.photo] : undefined;
  return (
    <SlideFrame
      preset={preset}
      ratio={ratio}
      image={image}
      dim={image ? s.dim : undefined}
      position={s.position}
      handle={HANDLE}
      page={`${page} / ${DECK.length}`}
      {...extra}
    >
      {s.kind === "cover" && <CoverSlide kicker={s.kicker} title={s.title} sub={s.sub} />}
      {s.kind === "body" && <BodySlide title={s.title} body={s.body} />}
      {s.kind === "list" && <ListSlide title={s.title} items={s.items ?? []} />}
      {s.kind === "quote" && <QuoteSlide quote={s.title} source={s.source} />}
      {s.kind === "cta" && <CtaSlide title={s.title} sub={s.sub} pill={`${HANDLE} 팔로우`} />}
    </SlideFrame>
  );
}
```

- [ ] **Step 3: 앱 뼈대와 스타일**

`design/showcase/main.tsx`(교체):

```tsx
import { createRoot } from "react-dom/client";

import "pretendard/dist/web/variable/pretendardvariable.css";
import "./showcase.scss";

import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

`design/showcase/App.tsx`:

```tsx
import { useEffect, useState, type JSX } from "react";

import { Components } from "./sections/Components";
import { Screens } from "./sections/Screens";
import { Slides } from "./sections/Slides";
import { Tokens } from "./sections/Tokens";

const SECTIONS: { id: string; label: string; view: (props: { sub?: string }) => JSX.Element }[] = [
  { id: "tokens", label: "토큰", view: Tokens },
  { id: "components", label: "컴포넌트", view: Components },
  { id: "slides", label: "슬라이드", view: Slides },
  { id: "screens", label: "화면", view: Screens },
];

function useHash() {
  const read = () => location.hash.replace(/^#/, "");
  const [hash, setHash] = useState(read);
  useEffect(() => {
    const on = () => setHash(read());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export function App() {
  const [sectionId, sub] = useHash().split("/");
  const section = SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0]!;
  const View = section.view;
  return (
    <div className="ohf sc-app">
      <nav className="sc-nav" aria-label="목차">
        <div className="sc-nav-brand">OpenHiggsfield Design</div>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="sc-nav-link" aria-current={s.id === section.id ? "page" : undefined}>
            {s.label}
          </a>
        ))}
      </nav>
      <main className="sc-main">
        <View sub={sub} />
      </main>
    </div>
  );
}
```

`design/showcase/showcase.scss`(쇼케이스 전용 `sc-` 클래스. `.ohf` 스코프 안에서 토큰을 쓴다):

```scss
@use "@/styles/mixins" as m;

.sc-app {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  min-height: 100dvh;
}
.sc-nav {
  position: sticky;
  top: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 14px;
  border-right: 1px solid var(--line);
  background: var(--rail);
}
.sc-nav-brand {
  padding: 6px 10px 14px;
  font-size: var(--fs-md);
  font-weight: var(--fw-display);
  letter-spacing: var(--ls-tight);
}
.sc-nav-link {
  display: flex;
  align-items: center;
  height: var(--h-md);
  padding: 0 10px;
  border-radius: var(--radius-ctl);
  color: var(--tx2);
  font-size: var(--fs-sm);
  font-weight: var(--fw-strong);
  text-decoration: none;
  &:hover {
    background: var(--s2);
    color: var(--tx);
  }
  &[aria-current="page"] {
    background: var(--s3);
    color: var(--tx);
  }
}
.sc-main {
  min-width: 0;
  padding: 32px 36px 80px;
}
.sc-h1 {
  margin-bottom: 6px;
  font-size: var(--fs-title);
  font-weight: var(--fw-display);
  letter-spacing: var(--ls-heading);
}
.sc-lead {
  margin-bottom: 28px;
  font-size: var(--fs-md);
  color: var(--tx3);
}
.sc-section {
  margin-bottom: 40px;
}
.sc-h2 {
  margin-bottom: 4px;
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  letter-spacing: var(--ls-tight);
}
.sc-note {
  margin-bottom: 14px;
  font-size: var(--fs-xs);
  color: var(--tx4);
}
.sc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.sc-swatch {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: var(--radius-md);
  background: var(--s1);
  border: 1px solid var(--line);
}
.sc-swatch-chip {
  height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line-2);
}
.sc-swatch-name {
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
}
.sc-swatch-value,
.sc-swatch-ratio {
  font-size: var(--fs-2xs);
  color: var(--tx3);
  word-break: break-all;
  @include m.tabular;
}
.sc-swatch-ratio {
  color: var(--tx4);
}
.sc-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px;
}
.sc-spec {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-2xs);
  color: var(--tx3);
  @include m.tabular;
}
.sc-box {
  background: var(--s3);
  border: 1px solid var(--line-2);
}
.sc-motion {
  width: 64px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--s3);
  transition-property: translate, background;
  transition-timing-function: var(--ease);
  &:hover {
    translate: 40px 0;
    background: var(--accent-32);
  }
}
.sc-matrix {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  th,
  td {
    padding: 10px 12px;
    text-align: left;
    vertical-align: middle;
    border-bottom: 1px solid var(--line);
  }
  th {
    font-size: var(--fs-2xs);
    font-weight: var(--fw-strong);
    color: var(--tx4);
    letter-spacing: var(--ls-caps);
    text-transform: uppercase;
  }
  td:first-child {
    font-size: var(--fs-sm);
    color: var(--tx2);
    white-space: nowrap;
  }
}
.sc-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sc-panel {
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--s1);
  border: 1px solid var(--line);
}
.sc-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.sc-slides {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.sc-slide-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: var(--fs-xs);
  color: var(--tx3);
  .ohf-slide {
    border-radius: var(--radius-md);
  }
}

/* ---- screens ---- */
.sc-frame {
  overflow: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line-2);
  background: var(--bg);
  box-shadow: var(--shadow-2);
}
.sc-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--tx);
  font-size: var(--fs-md);
  line-height: 1.4;
}
.sc-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  margin: 0 auto;
  padding: 32px 20px 28px;
  overflow: auto;
}
.sc-page-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sc-page-title {
  font-size: var(--fs-title);
  font-weight: var(--fw-display);
  letter-spacing: var(--ls-heading);
}
.sc-page-count {
  font-size: var(--fs-md);
  color: var(--tx3);
  @include m.tabular;
}
.sc-page-lead {
  margin-top: 6px;
  font-size: var(--fs-md);
  color: var(--tx3);
}
.sc-spacer {
  flex: 1 1 auto;
  min-width: 0;
}
.sc-muted {
  font-size: 12px;
  line-height: 1.5;
  color: var(--tx3);
}
.sc-label {
  font-size: var(--fs-xs);
  font-weight: var(--fw-strong);
  color: var(--tx3);
}
.sc-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sc-row-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.sc-row-3 {
  display: flex;
  gap: 10px;
  > * {
    flex: 1;
    min-width: 0;
  }
}
.sc-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  background: var(--s2);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-2), var(--glint);
}
.sc-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.sc-new-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 236px;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--line-2);
  color: var(--tx3);
  text-decoration: none;
  &:hover {
    border-color: var(--tx4);
  }
}
.sc-new-card-plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--s1);
  border: 1px solid var(--line);
  color: var(--tx2);
}
.sc-new-card-title {
  font-size: var(--fs-md);
  font-weight: var(--fw-strong);
  color: var(--tx2);
}
.sc-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  font-size: var(--fs-sm);
  color: var(--tx3);
  text-decoration: none;
}
.sc-account-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
}
.sc-big {
  font-size: 40px;
  font-weight: var(--fw-display);
  letter-spacing: -0.02em;
  line-height: 1;
  @include m.tabular;
}
.sc-pack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border-radius: var(--radius-lg);
  text-align: left;
  color: var(--tx);
  background: var(--s1);
  border: 1px solid var(--line);
  &[aria-pressed="true"] {
    background: var(--accent-08);
    border-color: var(--accent-32);
  }
}
.sc-pack-credits {
  font-size: var(--fs-title);
  font-weight: var(--fw-display);
  letter-spacing: -0.01em;
  @include m.tabular;
  small {
    font-size: var(--fs-md);
    font-weight: var(--fw-medium);
    color: var(--tx3);
  }
}
.sc-table {
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--s1);
  border: 1px solid var(--line);
}
.sc-table-head,
.sc-table-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) minmax(0, 1.2fr) 100px;
  gap: 16px;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  font-size: var(--fs-sm);
}
.sc-table-head {
  height: 36px;
  font-size: 11px;
  font-weight: var(--fw-strong);
  color: var(--tx4);
}
.sc-table-row {
  height: 48px;
  span {
    @include m.truncate;
  }
}
.sc-right {
  text-align: right;
}
.sc-amount {
  font-weight: var(--fw-bold);
  @include m.tabular;
  &--plus {
    color: var(--accent);
  }
  &--refund {
    color: var(--tx2);
  }
}
.sc-editor {
  display: flex;
  flex: 1;
  min-height: 0;
  .ohf-canvas {
    width: 634px;
  }
}
.sc-editor-left {
  display: flex;
  flex-direction: column;
  width: 806px;
  min-height: 0;
  border-right: 1px solid var(--line);
}
.sc-editor-brief {
  flex-shrink: 0;
  padding: 12px 20px 10px;
}
.sc-editor-rows {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.sc-lamp {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
.sc-overlay-pop {
  position: absolute;
  top: 112px;
  right: 20px;
  width: 400px;
}
.sc-scrim {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.62);
}
.sc-style-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.sc-swatch-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  height: var(--h-lg);
  padding: 0 10px 0 8px;
  border-radius: var(--radius-ctl);
  border: 1px solid var(--line-2);
  color: var(--tx2);
  font-size: 12px;
  @include m.tabular;
  > i {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
}
.sc-hashtags {
  padding: 10px 12px;
  border-radius: var(--radius-ctl);
  background: var(--s1);
  border: 1px solid var(--line);
  font-size: var(--fs-sm);
  line-height: 1.6;
  color: var(--tx2);
}
.sc-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border-radius: var(--radius-ctl);
  background: var(--s1);
  border: 1px solid var(--line);
  &--danger {
    background: var(--danger-bg);
    border-color: var(--danger-line);
    color: var(--danger);
  }
  b {
    font-size: 18px;
    font-weight: var(--fw-display);
    @include m.tabular;
  }
}
.sc-phone-head,
.sc-phone-actions,
.sc-phone-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 0 14px;
}
.sc-phone-head {
  height: 54px;
}
.sc-phone-actions {
  height: 46px;
  gap: 14px;
}
.sc-phone-caption {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 14px;
  font-size: var(--fs-md);
  line-height: 1.45;
}
.sc-phone-foot {
  justify-content: space-between;
  height: 56px;
  padding-bottom: 8px;
  border-top: 1px solid var(--line);
}
.sc-dots {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  > i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
    &:first-child {
      width: 6px;
      height: 6px;
      background: var(--tx);
    }
  }
}
.sc-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  font-size: 11px;
  font-weight: var(--fw-bold);
  @include m.tabular;
}
.sc-cols {
  display: flex;
  gap: 24px;
  > * {
    flex: 1;
    min-width: 0;
  }
}
.sc-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  .ohf-slide {
    border-radius: var(--radius-ctl);
  }
}
.sc-style-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-lg);
  background: var(--s1);
  border: 1px solid var(--line);
  &[data-default="true"] {
    border-color: var(--accent-32);
  }
  .ohf-slide {
    border-radius: var(--radius-md);
  }
}
.sc-style-pair {
  display: flex;
  gap: 12px;
  > * {
    flex: 1;
    min-width: 0;
  }
}
.sc-chips {
  display: flex;
  gap: 4px;
  > i {
    width: 14px;
    height: 14px;
    border-radius: var(--radius-xs);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
}
```

`design/showcase/sections/Screens.tsx`(자리. Task 12에서 교체):

```tsx
export function Screens() {
  return <h1 className="sc-h1">화면</h1>;
}
```

- [ ] **Step 4: 토큰 섹션**

`design/showcase/sections/Tokens.tsx`:

```tsx
import { tokens, type Token } from "@/index";

import { contrast } from "../lib/contrast";

const entries = Object.entries(tokens) as [Token, string][];
const pick = (re: RegExp) => entries.filter(([k]) => re.test(k));
const colors = entries.filter(([k]) => !/^(radius|h|fs|fw|ls|sp|dur|shadow)-/.test(k) && !["glint", "ease", "ease-slide", "font-ui"].includes(k));
const SAMPLE = "여름 자외선 차단제 고르는 법 · Sunscreen 0123";

export function Tokens() {
  return (
    <>
      <h1 className="sc-h1">토큰</h1>
      <p className="sc-lead">tokens.json에서 그린다. 기존 31개는 원본 값 그대로, 40개는 스튜디오의 리터럴에서 뽑았다.</p>

      <section className="sc-section">
        <h2 className="sc-h2">색</h2>
        <p className="sc-note">글자색은 --bg 위 대비비, 표면색은 그 위에 놓인 --tx의 대비비. 반투명 값은 비율을 적지 않는다.</p>
        <div className="sc-grid">
          {colors.map(([k, v]) => {
            const isText = /^(tx|accent$|accent-strong$|danger$)/.test(k);
            const ratio = isText ? contrast(v, tokens.bg) : contrast(tokens.tx, v);
            return (
              <div key={k} className="sc-swatch">
                <div className="sc-swatch-chip" style={{ background: v }} />
                <div className="sc-swatch-name">--{k}</div>
                <div className="sc-swatch-value">{v}</div>
                {ratio !== null && <div className="sc-swatch-ratio">{ratio.toFixed(2)}:1</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">반지름</h2>
        <div className="sc-row">
          {pick(/^radius-/).map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div className="sc-box" style={{ width: 64, height: 48, borderRadius: v }} />
              <span>{k.slice(7)} · {v}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">컨트롤 높이</h2>
        <div className="sc-row">
          {pick(/^h-/).map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div className="sc-box" style={{ width: 96, height: v, borderRadius: "var(--radius-ctl)" }} />
              <span>{k.slice(2)} · {v}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">글자 크기</h2>
        {pick(/^fs-/).map(([k, v]) => (
          <div key={k} className="sc-cell" style={{ marginBottom: 8 }}>
            <span className="sc-spec" style={{ width: 110, alignItems: "flex-start" }}>{k.slice(3)} · {v}</span>
            <span style={{ fontSize: v }}>{SAMPLE}</span>
          </div>
        ))}
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">굵기와 자간</h2>
        {pick(/^fw-/).map(([k, v]) => (
          <div key={k} className="sc-cell" style={{ marginBottom: 8 }}>
            <span className="sc-spec" style={{ width: 110, alignItems: "flex-start" }}>{k.slice(3)} · {v}</span>
            <span style={{ fontWeight: v }}>{SAMPLE}</span>
          </div>
        ))}
        {pick(/^ls-/).map(([k, v]) => (
          <div key={k} className="sc-cell" style={{ marginBottom: 8 }}>
            <span className="sc-spec" style={{ width: 110, alignItems: "flex-start" }}>{k.slice(3)} · {v}</span>
            <span style={{ letterSpacing: v, textTransform: k === "ls-caps" ? "uppercase" : undefined }}>{SAMPLE}</span>
          </div>
        ))}
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">간격</h2>
        <div className="sc-row">
          {pick(/^sp-/).map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div className="sc-box" style={{ width: v, height: 24, background: "var(--accent-32)" }} />
              <span>{k.slice(3)} · {v}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">그림자</h2>
        <div className="sc-row">
          {[...pick(/^shadow-/), ["glint", tokens.glint] as [Token, string]].map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div style={{ width: 120, height: 72, borderRadius: "var(--radius-lg)", background: "var(--s2)", boxShadow: v }} />
              <span>{k}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">모션</h2>
        <p className="sc-note">
          마우스를 올리면 각 지속 시간으로 움직인다. ease {tokens.ease} · ease-slide {tokens["ease-slide"]}
        </p>
        <div className="sc-row">
          {pick(/^dur-/).map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div className="sc-motion" style={{ transitionDuration: v }} />
              <span>{k.slice(4)} · {v}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 5: 컴포넌트 섹션(상태 매트릭스)**

`design/showcase/sections/Components.tsx`:

```tsx
import { useState, type ReactNode } from "react";

import {
  Alert,
  Avatar,
  Button,
  Chip,
  CreditBadge,
  Dialog,
  Field,
  IconButton,
  Input,
  Kbd,
  Menu,
  MenuRow,
  OptionList,
  Pill,
  Popover,
  Segment,
  Skeleton,
  Slider,
  Spinner,
  Stepper,
  Switch,
  Tag,
  Textarea,
  Thumb,
  Tooltip,
  UndoBar,
  type ButtonSize,
  type ButtonVariant,
  type ThumbState,
} from "@/index";
import { ClockIcon, CopyIcon, DownloadIcon, FilmIcon, RetryIcon, SparkleIcon, TrashIcon } from "@/index";

import { PHOTOS } from "../data";

type State = "default" | "hover" | "active" | "disabled";
const STATES: State[] = ["default", "hover", "active", "disabled"];
/* Pins a state for the matrix: the SCSS pairs every :hover/:active with the
   same data-state attribute. */
const st = (s: State) => ({ "data-state": s === "default" ? undefined : s, disabled: s === "disabled" });

function Matrix({ title, note, cols, rows, cell }: { title: string; note?: string; cols: readonly string[]; rows: readonly string[]; cell: (row: string, col: string) => ReactNode }) {
  return (
    <section className="sc-section">
      <h2 className="sc-h2">{title}</h2>
      {note && <p className="sc-note">{note}</p>}
      <table className="sc-matrix">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td>{r}</td>
              {cols.map((c) => (
                <td key={c}>
                  <div className="sc-cell">{cell(r, c)}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SegmentDemo({ size, plate }: { size: "sm" | "md"; plate: boolean }) {
  const [v, setV] = useState("projects");
  return (
    <Segment
      size={size}
      plate={plate}
      items={[{ id: "studio", label: "Studio" }, { id: "projects", label: "Projects" }, { id: "assets", label: "Assets" }]}
      value={v}
      onChange={setV}
      aria-label="구역"
    />
  );
}

function StepperDemo({ start }: { start: number }) {
  const [v, setV] = useState(start);
  return <Stepper value={v} min={4} max={10} onChange={setV} suffix="장" decrementLabel="한 장 줄이기" incrementLabel="한 장 늘리기" />;
}

function SwitchDemo({ on, disabled }: { on: boolean; disabled?: boolean }) {
  const [v, setV] = useState(on);
  return <Switch checked={v} onChange={setV} disabled={disabled} aria-label="쪽 번호 표시" />;
}

function SliderDemo({ start }: { start: number }) {
  const [v, setV] = useState(start);
  return (
    <div style={{ width: 200 }}>
      <Slider min={0} max={100} value={v} onChange={setV} aria-label="어둡게" />
    </div>
  );
}

function OptionsDemo() {
  const [v, setV] = useState("4:5");
  return (
    <div style={{ width: 200, height: 160, display: "flex" }}>
      <OptionList options={[{ value: "auto", label: "Auto" }, { value: "1:1", label: "1:1" }, { value: "4:5", label: "4:5" }, { value: "9:16", label: "9:16" }]} value={v} onChange={setV} ratio />
    </div>
  );
}

export function Components() {
  return (
    <>
      <h1 className="sc-h1">컴포넌트</h1>
      <p className="sc-lead">변형 × 상태. hover/active/disabled는 data-state로 고정했다. 문구는 모두 props다.</p>

      <Matrix
        title="Button"
        note="한 화면에 라임(primary)은 하나. busy는 생성 중, loading은 컨트롤 자신의 대기."
        cols={STATES}
        rows={["primary", "secondary", "model", "ghost", "danger", "busy", "loading"]}
        cell={(r, c) => {
          if (r === "busy") return c === "default" ? <Button variant="primary" busy icon={<SparkleIcon />}>7장 생성 중</Button> : null;
          if (r === "loading") return c === "default" ? <Button loading>저장</Button> : null;
          return (
            <Button variant={r as ButtonVariant} icon={<SparkleIcon />} kbd={r === "primary" ? "⌘↵" : undefined} {...st(c as State)}>
              {r === "primary" ? "7장 생성 · 28 크레딧" : "슬라이드 추가"}
            </Button>
          );
        }}
      />
      <Matrix
        title="Button · 크기"
        cols={["sm 32", "md 36", "lg 38"]}
        rows={["secondary", "primary"]}
        cell={(r, c) => (
          <Button variant={r as ButtonVariant} size={c.slice(0, 2) as ButtonSize} icon={<DownloadIcon />}>
            내보내기
          </Button>
        )}
      />
      <Matrix
        title="IconButton"
        cols={STATES}
        rows={["plate 30", "plate 36", "ghost 28"]}
        cell={(r, c) => (
          <IconButton icon={<CopyIcon />} aria-label="복제" size={Number(r.split(" ")[1]) as 28 | 30 | 36} ghost={r.startsWith("ghost")} {...st(c as State)} />
        )}
      />
      <Matrix
        title="Chip"
        cols={STATES}
        rows={["기본", "pressed", "dot", "ratio"]}
        cell={(r, c) => (
          <Chip pressed={r === "pressed" ? true : r === "기본" ? undefined : false} dot={r === "dot"} ratio={r === "ratio" ? "4:5" : undefined} {...st(c as State)}>
            {r === "ratio" ? "피드 4:5" : r === "dot" ? "생성 중" : "카드뉴스"}
          </Chip>
        )}
      />
      <Matrix
        title="Pill"
        cols={STATES}
        rows={["glyph + label", "expanded"]}
        cell={(r, c) => <Pill glyph={<FilmIcon />} label="장수" value="8" expanded={r === "expanded" ? true : undefined} {...st(c as State)} />}
      />
      <Matrix
        title="Segment"
        note="선택 판은 실제 폭을 재서 움직인다."
        cols={["interactive"]}
        rows={["md", "sm + plate"]}
        cell={(r) => <SegmentDemo size={r === "md" ? "md" : "sm"} plate={r !== "md"} />}
      />
      <Matrix title="Tag" cols={["default", "accent", "muted"]} rows={["tone"]} cell={(_, c) => <Tag tone={c as "default" | "accent" | "muted"}>{c === "accent" ? "기본값" : c === "muted" ? "준비 중" : "카드뉴스"}</Tag>} />
      <Matrix
        title="Field · Input · Textarea"
        cols={["default", "focus", "invalid", "disabled"]}
        rows={["input", "textarea", "counter", "error"]}
        cell={(r, c) => {
          const state = c === "focus" ? { "data-state": "focus" } : {};
          const common = { invalid: c === "invalid", disabled: c === "disabled", ...state };
          if (r === "textarea") return <div style={{ width: 240 }}><Field label="꼭 넣을 내용" optional="선택"><Textarea rows={2} defaultValue="2시간마다 덧바르기" {...common} /></Field></div>;
          if (r === "counter") return <div style={{ width: 240 }}><Field label="본문" counter={{ value: c === "invalid" ? 96 : 42, max: 90 }}><Input defaultValue="흐린 날에도 발라야 하는 이유" {...common} /></Field></div>;
          if (r === "error") return <div style={{ width: 240 }}><Field label="주제" required="필수" error={c === "invalid" ? "주제를 입력하세요" : undefined} hint="한 줄이면 됩니다"><Input placeholder="여름철 자외선 차단제 고르는 법" {...common} /></Field></div>;
          return <div style={{ width: 240 }}><Field label="대상 독자"><Input defaultValue="20대 직장인" {...common} /></Field></div>;
        }}
      />
      <Matrix title="Stepper" cols={["min", "mid", "max"]} rows={["4–10"]} cell={(_, c) => <StepperDemo start={c === "min" ? 4 : c === "max" ? 10 : 8} />} />
      <Matrix title="Switch" cols={["off", "on", "disabled"]} rows={["role=switch"]} cell={(_, c) => <SwitchDemo on={c !== "off"} disabled={c === "disabled"} />} />
      <Matrix title="Slider" cols={["0", "40", "100"]} rows={["--fill"]} cell={(_, c) => <SliderDemo start={Number(c)} />} />
      <Matrix title="OptionList" cols={["ratio"]} rows={["aria-pressed"]} cell={() => <OptionsDemo />} />
      <Matrix title="Avatar" cols={["28", "32", "44"]} rows={["initials"]} cell={(_, c) => <Avatar initials="BK" size={Number(c) as 28 | 32 | 44} />} />
      <Matrix title="CreditBadge" cols={["default"]} rows={["amount"]} cell={() => <CreditBadge amount={1240} unit="크레딧" />} />
      <Matrix title="Kbd · Spinner" cols={["default"]} rows={["kbd", "spinner"]} cell={(r) => (r === "kbd" ? <Kbd>⌘↵</Kbd> : <Spinner label="생성 중" />)} />
      <Matrix
        title="Skeleton"
        cols={["label + clock"]}
        rows={["4:5"]}
        cell={() => (
          <div style={{ width: 160 }}>
            <Skeleton label="생성 중" clock="0:42" ratio="4:5" />
          </div>
        )}
      />
      <Matrix
        title="Thumb"
        cols={["image", "pending", "failed", "empty", "flat"]}
        rows={["56", "80"]}
        cell={(r, c) => <Thumb state={c as ThumbState} src={PHOTOS.sand} size={Number(r)} />}
      />
      <Matrix
        title="Popover · Menu"
        note="placement=static으로 흐름 안에 그렸다."
        cols={["setting", "list", "menu"]}
        rows={["variant"]}
        cell={(_, c) => {
          if (c === "setting")
            return (
              <Popover variant="setting" placement="static">
                <Field label="어둡게" value="40%">
                  <SliderDemo start={40} />
                </Field>
              </Popover>
            );
          if (c === "list")
            return (
              <Popover variant="list" placement="static" style={{ height: 220 }}>
                <Field label="비율">
                  <OptionsDemo />
                </Field>
              </Popover>
            );
          return (
            <Popover variant="menu" placement="static" head="정렬">
              <Menu>
                <MenuRow icon={<ClockIcon />} label="최근 수정" count={5} />
                <MenuRow icon={<SparkleIcon />} label="최근 생성" />
                <MenuRow icon={<TrashIcon />} label="휴지통" disabled />
              </Menu>
            </Popover>
          );
        }}
      />
      <Matrix
        title="Dialog"
        note="inline: 페이지를 덮지 않고 패널만 그린다."
        cols={["inline"]}
        rows={["width 420"]}
        cell={() => (
          <Dialog open inline title="내보내기" onClose={() => {}} closeLabel="닫기" width={420} head={<span className="sc-muted">8장 · 1080×1350</span>}>
            <p className="sc-muted">01.png ~ 08.png와 caption.txt를 ZIP으로 묶습니다.</p>
            <div className="sc-cell">
              <Button icon={<CopyIcon />}>캡션 복사</Button>
              <Button variant="primary" icon={<DownloadIcon />}>ZIP 내려받기</Button>
            </div>
          </Dialog>
        )}
      />
      <Matrix
        title="Alert · UndoBar"
        cols={["default"]}
        rows={["alert", "alert + action", "undo"]}
        cell={(r) => (
          <div style={{ width: 520 }}>
            {r === "alert" && <Alert>생성에 실패했습니다 · 4 크레딧을 돌려드렸습니다</Alert>}
            {r === "alert + action" && <Alert action={<Button size="sm" icon={<RetryIcon />}>다시 시도</Button>}>슬라이드 5 생성 실패</Alert>}
            {r === "undo" && <UndoBar text="슬라이드 5를 지웠습니다" actionLabel="되돌리기" onAction={() => {}} durationMs={6000} />}
          </div>
        )}
      />
      <Matrix
        title="Tooltip"
        note="hover를 고정해 세 정렬을 보여 준다."
        cols={["center", "start", "end"]}
        rows={["data-tip"]}
        cell={(_, c) => (
          <div style={{ paddingTop: 36 }}>
            <Tooltip label="이 슬라이드 다시 쓰기" align={c === "center" ? undefined : (c as "start" | "end")} data-state="hover">
              <IconButton icon={<SparkleIcon />} aria-label="이 슬라이드 다시 쓰기" ghost size={28} />
            </Tooltip>
          </div>
        )}
      />
    </>
  );
}
```

- [ ] **Step 6: 슬라이드 섹션**

`design/showcase/sections/Slides.tsx`:

```tsx
import { useState } from "react";

import { SLIDE_PRESETS, Segment, Switch, type SlideRatio } from "@/index";

import { DECK } from "../data";
import { renderSlide } from "../lib/slide";

const RATIOS: SlideRatio[] = ["4:5", "3:4", "1:1", "9:16"];
const DIMS = ["0", "40", "75"] as const;
/* One slide per template: cover, body, list, quote, cta. */
const SAMPLES = [0, 1, 2, 3, 7];

export function Slides() {
  const [ratio, setRatio] = useState<SlideRatio>("4:5");
  const [dim, setDim] = useState<(typeof DIMS)[number]>("40");
  const [photo, setPhoto] = useState(true);
  return (
    <>
      <h1 className="sc-h1">슬라이드</h1>
      <p className="sc-lead">템플릿 5 × 프리셋 4. 글자는 cqw로 잰다. 앱 토큰을 쓰지 않는다.</p>
      <div className="sc-toolbar">
        <Segment size="sm" plate items={RATIOS.map((r) => ({ id: r, label: r }))} value={ratio} onChange={(v) => setRatio(v as SlideRatio)} aria-label="비율" />
        <Segment size="sm" plate items={DIMS.map((d) => ({ id: d, label: `어둡게 ${d}` }))} value={dim} onChange={(v) => setDim(v as (typeof DIMS)[number])} aria-label="어둡게" />
        <span className="sc-cell">
          <Switch checked={photo} onChange={setPhoto} aria-label="사진 위" />
          <span className="sc-muted">사진 위</span>
        </span>
      </div>
      {SAMPLES.map((i) => (
        <section key={i} className="sc-section">
          <h2 className="sc-h2">{DECK[i]!.label}</h2>
          <div className="sc-slides">
            {SLIDE_PRESETS.map((preset) => (
              <div key={preset} className="sc-slide-col">
                {renderSlide(DECK[i]!, i + 1, preset, ratio, photo, { dim: photo ? Number(dim) / 100 : undefined })}
                <span>{preset}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
```

- [ ] **Step 7: 검증**

Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build:showcase`
Expected: 전부 통과, `dist-showcase/` 생성.

Run: `corepack pnpm dev`(백그라운드) 후 브라우저로 `http://localhost:5173/#tokens`, `#components`, `#slides`를 연다.
Expected: 왼쪽 목차, 오른쪽 내용. 토큰 견본에 대비비, 컴포넌트 매트릭스의 hover 열이 hover 색으로 고정, 슬라이드 격자 20장. 콘솔 오류 없음. 확인 후 서버를 끈다. (브라우저를 쓸 수 없는 실행자는 이 단계를 건너뛰고 보고에 적는다. 검토자가 대신 본다.)

---

### Task 12: 쇼케이스 — 화면 11장

**Files:**
- Modify: `design/showcase/sections/Screens.tsx`
- Create: `design/showcase/screens/shell.tsx`, `design/showcase/screens/editor.tsx`, `design/showcase/screens/Projects.tsx`, `design/showcase/screens/NewProject.tsx`, `design/showcase/screens/Account.tsx`, `design/showcase/screens/Editors.tsx`, `design/showcase/screens/Phone.tsx`, `design/showcase/screens/Templates.tsx`, `design/showcase/screens/Styles.tsx`, `design/showcase/screens/CreditsModal.tsx`

**Interfaces:**
- Consumes: 공개 API, `data.ts`, `renderSlide`.
- Produces: `#screens/<id>`(projects, new, account, editor-outline, editor-generating, editor-style, editor-export, phone, templates, styles, credits).

- [ ] **Step 1: 공통 껍데기와 편집기 조각**

`design/showcase/screens/shell.tsx`:

```tsx
import type { ReactNode } from "react";

import { Avatar, BriefBar, Button, Pill, ProjectHeader, Tag, TopBar } from "@/index";
import { CheckIcon, DownloadIcon, FilmIcon, PaletteIcon, SparkleIcon, TextIcon, UserIcon } from "@/index";

import { TOPIC } from "../data";

export function AppBar({ active = "projects" }: { active?: string }) {
  return (
    <TopBar
      brand="OpenHiggsfield"
      brandLabel="OpenHiggsfield 홈"
      brandHref="#screens/projects"
      nav={{
        items: [{ id: "studio", label: "Studio" }, { id: "projects", label: "Projects" }],
        value: active,
        onChange: () => {},
        "aria-label": "구역",
      }}
      credits={1240}
      creditsUnit="크레딧"
      topUp={<Button variant="ghost" size="sm">충전</Button>}
      avatar={<Avatar initials="BK" size={32} aria-label="계정 메뉴" />}
    />
  );
}

export function Screen({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  return (
    <div className="sc-screen" style={{ width, height }}>
      {children}
    </div>
  );
}

export function EditorShell({
  rows,
  strip,
  panel,
  exportPrimary = false,
  styleOpen = false,
  overlay,
}: {
  rows: ReactNode;
  strip: ReactNode;
  panel: ReactNode;
  exportPrimary?: boolean;
  styleOpen?: boolean;
  overlay?: ReactNode;
}) {
  return (
    <Screen width={1440} height={960}>
      <AppBar />
      <ProjectHeader
        back={{ href: "#screens/projects", label: "프로젝트 목록으로" }}
        title={TOPIC}
        tags={
          <>
            <Tag>카드뉴스</Tag>
            <Tag>4:5 · 1080×1350</Tag>
          </>
        }
        status={
          <>
            <CheckIcon size={13} />
            저장됨
          </>
        }
        actions={
          <>
            <Button icon={<PaletteIcon />} aria-expanded={styleOpen}>
              스타일
            </Button>
            <Button variant={exportPrimary ? "primary" : "secondary"} icon={<DownloadIcon />}>
              내보내기
            </Button>
          </>
        }
      />
      <div className="sc-editor">
        <div className="sc-editor-left">
          <div className="sc-editor-brief">
            <BriefBar
              label="주제"
              topic={TOPIC}
              pills={
                <>
                  <Pill glyph={<FilmIcon />} label="장수" value="8" />
                  <Pill glyph={<TextIcon />} label="톤" value="친근하게" />
                  <Pill glyph={<UserIcon />} label="대상" value="20대 직장인" />
                </>
              }
              action={<Button icon={<SparkleIcon />}>구성안 다시 뽑기 · 1 크레딧</Button>}
            />
          </div>
          <div className="sc-editor-rows">{rows}</div>
          {strip}
        </div>
        {panel}
      </div>
      {overlay}
    </Screen>
  );
}
```

`design/showcase/screens/editor.tsx`:

```tsx
import { Button, CanvasPanel, Chip, IconButton, Pill, StoryboardRow, type SlidePreset, type ThumbState } from "@/index";
import { CopyIcon, DownloadIcon, ImageIcon, RetryIcon, SparkleIcon, TrashIcon } from "@/index";

import { DECK, PHOTOS, TEMPLATES, subline } from "../data";
import { renderSlide } from "../lib/slide";

export function storyRows(states: ThumbState[], selected: number, warnAt?: number) {
  return DECK.map((s, i) => {
    const state = states[i]!;
    const failed = state === "failed";
    const pending = state === "pending";
    return (
      <StoryboardRow
        key={i}
        index={i + 1}
        thumb={{ state, src: s.photo ? PHOTOS[s.photo] : undefined, size: 56 }}
        tag={s.label}
        title={s.title}
        sub={subline(s)}
        counter={warnAt === i ? { value: 96, max: 90 } : undefined}
        prompt={!failed && !pending && s.prompt ? s.prompt : undefined}
        status={failed ? "생성 실패 · 4 크레딧 돌려드림" : pending ? "생성 중 · 0:42" : !s.prompt ? "단색 배경 · 이미지 없음" : undefined}
        statusTone={failed ? "danger" : pending ? "live" : "default"}
        statusAction={failed ? <Button size="sm" icon={<RetryIcon />}>다시 시도</Button> : undefined}
        selected={i === selected}
        actions={
          i === selected ? (
            <>
              <IconButton ghost size={28} icon={<SparkleIcon />} aria-label="이 슬라이드 다시 쓰기" />
              <IconButton ghost size={28} icon={<CopyIcon />} aria-label="복제" />
              <IconButton ghost size={28} icon={<TrashIcon />} aria-label="삭제" />
            </>
          ) : undefined
        }
      />
    );
  });
}

export function canvas({
  index,
  template,
  options,
  hint,
  withImage = true,
  preset = "basic",
}: {
  index: number;
  template: (typeof TEMPLATES)[number];
  options: [string, string][];
  hint: string;
  withImage?: boolean;
  preset?: SlidePreset;
}) {
  return (
    <CanvasPanel
      mode={{ items: [{ id: "slide", label: "슬라이드" }, { id: "phone", label: "휴대폰" }], value: "slide", onChange: () => {}, "aria-label": "보기" }}
      index={index}
      total={DECK.length}
      onPrev={() => {}}
      onNext={() => {}}
      prevLabel="이전 슬라이드"
      nextLabel="다음 슬라이드"
      stage={renderSlide(DECK[index - 1]!, index, preset, "4:5", withImage)}
      templates={{
        label: "템플릿",
        chips: TEMPLATES.map((t) => (
          <Chip key={t} pressed={t === template}>
            {t}
          </Chip>
        )),
      }}
      options={{ label: "옵션", pills: options.map(([l, v]) => <Pill key={l} label={l} value={v} />) }}
      actions={
        <>
          <Button icon={<RetryIcon />}>다시 생성 · 4 크레딧</Button>
          <Button icon={<ImageIcon size={14} />}>에셋에서 고르기</Button>
          <Button icon={<DownloadIcon />}>PNG</Button>
        </>
      }
      hint={hint}
    />
  );
}
```

- [ ] **Step 2: 프로젝트 목록, 새 프로젝트, 계정**

`design/showcase/screens/Projects.tsx`:

```tsx
import { Button, Chip, Pill, ProjectCard, Thumb } from "@/index";
import { ClockIcon, PlusIcon } from "@/index";

import { PHOTOS, PROJECTS } from "../data";
import { AppBar, Screen } from "./shell";

export function Projects() {
  return (
    <Screen width={1440} height={900}>
      <AppBar />
      <main className="sc-page" style={{ width: 1200 }}>
        <div className="sc-page-head">
          <h1 className="sc-page-title">프로젝트</h1>
          <span className="sc-page-count">{PROJECTS.length}개</span>
          <span className="sc-spacer" />
          <Button variant="primary" size="lg" icon={<PlusIcon />}>새 프로젝트</Button>
        </div>
        <div className="sc-toolbar" style={{ marginBottom: 0 }}>
          <Chip pressed>전체</Chip>
          <Chip pressed={false}>카드뉴스</Chip>
          <Chip disabled>릴스 · 준비 중</Chip>
          <Chip disabled>랜딩 페이지 · 준비 중</Chip>
          <span className="sc-spacer" />
          <Pill glyph={<ClockIcon />} label="정렬" value="최근 수정" />
        </div>
        <div className="sc-cards">
          <a className="sc-new-card" href="#screens/new">
            <span className="sc-new-card-plus"><PlusIcon size={18} /></span>
            <span className="sc-new-card-title">새 프로젝트</span>
            <span className="sc-muted">주제 한 줄로 시작합니다</span>
          </a>
          {PROJECTS.map((p) => (
            <ProjectCard
              key={p.title}
              href="#screens/editor-generating"
              title={p.title}
              meta={p.meta}
              status={p.status}
              statusTone={p.tone}
              deck={p.deck.map((d, i) => (
                <Thumb key={i} size={80} state={d.state} src={d.photo ? PHOTOS[d.photo] : undefined} />
              ))}
            />
          ))}
        </div>
      </main>
    </Screen>
  );
}
```

`design/showcase/screens/NewProject.tsx`:

```tsx
import { useState } from "react";

import { Button, Chip, Field, FormatCard, Input, Stepper, Textarea } from "@/index";
import { ChevronLeftIcon, FilmIcon, LayersIcon, LayoutIcon, SparkleIcon } from "@/index";

import { TOPIC } from "../data";
import { AppBar, Screen } from "./shell";

const TONES = ["친근하게", "전문가", "위트 있게", "차분하게"];
const RATIOS: [string, string][] = [["4:5", "피드 4:5"], ["3:4", "피드 3:4"], ["1:1", "정사각 1:1"], ["9:16", "스토리 9:16"]];

export function NewProject() {
  const [pages, setPages] = useState(8);
  const [tone, setTone] = useState("친근하게");
  const [ratio, setRatio] = useState("4:5");
  return (
    <Screen width={1440} height={900}>
      <AppBar />
      <main className="sc-page" style={{ width: 720, gap: 22 }}>
        <a className="sc-back" href="#screens/projects">
          <ChevronLeftIcon />
          프로젝트
        </a>
        <div>
          <h1 className="sc-page-title">새 프로젝트</h1>
          <p className="sc-page-lead">주제 한 줄이면 됩니다. 나머지는 기본값이 있고, 편집기에서 언제든 바꿀 수 있습니다.</p>
        </div>
        <section className="sc-stack">
          <span className="sc-label">포맷</span>
          <div className="sc-row-3">
            <FormatCard icon={<LayersIcon size={18} />} name="카드뉴스" description="인스타그램·쓰레드 캐러셀. 구성안 → 이미지 → PNG 묶음" pressed />
            <FormatCard icon={<FilmIcon size={18} />} name="릴스" description="장면 스토리보드에서 세로 영상으로" soon="준비 중" />
            <FormatCard icon={<LayoutIcon size={18} />} name="랜딩 페이지" description="링크 인 바이오와 캠페인 페이지" soon="준비 중" />
          </div>
        </section>
        <section className="sc-card">
          <Field label="주제" htmlFor="np-topic" required="필수" counter={{ value: TOPIC.length, max: 120 }}>
            <Textarea id="np-topic" defaultValue={TOPIC} rows={2} style={{ fontSize: 15 }} />
          </Field>
          <div className="sc-row-2">
            <Field label="대상 독자" htmlFor="np-aud">
              <Input id="np-aud" defaultValue="20대 직장인" />
            </Field>
            <Field label="장수">
              <Stepper value={pages} min={4} max={10} onChange={setPages} suffix="장" decrementLabel="한 장 줄이기" incrementLabel="한 장 늘리기" />
            </Field>
          </div>
          <Field label="톤">
            <div className="sc-toolbar" style={{ marginBottom: 0 }}>
              {TONES.map((t) => (
                <Chip key={t} pressed={t === tone} onClick={() => setTone(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="채널 규격" hint="1080×1350 · 프로필 그리드에서는 가운데가 잘려 보입니다">
            <div className="sc-toolbar" style={{ marginBottom: 0 }}>
              {RATIOS.map(([r, label]) => (
                <Chip key={r} ratio={r} pressed={r === ratio} onClick={() => setRatio(r)}>
                  {label}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="꼭 넣을 내용" htmlFor="np-must" optional="선택">
            <Textarea id="np-must" defaultValue="2시간마다 덧바르기, PA 등급 설명" rows={2} />
          </Field>
        </section>
        <div className="sc-cell" style={{ gap: 12 }}>
          <span className="sc-muted">구성안 1 크레딧 · 이미지 크레딧은 구성안을 확인한 뒤에 씁니다</span>
          <span className="sc-spacer" />
          <Button variant="primary" size="lg" icon={<SparkleIcon />}>구성안 만들기</Button>
        </div>
      </main>
    </Screen>
  );
}
```

`design/showcase/screens/Account.tsx`:

```tsx
import { Avatar, Button, Pill, Tag, cx } from "@/index";
import { ClockIcon, PlusIcon, WalletIcon } from "@/index";

import { LEDGER, PACKS } from "../data";
import { AppBar, Screen } from "./shell";

export function Account() {
  return (
    <Screen width={1440} height={900}>
      <AppBar />
      <main className="sc-page" style={{ width: 1040, gap: 24 }}>
        <div className="sc-cell" style={{ gap: 14 }}>
          <Avatar initials="BK" size={44} />
          <div>
            <h1 className="sc-page-title" style={{ fontSize: 20 }}>계정</h1>
            <span className="sc-muted">brian@example.com · 카카오로 로그인</span>
          </div>
          <span className="sc-spacer" />
          <Button variant="ghost">로그아웃</Button>
        </div>
        <div className="sc-account-grid">
          <section className="sc-card" style={{ gap: 14 }}>
            <span className="sc-muted sc-cell"><WalletIcon size={15} />크레딧 잔액</span>
            <div className="sc-big">1,240</div>
            <span className="sc-muted">이미지 1장 4 크레딧 · 구성안 1 크레딧<br />실패한 생성은 자동으로 돌려드립니다</span>
            <Button variant="primary" size="lg" icon={<PlusIcon />}>충전하기</Button>
          </section>
          <section className="sc-stack">
            <span className="sc-label">충전 패키지</span>
            <div className="sc-row-3">
              {PACKS.map((p) => (
                <button key={p.name} type="button" className="sc-pack" aria-pressed={p.best}>
                  <span className="sc-cell">
                    <span className="sc-muted">{p.name}</span>
                    <span className="sc-spacer" />
                    {p.best && <Tag tone="accent">인기</Tag>}
                  </span>
                  <span className="sc-pack-credits">{p.credits} <small>크레딧</small></span>
                  <span className="sc-muted">{p.price}</span>
                </button>
              ))}
            </div>
            <span className="sc-muted">가격과 단가는 서비스 기반 기획에서 정합니다 · 결제는 국내 PG로 진행합니다</span>
          </section>
        </div>
        <section className="sc-stack">
          <div className="sc-cell">
            <span className="sc-label">사용 내역</span>
            <span className="sc-spacer" />
            <Pill glyph={<ClockIcon />} label="기간" value="최근 30일" />
          </div>
          <div className="sc-table">
            <div className="sc-table-head"><span>일시</span><span>내용</span><span>프로젝트</span><span className="sc-right">크레딧</span></div>
            {LEDGER.map((r, i) => (
              <div key={i} className="sc-table-row">
                <span className="sc-muted">{r.when}</span>
                <span>{r.what}</span>
                <span className="sc-muted">{r.detail}</span>
                <span className={cx("sc-right sc-amount", r.tone === "plus" && "sc-amount--plus", r.tone === "refund" && "sc-amount--refund")}>
                  {r.tone === "minus" ? "−" : "+"}{r.amount}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </Screen>
  );
}
```

- [ ] **Step 3: 편집기 4상태**

`design/showcase/screens/Editors.tsx`:

```tsx
import { ActionStrip, Button, Chip, Dialog, Field, IconButton, Input, Popover, StyleCard, Switch, Textarea, Thumb, SLIDE_PRESETS, SLIDE_STYLES, type ThumbState } from "@/index";
import { CaretDownIcon, CheckIcon, CloseIcon, CopyIcon, DownloadIcon, ImageIcon, PlusIcon, SparkleIcon } from "@/index";

import { DECK, PHOTOS } from "../data";
import { renderSlide } from "../lib/slide";
import { canvas, storyRows } from "./editor";
import { EditorShell } from "./shell";

const OPTIONS: [string, string][] = [["위치", "아래"], ["제목", "크게"], ["어둡게", "40%"]];
const PRESET_NAMES = { basic: ["기본 고딕", "Pretendard · 남색과 노랑"], editorial: ["에디토리얼", "Noto Serif KR 제목 · 크림과 벽돌색"], impact: ["임팩트", "Black Han Sans 제목 · 검정과 주홍"], soft: ["부드럽게", "Gowun Dodum · 세이지와 초록"] } as const;

export function EditorOutline() {
  const states = DECK.map((s): ThumbState => (s.kind === "cta" ? "flat" : "empty"));
  return (
    <EditorShell
      rows={storyRows(states, 0, 4)}
      strip={
        <ActionStrip
          status={<><ImageIcon size={15} />이미지가 없는 슬라이드 <b>7장</b> · 문구를 확정한 뒤 생성하세요</>}
          actions={<><Button icon={<PlusIcon />}>슬라이드 추가</Button><Button variant="primary" size="lg" icon={<SparkleIcon />}>7장 생성 · 28 크레딧</Button></>}
        />
      }
      panel={canvas({ index: 1, template: "표지", options: OPTIONS, hint: "이미지가 없는 동안에는 스타일의 단색 배경 위에 글만 얹어 보여 줍니다", withImage: false })}
    />
  );
}

export function EditorGenerating() {
  const states: ThumbState[] = ["image", "image", "image", "pending", "failed", "empty", "empty", "flat"];
  return (
    <EditorShell
      rows={storyRows(states, 0)}
      strip={
        <ActionStrip
          status={<><span className="sc-lamp" /><b>1장</b> 생성 중 · 문구는 계속 고칠 수 있습니다</>}
          actions={<><Button icon={<PlusIcon />}>슬라이드 추가</Button><Button variant="primary" size="lg" icon={<SparkleIcon />}>남은 3장 생성 · 12 크레딧</Button></>}
        />
      }
      panel={canvas({ index: 1, template: "표지", options: OPTIONS, hint: "캔버스에서 배경을 끌어 잘릴 위치를 맞춥니다 · ⌘Enter로 남은 슬라이드를 생성합니다" })}
    />
  );
}

function StylePanel() {
  return (
    <div className="sc-overlay-pop">
      <Popover variant="setting" placement="static" style={{ width: 400, maxHeight: "none", padding: 18, display: "flex", flexDirection: "column", gap: 16 }} role="dialog" aria-label="스타일">
        <div className="sc-cell">
          <span style={{ fontSize: 14, fontWeight: 620 }}>스타일</span>
          <span className="sc-muted">덱 전체에 적용됩니다</span>
          <span className="sc-spacer" />
          <IconButton ghost size={28} icon={<CloseIcon />} aria-label="닫기" />
        </div>
        <div className="sc-style-grid">
          {SLIDE_PRESETS.map((p) => (
            <StyleCard
              key={p}
              pressed={p === "basic"}
              name={PRESET_NAMES[p][0]}
              description={PRESET_NAMES[p][1]}
              preview={
                <>
                  {renderSlide(DECK[0]!, 1, p, "4:5", true, { showFooter: false })}
                  {renderSlide(DECK[7]!, 8, p, "4:5", false, { showFooter: false })}
                </>
              }
            />
          ))}
        </div>
        <div className="sc-stack" style={{ gap: 8 }}>
          <span className="sc-label">색</span>
          <div className="sc-cell" style={{ gap: 6 }}>
            {([["배경", SLIDE_STYLES.basic.bg], ["글자", SLIDE_STYLES.basic.tx], ["강조", SLIDE_STYLES.basic.acc]] as const).map(([n, c]) => (
              <button key={n} type="button" className="sc-swatch-btn" aria-label={`${n} 색 바꾸기`}>
                <i style={{ background: c }} />
                <span className="sc-muted">{n}</span>
                <span className="sc-spacer" />
                <span style={{ color: "var(--tx)" }}>{c.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="sc-row-2" style={{ gridTemplateColumns: "1fr auto", alignItems: "end", gap: 12 }}>
          <Field label="계정 핸들" htmlFor="st-handle"><Input id="st-handle" defaultValue="@sunny.skin.lab" /></Field>
          <Field label="쪽 번호"><div style={{ height: 34, display: "flex", alignItems: "center" }}><Switch checked onChange={() => {}} aria-label="쪽 번호 표시" /></div></Field>
        </div>
        <Field label="이미지 스타일" htmlFor="st-img" hint="모든 슬라이드의 프롬프트 뒤에 붙습니다"><Textarea id="st-img" rows={2} defaultValue="따뜻한 필름 톤, 자연광, 여백 많은 구도" /></Field>
        <Field label="이미지 모델">
          <Button variant="model" icon={<span className="sc-cell" style={{ width: 18, height: 18, borderRadius: 5, background: "#e8e8ec", color: "#111", fontSize: 9, fontWeight: 800, justifyContent: "center" }}>F2</span>} style={{ justifyContent: "flex-start" }}>
            Flux 2 <span className="sc-muted">4 크레딧 / 장</span>
            <span className="sc-spacer" />
            <CaretDownIcon />
          </Button>
        </Field>
      </Popover>
    </div>
  );
}

export function EditorStyle() {
  const states: ThumbState[] = [...Array<ThumbState>(7).fill("image"), "flat"];
  return (
    <EditorShell
      rows={storyRows(states, 0)}
      strip={
        <ActionStrip
          status={<><CheckIcon size={15} />8장 모두 완성 · 내보낼 준비가 됐습니다</>}
          actions={<><Button icon={<PlusIcon />}>슬라이드 추가</Button><Button variant="primary" size="lg" icon={<SparkleIcon />} disabled>남은 슬라이드 없음</Button></>}
        />
      }
      panel={canvas({ index: 1, template: "표지", options: OPTIONS, hint: "스타일을 바꾸면 여덟 장이 모두 다시 그려집니다 · 이미지는 그대로입니다" })}
      exportPrimary
      styleOpen
      overlay={<StylePanel />}
    />
  );
}

function ExportDialog() {
  const caption = "SPF 50이면 하루 종일 안심일까요? 숫자보다 중요한 건 덧바르는 습관이에요. 출퇴근·야외·물놀이 상황별로 어떤 지수를 고르면 되는지, 성분표에서 무엇을 봐야 하는지 8장에 정리했어요. 저장해 두고 여름 내내 꺼내 보세요.";
  const tags = ["자외선차단제", "선크림추천", "여름피부관리", "스킨케어팁", "SPF", "PA등급", "덧바르기"].map((t) => `#${t}`).join(" ");
  return (
    <div className="sc-scrim">
      <Dialog open inline title="내보내기" onClose={() => {}} closeLabel="닫기" width={600} head={<span className="sc-muted">8장 · 1080×1350 · 크레딧을 쓰지 않습니다</span>}>
        <div className="sc-cell" style={{ gap: 6 }}>
          {DECK.map((s, i) => (
            <Thumb key={i} size={52} state={s.photo ? "image" : "flat"} src={s.photo ? PHOTOS[s.photo] : undefined} />
          ))}
        </div>
        <div className="sc-cell" style={{ gap: 6 }}>
          <span className="sc-label" style={{ width: 44 }}>형식</span>
          <Chip pressed>PNG</Chip>
          <Chip pressed={false}>JPG</Chip>
          <span className="sc-muted" style={{ marginLeft: 6 }}>01.png ~ 08.png와 caption.txt를 ZIP으로 묶습니다</span>
        </div>
        <Field label="캡션" htmlFor="ex-cap" counter={{ value: caption.length, max: 400 }}>
          <Textarea id="ex-cap" rows={3} defaultValue={caption} />
          <div className="sc-hashtags">{tags}</div>
        </Field>
        <div className="sc-cell">
          <Button size="lg" icon={<CopyIcon />} style={{ flex: 1 }}>캡션 복사</Button>
          <Button variant="primary" size="lg" icon={<DownloadIcon />} style={{ flex: 1 }}>ZIP 내려받기</Button>
        </div>
      </Dialog>
    </div>
  );
}

export function EditorExport() {
  const states: ThumbState[] = [...Array<ThumbState>(7).fill("image"), "flat"];
  return (
    <EditorShell
      rows={storyRows(states, 7)}
      strip={
        <ActionStrip
          status={<><CheckIcon size={15} />8장 모두 완성</>}
          actions={<><Button icon={<PlusIcon />}>슬라이드 추가</Button><Button variant="primary" size="lg" icon={<SparkleIcon />} disabled>남은 슬라이드 없음</Button></>}
        />
      }
      panel={canvas({ index: 8, template: "CTA", options: [["위치", "가운데"], ["어둡게", "60%"]], hint: "CTA는 기본이 단색 배경입니다 · 배경을 넣으려면 다시 생성을 누르세요" })}
      exportPrimary
      overlay={<ExportDialog />}
    />
  );
}
```

- [ ] **Step 4: 휴대폰, 템플릿, 스타일, 크레딧 모달**

`design/showcase/screens/Phone.tsx`:

```tsx
import { Avatar, HeartIcon, PhoneIcon } from "@/index";

import { DECK } from "../data";
import { renderSlide } from "../lib/slide";
import { Screen } from "./shell";

export function Phone() {
  return (
    <Screen width={390} height={844}>
      <div className="sc-phone-head">
        <Avatar initials="S" size={32} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>sunny.skin.lab</span>
          <span className="sc-muted" style={{ fontSize: 11 }}>협찬 아님 · 원본 오디오</span>
        </div>
      </div>
      <div style={{ position: "relative", flexShrink: 0 }}>
        {renderSlide(DECK[0]!, 1, "basic", "4:5", true, { style: { borderRadius: 0 } })}
        <span className="sc-badge">1/8</span>
      </div>
      <div className="sc-phone-actions">
        <HeartIcon size={22} />
        <div className="sc-dots">{DECK.map((_, i) => <i key={i} />)}</div>
      </div>
      <div className="sc-phone-caption">
        <span style={{ fontWeight: 600 }}>좋아요 1,284개</span>
        <span><b style={{ fontWeight: 600 }}>sunny.skin.lab</b> SPF 50이면 하루 종일 안심일까요? 숫자보다 중요한 건 덧바르는 습관이에요… <span className="sc-muted">더 보기</span></span>
        <span className="sc-muted">댓글 36개 모두 보기</span>
      </div>
      <span className="sc-spacer" />
      <div className="sc-phone-foot">
        <span className="ohf-credit"><PhoneIcon size={13} />휴대폰 미리보기 · 인스타그램 피드</span>
        <span className="sc-muted">옆으로 넘겨 보세요</span>
      </div>
    </Screen>
  );
}
```

`design/showcase/screens/Templates.tsx`:

```tsx
import { Tag } from "@/index";

import { DECK } from "../data";
import { renderSlide } from "../lib/slide";
import { Screen } from "./shell";

const SPECS: [number, string, string][] = [
  [0, "제목 28자 · 부제 24자 · 꼬리표 12자(선택)", "위치 · 제목 크기 · 어둡게 40%"],
  [1, "제목 24자 · 본문 90자", "위치 · 어둡게 55%"],
  [2, "제목 20자 · 항목 3~5개, 항목당 24자", "번호 표시 · 어둡게 75%"],
  [3, "인용문 60자 · 출처 20자(선택)", "위치 · 어둡게 60%"],
  [7, "제목 24자 · 부제 30자(선택)", "위치 · 기본은 단색 배경"],
];

export function Templates() {
  return (
    <Screen width={1440} height={520}>
      <div className="sc-page" style={{ width: "100%", padding: "28px 32px" }}>
        <div className="sc-page-head" style={{ alignItems: "baseline" }}>
          <h1 className="sc-page-title" style={{ fontSize: 20 }}>템플릿 5종</h1>
          <span className="sc-muted">한 덱의 다섯 장 · 기본 고딕 스타일 · 1080×1350을 256px로 줄여 실제 글꼴로 조판</span>
        </div>
        <div className="sc-cols">
          {SPECS.map(([i, limits, opts]) => (
            <div key={i} className="sc-col">
              {renderSlide(DECK[i]!, i + 1, "basic")}
              <div className="sc-cell"><span style={{ fontSize: 14, fontWeight: 620 }}>{DECK[i]!.label}</span><Tag tone="muted">{DECK[i]!.kind}</Tag></div>
              <span className="sc-muted" style={{ color: "var(--tx2)" }}>{limits}</span>
              <span className="sc-muted">옵션: {opts}</span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}
```

`design/showcase/screens/Styles.tsx`:

```tsx
import { SLIDE_PRESETS, SLIDE_STYLES, Tag } from "@/index";

import { DECK } from "../data";
import { renderSlide } from "../lib/slide";
import { Screen } from "./shell";

const INFO = {
  basic: ["기본 고딕", "Pretendard · 남색, 흰색, 노랑", "범용 · 기본값"],
  editorial: ["에디토리얼", "Noto Serif KR 제목 + Pretendard 본문 · 크림, 짙은 갈색, 벽돌색", "매거진, 뷰티, 라이프스타일"],
  impact: ["임팩트", "Black Han Sans 제목 + Pretendard 본문 · 검정, 흰색, 주홍", "정보성, 뉴스, 할인 공지"],
  soft: ["부드럽게", "Gowun Dodum · 세이지, 짙은 초록, 초록", "육아, 웰니스, 카페"],
} as const;

export function Styles() {
  return (
    <Screen width={1440} height={440}>
      <div className="sc-page" style={{ width: "100%", padding: "28px 32px" }}>
        <div className="sc-page-head" style={{ alignItems: "baseline" }}>
          <h1 className="sc-page-title" style={{ fontSize: 20 }}>스타일 4종</h1>
          <span className="sc-muted">글꼴 쌍 + 색 세 개(배경·글자·강조) · 왼쪽은 사진 위 표지, 오른쪽은 단색 CTA · 모두 OFL 글꼴</span>
        </div>
        <div className="sc-cols" style={{ gap: 16 }}>
          {SLIDE_PRESETS.map((p) => {
            const s = SLIDE_STYLES[p];
            return (
              <div key={p} className="sc-style-col" data-default={p === "basic"}>
                <div className="sc-style-pair">
                  {renderSlide(DECK[0]!, 1, p)}
                  {renderSlide(DECK[7]!, 8, p, "4:5", false)}
                </div>
                <div className="sc-cell">
                  <span style={{ fontSize: 14, fontWeight: 620 }}>{INFO[p][0]}</span>
                  {p === "basic" && <Tag tone="accent">기본값</Tag>}
                  <span className="sc-spacer" />
                  <span className="sc-chips">{[s.bg, s.tx, s.acc].map((c) => <i key={c} style={{ background: c }} />)}</span>
                </div>
                <span className="sc-muted" style={{ color: "var(--tx2)" }}>{INFO[p][1]}</span>
                <span className="sc-muted">{INFO[p][2]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
```

`design/showcase/screens/CreditsModal.tsx`:

```tsx
import { Button, Dialog } from "@/index";
import { PlusIcon, SparkleIcon } from "@/index";

export function CreditsModal() {
  return (
    <div style={{ width: 520, padding: 20 }}>
      <Dialog open inline title="크레딧이 부족합니다" onClose={() => {}} closeLabel="닫기" width={480} head={<span className="sc-muted">남은 3장 · 12 크레딧 필요</span>}>
        <div className="sc-row-3" style={{ gap: 8 }}>
          <div className="sc-stat"><span className="sc-muted">필요</span><b>12</b></div>
          <div className="sc-stat"><span className="sc-muted">잔액</span><b>4</b></div>
          <div className="sc-stat sc-stat--danger"><span style={{ fontSize: 11 }}>부족</span><b>8</b></div>
        </div>
        <span className="sc-muted">지금은 1장만 생성할 수 있습니다. 나머지는 충전한 뒤 이어서 생성할 수 있고, 문구 편집과 내보내기는 계속 됩니다.</span>
        <div className="sc-cell">
          <Button size="lg" icon={<SparkleIcon />} style={{ flex: 1 }}>1장만 생성 · 4 크레딧</Button>
          <Button variant="primary" size="lg" icon={<PlusIcon />} style={{ flex: 1 }}>충전하기</Button>
        </div>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 5: 화면 섹션 연결**

`design/showcase/sections/Screens.tsx`(교체):

```tsx
import { Chip } from "@/index";

import { Account } from "../screens/Account";
import { CreditsModal } from "../screens/CreditsModal";
import { EditorExport, EditorGenerating, EditorOutline, EditorStyle } from "../screens/Editors";
import { NewProject } from "../screens/NewProject";
import { Phone } from "../screens/Phone";
import { Projects } from "../screens/Projects";
import { Styles } from "../screens/Styles";
import { Templates } from "../screens/Templates";

const SCREENS = [
  { id: "projects", label: "프로젝트 목록", view: Projects },
  { id: "new", label: "새 프로젝트", view: NewProject },
  { id: "account", label: "계정 · 크레딧", view: Account },
  { id: "editor-outline", label: "편집기 ① 구성안", view: EditorOutline },
  { id: "editor-generating", label: "편집기 ② 생성 중", view: EditorGenerating },
  { id: "editor-style", label: "편집기 ③ 스타일", view: EditorStyle },
  { id: "editor-export", label: "편집기 ④ 내보내기", view: EditorExport },
  { id: "phone", label: "휴대폰 미리보기", view: Phone },
  { id: "templates", label: "템플릿 5종", view: Templates },
  { id: "styles", label: "스타일 4종", view: Styles },
  { id: "credits", label: "크레딧 부족 모달", view: CreditsModal },
];

export function Screens({ sub }: { sub?: string }) {
  const screen = SCREENS.find((s) => s.id === sub) ?? SCREENS[0]!;
  const View = screen.view;
  return (
    <>
      <h1 className="sc-h1">화면</h1>
      <p className="sc-lead">시안 11장을 실제 컴포넌트로 조립했다. 라임 버튼은 한 화면에 하나.</p>
      <div className="sc-toolbar">
        {SCREENS.map((s) => (
          <Chip key={s.id} pressed={s.id === screen.id} onClick={() => { location.hash = `screens/${s.id}`; }}>
            {s.label}
          </Chip>
        ))}
      </div>
      <div className="sc-frame">
        <View />
      </div>
    </>
  );
}
```

- [ ] **Step 6: 검증**

Run: `corepack pnpm typecheck && corepack pnpm test && corepack pnpm build:showcase`
Expected: 전부 통과. 타입 오류가 나면 대개 `data-state`·`aria-*`를 받지 않는 컴포넌트에 넘긴 것이다 — 해당 컴포넌트의 props가 `HTMLAttributes`를 확장하는지 확인한다.

Run: `corepack pnpm dev` 후 `http://localhost:5173/#screens/projects` … `#screens/credits` 11개를 차례로 연다.
Expected: 각 화면이 시안(https://claude.ai/artifact/M7Fbz6EVzSkYpGYqsLMtLt)과 같은 구성으로 보인다. 확인 항목: 편집기 4상태의 스토리보드 행 상태(선택 라임 막대, 생성 중 점, 실패 빨강, 글자 수 초과 빨간 카운터), 스타일 패널의 StyleCard 4장, 내보내기 모달, 휴대폰 390px. 콘솔 오류 없음. 확인 후 서버를 끈다. (브라우저를 쓸 수 없는 실행자는 건너뛰고 보고에 적는다.)

---

### Task 13: README, 래퍼 CLAUDE.md, 최종 검증

**Files:**
- Modify: `design/README.md`, `/Users/brian/works/agent/openhigsfield/CLAUDE.md`
- Modify: `/Users/brian/.claude/projects/-Users-brian-works-agent-openhigsfield/memory/design-system-package.md`(진행 상태)

- [ ] **Step 1: README 완성**

`design/README.md`(전체 교체):

```markdown
# @openhiggsfield/design

OpenHiggsfield 스튜디오의 디자인 시스템. 기존 `openhiggsfield.css`(3,736줄)를 SCSS 파셜로 옮겨 토큰화하고, 그 위에 React 컴포넌트·조립 요소·슬라이드 층을 얹었다. 기획서: `../docs/superpowers/specs/2026-09-18-design-system-design.md`.

## 명령

이 머신의 전역 pnpm은 9이므로 `corepack pnpm`을 쓴다(`packageManager: pnpm@10.33.2`).

| 명령 | 내용 |
| --- | --- |
| `corepack pnpm dev` | 쇼케이스(`#tokens`, `#components`, `#slides`, `#screens/<id>`) |
| `corepack pnpm build` | `dist/index.js`, `dist/index.d.ts`, `dist/ohf.css` + `scripts/check-dist.mjs` |
| `corepack pnpm build:showcase` | `dist-showcase/` |
| `corepack pnpm tokens` | `_emit.scss` → `src/tokens/tokens.json` |
| `corepack pnpm test` | Vitest: parity, token-rules, tokens-sync, contrast, 컴포넌트 스모크 |
| `corepack pnpm typecheck` | `tsc --noEmit` |

## 층

1. **토큰** `src/styles/tokens/_maps.scss` → `_emit.scss`가 `.ohf { --… }`로 뽑는다. 기존 31개는 값 그대로, 40개 추가(`--radius-*`, `--h-*`, `--fs-*`, `--fw-*`, `--ls-*`, `--sp-*`, `--dur-*`). `$z`, `$bp`는 SCSS 전용.
2. **스튜디오 파셜** `src/styles/base/*`, `src/styles/studio/*` — 원본 20개 섹션을 1:1로. `test/parity.test.ts`가 원본과 선언 단위로 비교한다(`var()`는 양쪽 다 치환한 뒤). 원본 경로: `../open-higgsfield/src/openhiggsfield/openhiggsfield.css`.
3. **컴포넌트** `src/components/*`(17), `src/composites/*`(9). 스튜디오가 이미 그리는 클래스는 그대로 쓰고 새 변형·상태만 SCSS로 더한다. 토큰은 `var()`로만(`test/token-rules.test.ts`).
4. **슬라이드** `src/slides/*` — `SlideFrame` + 템플릿 5 + 프리셋 4. 앱 토큰을 쓰지 않는다(`--sl-*`만). 세로 정렬 `position`은 템플릿이 아니라 `SlideFrame`이 갖는다.

## 스튜디오 클래스 ↔ 컴포넌트

| 스튜디오 | 컴포넌트 |
| --- | --- |
| `.ohf-generate` | `Button variant="primary" size="lg"` |
| `.ohf-btn-solid` / `.ohf-ctl--model` | `Button variant="model"` |
| `.ohf-ctl` | `Button variant="secondary"`(문구) · `Pill`(값) |
| `.ohf-btn-quiet` | `Button variant="ghost"` |
| `.ohf-icon-btn(--ghost)` | `IconButton` |
| `.ohf-chip` | `Chip` |
| `.ohf-tabs/.ohf-tab/.ohf-thumb` | `Segment` |
| `.ohf-field*` / `.ohf-input` | `Field` / `Input` / `Textarea` |
| `.ohf-batch*` | `Stepper` |
| `.ohf-slider` / `.ohf-opts` | `Slider` / `OptionList` |
| `.ohf-skeleton*` | `Skeleton` |
| `.ohf-popover*` / `.ohf-menu*` | `Popover` / `Menu` / `MenuRow` |
| `.ohf-dialog-panel` | `Dialog` |
| `.ohf-alert*` / `.ohf-undo*` / `.ohf-tip` / `.ohf-kbd` / `.ohf-spinner` | `Alert` / `UndoBar` / `Tooltip` / `Kbd` / `Spinner` |

## 규칙

- 라임(`--accent`)은 상태에만: 선택, 주 동작, 생성 중. 한 화면에 primary 버튼은 하나.
- 컴포넌트에 문구를 넣지 않는다. 필수/선택 표시도 `required="필수"`처럼 문구를 넘긴다.
- 상태는 `:hover`와 `[data-state="hover"]`를 항상 같이 정의한다(쇼케이스가 고정해 보여 준다).
- `src/`는 `react-dom`을 import하지 않는다.

## Next 앱에 붙이기(통합 단계, 아직 하지 않음)

1. `open-higgsfield/package.json`에 `"@openhiggsfield/design": "file:../design"`(또는 배포 뒤 버전).
2. `src/app/layout.tsx`에서 `import "@openhiggsfield/design/ohf.css"`로 바꾸고 `openhiggsfield.css` import를 뺀다. parity가 0이므로 화면은 같다.
3. Pretendard 전환: `--font-ohf-inter`를 `next/font/local`의 Pretendard 변수로 싣는다. `--font-ui` 값은 바꾸지 않는다.
4. 컴포넌트 치환은 화면 단위로, 위 표를 따라.

## 알려진 결정

- `Segment`의 선택 판은 실제 폭을 재서 움직인다(`ResizeObserver`, 없으면 건너뜀).
- `Dialog`는 `<dialog>`와 `showModal()`을 쓴다. `inline`이면 패널만 그린다(쇼케이스·미리보기).
- `Thumb`의 `flat` 상태 색은 props(`flatColor`, `flatAccent`)로 받는다. 기본값은 basic 프리셋.
- 스튜디오 파셜의 토큰화는 `scripts/tokenize-studio.mjs`가 했고 멱등이다. 간격 리터럴과 7/9/12px 보정값은 그대로다.
```

- [ ] **Step 2: 래퍼 CLAUDE.md에 한 단락**

`/Users/brian/works/agent/openhigsfield/CLAUDE.md`의 `## Workspace layout` 첫 문단에서 "`docs/` is an empty scratch folder"를 "`docs/superpowers/` holds the specs and plans (outside git on purpose)"로 바꾸고, 그 문단 바로 뒤에 추가:

```markdown
`design/` (sibling of `open-higgsfield/`, also outside git) is the design-system
package `@openhiggsfield/design`: React + Vite library (`dist/index.js`,
`dist/ohf.css`) plus a showcase. Its SCSS partials are a 1:1 port of
`openhiggsfield.css`, verified by `design/test/parity.test.ts` against the
original file — **change the studio stylesheet in one place and re-run that
test**. Commands there use `corepack pnpm` (pnpm 10). See `design/README.md`.
```

- [ ] **Step 3: 최종 검증**

Run:

```bash
cd /Users/brian/works/agent/openhigsfield/design
corepack pnpm test && corepack pnpm typecheck && corepack pnpm build && corepack pnpm build:showcase
ls dist dist/tokens && grep -c "react-dom" dist/index.js; echo "(0이어야 함)"
node scripts/tokenize-studio.mjs
```

Expected: 테스트 전부 통과(skipped 0), 타입 오류 없음, `dist ok`, `dist/tokens/tokens.json` 존재, `react-dom` 0건, `tokenized 0 partials`.

- [ ] **Step 4: 메모리 갱신**

`/Users/brian/.claude/projects/-Users-brian-works-agent-openhigsfield/memory/design-system-package.md`의 "진행 상태" 문단을 다음으로 바꾼다(날짜는 실제 완료일):

```
진행 상태(YYYY-MM-DD): 구현 완료. `design/`에서 `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build`가 통과한다. 계획서: `docs/superpowers/plans/2026-09-18-design-system.md`. 다음은 Next 앱 통합(README "Next 앱에 붙이기" 절), 사용자 결정 뒤에.
```

---

## 자체 검토 기록

- 기획서 §3 구조: Task 1(설정), 2(토큰), 3(파셜), 5(아이콘), 6–8(컴포넌트), 9(슬라이드), 10(조립), 11–12(쇼케이스), `scripts/` 3개(Task 1·2·4). `test/` 5개 + `flatten` 도우미.
- 기획서 §4: 31 + 40 토큰(Task 2), 믹스인 6종 + `z()`(Task 4), 슬라이드 토큰(Task 9; `--sl-acc-ink`, `--sl-head-weight/-ls/-lh`를 더했다 — 프리셋의 굵기·자간·행간을 실을 자리), 토큰화 범위(Task 4 스크립트).
- 기획서 §5: 17 기본 요소(Task 6–8), 9 조립 요소(Task 10), 슬라이드 5 템플릿·4 프리셋(Task 9), 아이콘 30+12(Task 5). `position`은 `SlideFrame` prop(README에 기록). `Field.required/optional`은 문구(ReactNode).
- 기획서 §6: 4 섹션(Task 11–12), 화면 11장(Task 12).
- 기획서 §7: parity(Task 3), 토큰 규칙(Task 4, 슬라이드는 `--sl-*` 규칙), 토큰 동기화(Task 2), 스모크(각 컴포넌트 테스트), 타입·빌드(`check-dist.mjs`).
- 기획서 §9 확인 항목: Task 1 Step 4에 처방 포함. `sass-embedded` arm64 패키지는 존재 확인됨(1.104.1).
- 기획서와 다른 점: 토큰 수 33→31(원본 재계산, 기획서 수정함); `Skeleton`·`Kbd`·`Spinner`·`Slider`·`OptionList`·`Alert`·`UndoBar`는 SCSS 파일 없음(추가 규칙이 없다); 조립 요소·컴포넌트 클래스 중 스튜디오에 없는 것은 새 이름(`ohf-frame`, `ohf-appbar` 등, 충돌 확인함).
- 타입 일관성: `SegmentProps`(Task 6) → `TopBar.nav`, `CanvasPanel.mode`(Task 10); `ThumbProps`(Task 8) → `StoryboardRow.thumb`(Task 10); `SlideFrameProps`(Task 9) → `renderSlide`(Task 11); `ButtonVariant`/`ButtonSize`(Task 6) → 쇼케이스(Task 11). `cx`·`ratioBox`·`ratioToCss`는 공개 API에서 export(Task 6)하고 쇼케이스가 `@/index`로 쓴다.
