# OpenHiggsfield 디자인 시스템 기획서

- 날짜: 2026-09-18
- 위치: 래퍼 루트 `design/` (`open-higgsfield/` 옆, git 밖. `docs/`와 같은 자리)
- 관련 문서: `2026-09-18-content-formats-design.md`(콘텐츠 포맷 확장 기획), 디자인 시안 https://claude.ai/artifact/M7Fbz6EVzSkYpGYqsLMtLt
- 원천 코드: `open-higgsfield/src/openhiggsfield/openhiggsfield.css`(3,736줄, 20개 섹션), `icons.tsx`, `ui.tsx`, `settings.tsx`, `topbar.tsx`, `src/app/base.css`

## 1. 목표와 범위

기존 스튜디오의 디자인(어두운 바탕, 라임 강조 하나, 헤어라인 경계, 고정폭 숫자)을 **재사용 가능한 패키지**로 만든다. React + Vite로 빌드하고, 기존 CSS를 SCSS로 옮겨 토큰화하며, 콘텐츠 스튜디오 시안(프로젝트 목록·브리프·편집기·슬라이드)에 필요한 요소를 같은 일관성으로 추가한다.

### 다루는 것

- 토큰: 기존 31개 유지 + 반지름·높이·글자·굵기·자간·간격·모션 토큰 40개 추가
- 기존 스타일시트의 SCSS 변환과 변환 검증(parity)
- 기본 요소 17개, 조립 요소 9개, 슬라이드 층(템플릿 5종, 프리셋 4종), 아이콘 42개
- 쇼케이스 앱(토큰 / 컴포넌트 상태 매트릭스 / 슬라이드 / 시안 11장 조립)
- 라이브러리 빌드(`dist/index.js`, `dist/index.d.ts`, `dist/ohf.css`)

### 다루지 않는 것

- 저장소(`open-higgsfield/`) 수정과 통합. 통합 절차는 README에만 적는다.
- Storybook, 시각 회귀 스냅샷, 라이트 테마, npm 배포, 다국어 문자열

## 2. 합의한 결정

| 항목 | 결정 | 이유 |
| --- | --- | --- |
| 위치 | 래퍼 루트 `design/` | 공개 저장소 구조를 건드리지 않고, 검증 뒤 옮기거나 배포 |
| 쓰임새 | 라이브러리 + 쇼케이스 둘 다 | Next 앱이 나중에 가져다 쓰고, 지금은 눈으로 검토 |
| 스타일 | **SCSS**(맵·믹스인·파셜) + 런타임은 CSS 커스텀 프로퍼티 | 리터럴로 흩어진 값을 한 곳에서 정의하되, 테마와 런타임 덮어쓰기는 유지 |
| 빌드 결과 | 순수 CSS 한 파일 `ohf.css` | Next 앱은 Sass 없이 소비. 저장소의 "순수 CSS 하나" 규칙 유지 |
| 기존 토큰 | 이름·값 그대로, 추가만 | 424곳의 `var(--…)`와 parity 검증을 지키기 위해 |
| 변환 검증 | 컴파일 결과 vs 원본 CSS의 선언 단위 비교 | 섹션을 옮길 때마다 어긋남을 즉시 발견 |
| 컴포넌트 문구 | 없음, 모두 props | 나중에 `src/i18n/ko.ts`가 채움 |

## 3. 구조와 빌드

