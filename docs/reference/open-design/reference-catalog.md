# 참고 카탈로그

기준과 범위는 [README](README.md), 호출 흐름은 [participation-workflow](participation-workflow.md)를 따른다. 아래 항목은 **도입 승인이나 복제 대상 목록이 아니라 후속 인터뷰·리뷰용 근거**다. 전부 정적 확인이며 테스트는 소스를 읽었을 뿐 실행하지 않았다. `SHA`는 분석 커밋으로 고정되어 있다. 원격 바이트 대조 범위는 README에 구분했다.

<a id="r01"></a>

## R01. 최소 입력·첨부 전달

- `canSubmit` — [apps/web/src/components/HomeHero.tsx:405](/Users/brian/works/github/open-design/apps/web/src/components/HomeHero.tsx:405) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/HomeHero.tsx#L405)
- `submit / onSubmit payload` — [apps/web/src/components/HomeView.tsx:1935](/Users/brian/works/github/open-design/apps/web/src/components/HomeView.tsx:1935) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/HomeView.tsx#L1935)
- `firstMessageAttachments` — [apps/web/src/App.tsx:1486](/Users/brian/works/github/open-design/apps/web/src/App.tsx:1486) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/App.tsx#L1486)
- `resolveSafeProjectAttachments / formatProjectAttachmentHint` — [apps/daemon/src/runtimes/chat-prompt-inputs.ts:758](/Users/brian/works/github/open-design/apps/daemon/src/runtimes/chat-prompt-inputs.ts:758) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/runtimes/chat-prompt-inputs.ts#L758)
- `Reading documents and images` — [apps/daemon/src/prompts/official-system.ts:36](/Users/brian/works/github/open-design/apps/daemon/src/prompts/official-system.ts:36) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/official-system.ts#L36)

**동작·목적:** 텍스트만, 사진 포함 텍스트 모두 공통 composer로 받는다. Home 첨부는 프로젝트 생성 이후 업로드하며 순서와 프로젝트 상대경로를 유지한다. 에이전트에는 첨부 읽기 지시가 들어간다.

**적용 조건·주의:** 세 입력 유형을 별도 긴 폼 없이 받는 진입 구조의 참고. 상품 사진의 판매 대상/사실/사용 목적은 이 전달 계약만으로 확정되지 않는다. 업로드 일부 실패와 필수 자료 누락 정책을 구분해야 한다. 선택한 플러그인의 필수 입력 검증은 별도로 존재하므로 모든 진입 경로가 한 문장만으로 제출되는 것은 아니다.

**테스트·증거 한계:** apps/daemon/tests/project-upload-filenames.test.ts 및 project-upload-subdir-path.test.ts는 파일 업로드 관련 참고. 이번에는 실제 업로드/비전 실행을 하지 않았다. 상품 사실 추출의 정확도를 증명하는 테스트로 쓰지 않는다.

<a id="r02"></a>

## R02. 채팅 요청에서 실행까지의 공통 계약

- `ChatRequest` — [packages/contracts/src/api/chat.ts:22](/Users/brian/works/github/open-design/packages/contracts/src/api/chat.ts:22) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/packages/contracts/src/api/chat.ts#L22)
- `streamViaDaemon` — [apps/web/src/providers/daemon.ts:561](/Users/brian/works/github/open-design/apps/web/src/providers/daemon.ts:561) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/providers/daemon.ts#L561)
- `POST /api/runs` — [apps/daemon/src/routes/runs.ts:472](/Users/brian/works/github/open-design/apps/daemon/src/routes/runs.ts:472) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/routes/runs.ts#L472)
- `runs.start / startChatRun` — [apps/daemon/src/routes/runs.ts:689](/Users/brian/works/github/open-design/apps/daemon/src/routes/runs.ts:689) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/routes/runs.ts#L689)
- `startChatRun` — [apps/daemon/src/server.ts:5391](/Users/brian/works/github/open-design/apps/daemon/src/server.ts:5391) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/server.ts#L5391)
- `projects / conversations / agent_sessions / messages tables` — [apps/daemon/src/db.ts:57](/Users/brian/works/github/open-design/apps/daemon/src/db.ts:57) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/db.ts#L57)

**동작·목적:** 웹은 message, project/conversation, attachments, commentAttachments, skill/context/model 등을 전송한다. daemon은 run을 만들고 프롬프트·에이전트 실행을 시작하며 별도 events 엔드포인트로 SSE를 구독한다.

**적용 조건·주의:** 입력·피드백이 같은 실행 통로를 쓰는 패턴. ChatRequest를 페이지 구성/이미지 슬롯/확정 상품 사실 스키마로 오해하지 않는다. BYOK direct와 daemon CLI 경로의 도구 능력도 구분한다.

