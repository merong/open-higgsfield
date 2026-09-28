# Opus 5.5 high 독립 리뷰 — 개선 backlog · 프로젝트별 SQLite 실행 로그

2026-09-28 · 구현 전 설계 리뷰 · 제품 코드·다른 문서 무수정

- 실행 기록: [리뷰 지시서](../review-brief.md)가 기록한 CLI 표기 `claude --model opus --effort high`. 응답 모델 ID는 `claude-opus-5-5`. effort 값은 리뷰어가 런타임에서 직접 확인할 수 없어 지시서 기록을 그대로 인용한다. 사용자 요청 표기 "opus 5.5 fable high"의 Fable은 이 실행 모델과 다르다.
- 대상: 이 디렉터리의 [README](../README.md), [개선 backlog](../improvement-backlog.md), [trace 설계](../project-trace-design.md), [초기 schema](../project-trace-schema.sql), [검증 기록](../validation-notes.md). 기준 근거: [도입 리뷰](../../reference/open-design/review/adoption-review.md), [검증 계획](../../reference/open-design/review/validation-plan.md), [인터뷰 기록](../../reference/open-design/interview-log.md). 앱은 `main` HEAD `b16a0ef`의 **현재 작업 트리**(미추적 `src/service/` 등 포함)를 읽었다.
- 증거 표기: **[코드]** 직접 읽은 현재 소스 · **[문서]** 검토 대상 문서의 제안 · **[추론]** 코드·문서에서 도출한 정적 판단 · **[실행]** 스크래치 임시 SQLite에서 한 비파괴 확인 · **[미검증]** 근거 없음 또는 실행하지 않음.

## 결론: 수정 후 진행

방향은 맞다. 업무·크레딧 원장은 PostgreSQL/PGlite에 두고, 프로젝트 SQLite는 실행 추적만 맡는다. 첫 로그 시점의 lazy init을 신규 프로젝트 요구 충족으로 인정하지 않는다. 제공되지 않은 reasoning을 만들어내지 않는다. 대화 로그를 복원 원장으로 쓰지 않는다. 이 네 원칙은 인터뷰 결정, 기존 리뷰와 일치하며 유지해야 한다.

다만 W00을 문서 그대로 구현하면 사용자 핵심 요구 두 가지가 실제로는 충족되지 않는다. 하나는 **공개 reasoning 요약**이고, 다른 하나는 **"로그가 조회 가능하게 보존된다"는 일관성**이다. 아래 B1~B3은 구현 착수 전에 설계 문서를 고치거나 사용자 결정을 받아야 한다. B3은 운영 활성화에만 걸리는 조건이며, 로컬 기준선 PoC는 막지 않는다. W01 이후 품질 개선 항목의 선택과 순서는 대체로 인터뷰에 맞는다. W04의 의존성 모순 하나만 고치면 된다(M9).

## Blocker

### B1. outbox를 누가·언제·어떤 순서로 전달하는지 정의되지 않았다