```
design/
├─ package.json               @openhiggsfield/design · private · "type": "module"
├─ pnpm-lock.yaml
├─ vite.config.ts             mode === "lib"이면 라이브러리 빌드, 아니면 쇼케이스
├─ vitest.config.ts           environment: jsdom, setupFiles: test/setup.ts
├─ tsconfig.json              strict, noUnusedLocals, noUnusedParameters, jsx: react-jsx, paths @/* → src/*
├─ index.html                 쇼케이스 진입점. Pretendard(npm)와 Google Fonts 3종은 여기서만 로드
├─ README.md
├─ src/
│  ├─ index.ts                공개 API: 컴포넌트, 조립 요소, 슬라이드, 아이콘, tokens
│  ├─ styles/
│  │  ├─ index.scss           @use tokens/emit, base/*, studio/*  (컴포넌트·슬라이드 SCSS는 각 .tsx가 import)
│  │  ├─ tokens/_maps.scss    원천 맵
│  │  ├─ tokens/_emit.scss    .ohf { --… } 로 뽑음
│  │  ├─ _mixins.scss
│  │  ├─ base/_reset.scss     기존 1~136줄(.ohf 스코프, 리셋, 선택, 스크롤바, focus-visible)
│  │  ├─ base/_keyframes.scss 기존 137~340줄
│  │  └─ studio/_*.scss       기존 20개 섹션을 1:1로(shell, topbar, tabs, lamp, main, gallery, picking, empty, composer, attached, dock, tooltips, popovers, asset-picker, dialogs, viewer, entrance, responsive, reduced-motion)
│  ├─ tokens/
│  │  ├─ tokens.json          생성물(scripts/export-tokens.mjs)
│  │  └─ index.ts             `tokens` 객체와 `Token` 타입, `cssVar("radius-ctl")` 헬퍼
│  ├─ components/<Name>/      <Name>.tsx, <Name>.scss, index.ts, <Name>.test.tsx
│  ├─ composites/<Name>/      같은 구조
│  ├─ slides/                 SlideFrame.tsx, templates/*.tsx, styles.ts(SLIDE_STYLES), slides.scss
│  └─ icons/index.tsx         16격자 1.5px 획. 기존 30 + 신규 12
├─ showcase/
│  ├─ main.tsx, App.tsx, showcase.scss
│  └─ sections/ Tokens.tsx, Components.tsx, Slides.tsx, Screens.tsx (+ screens/*.tsx 시안 11장)
├─ scripts/export-tokens.mjs  _emit.scss 컴파일 → `.ohf { --x: y }` 파싱 → tokens.json
└─ test/
   ├─ setup.ts                @testing-library/jest-dom
   ├─ parity.test.ts          변환 검증
   ├─ token-rules.test.ts     컴포넌트 SCSS에 토큰 값 리터럴 금지
   └─ tokens-sync.test.ts     tokens.json이 맵과 같은지
```

### 빌드

- `pnpm dev`: 쇼케이스 개발 서버. `src/`를 소스로 직접 가져다 씀.
- `pnpm build`: `vite build --mode lib`. `build.lib = { entry: src/index.ts, formats: ["es"], fileName: "index", cssFileName: "ohf" }`, `rollupOptions.external = ["react", "react-dom", "react/jsx-runtime"]`, `cssCodeSplit: false`. `vite-plugin-dts`로 `dist/index.d.ts`.
- `pnpm build:showcase`: `vite build --outDir dist-showcase`.
- `pnpm tokens`: `node scripts/export-tokens.mjs`.
- `pnpm test`, `pnpm typecheck`(`tsc --noEmit`).
- `package.json` `exports`: `"."` → `dist/index.js` + types, `"./ohf.css"` → `dist/ohf.css`. `peerDependencies`: react ^19, react-dom ^19.

### 의존성

react 19, react-dom 19, vite 7, @vitejs/plugin-react, sass-embedded, typescript 5.9, vitest, jsdom, @testing-library/react, @testing-library/jest-dom, vite-plugin-dts, pretendard(쇼케이스용 글꼴). pnpm 10.

## 4. 토큰과 SCSS 층

### 4.1 기존 토큰(그대로)

`--bg --rail --s1 --s2 --s3 --s4 --line --line-2 --tx --tx2 --tx3 --tx4 --tx-off --accent --accent-strong --accent-ink --accent-08 --accent-14 --accent-32 --plate --plate-ink --shadow-1 --shadow-2 --shadow-3 --glint --ease --ease-slide --font-ui --danger --danger-bg --danger-line`. `.ohf` 스코프에 선언한다(`:root`가 아님).