**테스트·증거 한계:** 호출 경로 정적 대조. 이번에 HTTP 요청이나 실행 테스트를 보내지 않았다.

<a id="r03"></a>

## R03. 조건부 질문과 의도 요약

- `RULE 1` — [apps/daemon/src/prompts/discovery.ts:42](/Users/brian/works/github/open-design/apps/daemon/src/prompts/discovery.ts:42) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/discovery.ts#L42)
- `answered fields / skip exceptions` — [apps/daemon/src/prompts/discovery.ts:140](/Users/brian/works/github/open-design/apps/daemon/src/prompts/discovery.ts:140) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/discovery.ts#L140)
- `Branch A / Branch B` — [apps/daemon/src/prompts/discovery.ts:170](/Users/brian/works/github/open-design/apps/daemon/src/prompts/discovery.ts:170) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/discovery.ts#L170)
- `SKIP_DISCOVERY_BRIEF_OVERRIDE` — [apps/daemon/src/prompts/system.ts:257](/Users/brian/works/github/open-design/apps/daemon/src/prompts/system.ts:257) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/system.ts#L257)
- `memoryBody / memoryHooks.rewrite` — [apps/daemon/src/prompts/system.ts:693](/Users/brian/works/github/open-design/apps/daemon/src/prompts/system.ts:693) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/system.ts#L693)
- `batch-mode discovery skip test` — [apps/daemon/tests/system-prompt-template.test.ts:35](/Users/brian/works/github/open-design/apps/daemon/tests/system-prompt-template.test.ts:35) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/system-prompt-template.test.ts#L35)
- `task-type single-shot brief tests` — [apps/daemon/tests/prompts/discovery-form.test.ts:16](/Users/brian/works/github/open-design/apps/daemon/tests/prompts/discovery-form.test.ts:16) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/prompts/discovery-form.test.ts#L16)

**동작·목적:** 기본 첫 턴 질문, 이미 답한 정보 재질문 금지, 명확한 기존 수정/바로 제작 지시 예외가 있다. memory가 충분하고 rewrite가 켜진 경우 task-brief 카드가 discovery를 대체하고 확인 없이 계속하도록 지시한다.

**적용 조건·주의:** 사용자 부담 감소와 가장 관련 높은 참고. 질문 여부와 의도 충분성은 모델 판단이며 구조화 confidence 판별기와 같지 않다. API metadata 예외가 Home의 기본 UX인지도 별개다.

**테스트·증거 한계:** 질문 통합, canonical option 값, 도구보다 폼을 먼저 출력하는 문구, override 순서를 테스트 소스에서 확인했다. 자연어의 명확성 판단이나 질문 감소 효과를 실측하지 않았다.

<a id="r04"></a>

## R04. 질문 UI와 답변의 재진입

- `OPEN_RE / splitOnQuestionForms` — [apps/web/src/artifacts/question-form.ts:125](/Users/brian/works/github/open-design/apps/web/src/artifacts/question-form.ts:125) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/artifacts/question-form.ts#L125)
- `formatFormAnswers` — [apps/web/src/artifacts/question-form.ts:687](/Users/brian/works/github/open-design/apps/web/src/artifacts/question-form.ts:687) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/artifacts/question-form.ts#L687)
- `onSubmit answers` — [apps/web/src/components/QuestionForm.tsx:113](/Users/brian/works/github/open-design/apps/web/src/components/QuestionForm.tsx:113) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/QuestionForm.tsx#L113)
- `question_answer handleSend` — [apps/web/src/components/ProjectView.tsx:7878](/Users/brian/works/github/open-design/apps/web/src/components/ProjectView.tsx:7878) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/ProjectView.tsx#L7878)
- `formAnswerMatch / formOverride` — [apps/daemon/src/server.ts:6060](/Users/brian/works/github/open-design/apps/daemon/src/server.ts:6060) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/server.ts#L6060)
- `stable option values test` — [apps/web/tests/artifacts/question-form.test.ts:97](/Users/brian/works/github/open-design/apps/web/tests/artifacts/question-form.test.ts:97) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/tests/artifacts/question-form.test.ts#L97)

**동작·목적:** assistant의 question-form 텍스트를 UI로 파싱하고 답을 [form answers — id] 텍스트로 다음 메시지에 보낸다. daemon은 해당 마커에 override를 추가한다. native AskUserQuestion tool_result 흐름이 아니다.

**적용 조건·주의:** 어떤 에이전트든 텍스트로 질문 UI를 표현할 수 있는 패턴. 승인된 값의 machine schema/버전과 실제 적용 여부까지 이 텍스트 형식 하나가 보장하지는 않는다.

**테스트·증거 한계:** 완성/부분 스트림 파싱, option value 보존, malformed JSON/닫히지 않은 태그 처리 테스트 확인. 모델이 중요한 사실을 재해석하지 않는다는 검증은 아니다.