- [문서] 업무 트랜잭션의 outbox에 이벤트를 쓰고, "SQLite writer"가 event ID UNIQUE로 중복을 제거한 뒤 ack한다 ([설계 §4](../project-trace-design.md)). 프로젝트별 순서는 `producer_seq`로 유지한다.
- [코드] 앱에는 백그라운드 실행 주체가 없다. `src/service`, `src/app/api`, `scripts`에 타이머·큐·instrumentation이 없고, 진행은 모두 클라이언트 폴링 요청이 만든다. 예: [stepLanding](../../../src/service/landing-workflow.ts:129), [statusesFor](../../../src/service/generation.ts:237). 서버 진입점 [server.mjs](../../../scripts/server.mjs:20)도 요청 핸들러만 둔다.
- [실행] 초안 DDL은 존재하지 않는 turn을 참조하는 event를 FK로 거부한다. 따라서 relay가 순서를 어기면 전달이 멈춘다. PG에서 커밋 순서와 ID 할당 순서는 다를 수 있어서 "pending을 seq 순으로 읽기"만으로는 낮은 seq가 늦게 커밋되는 구간이 생긴다 [추론].
- 영향: 전달 주체가 없으면 outbox만 쌓이고 SQLite는 비어 있다. 전달 순서가 뒤바뀌면 FK 실패로 해당 프로젝트 전체가 멈춘다. 합격 조건 5·6을 구현할 수 없다.
- 수정 권고:
  1. 전달 트리거를 명시한다. 커밋 직후 같은 요청에서 해당 프로젝트만 동기 전달한다. 서버 시작 시와 trace 조회 시에는 미전달분을 전달한다. 적체 지표도 둔다. 별도 워커는 필요해질 때 추가한다.
  2. 순서 계약을 하나로 정한다. 권고는 (a)다. 업무 DB의 프로젝트 registry 행에 gapless 카운터를 두고, 같은 업무 트랜잭션에서 증가시킨다. 롤백되면 카운터도 롤백된다. relay는 `last_applied+1`만 적용하고, 빈 번호가 일정 시간 안 채워지면 `trace.gap` 이벤트를 남긴다. 대안 (b)는 순서를 요구하지 않는 대신 projection을 부모 행 placeholder upsert로 만들어 FK 의존을 없애는 방식이다.
  3. (a)를 택하면 registry 행 잠금 순서를 기존 순서의 **마지막**으로 고정한다. 현재 순서는 workflow → projects → board다 ([save](../../../src/service/landing-workflow.ts:26), [applyLandingImages](../../../src/service/landing-workflow.ts:250)).

### B2. 현재 요청 구조로는 "공개 reasoning 요약"이 한 건도 수집되지 않는다

- [코드] 모든 OpenAI 호출은 `reasoning: { effort }`만 보내고 요약을 요청하지 않는다. 모두 `store: false`다. 예: [landing](../../../src/service/landing-model.ts:37), [card-agent](../../../src/service/card-agent-provider.ts:59), [workflow](../../../src/service/workflow-model.ts:28). card-agent에는 "provider reasoning blocks are deliberately neither persisted nor shown"이라는 기존 의도가 주석으로 남아 있다 ([주석](../../../src/service/card-agent-provider.ts:52)). Anthropic 구성안 경로도 thinking을 요청하지 않는다 ([claudeOutline](../../../src/service/outline.ts:24)).
- [실행] 초안의 `reasoning_availability` 기본값은 `not_returned`다. 요청하지 않은 것과 요청했지만 오지 않은 것을 구분하지 못한다.
- [추론] 설계대로 구현하면 모든 턴이 "not_returned"가 된다. 사용자는 추론 기록 기능이 있다고 믿지만 데이터는 0건이다. 요약을 켜려면 provider 요청 자체가 바뀐다. 그러면 W01 기준선이 오염된다. 모델·계정에 따라 요약이 반환되지 않을 수도 있다 [미검증].
- 수정 권고:
  - 상태 값을 `not_requested / requested_not_returned / returned / unsupported / redacted`로 나누고, 기본값은 `not_requested`로 한다.
  - 요약 요청을 켤지, 켠다면 기준선도 켠 상태로 잴지는 **사용자 결정**으로 올린다(질문 Q1).
  - 모델이 출력하는 `summary` 필드는 앱이 스키마로 요구한 작업 요약이다. provider reasoning 요약이 아니다. 따라서 `assistant_output`으로 저장한다. 설계의 `decision_summary`와도 섞지 않는다.
  - `usage.output_tokens_details.reasoning_tokens` 같은 사용량은 요약 없이도 수집할 수 있다. 이것은 W00 최소 범위에 넣는다.

### B3. [운영 활성화 조건] 프로젝트별 로컬 파일을 둘 영속 단일 호스트가 확인되지 않았다

- [코드·문서] 운영은 `DATABASE_URL`(PostgreSQL)을 요구하고, 임시 파일시스템 환경에는 PGlite를 배포하지 말라고 적혀 있다 ([db.ts](../../../src/service/db.ts:80), [워크스페이스 문서](../../content-workspace.md:15)). 배포 설정 파일(Dockerfile, vercel.json 등)은 저장소에 없다.
- [추론] 운영이 다중 인스턴스이거나 임시 디스크라면 프로젝트별 SQLite는 유실되거나 인스턴스마다 갈라진다. 설계도 "구현 전 확인"으로 적어 두었다([설계 §7](../project-trace-design.md)). 이 조건을 통과하기 전에는 운영에 W00을 켜지 않는다는 **게이트**로 문서에 명시해야 한다. 로컬·단일 호스트 기준선 측정은 이 게이트와 무관하게 진행할 수 있다.