`--font-ui`의 값은 `var(--font-ohf-inter), ui-sans-serif, system-ui, sans-serif`로 **원본과 같게** 둔다(parity). Pretendard 전환은 통합 단계에서 `--font-ohf-inter` 대신 Pretendard를 싣는 것으로 한다. 쇼케이스는 `index.html`에서 `--font-ohf-inter: "Pretendard Variable"`을 정의해 미리 보여 준다.

### 4.2 추가 토큰

| 묶음 | 토큰 | 값 |
| --- | --- | --- |
| 반지름 | `--radius-xs / sm / md / ctl / lg / bar / xl / pill` | 4 / 6 / 8 / 10 / 14 / 15 / 24 / 999px |
| 컨트롤 높이 | `--h-xs / sm / md / lg / bar` | 28 / 32 / 36 / 38 / 46px |
| 글자 크기 | `--fs-2xs / xs / sm / md / base / lg / title` | 10.5 / 11.5 / 12.5 / 13 / 14 / 15 / 22px |
| 굵기 | `--fw-medium / strong / bold / display` | 500 / 550 / 600 / 620 |
| 자간 | `--ls-tight / heading / caps` | −0.005em / −0.015em / 0.16em |
| 간격 | `--sp-0 … --sp-8` | 2 / 4 / 6 / 8 / 12 / 16 / 20 / 24 / 32px |
| 모션 | `--dur-fast / base / slow / slide` | 0.12 / 0.15 / 0.2 / 0.34s |

SCSS 전용(emit하지 않음): `$z: (base: 1, raised: 2, float: 3, bar: 30, overlay: 40)`, `$bp: (md: 900px, sm: 760px, xs: 640px, xxs: 560px, tiny: 400px, min: 360px)`.

### 4.3 맵 → emit → 사용

```scss
// tokens/_maps.scss
$radius: (xs: 4px, sm: 6px, md: 8px, ctl: 10px, lg: 14px, bar: 15px, xl: 24px, pill: 999px);
// tokens/_emit.scss
@use "maps";
.ohf { @each $k, $v in maps.$radius { --radius-#{$k}: #{$v}; } /* … 다른 맵도 같은 방식 */ }
// components/Button/Button.scss
@use "@/styles/mixins" as m;
.ohf-btn { height: var(--h-lg); border-radius: var(--radius-ctl); @include m.press; }
```

규칙: 컴포넌트·슬라이드 SCSS는 맵 값을 속성에 직접 쓰지 않고 `var()`만 쓴다. `token-rules.test.ts`가 강제한다.

### 4.4 믹스인

| 이름 | 내용 |
| --- | --- |
| `control-states($hover-bg, $hover-color)` | `:hover`, `[data-state="hover"]`, `:active`/`[data-state="active"]`, `:disabled`, `[aria-expanded="true"]`, `[aria-pressed="true"]`를 한 묶음으로. 쇼케이스가 `data-state`로 상태를 고정해 보여 줌 |
| `focus-ring` | 기존 `:focus-visible` 규칙(`outline: 2px solid var(--accent-32)`) |
| `press` | `:active { transform: scale(0.96) }` + `transition: transform var(--dur-base) var(--ease)` |
| `tabular` | `font-variant-numeric: tabular-nums` |
| `truncate` | 한 줄 말줄임 |
| `bp($name)` | `@media (max-width: map.get($bp, $name))` |

### 4.5 슬라이드 토큰

`.ohf-slide { --sl-bg; --sl-tx; --sl-acc; --sl-head; --sl-body }`. 프리셋 4종이 채운다. 크기는 `cqw`(컨테이너 단위). 앱 토큰을 참조하지 않는다.