<a id="r05"></a>

## R05. 페이지 계획·디자인 방향·자기 점검

- `RULE 3 / TodoWrite plan` — [apps/daemon/src/prompts/discovery.ts:193](/Users/brian/works/github/open-design/apps/daemon/src/prompts/discovery.ts:193) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/discovery.ts#L193)
- `checklist / 5-dimensional critique` — [apps/daemon/src/prompts/discovery.ts:219](/Users/brian/works/github/open-design/apps/daemon/src/prompts/discovery.ts:219) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/discovery.ts#L219)
- `PLAN_MODE_OVERRIDE` — [apps/daemon/src/prompts/system.ts:1004](/Users/brian/works/github/open-design/apps/daemon/src/prompts/system.ts:1004) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/system.ts#L1004)
- `TodoWrite prompt contract tests` — [apps/daemon/tests/prompts/discovery-todo-cap.test.ts:1](/Users/brian/works/github/open-design/apps/daemon/tests/prompts/discovery-todo-cap.test.ts:1) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/prompts/discovery-todo-cap.test.ts#L1)
- `Accept input / natural language mapping` — [skills/design-brief/SKILL.md:52](/Users/brian/works/github/open-design/skills/design-brief/SKILL.md:52) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/skills/design-brief/SKILL.md#L52)

**동작·목적:** 섹션 목록·템플릿·콘텐츠·검수 순서를 TodoWrite로 보여주고 갱신하게 한다. design-brief 스킬은 자연어를 디자인 차원/기본 토큰으로 해석하는 문서형 작업 지침이다. Plan 모드는 별도 Markdown 산출물 작업이다.

**적용 조건·주의:** 진행 중 사용자 수정 기회를 제공하는 계획 표시 참고. 일반 계획은 실행 인자를 자동 검증하는 중간 표현이 아니다. design-brief는 판매 사실 추출기가 아니고 닫힌 취향 어휘·고정 기본값이 있다. 이 스킬이 모든 요청에 자동 적용되는 것도 아니다.

**테스트·증거 한계:** 프롬프트·Todo 계약 테스트가 있다. 실제 섹션 설득력, 이미지 수량 타당성, 출력 시각 품질의 합격 증거는 미확인.

<a id="r06"></a>

## R06. 슬롯 계획이 생성 크기로 이어지는 랜딩 템플릿

- `EditorialCollageInputs contract` — [design-templates/open-design-landing/schema.ts:1](/Users/brian/works/github/open-design/design-templates/open-design-landing/schema.ts:1) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/design-templates/open-design-landing/schema.ts#L1)
- `slots` — [design-templates/open-design-landing/assets/image-manifest.json:1](/Users/brian/works/github/open-design/design-templates/open-design-landing/assets/image-manifest.json:1) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/design-templates/open-design-landing/assets/image-manifest.json#L1)
- `callFalGptImage request` — [design-templates/open-design-landing/scripts/imagegen.ts:201](/Users/brian/works/github/open-design/design-templates/open-design-landing/scripts/imagegen.ts:201) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/design-templates/open-design-landing/scripts/imagegen.ts#L201)
- `main / targets / force` — [design-templates/open-design-landing/scripts/imagegen.ts:272](/Users/brian/works/github/open-design/design-templates/open-design-landing/scripts/imagegen.ts:272) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/design-templates/open-design-landing/scripts/imagegen.ts#L272)
- `JSON.parse as EditorialCollageInputs` — [design-templates/open-design-landing/scripts/compose.ts:807](/Users/brian/works/github/open-design/design-templates/open-design-landing/scripts/compose.ts:807) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/design-templates/open-design-landing/scripts/compose.ts#L807)
- `Workflow contract / eight question groups` — [design-templates/open-design-landing/SKILL.md:161](/Users/brian/works/github/open-design/design-templates/open-design-landing/SKILL.md:161) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/design-templates/open-design-landing/SKILL.md#L161)

**동작·목적:** 16개 고정 슬롯의 width/height를 실제 fal image_size로 보내고 슬롯 파일명으로 HTML에 연결한다. only로 선택 생성, force로 덮어쓰기, 파일 존재 시 생략한다. placeholder/generate/bring-your-own 전략이 문서화돼 있다.

**적용 조건·주의:** 이미지 역할·파일·크기·실행을 묶는 구체적 사례. 범용 최소 입력 상품 페이지 계획이 아니라 특정 스타일·고정 슬롯 템플릿이다. 8개 질문 그룹은 현재 인터뷰의 부담 최소화 원칙과 충돌할 수 있다. force는 후보 비교/확정이 아니다.

**테스트·증거 한계:** 생성 스크립트의 인자 소비를 정적으로 확인했다. 전용 end-to-end 품질 테스트는 이번 경로에서 확인하지 못했고 스크립트를 실행하지 않았다. SKILL의 비용/시간 추정은 검증하거나 재사용하지 않았다.