## Major

### M1. 생성 전 AI 호출의 "숨겨진 준비 레코드"를 `projects` 테이블에 두면 기존 조회가 오염된다

- [코드] `projects`에는 상태 열이 없다 ([스키마](../../../src/service/db.ts:22)). 아래 조회들은 `deleted_at IS NULL`만 거른다. 숨겨진 행을 넣으면 모두 수정해야 한다.
  - [listProjects](../../../src/service/projects.ts:17)
  - [관리자 집계](../../../src/service/admin-reports.ts:58)
  - [라이브러리 조인](../../../src/service/library.ts:21)
  - 랜딩 활성 작업 조회 ([activeLanding](../../../src/service/landing-workflow.ts:49))
- [코드] 경로별 현재 순서:
  - **구성안/quick-card**: 크레딧 예약 → provider 호출 → 그 뒤 `randomUUID()`로 프로젝트 ID 생성 ([예약](../../../src/service/outline.ts:103), [호출·ID](../../../src/service/outline.ts:142)).
  - **구형 card-agent**: `save` 시점에 새 UUID로 프로젝트를 만든다 ([save](../../../src/service/card-agent.ts:157)). 실패·취소·만료된 run은 프로젝트가 아예 없다.
  - **랜딩·릴스·카드 신규**: 프로젝트 INSERT와 run 생성이 같은 트랜잭션이다 ([랜딩](../../../src/service/landing-workflow.ts:78), [릴스](../../../src/service/reel-workflow.ts:82), [카드](../../../src/service/card-workflow.ts:93)). 첫 AI 호출은 이후 step 요청에서 일어난다. 따라서 provision을 이 트랜잭션에 붙이면 요구를 충족할 수 있다.
  - **추천 3종**: 요청 키·크레딧·프로젝트가 없는 독립 호출이다 ([랜딩](../../../src/service/landing-recommendation.ts:55), [상품](../../../src/service/product-recommendation.ts:47), [릴스](../../../src/service/reel-recommendation.ts:42)). 시작 키는 시작 버튼을 누를 때 처음 만들어진다 ([startKey](../../../src/editors/landing-workflow-creator.tsx:84)). 추천 시점에는 연결할 ID가 없다.
- 수정 권고:
  1. 예약은 업무 DB의 **별도 registry 테이블**(가칭 `project_traces`: project_id, owner_id, state, 예약한 job/run ID, schema version, 경로, 카운터, coverage_start)에 둔다. `projects` 행은 실제 프로젝트가 생길 때 **예약 ID를 그대로 사용해** INSERT한다. 기존 조회는 바꿀 필요가 없다.
  2. 구성안은 예약 트랜잭션([outline.ts:103](../../../src/service/outline.ts:103))에서, card-agent는 `startCardAgent`([card-agent.ts:49](../../../src/service/card-agent.ts:49))에서 ID를 예약하고 run data에 보존한다. save·INSERT는 그 ID를 쓴다. 실패·만료 run의 registry는 `abandoned`로 둔다.
  3. 추천은 클라이언트가 제작 화면을 열 때 만드는 **creation session ID**를 추천 요청과 시작 요청에 함께 보내게 한다. 서버는 이 ID로 registry에 `prepared` 행을 만들고, 시작 요청이 같은 소유자·미사용 조건에서 그 행을 채택한다. 채택되지 않은 세션의 보존 여부는 사용자 결정이다(Q3).

### M2. "같은 생성 키 재요청" 합격 조건을 일부 경로에서는 검증할 수 없다