| 프리셋 | bg / tx / acc | head / body |
| --- | --- | --- |
| basic | #1d2a44 / #ffffff / #ffd54a | Pretendard 800 / Pretendard |
| editorial | #f3ece0 / #2a2320 / #b5482f | Noto Serif KR 700 / Pretendard |
| impact | #0f0f10 / #ffffff / #ff5a3c | Black Han Sans 400 / Pretendard |
| soft | #e6efe6 / #22332b / #3f7d5d | Gowun Dodum 400 / Gowun Dodum |

### 4.6 스튜디오 파셜의 토큰화 범위

값이 토큰과 정확히 같은 자리만 바꾼다(반지름 4/6/8/10/14/15/24, 높이 28/32/36/38/46, 글자 크기, 굵기 500/550/600/620, 지속 시간 0.12/0.15/0.2/0.34s). 7px·9px·12px 같은 동심원 보정값과 간격 리터럴은 그대로 둔다. `--ctl-r`는 composer 파셜에서 `var(--radius-ctl)`로 바꾼다.

## 5. 컴포넌트

### 5.1 규칙

- 폴더당 하나: `<Name>.tsx`, `<Name>.scss`(`@use "@/styles/mixins"`, 토큰은 `var()`), `index.ts`, `<Name>.test.tsx`.
- 클래스는 `ohf-` 접두어. 기존 클래스 이름이 있으면 그대로 쓴다(`ohf-generate`는 `ohf-btn--primary`의 별칭으로 남긴다).
- 문구는 props로. 아이콘만 있는 버튼은 `aria-label` 필수(타입).
- 진짜 요소: `<button>`, `<a href>`, `<input>`+`<label>`. `aria-pressed`(토글), `aria-selected`(탭), `role="switch"`.
- `className`과 native 속성 전달, `ref`는 React 19 prop.

### 5.2 기본 요소 (17)

| 컴포넌트 | props 요지 | 상태 |
| --- | --- | --- |
| `Button` | `variant: primary\|secondary\|model\|ghost\|danger`, `size: sm\|md\|lg`, `icon?`, `kbd?`, `busy?`, `loading?`, `href?` | hover, active, disabled, busy(`data-busy`, 라임 14%), loading(스피너) |
| `IconButton` | `icon`, `aria-label`(필수), `size: 28\|30\|36` | hover, active, disabled |
| `Chip` | `pressed?`, `dot?`, `ratio?: string`, `disabled?` | pressed(라임 14%), hover, disabled |
| `Pill` | `glyph?`, `label`, `value`, `expanded?`, `onClick` | hover, expanded(라임 32% 테두리) |
| `Segment` | `items: {id,label,icon?}[]`, `value`, `onChange`, `size: sm\|md` | 움직이는 판(`--thumb-x/--thumb-w` 측정) |
| `Tag` | `tone: default\|accent\|muted` | |
| `Field` | `label`, `hint?`, `required?`, `optional?`, `counter?: {value,max}`, `error?` | error |
| `Input`, `Textarea` | native + `invalid?` | focus, invalid, disabled |
| `Stepper` | `value`, `min`, `max`, `onChange`, `suffix?` | min/max에서 버튼 disabled |
| `Switch` | `checked`, `onChange`, `aria-label` | on(라임), off, disabled |
| `Slider`, `OptionList` | `ui.tsx`와 같음 | |
| `Avatar` | `initials` 또는 `src`, `size: 28\|32\|44` | |
| `CreditBadge` | `amount: number` | |
| `Skeleton` | `label?`, `clock?` | |
| `Thumb` | `state: image\|pending\|failed\|empty\|flat`, `src?`, `size` | 5상태 |
| `Popover`, `Menu`, `MenuRow` | `variant: setting\|list\|picker\|menu\|assets` | |
| `Dialog` | `open`, `title`, `onClose`, `width?` | 스크림, Esc, `aria-modal` |
| `Alert`, `UndoBar`, `Tooltip`, `Spinner`, `Kbd` | 컴포저 띠에서 그대로 | |

