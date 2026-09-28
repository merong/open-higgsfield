# @openhiggsfield/design

OpenHiggsfield 스튜디오의 디자인 시스템. 기존 `openhiggsfield.css`(3,736줄)를 SCSS 파셜로 옮겨 토큰화하고, 그 위에 React 컴포넌트·조립 요소·슬라이드 층을 얹었다. 기획서: `../docs/superpowers/specs/2026-09-18-design-system-design.md`.

## 명령

이 머신의 전역 pnpm은 9이므로 `corepack pnpm`을 쓴다(`packageManager: pnpm@10.33.2`).

| 명령                           | 내용                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `corepack pnpm dev`            | 쇼케이스(`#tokens`, `#components`, `#slides`, `#screens/<id>`)                |
| `corepack pnpm build`          | `dist/index.js`, `dist/index.d.ts`, `dist/ohf.css` + `scripts/check-dist.mjs` |
| `corepack pnpm build:showcase` | `dist-showcase/`                                                              |
| `corepack pnpm tokens`         | `_emit.scss` → `src/tokens/tokens.json`                                       |
| `corepack pnpm test`           | Vitest: parity, token-rules, tokens-sync, contrast, 컴포넌트 스모크           |
| `corepack pnpm typecheck`      | `tsc --noEmit`                                                                |

## 층

1. **토큰** `src/styles/tokens/_maps.scss` → `_emit.scss`가 `.ohf { --… }`로 뽑는다. 기존 31개는 값 그대로, 40개 기반 토큰과 18개 의미/확장 토큰을 더해 총 89개다. 기존 71개 값은 유지한다(`--radius-*`, `--h-*`, `--fs-*`, `--fw-*`, `--ls-*`, `--sp-*`, `--dur-*`). `$z`, `$bp`는 SCSS 전용.
2. **스튜디오 파셜** `src/styles/base/*`, `src/styles/studio/*` — 원본 20개 섹션을 1:1로. `test/parity.test.ts`가 원본과 선언 단위로 비교한다(`var()`는 양쪽 다 치환한 뒤). 저장소 통합 후 원본 경로: `../src/openhiggsfield/openhiggsfield.css`.
3. **컴포넌트** `src/components/*`(30), `src/composites/*`(11). 스튜디오가 이미 그리는 클래스는 그대로 쓰고 새 변형·상태만 SCSS로 더한다. 토큰은 `var()`로만(`test/token-rules.test.ts`).
4. **슬라이드** `src/slides/*` — `SlideFrame` + 템플릿 7 + 프리셋 4 + full/split/inset 구도. 앱 토큰을 쓰지 않는다(`--sl-*`만). 기획서는 `position`(세로 정렬)을 템플릿의 props로 두었지만, 세로 정렬은 `SlideFrame`의 레이아웃 책임이므로 `SlideFrame`이 `position` prop을 갖고 템플릿은 콘텐츠만 렌더링한다.

## 스튜디오 클래스 ↔ 컴포넌트

| 스튜디오                                                                | 컴포넌트                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------- |
| `.ohf-generate`                                                         | `Button variant="primary" size="lg"`                |
| `.ohf-btn-solid` / `.ohf-ctl--model`                                    | `Button variant="model"`                            |
| `.ohf-ctl`                                                              | `Button variant="secondary"`(문구) · `Pill`(값)     |
| `.ohf-btn-quiet`                                                        | `Button variant="ghost"`                            |
| `.ohf-icon-btn(--ghost)`                                                | `IconButton`                                        |
| `.ohf-chip`                                                             | `Chip`                                              |
| `.ohf-tabs/.ohf-tab/.ohf-thumb`                                         | `Segment`                                           |
| `.ohf-field*` / `.ohf-input`                                            | `Field` / `Input` / `Textarea`                      |
| `.ohf-batch*`                                                           | `Stepper`                                           |
| `.ohf-slider` / `.ohf-opts`                                             | `Slider` / `OptionList`                             |
| `.ohf-skeleton*`                                                        | `Skeleton`                                          |
| `.ohf-popover*` / `.ohf-menu*`                                          | `Popover` / `Menu` / `MenuRow`                      |
| `.ohf-dialog-panel`                                                     | `Dialog`                                            |
| `.ohf-alert*` / `.ohf-undo*` / `.ohf-tip` / `.ohf-kbd` / `.ohf-spinner` | `Alert` / `UndoBar` / `Tooltip` / `Kbd` / `Spinner` |

## 규칙

- 라임(`--accent`)은 상태에만: 선택, 주 동작, 생성 중. 한 화면에 primary 버튼은 하나.
- 컴포넌트에 문구를 넣지 않는다. 필수/선택 표시도 `required="필수"`처럼 문구를 넘긴다.
- 상태는 `:hover`와 `[data-state="hover"]`를 항상 같이 정의한다(쇼케이스가 고정해 보여 준다).
- `src/`는 `react-dom`을 import하지 않는다.