- [코드] 직접/템플릿 생성 `POST /projects`에는 요청 키가 없다 ([route](../../../src/app/api/workspace/[[...path]]/route.ts:259), [템플릿 호출](../../../src/editors/card-template-gallery.tsx:27)).
- [코드] 구성안 클라이언트는 호출할 때마다 새 키를 만든다 ([new-project](../../../src/editors/new-project.tsx:85)). 네트워크 재시도나 중복 클릭은 서로 다른 유료 요청이 된다.
- 권고: `provisionProjectWithTrace`의 "owner + creation request ID" 멱등성을 적용하려면 두 경로의 API 계약과 클라이언트 키 수명을 먼저 바꿔야 한다. 랜딩·카드의 `startKey ||=` 패턴이 참고할 만하다. W00 작업 목록에 명시한다.

### M3. "파싱 전 원문 기록"을 하려면 provider 경계를 다시 짜야 한다

- [코드] provider 함수들은 원문을 버린다.
  - HTTP 오류 본문과 응답 헤더를 읽지 않는다. 요청 ID 헤더와 오류 JSON이 사라진다 ([landing](../../../src/service/landing-model.ts:64)).
  - 파싱이 실패하면 원문 텍스트 없이 일반 오류로 바꾼다 ([landing](../../../src/service/landing-model.ts:70), [card-agent](../../../src/service/card-agent-provider.ts:77)).
  - `usage`와 응답 ID를 반환하지 않는다.
- [코드] 전역 `fetch`를 직접 호출해서 주입 wrapper를 끼울 수 없는 곳: [landingModel](../../../src/service/landing-model.ts:62), [reelModel](../../../src/service/reel-model.ts:43), [qualityModel](../../../src/service/workflow-quality.ts:27), [reel-render](../../../src/service/reel-render.ts:96), [음성](../../../src/service/reel-media.ts:136). 나머지는 `fetchImpl` 인자가 있다.
- [코드] 랜딩은 provider 응답의 검증·적용을 업무 트랜잭션 **안에서** 한다 ([stepLanding](../../../src/service/landing-workflow.ts:143)). 검증에서 예외가 나면 그 트랜잭션의 outbox 행도 롤백된다.
- 권고:
  1. provider 공통 transport를 하나 두고, `{ raw text, status, headers의 request-id, parsed | parse_error, usage, response id }`를 반환하게 한다. 기존 파싱·보호 로직은 그 결과를 받는다.
  2. 원문 수신 기록은 적용 트랜잭션과 분리된 짧은 기록으로 **먼저** 남긴다(설계 §4의 의도와 같다).
  3. 요청 기록은 claim 트랜잭션 이후, fetch 이전에 남긴다. 이 기록이 실패하면 호출하지 않고 claim을 기존 실패 경로로 되돌린다.

### M4. 기존 프로젝트 게이트의 순서가 잘못되면 기존 AI 기능 전체가 막힌다

- [문서] 설계는 "ready가 아니면 새 외부 호출을 시작하지 않는다"고 하면서, 기존 프로젝트 초기화는 "별도 도입 작업"으로 둔다.
- [코드] 기존 프로젝트에서 AI·유료 호출을 시작하는 경로:
  - 카드 후속 수정 run ([sourceRunId](../../../src/service/card-workflow.ts:74))
  - 페이지 이미지 보드 ([submitJob](../../../src/service/landing-images.ts:98))
  - 편집기 이미지 생성 ([route](../../../src/app/api/workspace/[[...path]]/route.ts:285))
  - 글꼴 추천 ([typography](../../../src/service/typography.ts:20))
- 권고: 게이트를 켜기 전에 backfill을 끝낸다. 또는 기존 프로젝트만 호출 직전에 `origin=legacy`, `coverage_start=now`로 즉시 초기화하도록 허용한다. "lazy init 불인정"은 신규 프로젝트에만 적용한다고 명시한다.

### M5. outbox와 trace에 민감 원문이 남는 범위가 과소 평가됐다