### 5.3 조립 요소 (9)

| 컴포넌트 | 내용 |
| --- | --- |
| `TopBar` | 브랜드, `Segment`(Studio\|Projects), `CreditBadge`, 충전 `Button`, `Avatar` |
| `ProjectHeader` | 뒤로 `IconButton`, 제목, `Tag`들, 저장 상태, 액션 슬롯(스타일·내보내기) |
| `BriefBar` | 컴포저 카드 모양: 라벨 + 주제 + `Pill`들 + 액션 |
| `StoryboardRow` | 8상태: 기본, hover, 선택(라임 막대), 편집 중, 생성 중, 실패(다시 시도), 글자 수 초과(빨간 카운터), 끄는 중. 번호·`Thumb`·태그·제목·부제·프롬프트·액션(`IconButton`×3) |
| `ActionStrip` | 왼쪽 상태 문구 + 오른쪽 버튼. `Alert`/`UndoBar`를 얹는 슬롯 |
| `CanvasPanel` | `Segment`(슬라이드\|휴대폰), 페이저, 스테이지 슬롯, 템플릿 `Chip`들, 옵션 `Pill`들, 액션 |
| `ProjectCard` | 미니 덱 4장, 제목, 메타, 상태(완성·생성 중·구성안) |
| `FormatCard` | 아이콘, 이름, 설명, `pressed`, `soon`(준비 중) |
| `StyleCard` | 표지+CTA 미니 슬라이드, 이름, 설명, `pressed` |

### 5.4 슬라이드

- `SlideFrame`: `preset`, `ratio: "4:5"\|"3:4"\|"1:1"\|"9:16"`, `image?`, `dim?: number\|"grad"`, `handle?`, `page?`, `showFooter?`. 루트에 `container-type: inline-size`.
- 템플릿: `CoverSlide{kicker?,title,sub?,position,titleSize}`, `BodySlide{title,body,position}`, `ListSlide{title,items:{label,value?}[],numbered}`, `QuoteSlide{quote,source?}`, `CtaSlide{title,sub?,pill?}`.
- `SLIDE_STYLES`: 4.5절의 프리셋.
- 글자 크기는 시안의 비율을 그대로(제목 10.4cqw, 소제목 7.4cqw, 본문 4.5cqw, 목록 4.5cqw, 인용 6.8cqw, 꼬리표 3.4cqw, 바닥글 3.1cqw). `word-break: keep-all`, 제목에 `text-wrap: balance`.

### 5.5 아이콘

기존 30개(`ImageIcon` … `WaveBadgeIcon`)를 그대로 옮기고, 같은 규격으로 12개 추가: `SparkleIcon`, `PaletteIcon`, `GripIcon`, `UserIcon`, `FilmIcon`, `LayoutIcon`, `LayersIcon`, `PhoneIcon`, `TextIcon`, `WalletIcon`, `ChevronLeftIcon`, `ChevronRightIcon`. `GemIcon`은 크레딧, `RetryIcon`은 다시 생성에 쓴다.

## 6. 쇼케이스

한 페이지, 왼쪽 목차 + 오른쪽 내용. `.ohf` 스코프 안에서 디자인 시스템으로 만든다.

| 섹션 | 내용 |
| --- | --- |
| 토큰 | `tokens.json`에서 그림. 색 견본(배경 대비비 표시), 반지름·높이·글자·간격 자, 그림자, 모션 |
| 컴포넌트 | 컴포넌트마다 변형 × 상태 매트릭스. hover/active는 `data-state`로 고정 |
| 슬라이드 | 템플릿 5 × 프리셋 4, 어둡게 0·40·75, 비율 4종 |
| 화면 | 시안 11장을 실제 컴포넌트로 조립 |

## 7. 검증