<a id="r07"></a>

## R07. URL 수집의 경계: 일반 지시와 브랜드 추출 모듈

- `brand-source extraction instructions` — [apps/daemon/src/prompts/discovery.ts:170](/Users/brian/works/github/open-design/apps/daemon/src/prompts/discovery.ts:170) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/discovery.ts#L170)
- `PrefetchResult` — [apps/daemon/src/brands/prefetch.ts:53](/Users/brian/works/github/open-design/apps/daemon/src/brands/prefetch.ts:53) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/brands/prefetch.ts#L53)
- `prefetchBrand` — [apps/daemon/src/brands/prefetch.ts:750](/Users/brian/works/github/open-design/apps/daemon/src/brands/prefetch.ts:750) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/brands/prefetch.ts#L750)
- `buildFromUrl` — [apps/daemon/src/brands/engine/build.ts:410](/Users/brian/works/github/open-design/apps/daemon/src/brands/engine/build.ts:410) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/brands/engine/build.ts#L410)
- `plain Messages API override` — [apps/daemon/src/prompts/system.ts:967](/Users/brian/works/github/open-design/apps/daemon/src/prompts/system.ts:967) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/system.ts#L967)
- `prefetchFromHtml material test` — [apps/daemon/tests/brand-prefetch.test.ts:61](/Users/brian/works/github/open-design/apps/daemon/tests/brand-prefetch.test.ts:61) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/brand-prefetch.test.ts#L61)
- `blocked / thin test` — [apps/daemon/tests/brand-prefetch.test.ts:91](/Users/brian/works/github/open-design/apps/daemon/tests/brand-prefetch.test.ts:91) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/brand-prefetch.test.ts#L91)

**동작·목적:** 일반 디자인 지시는 CLI 도구로 출처를 읽어 brand-spec.md를 만들라고 안내한다. 별도 prefetch 구현은 HTML/CSS·색·폰트·로고·문구 등을 모아 materialMd와 thin/blocked 신호를 만든다. tool-less API 모드는 WebFetch가 없으므로 필요한 자료를 질문한다.

**적용 조건·주의:** URL 자료의 출처·읽기 실패를 분리하는 참고. prefetch 주석의 속도 설명은 실측 결과로 인용하지 않는다. 주석의 no-headless 설명과 달리 코드에는 Chrome 보완 경로도 있다. 일반 채팅의 상품 URL이 자동으로 이 모듈에 연결되는지와 상품 사양 추출은 미확인.

**테스트·증거 한계:** 주어진 HTML+CSS 수집 및 anti-bot 페이지 판별 테스트 소스 확인. 실제 외부 상품 URL 접근/상품 정확성은 시험하지 않았다.

<a id="r08"></a>

## R08. 저장 코멘트와 대상 구조

- `PreviewCommentStatus / PreviewCommentTarget` — [packages/contracts/src/api/comments.ts:3](/Users/brian/works/github/open-design/packages/contracts/src/api/comments.ts:3) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/packages/contracts/src/api/comments.ts#L3)
- `ChatCommentAttachment` — [packages/contracts/src/api/chat.ts:401](/Users/brian/works/github/open-design/packages/contracts/src/api/chat.ts:401) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/packages/contracts/src/api/chat.ts#L401)
- `GET / POST / PATCH / DELETE comments` — [apps/daemon/src/routes/project/comments.ts:19](/Users/brian/works/github/open-design/apps/daemon/src/routes/project/comments.ts:19) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/routes/project/comments.ts#L19)
- `buildVisualAnnotationAttachment` — [apps/web/src/comments.ts:326](/Users/brian/works/github/open-design/apps/web/src/comments.ts:326) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/comments.ts#L326)
- `target snapshot test` — [apps/web/tests/comments.test.ts:41](/Users/brian/works/github/open-design/apps/web/tests/comments.test.ts:41) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/tests/comments.test.ts#L41)
- `upsert / persistence tests` — [apps/daemon/tests/comment-attachments.test.ts:60](/Users/brian/works/github/open-design/apps/daemon/tests/comment-attachments.test.ts:60) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/comment-attachments.test.ts#L60)

**동작·목적:** DOM 요소·묶음에는 selector와 문구·HTML·computed style·좌표를, visual 마크에는 screenshotPath/markKind/intent를 담는다. 코멘트 저장과 실행용 attachment 변환은 분리돼 있다. 참고 이미지도 코멘트에 붙일 수 있다.

**적용 조건·주의:** 피드백을 단순 문자열 대신 대상 맥락과 연결하는 패턴. preview 위치를 원본 이미지 픽셀 위치로 취급하지 않는다. visual attachment와 DB 저장 코멘트가 동일한 객체는 아니다.