- [문서] outbox가 `sanitized_payload`를 담고, 전달된 payload의 정리 기간은 "운영 측정 후" 정한다. [추론] 정책이 없으면 전체 프롬프트·원문 응답이 업무 PG와 그 백업에 **무기한** 남는다. 업무 원장과 trace를 분리한 의도에 어긋난다.
- [코드] 업로드 에셋은 Vercel Blob `access: "public"`이다 ([assets](../../../src/service/assets.ts:52)). URL 자체가 접근 권한이다. 설계가 제거 대상으로 든 "서명 URL 쿼리"만 지워서는 부족하다.
- [코드] 모델에 실제로 전달되는 이미지는 원본이 아니다. 리사이즈·재인코딩한 1600px JPEG base64다 ([preview](../../../src/service/product-images.ts:37), [data URL](../../../src/service/product-images.ts:69)). 카드 시각 검수 PNG는 브라우저가 만든 일회성 바이트이고 에셋으로 저장되지 않는다 ([quality](../../../src/service/workflow-quality.ts:19)).
- 권고:
  1. outbox에는 ID·버전·해시·상태만 담는다. 큰 원문(요청 본문, 원문 응답, 오류 본문)은 SQLite나 payload 파일에 직접 쓰고 outbox에는 해시만 둔다.
  2. 에셋 URL은 asset ID로 바꾼다.
  3. 이미지 입력은 "원본 asset ID + 변환 파라미터 + 실제 전송 바이트 해시"로 기록한다.
  4. 일회성 PNG를 보관할지, 계정 보관 한도(500MB)에 포함할지는 사용자 결정이다(Q7).

### M6. 초기 schema가 상태 의미와 초기화 재시도를 보장하지 못한다

[실행] SQLite 3.42.0 임시 파일에서 확인한 사실:

- `PRAGMA foreign_keys`는 새 연결에서 다시 0이 된다. pragma 없이 연 연결에서는 고아 turn이 저장됐다. 모든 연결에서 설정해야 한다.
- STRICT 테이블이 아니어서 `runs.started_at`에 `'yesterday'`(text)가 저장됐다.
- `turns.status`와 `reasoning_availability`에 임의 문자열이 저장됐다. 설계가 요구하는 `unknown / cancelled / stale / late_discarded` 구분을 DB가 강제하지 못한다.
- DDL을 두 번째 실행하면 `table already exists`로 실패하고, 그 연결에 **열린 트랜잭션이 남는다**. 크래시 후 재시도하는 provisioner가 파일을 그대로 다시 적용하면 곧바로 재현된다.
- `artifacts`에는 자연 키가 없어 같은 asset 행이 두 개 저장됐다.
- `events.producer_seq NOT NULL`이라 writer 자체의 진단 이벤트(gap, 손상 표시)를 넣을 수 없다.

권고:

- 버전 판정은 `PRAGMA user_version` 하나로 한다. `project_meta.schema_version`과 `schema_migrations` 중 원천을 하나로 정한다.
- provisioner는 버전을 먼저 읽고 필요한 migration만 트랜잭션으로 적용한다.
- STRICT 테이블과 상태 CHECK 열거를 추가한다.
- projection 행 ID는 event ID에서 결정적으로 만든다.
- `producer_seq`는 NULL을 허용하되 부분 UNIQUE로 둔다.

### M7. 'unknown'의 종류마다 복구 가능성이 다르다

- [코드] 텍스트 모델 호출은 모두 `store: false`다. 응답을 잃으면 나중에 provider에서 다시 조회할 수 없다 [추론]. 반면 이미지·영상 작업은 `request_id`로 상태를 다시 조회해 정산한다 ([statusesFor](../../../src/service/generation.ts:237)).
- [코드] lease가 만료되면 run은 멈추거나 실패·환불 처리된다. provider 호출은 계속 진행되고, 늦게 온 응답은 적용되지 않는다. 비용은 이미 발생했다.
  - [랜딩 만료](../../../src/service/landing-workflow.ts:41), [늦은 응답 무시](../../../src/service/landing-workflow.ts:145)
  - [card-agent 만료 환불](../../../src/service/card-agent.ts:32)
- [코드] 구성안에는 만료 처리가 없다. provider 응답 후 INSERT 전에 프로세스가 죽으면 job이 `submitting`으로 남고, 예약한 크레딧이 풀리지 않는다 ([outline](../../../src/service/outline.ts:141)).
- 권고:
  - trace 상태를 `unknown_irrecoverable`(텍스트)과 `unknown_reconcilable`(request_id 보유)로 나누고, `late_discarded`를 별도로 둔다.
  - 구성안 크레딧 문제는 trace로 **드러낼** 기존 결함이다. W00이 고쳤다고 주장하지 않는다.