| 검사 | 방법 | 실패 조건 |
| --- | --- | --- |
| parity | `styles/index.scss` 컴파일 → `var(--x)`를 emit 값으로 치환(중첩 `var()` 반복) → 주석 제거, 공백·세미콜론 정규화, `선택자 { 선언 }` 단위로 정렬 없이 순서대로 비교 → 원본 `../open-higgsfield/src/openhiggsfield/openhiggsfield.css`와 같은 처리 후 비교 | 다름. 원본 파일이 없으면 실패 |
| 토큰 규칙 | `src/components`, `src/composites`, `src/slides`의 SCSS에서 속성값에 토큰 값 리터럴이 있는지 | 있음 |
| 토큰 동기화 | `export-tokens.mjs`를 메모리에서 실행해 `tokens.json`과 비교 | 다름 |
| 스모크 | 컴포넌트마다 렌더 + 역할 + 상태 클래스 | |
| 타입 | `tsc --noEmit` | |
| 빌드 | `dist/index.js`, `dist/index.d.ts`, `dist/ohf.css` 존재, `dist/index.js`에 `react-dom` 코드 없음 | |

parity 주의: 원본은 `.ohf-composer { --ctl-r: 10px }`처럼 지역 커스텀 프로퍼티도 쓴다. 치환 표는 **양쪽 모두** "emit된 토큰 + 그 파일 안에 선언된 모든 `--x: y`"로 만들고, 값이 정해질 때까지 반복 치환한다. 그래서 composer 파셜이 `--ctl-r: var(--radius-ctl)`로 선언을 남겨 두면, 선언도 사용처도 양쪽에서 `10px`로 풀려 같아진다. 선언을 지우면 실패한다(의도한 동작: 원본의 선언은 모두 남아야 한다).

## 8. 구현 순서

1. 스캐폴딩: package.json, vite/vitest/ts 설정, index.html, README 뼈대, `pnpm install`, 빈 `src/index.ts`로 `pnpm build` 통과
2. 토큰: `_maps.scss`, `_emit.scss`, `export-tokens.mjs`, `tokens.json`, `tokens/index.ts`, `tokens-sync.test.ts`
3. 베이스 + 스튜디오 파셜 1:1 변환, `parity.test.ts`(차이 0)
4. 믹스인, 스튜디오 파셜 토큰화 패스(parity 유지), `token-rules.test.ts`
5. 아이콘 42개
6. 기본 요소 1묶음: Button, IconButton, Chip, Pill, Segment, Tag, Kbd, Spinner
7. 기본 요소 2묶음: Field, Input, Textarea, Stepper, Switch, Slider, OptionList, Avatar, CreditBadge
8. 기본 요소 3묶음: Skeleton, Thumb, Popover/Menu, Dialog, Alert, UndoBar, Tooltip
9. 슬라이드 층
10. 조립 요소 9개
11. 쇼케이스: 토큰 → 컴포넌트 → 슬라이드 → 화면
12. README 완성, 래퍼 `CLAUDE.md`에 한 단락

각 단계는 `pnpm test && pnpm typecheck`가 통과해야 끝난다.

## 9. 구현 전 확인 항목

| 항목 | 확인 방법 | 결과에 따라 |
| --- | --- | --- |
| Vite 7의 `build.lib.cssFileName` | 스캐폴딩 단계에서 빌드 | 없으면 `rollupOptions.output.assetFileNames`로 이름 지정 |
| `vite-plugin-dts`의 Vite 7 호환 | 설치·빌드 | 안 되면 `tsc --emitDeclarationOnly`로 대체 |
| `sass-embedded`의 macOS arm64 바이너리 | 설치 | 안 되면 `sass`(JS) |
| npm `pretendard` 패키지의 CSS 경로 | `node_modules/pretendard/dist/web/variable/pretendardvariable.css` | 다르면 jsdelivr `<link>` |
| React 19 `ref` prop | 타입 확인 | |