**테스트·증거 한계:** 대상 정보 압축, 묶음/visual payload, 참조 이미지 보존, DB upsert·정렬·상태 변경 테스트 확인. 실제 선택 영역에만 모델이 수정했는지는 이 테스트의 범위 밖.

<a id="r09"></a>

## R09. Mark 캡처와 HTML 수동 Edit의 차이

- `send` — [apps/web/src/components/PreviewDrawOverlay.tsx:677](/Users/brian/works/github/open-design/apps/web/src/components/PreviewDrawOverlay.tsx:677) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/PreviewDrawOverlay.tsx#L677)
- `ANNOTATION_EVENT screenshot upload` — [apps/web/src/components/ChatComposer.tsx:1780](/Users/brian/works/github/open-design/apps/web/src/components/ChatComposer.tsx:1780) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/ChatComposer.tsx#L1780)
- `queue / send / draft branches` — [apps/web/src/components/ChatComposer.tsx:1864](/Users/brian/works/github/open-design/apps/web/src/components/ChatComposer.tsx:1864) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/ChatComposer.tsx#L1864)
- `manualEditContentPatchForDraft image branch` — [apps/web/src/components/FileViewer.tsx:7389](/Users/brian/works/github/open-design/apps/web/src/components/FileViewer.tsx:7389) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/FileViewer.tsx#L7389)
- `applyManualEdit` — [apps/web/src/components/FileViewer.tsx:7460](/Users/brian/works/github/open-design/apps/web/src/components/FileViewer.tsx:7460) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/FileViewer.tsx#L7460)
- `ImageViewer` — [apps/web/src/components/FileViewer.tsx:11476](/Users/brian/works/github/open-design/apps/web/src/components/FileViewer.tsx:11476) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/FileViewer.tsx#L11476)
- `selector-free visual payload test` — [apps/web/tests/comments.test.ts:200](/Users/brian/works/github/open-design/apps/web/tests/comments.test.ts:200) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/tests/comments.test.ts#L200)

**동작·목적:** Mark는 표시가 합성된 PNG와 메모를 보낸다. 캡처 실패 시 텍스트/별도 이미지가 있으면 그 자료로 보내고, 표시만 있으면 경고한다. 수동 Edit는 HTML text/link/image src·alt/style patch를 저장한다. 독립 ImageViewer는 표시/열기/다운로드만 한다.

**적용 조건·주의:** 명확한 문구나 링크는 모델 없이 바로 고칠 수 있는 수동 경로와 AI 피드백을 구분하는 참고. Mark screenshot을 인페인팅 mask로 해석하면 안 된다. 이미지 뷰어에 별도 영역편집 UI가 있다는 주장도 하지 않는다.

**테스트·증거 한계:** payload 단위 테스트와 e2e/ui/app-manual-edit.test.ts가 관련 참고. 이번에 실제 캡처나 E2E를 실행하지 않았으므로 브라우저에서 동일하게 동작한다고 확정하지 않는다.

<a id="r10"></a>

## R10. 범위 지정 수정 프롬프트

- `normalizeCommentAttachments` — [apps/daemon/src/runtimes/chat-prompt-inputs.ts:477](/Users/brian/works/github/open-design/apps/daemon/src/runtimes/chat-prompt-inputs.ts:477) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/runtimes/chat-prompt-inputs.ts#L477)
- `renderCommentAttachmentHint` — [apps/daemon/src/runtimes/chat-prompt-inputs.ts:540](/Users/brian/works/github/open-design/apps/daemon/src/runtimes/chat-prompt-inputs.ts:540) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/runtimes/chat-prompt-inputs.ts#L540)
- `safeCommentAttachments` — [apps/daemon/src/server.ts:5480](/Users/brian/works/github/open-design/apps/daemon/src/server.ts:5480) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/server.ts#L5480)
- `commentHint` — [apps/daemon/src/server.ts:5642](/Users/brian/works/github/open-design/apps/daemon/src/server.ts:5642) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/server.ts#L5642)
- `rendered context tests` — [apps/daemon/tests/comment-attachments.test.ts:438](/Users/brian/works/github/open-design/apps/daemon/tests/comment-attachments.test.ts:438) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/comment-attachments.test.ts#L438)
- `visual context test` — [apps/daemon/tests/comment-attachments.test.ts:539](/Users/brian/works/github/open-design/apps/daemon/tests/comment-attachments.test.ts:539) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/comment-attachments.test.ts#L539)

**동작·목적:** 요소는 selector, visual은 screenshotPath를 필요로 하고 currentText 160자/htmlHint 180자 등으로 제한한다. 프롬프트는 지정 대상만 고치며 범위 밖 변경이 필요하면 질문하라고 지시한다.