### M8. 계측 대상 목록이 코드보다 좁다

설계 §6에 없는 provider 호출:

- [릴스 사진 추천](../../../src/service/reel-recommendation.ts:21)
- 유료 음성 합성·전사 ([음성](../../../src/service/reel-media.ts:136), [전사](../../../src/service/reel-media.ts:146))
- [릴스 출력 검수](../../../src/service/reel-render.ts:96)
- 카드 이미지 일괄 생성 ([workflow-images](../../../src/service/workflow-images.ts:39))

프로젝트에 속하지 않는 호출:

- 스튜디오 생성: `submitGeneration`이 프로젝트 없이 `submitJob`을 호출한다 ([actions](../../../src/generation/actions.ts:24)).
- 관리자 모델 확인 ([openai-settings](../../../src/service/openai-settings.ts:38)).

권고:

- 이미지·영상은 워크플로우별로 계측하지 말고 `submitJob`/`settleJob` 한 곳에서 계측한다 ([submitJob](../../../src/service/generation.ts:67), [settleJob](../../../src/service/generation.ts:190)).
- 호출 지점 전체를 `project / pre-project / 비프로젝트(대상 외)`로 분류한 표를 설계에 넣는다.

### M9. backlog의 의존성과 기준선 정의를 고쳐야 한다

- [문서] W04는 표에서 "W00·W03"에 의존한다. 그런데 단계 3은 W03(단계 4)보다 먼저 W04의 "문구/배치 단일 코멘트"를 진행한다 ([backlog](../improvement-backlog.md)). 권고: W04a(문구·배치, W03 무관)와 W04b(이미지 라우팅, W03·W05 이후)로 나눈다.
- [추론] W00 자체가 동작을 바꾼다. 동기 기록 지연이 생기고, trace 실패 시 호출을 막고, B2를 택하면 요청 본문도 바뀐다. 그러면 W01은 "기존 동작"이 아니라 "기존 동작 + 계측"을 재게 된다. 권고:
  - 요청 본문을 바꾸지 않는 관찰 전용 W00 최소판으로 기준선을 잰다.
  - 계측 지연을 별도로 보고한다.
- [코드] OpenAI 모델·effort는 관리자가 바꾸는 전역 설정이다 ([resolveOpenAi](../../../src/service/openai-settings.ts:77)). 기준선 동안 설정을 고정하고 턴마다 스냅샷을 기록한다.
- [추론] 같은 입력이라도 모델 출력은 달라진다. 반복 횟수와 유료 예산이 필요하다(Q6).
- [추론] 자동 스크립트로 잰 "사용자 대기 시간"은 실제 사용자 부담이 아니다. 두 값을 구분해 보고한다.

### M10. SQLite driver와 런타임을 가정하면 안 된다

- [실행] 로컬 Node v24.2.0의 `node:sqlite`는 SQLite 3.50.0을 쓰고 `backup` 함수가 있다. 다만 실행 시 `ExperimentalWarning`을 낸다. `package.json`에는 engines 고정도 SQLite 의존성도 없다.
- 권고: driver 선택, Next 번들 포함 여부, 운영 Node 버전을 W00-a의 첫 확인 항목으로 둔다. 설계의 "단정하지 않는다"는 기조는 맞다.

## Minor

- 설계 표의 라인 참조 네 곳이 대상 함수와 어긋난다.
  - `card-agent.ts:45`는 `activeCardAgent`다. 시작은 [49](../../../src/service/card-agent.ts:49), 저장은 [157](../../../src/service/card-agent.ts:157)이다.
  - `card-workflow.ts:68`은 `afterPlan`이다. 시작은 [70](../../../src/service/card-workflow.ts:70)이다.
  - `reel-workflow.ts:60`은 [58](../../../src/service/reel-workflow.ts:58)이다.
  - `generation.ts:68`은 [67](../../../src/service/generation.ts:67)이다.