## Next 앱 연결

앱은 `file:vendor/design` 패키지를 사용한다. 이 폴더에서 `corepack pnpm build` 후 앱 루트에서 `corepack pnpm design:sync`로 배포 파일을 복사하고 `corepack pnpm install --force`로 로컬 패키지를 갱신한다. 앱 스타일 진입점은 `@openhiggsfield/design/ohf.css`를 사용한다. parity는 기존 studio 파셜에 적용되며 최종 CSS의 개선 스타일은 별도 화면 검증이 필요하다.

컴포넌트 치환은 화면 단위로 진행한다. 훅을 사용하는 컴포넌트는 `"use client"` 경계 안에서 import한다. 현재 라이브러리 번들 자체에는 해당 지시문을 넣지 않는다.

## 알려진 결정

- `Segment`의 선택 판은 실제 폭을 재서 움직인다(`ResizeObserver`, 없으면 건너뜀).
- `Dialog`는 `<dialog>`와 `showModal()`을 쓴다. `inline`이면 패널만 그린다(쇼케이스·미리보기).
- `Thumb`의 `flat` 상태 색은 props(`flatColor`, `flatAccent`)로 받는다. 기본값은 basic 프리셋.
- 스튜디오 파셜의 토큰화는 `scripts/tokenize-studio.mjs`가 했고 멱등이다. 간격 리터럴과 7/9/12px 보정값은 그대로다.
- `test/parity.test.ts`, `test/token-rules.test.ts`, `scripts/export-tokens.mjs`는 경로를 `dirname(fileURLToPath(import.meta.url))`로 계산한다 — Vitest가 `new URL(<상대경로>, import.meta.url)`을 재작성해 버리기 때문에 그 형태를 피한다.
- `scripts/check-dist.mjs`는 `dist/ohf.css`가 없거나 크기 0이면 실패한다. Task 3부터 실제 SCSS가 `src/index.ts`를 통해 번들에 실리므로, 빈 CSS는 정상 상태가 아니라 스타일 import가 빠진 회귀로 본다.
- Vitest globals를 켜지 않았기 때문에 `test/setup.ts`가 `afterEach(cleanup)`을 직접 등록한다(그러지 않으면 테스트 사이에 이전 렌더의 DOM이 새어나간다).
- `StoryboardRow`는 행 div가 아니라 실제 제목 `<button>`을 통해 선택한다. 이 버튼의 `::after`가 행 전체 영역으로 확장돼 히트 영역을 대신하며, `onSelect`가 있고 `editing`이 아닐 때만 렌더링된다(편집 중에는 그 자리에 입력 요소가 올 수 있어 버튼 안에 넣을 수 없다).
- `Switch`는 hover·active 상태를 갖고, 나머지 네이티브 버튼 속성을 그대로 전달한다.
- `data-state` 상태 고정은 각 컴포넌트의 루트 인터랙티브 요소에만 적용된다. 컴포넌트가 스스로 그리는 내부 요소(`OptionList`의 옵션 행, `Slider`의 thumb, `UndoBar`의 액션 버튼)는 고정 대상이 아니다.
- `pnpm-workspace.yaml`은 `esbuild`와 `@parcel/watcher`의 빌드를 허용한다.

## 0.2 — 편집 화면과 결과물 고도화

- `src/styles/refinements.scss`는 기반 스타일 다음에 적용한다. 의미 토큰, 키보드 focus, reduced-motion, 카드·버튼·캔버스 표면을 다듬는다.
- 검색·상태·페이지·빈 결과·진행률·속성 패널과 에셋/타임라인 단위를 추가했다. 사용 기준과 후속 확장 목록은 [전체 검토 기록](review/2026-09-19-design-review.md)을 따른다.
- 프로젝트 갤러리와 11개 화면은 컨테이너 너비에 대응한다. 편집기에서는 제목/본문 수정, 장 추가/복제/삭제, 스타일·구도·사진 선택, 휴대폰 미리보기, 스토리보드 JSON 다운로드를 직접 확인할 수 있다.
- 쇼케이스 상태는 메모리에만 유지된다. 서버 저장·결제·AI 생성·PNG/ZIP 렌더링은 연결하지 않았다. 표시된 잔액과 진행률은 예시다.
- 사진 2종은 이번 작업에서 생성했다. [자산 출처와 생성 명세](assets/README.md)에 원본·최적화 경로를 기록했다.
- 토큰 규칙 검사는 SCSS를 컴파일한 뒤 선언을 검사한다. 기존 파셜 parity, 접근성 대비, 컴포넌트 상태와 작업 흐름 회귀 테스트를 함께 실행한다.