**적용 조건·주의:** 사용자가 다시 대상 설명을 하지 않아도 되는 장점. Hard scope라는 이름은 모델 지시의 강도를 뜻하며 에이전트 파일 diff의 허용 목록 검사와 같지 않다. 상품 사실/원문 불변성도 별도 검증이 필요하다.

**테스트·증거 한계:** 테스트는 hard-scope 문장과 타깃 맥락이 렌더링되는지 검사한다. 범위 밖 파일 쓰기 차단·확정 원문 보호의 실행 테스트라고 표현하지 않는다.

<a id="r11"></a>

## R11. 피드백 전송·큐·결과 확인 상태

- `commentTaskQuery / commentTaskContextAttachment` — [apps/web/src/components/ProjectView.tsx:694](/Users/brian/works/github/open-design/apps/web/src/components/ProjectView.tsx:694) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/ProjectView.tsx#L694)
- `handleSend` — [apps/web/src/components/ProjectView.tsx:4281](/Users/brian/works/github/open-design/apps/web/src/components/ProjectView.tsx:4281) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/ProjectView.tsx#L4281)
- `applying status` — [apps/web/src/components/ProjectView.tsx:4440](/Users/brian/works/github/open-design/apps/web/src/components/ProjectView.tsx:4440) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/ProjectView.tsx#L4440)
- `needs_review status` — [apps/web/src/components/ProjectView.tsx:4816](/Users/brian/works/github/open-design/apps/web/src/components/ProjectView.tsx:4816) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/ProjectView.tsx#L4816)
- `handleSendBoardCommentAttachments` — [apps/web/src/components/ProjectView.tsx:5558](/Users/brian/works/github/open-design/apps/web/src/components/ProjectView.tsx:5558) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/ProjectView.tsx#L5558)
- `status patch test` — [apps/daemon/tests/comment-attachments.test.ts:296](/Users/brian/works/github/open-design/apps/daemon/tests/comment-attachments.test.ts:296) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/comment-attachments.test.ts#L296)

**동작·목적:** 저장 코멘트 전송은 메모를 사용자 질의로 만들고 대상 정보를 context로 남긴다. 여러 코멘트를 각각 queue task로 처리한다. 실행 시작 applying, 성공 needs_review, 실패 failed를 설정한다.

**적용 조건·주의:** 요청 전 모든 수정안의 별도 승인을 요구하지 않는 흐름. needs_review는 성공 뒤 상태이며 의미적 적절성의 판정은 아니다. 많은 작은 코멘트를 개별 실행할 때의 시간/호출 수 영향은 미측정이다.

**테스트·증거 한계:** 저장 상태 전환과 payload 테스트는 확인했으나 코멘트→실제 모델 수정→시각 확인 전 구간을 이번에 재생하지 않았다.

<a id="r12"></a>

## R12. 이미지 생성·참조·모델·크기 실행 계약

- `generateMedia request mapping` — [apps/daemon/src/routes/media.ts:145](/Users/brian/works/github/open-design/apps/daemon/src/routes/media.ts:145) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/routes/media.ts#L145)
- `project media/generate route` — [apps/daemon/src/routes/media.ts:487](/Users/brian/works/github/open-design/apps/daemon/src/routes/media.ts:487) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/routes/media.ts#L487)
- `generateMedia` — [apps/daemon/src/media/index.ts:312](/Users/brian/works/github/open-design/apps/daemon/src/media/index.ts:312) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/media/index.ts#L312)
- `imageRef / imageRefs` — [apps/daemon/src/media/index.ts:443](/Users/brian/works/github/open-design/apps/daemon/src/media/index.ts:443) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/media/index.ts#L443)
- `renderOpenAIImage` — [apps/daemon/src/media/index.ts:870](/Users/brian/works/github/open-design/apps/daemon/src/media/index.ts:870) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/media/index.ts#L870)
- `openaiSizeFor` — [apps/daemon/src/media/index.ts:1349](/Users/brian/works/github/open-design/apps/daemon/src/media/index.ts:1349) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/media/index.ts#L1349)
- `fal image input` — [apps/daemon/src/media/index.ts:3637](/Users/brian/works/github/open-design/apps/daemon/src/media/index.ts:3637) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/media/index.ts#L3637)
- `image model capability metadata` — [apps/daemon/src/media/models.ts:88](/Users/brian/works/github/open-design/apps/daemon/src/media/models.ts:88) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/media/models.ts#L88)

**동작·목적:** 공통 인자는 model/prompt/aspect/output/image/images 등이다. 원본 파일을 project 상대 경로에서 읽고 renderer로 넘긴다. OpenAI 직접 renderer는 이 분석 SHA의 요청 본문에 imageRef를 싣지 않으며 fal renderer에는 image_url 전달이 있다. 공통 mask 인자는 없다.