- `messages UNIQUE(run_id, ordinal)`를 쓰려면 병렬 턴 사이의 ordinal 할당자가 필요하다. `(turn_id, ordinal)`과 이벤트 순서로 바꾸는 편이 단순하다.
- 시간 단위(ms)와 ID 형식을 schema 주석에 명시한다.
- 테스트는 `LOCAL_DATABASE_DIR=memory://`를 쓴다. trace 루트에도 임시 경로나 메모리 모드가 필요하다. 테스트 fixture의 직접 INSERT도 있다 ([library.test](../../../test/library.test.ts:10)).
- W07 URL 읽기에는 SSRF 통제가 필요하다(사설 IP, 리다이렉트, 크기). 현재 원격 다운로드는 호스트 allowlist 방식이라 일반 URL 수집에 그대로 쓸 수 없다 ([remoteMedia](../../../src/service/reel-media.ts:39)).
- 설계 §7의 "WAL" 문장은 맞다. 다만 초안 DDL은 journal mode를 지정하지 않는다([실행] 기본값 `delete`). 모드는 provisioner가 정할 값이라고 적어 둔다.

## 동의하는 부분

- trace는 업무 원장이나 복원 원장이 아니다. `change_refs`는 참조일 뿐이다.
- 기존 요약 이벤트를 가져올 때 `imported_summary` 출처를 표시한다. 과거 원문을 복구한 것처럼 꾸미지 않는다.
- 미측정 비용은 0이 아니라 null이다. estimated와 measured를 구분한다.
- provider 내장 검색은 관측한 범위만 기록한다. 현재 코드도 `web_search_call.action.sources`와 인용 URL만 신뢰한다 ([observedUrls](../../../src/service/workflow-model.ts:48)).
- 실제 전송 입력, 원본 응답, 파싱 결과, 검증 결과를 분리해 저장한다.
- live 파일만 복사한 것을 백업으로 인정하지 않고 backup API를 쓴다.

## 권고 구현 순서

1. **결정·확인(코드 없음):** Q1~Q8. B3 배포 형태와 M10 driver·Node를 확인한다.
2. **W00-a 초기화:**
   - 업무 DB에 registry를 추가하고, gapless 카운터와 잠금 순서를 정한다(B1).
   - provisioner: `user_version` 확인, STRICT schema, 쓰기 probe를 거친 뒤 ready로 바꾼다.
   - 생성 6경로를 공통 함수로 옮긴다. 예약 ID를 쓰고(M1), 요청 키를 추가한다(M2).
   - 각 단계에서 프로세스를 종료하는 테스트를 둔다. provider 호출은 하지 않는다.
3. **W00-b 관찰 전용 캡처:**
   - 공통 transport(M3). `submitJob`/`settleJob` 계측(M8).
   - claim·apply 트랜잭션 안에 작은 outbox 이벤트를 쓰고, 큰 원문은 SQLite에 직접 쓴다(M5).
   - 트리거 기반 전달과 적체 지표(B1).
   - 요청 본문은 바꾸지 않는다. reasoning은 `not_requested`로 기록한다.
4. **W00-c:** 기존 프로젝트 즉시 초기화 또는 backfill 뒤 게이트를 켠다(M4). 대상 외 호출 분류표를 확정한다.
5. **W01 기준선:** 랜딩·제품 상세 우선. 설정을 고정하고 반복 측정한다. Q1이 승인되면 요약을 켠 상태도 따로 기록한다.
6. **품질 개선:** W06 계약 설계 → W02 → W04a → W03·W05 → W04b → W07(SSRF 통제 포함)·W08 → W09. W10은 보류를 유지한다.

**최소 기준선 범위:**

- 생성 6경로 전부의 초기화
- 랜딩·제품 상세 텍스트 턴의 원문·usage·오류
- 이미지 작업의 제출·정산
- 사용자 action 이벤트

이 범위면 W01의 질문 수·호출 수·실패·대기·토큰·크레딧을 계산할 수 있다. 카드·릴스·추천 호출은 transport 공통화 후 확대한다. 확대 전에는 해당 run을 `capture_status=partial`로 표시한다.

## 사용자 판단이 필요한 질문

1. **Q1 reasoning 요약 요청:** provider 요청에 요약 요청을 추가할까? 추가하면 요청 본문이 바뀌고, 모델·계정에 따라 반환되지 않을 수 있다. 기준선은 요약을 끈 상태로 잴까, 켠 상태로 잴까?
2. **Q2 초기화 실패 시 생성:** AI 없이 직접·템플릿으로 만드는 프로젝트도 trace 초기화가 실패하면 생성 자체를 거절할까? 아니면 생성은 허용하고 AI 호출만 막을까?
3. **Q3 채택되지 않은 준비 기록:** 추천만 받고 끝낸 세션, 실패·만료된 card-agent run의 trace를 남길까? 남긴다면 얼마나 보존할까?
4. **Q4 관리자 열람:** 관리자가 다른 사용자의 원문 프롬프트, 사진 입력, 응답 trace를 볼 수 있어야 하나?
5. **Q5 보존·삭제:** 보관(archive)된 프로젝트와 영구 삭제 요청의 trace 처리, 업무 DB outbox에 전달된 payload의 정리 시점.
6. **Q6 기준선 예산:** 입력 fixture 수, 반복 횟수, 허용할 유료 호출 비용.
7. **Q7 일회성 입력 보관:** 시각 검수 PNG나 비전용 변환 이미지를 재현용으로 보관할까? 보관한다면 사용자 계정 보관 한도에 포함할까?
8. **Q8 운영 배포 형태:** 영속 볼륨이 있는 단일 호스트로 운영할 예정인가?

기존 미정 정책(재생성 비용 한도, 복원 충돌, 대상은 아는 URL의 읽기 실패, 코멘트 묶음)은 이 리뷰에서 확정하지 않았다.

## 검증 기록

- 읽은 파일:
  - 이 디렉터리 문서 6개, 기준 문서 3개(도입 리뷰, 검증 계획, 인터뷰 기록)
  - 앱의 `AGENTS.md`/`CLAUDE.md`
  - `src/service`의 생성·모델·생성 작업·추천·검수·에셋·크레딧·설정 파일, workspace API route, 생성 action, 관련 editor의 키 생성 지점
  - `package.json`, `scripts/server.mjs`, `next.config.ts`
  - README와 `docs/content-workspace.md`의 운영 항목
  - `.env*` 파일은 권한 정책상 읽지 않았다.
- [실행] 스크래치 디렉터리에서 초안 DDL을 Python sqlite3(SQLite 3.42.0) 임시 파일로 실행했다. M6의 결과가 이 확인에서 나왔다. 임시 파일은 삭제를 확인했다. `node:sqlite`는 메모리 DB에서 버전과 `backup` 존재만 확인했다. 앱 DB, trace 파일, 서비스, 테스트, 빌드, 모델 호출은 실행하지 않았다.
- 관찰 버전: 아래 세 파일의 SHA-256은 [도입 리뷰](../../reference/open-design/review/adoption-review.md)에 기록된 값과 같다.
  - `landing-workflow.ts` `d1fba0ac…a6b5`
  - `landing-model.ts` `d83150cf…695a`
  - `projects.ts` `cf2e4eca…2192`

  이번에 추가로 기록한 파일:

  | 파일 | SHA-256(앞 8자) |
  | --- | --- |
  | `db.ts` | `e7bacc55` |
  | `outline.ts` | `6c43c233` |
  | `card-agent.ts` | `77303f94` |
  | `card-agent-provider.ts` | `695b8e2d` |
  | `card-workflow.ts` | `bab67788` |
  | `reel-workflow.ts` | `33da82c8` |
  | `generation.ts` | `fbfd4ce3` |
  | `product-images.ts` | `65518055` |
  | 대상 schema | `f032e162` |
  | 대상 설계 | `89bd6118` |
  | 대상 backlog | `1d10f863` |
- 링크·라인 검사: 이 문서의 로컬 Markdown 링크 85개(외부 URL 제외) 중 소스 라인 참조는 72개다. 스크립트로 파일 존재와 라인 범위를 확인했고 누락·범위 초과는 0건이다. 참조한 각 라인의 내용도 출력해 인용 의도와 대조했다.
- 쓰기: 이 파일 하나. 다른 문서·코드·Git 상태는 바꾸지 않았다. 추가 에이전트는 만들지 않았다.