**적용 조건·주의:** 생성 도구 능력과 페이지 흐름을 분리해서 참고한다. aspect를 모델별 픽셀 크기로 매핑하므로 생성 비율·출력 해상도·페이지 CSS 크기는 다르다. 카탈로그의 i2i/inpaint 표시는 실제 주석→mask 실행 증거가 아니다. 기본 파일명은 타임스탬프지만 output 지정은 기존 파일을 덮어쓸 수 있다.

**테스트·증거 한계:** media-adapters.test.ts 및 media 관련 provider 테스트가 존재하나 이번에는 provider 호출/인페인팅/품질 검증을 실행하지 않았다. 호출 완료 파일과 사용자 채택 결과를 혼동하지 않는다.

<a id="r13"></a>

## R13. HTML 버전과 되돌리기의 범위

- `snapshotAiHtmlVersionsForRun` — [apps/daemon/src/run-html-version-snapshots.ts:46](/Users/brian/works/github/open-design/apps/daemon/src/run-html-version-snapshots.ts:46) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/run-html-version-snapshots.ts#L46)
- `HTML versions endpoint` — [apps/daemon/src/routes/project/index.ts:3120](/Users/brian/works/github/open-design/apps/daemon/src/routes/project/index.ts:3120) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/routes/project/index.ts#L3120)
- `restore endpoint` — [apps/daemon/src/routes/project/index.ts:3228](/Users/brian/works/github/open-design/apps/daemon/src/routes/project/index.ts:3228) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/routes/project/index.ts#L3228)
- `version history state / preview` — [apps/web/src/components/FileViewer.tsx:2564](/Users/brian/works/github/open-design/apps/web/src/components/FileViewer.tsx:2564) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/components/FileViewer.tsx#L2564)
- `snapshot / dedupe test` — [apps/daemon/tests/project-file-versions.test.ts:28](/Users/brian/works/github/open-design/apps/daemon/tests/project-file-versions.test.ts:28) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/project-file-versions.test.ts#L28)
- `ignore non-HTML test` — [apps/daemon/tests/project-file-versions.test.ts:102](/Users/brian/works/github/open-design/apps/daemon/tests/project-file-versions.test.ts:102) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/project-file-versions.test.ts#L102)
- `snapshot failure test` — [apps/daemon/tests/run-html-version-snapshots.test.ts:27](/Users/brian/works/github/open-design/apps/daemon/tests/run-html-version-snapshots.test.ts:27) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/tests/run-html-version-snapshots.test.ts#L27)

**동작·목적:** 변경된 HTML을 기록하고 버전 미리보기/복원한다. restore는 이전 HTML을 파일에 쓰고 새 복원 버전을 남긴다. HTML snapshot 실패도 별도 오류로 취급한다.

**적용 조건·주의:** 즉시 수정 뒤 복구 가능성을 제공하는 참고. HTML 문자열의 이전 img src가 같아도 해당 이미지 파일이 덮어써졌다면 예전 픽셀은 돌아오지 않을 수 있다(정적 추론). 이미지 후보 비교·최종 채택이나 전체 페이지 asset bundle checkpoint와는 구분한다.

**테스트·증거 한계:** 중복 제거, 수동 provenance, 비HTML 제외, 동시 checkpoint 보존 등 테스트 소스 확인. 원본 이미지까지 복원하는 통합 검증은 확인하지 못했다.

<a id="r14"></a>

## R14. 검수는 프롬프트·선택적 프로토콜·실제 출력 증거로 나누기

- `checklist / self-critique` — [apps/daemon/src/prompts/discovery.ts:219](/Users/brian/works/github/open-design/apps/daemon/src/prompts/discovery.ts:219) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/discovery.ts#L219)
- `isCritiqueEnabled` — [apps/daemon/src/server.ts:5149](/Users/brian/works/github/open-design/apps/daemon/src/server.ts:5149) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/server.ts#L5149)
- `critiqueShouldRun` — [apps/daemon/src/server.ts:5185](/Users/brian/works/github/open-design/apps/daemon/src/server.ts:5185) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/server.ts#L5185)
- `defaultCritiqueConfig` — [packages/contracts/src/critique.ts:58](/Users/brian/works/github/open-design/packages/contracts/src/critique.ts:58) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/packages/contracts/src/critique.ts#L58)
- `decideRound` — [apps/daemon/src/critique/scoreboard.ts:51](/Users/brian/works/github/open-design/apps/daemon/src/critique/scoreboard.ts:51) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/critique/scoreboard.ts#L51)
- `normalized ship resolution` — [apps/daemon/src/critique/orchestrator.ts:439](/Users/brian/works/github/open-design/apps/daemon/src/critique/orchestrator.ts:439) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/critique/orchestrator.ts#L439)

**동작·목적:** 일반 흐름에는 체크리스트·5차원 자기평가 지시가 있다. 선택적 Jury는 score와 mustFix로 판정하지만 기본 비활성이며 plain adapter+브랜드+스킬+비미디어 조건에서만 이 분기로 간다.

**적용 조건·주의:** 부수 기능으로 구조만 확인했다. 여러 평가 역할이 독립 모델/독립 시각 검수자라는 뜻은 아니다. 자기평가 점수나 shipped를 랜딩 실제 반응형·상품 정확성·이미지 품질의 객관적 보증으로 사용하지 않는다.

**테스트·증거 한계:** critique fixture/scoreboard 계열은 프로토콜·판정 로직 참고. 이번 집중 분석에서는 확대 조사·실행하지 않았다.

<a id="r15"></a>

## R15. 맥락 조합·진행·복구의 구조

- `composeSystemPrompt` — [apps/daemon/src/prompts/system.ts:544](/Users/brian/works/github/open-design/apps/daemon/src/prompts/system.ts:544) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/system.ts#L544)
- `craft / active skill composition` — [apps/daemon/src/prompts/system.ts:787](/Users/brian/works/github/open-design/apps/daemon/src/prompts/system.ts:787) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/prompts/system.ts#L787)
- `createChatRunService` — [apps/daemon/src/runtimes/runs.ts:28](/Users/brian/works/github/open-design/apps/daemon/src/runtimes/runs.ts:28) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/runtimes/runs.ts#L28)
- `stream / Last-Event-ID` — [apps/daemon/src/runtimes/runs.ts:232](/Users/brian/works/github/open-design/apps/daemon/src/runtimes/runs.ts:232) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/runtimes/runs.ts#L232)
- `cancel` — [apps/daemon/src/runtimes/runs.ts:361](/Users/brian/works/github/open-design/apps/daemon/src/runtimes/runs.ts:361) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/runtimes/runs.ts#L361)
- `evaluateResumeInvalidation` — [apps/daemon/src/agent-session-resume.ts:57](/Users/brian/works/github/open-design/apps/daemon/src/agent-session-resume.ts:57) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/agent-session-resume.ts#L57)
- `decideSafeRunRetry` — [apps/daemon/src/run-retry-policy.ts:118](/Users/brian/works/github/open-design/apps/daemon/src/run-retry-policy.ts:118) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/daemon/src/run-retry-policy.ts#L118)
- `subscription vs explicit cancellation` — [apps/web/src/providers/daemon.ts:256](/Users/brian/works/github/open-design/apps/web/src/providers/daemon.ts:256) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/apps/web/src/providers/daemon.ts#L256)

**동작·목적:** design system/craft/skill/memory와 현재 요청·첨부를 조합한다. run은 메모리 Map과 SSE 이벤트/선택적 JSONL 로그, 대화와 CLI 세션은 별도 저장된다. 구독 종료와 취소가 다르고 안전한 일시 오류 재시도는 부작용 여부로 제한된다.

**적용 조건·주의:** 어댑터·세션을 그대로 이식하라는 권고가 아니라 반복 수정의 맥락과 복구 경계 참고다. 파일 변경 취소/유료 작업 환불/프로세스 재시작 후 자동 복구를 같은 의미로 보지 않는다.

**테스트·증거 한계:** 이번에는 런타임·인증·설치·운영 테스트를 실행하지 않았다. 사용자 목표와 직접 연결되는 경계만 요약했다.

## 발췌와 재사용 조건

- `Apache-2.0 redistribution conditions` — [LICENSE:89](/Users/brian/works/github/open-design/LICENSE:89) · [SHA](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/LICENSE#L89)

루트 LICENSE는 Apache-2.0이다. 이 조사에서 `git ls-files '*NOTICE*'`는 빈 결과였고 집중 참고한 `skills/design-brief`, `design-templates/open-design-landing` 안의 별도 LICENSE/NOTICE도 찾지 못했다. 저장소의 다른 스킬·템플릿에는 개별 라이선스가 있으므로 루트 조건을 모든 제3자 자료에 일괄 적용하지 않는다.

이 문서는 코드/프롬프트를 대량 복제하지 않고 심볼·필드 이름과 계약을 요약했다. 이후 원본 코드·프롬프트를 실제 복사·수정·배포한다면 해당 파일의 출처와 라이선스를 동반하고 수정 표시, 저작권·귀속 고지 보존, 해당되는 NOTICE 고지 조건을 확인해야 한다. Apache 라이선스 문구가 포함된 템플릿의 고객 노출 `brand.license` 입력값은 **템플릿 자체의 법적 라이선스 증거가 아니다**. 사진·폰트·로고·외부 참고 사이트 자료의 사용권은 이번 코드 분석으로 확정하지 않았다.

후속 리뷰는 필요한 패턴의 계약만 재설계할지, 원본 구현을 실제 재사용할지를 구분해야 한다. 이 문서는 그 결정을 대신하지 않는다.
