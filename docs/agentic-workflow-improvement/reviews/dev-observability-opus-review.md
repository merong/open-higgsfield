# 개발 모드 워크플로우 관찰·평가 loop 독립 리뷰

2026-09-28 · Opus 5.5 high(응답 모델 ID `claude-opus-5-5`, effort는 이전 지시서 기록을 유지) · 소스 무수정

## 범위와 판정 기준

- 대상: `src/service/{trace-policy,trace-store,workflow-trace,trace-access}.ts`, `src/dev-workflow/*`, `src/app/dev/workflows/page.tsx`, `src/app/api/dev/workflows/[projectId]/route.ts`. 기존 서비스 연결부도 함께 보았다: 생성 6경로, 랜딩 상태·모델, 생성 작업, 이미지 보드, workspace route, `db.ts` outbox, `test/workflow-trace.test.ts`. 미추적 파일은 git diff가 아니라 실제 파일을 읽었다.
- 판정 범위: **개발용 foundation**이다. 수집 대상은 랜딩·제품 상세 AI 턴, 프로젝트에 연결된 이미지·영상 생성, 실제 6개 생성 경로의 초기화다. 다른 AI provider와 생성 전 추천은 미수집이며 UI가 이를 공개한다. 운영 배포 완성 여부는 판정하지 않았다.
- 다른 작성자가 검토 도중 코드를 수정했다(23:11~23:26). 판정은 **23:26 스냅샷** 기준이다. 23:41에 해시를 다시 확인했을 때 소스는 그대로였다. 파일 목록과 해시는 아래 검증 기록에 있다.
- 증거 표기: **[재현]** 격리된 임시 DB·임시 디렉터리에서 실행한 확인 · **[코드]** 정적 확인 · **[미검증]** 실행하지 않음.

## 결론

**개발용 foundation으로 진행 가능하다.** 이 범위에서 Blocker는 없다.

- 핵심 계약은 코드와 격리 실행으로 확인했다.
  - 6개 생성 경로가 모두 프로젝트 INSERT와 같은 트랜잭션에서 SQLite를 초기화한다.
  - outbox 재전달 시 중복이 생기지 않는다.
  - production에서는 404로 차단된다.
  - 소유자만 열람할 수 있다.
  - 숨겨진 reasoning과 비밀값이 제거된다.
  - 고객 의견과 개발자 가설이 구분된다.
  - 실험 결론에 같은 출처의 점수 쌍을 요구한다.
- 남은 것은 조건부 Major 1건과 Minor들이다.

## Major

### M1. [조건부] 수집 게이트가 `NODE_ENV`만 봐서, 공유 PostgreSQL을 쓰는 개발 서버에서 outbox가 다른 서버로 빠져나가고 원문이 공유 DB에 남는다

- [코드] 수집 여부는 `NODE_ENV === "development"` 하나로 결정된다 ([게이트](../../../src/service/trace-policy.ts:5)). 저장소 위치와는 무관하다.
- [코드] outbox는 업무 DB의 테이블이다 ([db.ts](../../../src/service/db.ts:51)).
- [코드] 전달은 요청을 처리한 서버가 자기 로컬 파일에 쓰고 DB 행을 지우는 방식이다 ([flush](../../../src/service/workflow-trace.ts:57), [삭제](../../../src/service/workflow-trace.ts:59)). 이 전달은 모든 workspace 요청이 끝날 때 실행된다 ([finally](../../../src/app/api/workspace/[[...path]]/route.ts:384)).
- 재현 조건 [미검증, 정적 추론]: `.env.local`의 `DATABASE_URL`이 공유 DB(스테이징 등)를 가리키고, 두 개발 서버가 같은 계정으로 요청하는 경우.
  - 먼저 요청을 처리한 서버가 이벤트를 자기 `.data/workflow-traces`로 옮기고 PG에서 지운다.
  - 다른 서버에서는 해당 기록이 영구히 보이지 않는다.
  - 프로젝트를 만든 서버가 아니면 파일이 `legacy_partial`로 새로 생긴다.
  - 전달 전까지는 민감 원문(프롬프트, 사진 해시, 응답)이 공유 DB 백업 범위에 들어간다.
- 권고: 명시적 opt-in(`WORKFLOW_TRACE_DEV=1` 등)과 로컬 DB 조건을 함께 요구한다. 최소한 `DATABASE_URL`이 있으면 끄거나 경고를 띄운다. outbox 행에 수집 호스트 식별자를 넣고 다른 호스트의 행은 가져가지 않게 한다.

## Minor

1. **수집 공백이 표시되지 않는다.** 헤더의 "프로젝트 생성부터 기록"(`new_project`)은 이후 수집이 꺼졌던 기간을 반영하지 않는다 ([UI](../../../src/dev-workflow/workbench.tsx:76), [early return](../../../src/service/workflow-trace.ts:9)). 예를 들어 `ALLOW_LOCAL_DATABASE`로 같은 로컬 DB를 production 모드로 띄워 AI 제작을 진행하면, 그 기간의 턴은 흔적 없이 빠진다. `captureGaps`에도 잡히지 않는다. 비교·실험에서 누락된 턴을 "없었던 것"으로 읽을 수 있다. 권고: 서버 시작 시 수집 세션 ID와 모드를 기록하고, 프로젝트 event 사이에 세션이 바뀌면 공백 가능성을 표시한다.
2. **fallback 기록이 시간 순서를 뒤집는다.** [재현] 커밋 밖의 outbox 쓰기가 실패하면 SQLite에 바로 쓴다 ([fallback](../../../src/service/workflow-trace.ts:28), [store](../../../src/service/trace-store.ts:65)). 이때 이미 대기 중이던 이전 이벤트보다 앞 순번을 받는다. 실측: `1:fallback-second`, 그 뒤에 `3:queued-first`. `project.created`보다도 앞에 놓였다. UI 각주가 "수집 순서"라고 밝히긴 하지만, 타임라인 기본 정렬이 seq라서 턴 흐름을 잘못 읽게 된다. 권고: 표시 정렬을 `at` 우선으로 하거나, fallback 이벤트에 전달 경로 배지를 붙인다.
3. **롤백된 업무 트랜잭션도 "기록 누락 가능" 경고를 남긴다.** [재현] 트랜잭션 안에서 outbox 쓰기가 실패하면 SQLite에 capture_gap 진단을 쓴다. 그 뒤 업무 트랜잭션이 롤백돼도 진단은 남는다. 실측으로 커밋 1건, 롤백 1건에서 모두 marker가 생겼다. 문구가 "적용 여부는 알 수 없음"이라 허위 주장은 아니다. 다만 누락 경고 수가 부풀려진다. 권고: 트랜잭션 ID나 업무 버전을 함께 기록해 나중에 확인할 수 있게 한다.
4. **다른 트랜잭션 전략을 쓰는 DB 드라이버는 미검증이다.** 원문 SAVEPOINT 복구는 PGlite에서만 실행 확인했다 ([savepoint](../../../src/service/workflow-trace.ts:14)). postgres.js 트랜잭션에서 `unsafe("SAVEPOINT …")`가 같은 연결에서 동작하는지는 [미검증]이다.
5. **초기화 파일 누수.** SQLite 파일은 PG 커밋 전에 만들어진다 ([init](../../../src/service/workflow-trace.ts:39)). 구성안 저장처럼 이후 단계에서 롤백되면 접근할 수 없는 빈 파일이 남는다. 코드 주석이 이를 인정하고 있다. 개발용으로는 허용 가능하다. 정리 도구를 두거나 문서에 적어 둔다.
6. **요청 경로의 부담과 노이즈.** 모든 workspace 요청의 `finally`에서 최대 12개 프로젝트 × 4배치를 동기 SQLite로 전달한다 ([finally](../../../src/app/api/workspace/[[...path]]/route.ts:384)). 이미지 보드는 폴링 단계마다 보드 전체 JSON을 `workflow.state`로 두 번씩 남긴다 ([보드 save](../../../src/service/landing-images.ts:31)). 폴링이 많은 작업에서는 모델 턴이 첫 페이지 밖으로 밀리고 응답 지연도 커진다. 권고: 보드 이벤트는 변경이 있을 때만 남기고, 요청마다 하는 flush는 해당 프로젝트로 좁힌다.
7. **보관 이미지가 미리보기에서 깨진다.** 공개 Blob URL은 해시 참조로 치환된다 ([sanitize](../../../src/service/trace-policy.ts:19)). 그래서 저장된 결과 미리보기에서 이런 이미지는 깨진다. UI 문구는 원인을 "만료될 수 있음"으로 설명한다 ([preview](../../../src/dev-workflow/workbench.tsx:40)). Blob 저장소를 쓰는 개발 환경에서만 해당한다. 권고: asset ID를 따로 보존하고 소유권을 확인하는 경로로 다시 연결한다.
8. **실험의 비교 가능성을 서버가 확인하지 않는다.** 기준·후보 쌍이 같은 단계·종류·모델·입력인지 검사하지 않는다. `controls`는 자유 문자열이다 ([실험 저장](../../../src/service/trace-store.ts:127)). 예를 들어 `project.created`와 `model.response`를 비교해 도입 결론을 낼 수 있다. 결론을 내릴 때 evidence 스냅샷은 저장된다 ([evidence](../../../src/service/trace-store.ts:147)). 권고: 양쪽 이벤트의 kind·phase·model·requestHash를 실험 행에 자동 기록하고, 서로 다르면 경고를 띄운다.
9. **표기·오류 처리의 작은 부정확성.**
   - `model.request` 라벨이 "실제 입력"인데, 저장된 것은 이미지 바이트와 URL 쿼리를 제거한 정규화본이고 `requestHash`도 정규화본의 해시다 ([transport](../../../src/service/workflow-trace.ts:74)).
   - 요청 기록을 저장하지 못하면 provider를 호출하지 않는다(의도한 fail-closed). 그런데 사용자에게는 "AI 응답을 확인하지 못했어요"로 표시되고, 원인은 콘솔에만 남는다 ([landing-model](../../../src/service/landing-model.ts:63)).
   - Origin 헤더가 문자열 `null`이면 403이 아니라 500이 된다 ([route](../../../src/app/api/dev/workflows/[projectId]/route.ts:21)). 기존 workspace route와 같은 패턴이며, 어느 경우든 요청은 거부된다.

## 요구별 확인 결과

| 집중 항목 | 결과 | 근거 |
| --- | --- | --- |
| 초기화: 6개 생성 경로 | 충족. 직접·템플릿, 구성안, card-agent 저장, 카드·릴스·랜딩 신규 생성 모두 프로젝트 INSERT와 같은 트랜잭션에서 초기화한다. 카드 후속 수정은 기존 프로젝트라 최초 조회 시 `legacy_partial`로 초기화된다 | [projects](../../../src/service/projects.ts:46), [outline](../../../src/service/outline.ts:153), [card-agent](../../../src/service/card-agent.ts:160), [card-workflow](../../../src/service/card-workflow.ts:94), [reel](../../../src/service/reel-workflow.ts:84), [landing](../../../src/service/landing-workflow.ts:86) |
| migration·FK·버전 | 충족. 버전 확인 → schema 적용 → metadata 검사가 `BEGIN IMMEDIATE` 안에서 이루어진다. 연결마다 FK를 켜고 STRICT·CHECK를 쓴다. [재현] v1 파일(기존 decision 포함)이 v2로 올라가며 evidence 기본값 `[]`, `foreign_key_check` 0건 | [withTraceStore](../../../src/service/trace-store.ts:23) |
| idempotency·재전달 | 충족. event ID `ON CONFLICT`, SQLite 커밋 후 PG 삭제. 결정적 ID(생성·상태·action·생성 종료). 평가·실험·결론은 같은 ID에 다른 내용이 오면 409. UI가 같은 내용에 같은 키를 재사용한다 | [append](../../../src/service/trace-store.ts:52), [checkRetry](../../../src/service/trace-store.ts:100), [UI 키](../../../src/dev-workflow/workbench.tsx:59) |
| outbox 장애·crash replay | 충족(M1 조건 제외). [재현] 테스트: ack 전 종료 후 재전달 중복 0, 전달 불가 시 대기 유지 후 복구. 추가 재현: outbox 거부 시 커밋 밖 기록은 SQLite fallback, 트랜잭션 안 기록은 업무 커밋을 유지하고 gap marker를 남김 | [queueTrace](../../../src/service/workflow-trace.ts:8) |
| production gate | 충족. 페이지는 `notFound`, API·서비스는 404, 기록 함수는 early return | [page](../../../src/app/dev/workflows/page.tsx:12), [route](../../../src/app/api/dev/workflows/[projectId]/route.ts:11) |
| 소유권·CSRF | 충족. 모든 접근 전에 현재 프로젝트의 소유·삭제 상태를 확인하고, SQLite metadata의 소유자도 검사한다. 관리자라는 이유로 열람할 수 없다. POST는 Origin=Host와 크기 제한을 둔다. GET은 flush·migration 쓰기를 하지만 멱등이다 | [trace-access](../../../src/service/trace-access.ts:8), [route](../../../src/app/api/dev/workflows/[projectId]/route.ts:20) |
| 숨겨진 reasoning·비밀값 | 충족. reasoning 항목은 id·summary만 남기고 encrypted/content는 버린다. 요청하지 않은 요약은 `not_requested`로 기록하며 provider 요청을 바꾸지 않는다. [재현] x-api-key·token·client_secret·`Key id:secret`·JWT·공개 Blob 경로가 모두 제거되고, 120,000자를 넘는 중첩 JSON도 길이 제한된다. 테스트로 encrypted/content/sk 키/쿼리 토큰/base64가 저장되지 않음을 확인 | [policy](../../../src/service/trace-policy.ts:12), [transport](../../../src/service/workflow-trace.ts:91) |
| 원문 오류·unknown·늦은 응답 | 충족. 비JSON 응답 본문 보존([재현] 502 HTML 본문 저장), 네트워크 실패는 `unknown`, 늦은 응답은 `late_discarded`, 생성 거절과 미확인을 구분 | [body](../../../src/service/workflow-trace.ts:84), [late](../../../src/service/landing-workflow.ts:156), [generation](../../../src/service/generation.ts:165) |
| 고객 평가 vs 개발자 가설 | 충족. 출처 enum, 만족도는 고객 의견일 때만(DB CHECK·서비스·UI 3중), 고객 원문 필수, 변화 방향은 "가설"로 표시, 사용자 action은 `satisfaction: not_inferred`. 결론에는 같은 출처의 점수 쌍이 필요하고 근거 스냅샷을 보존한다 | [evaluation](../../../src/service/trace-store.ts:109), [결론 게이트](../../../src/service/trace-store.ts:144) |
| UI 데이터·비교·실험 | 서비스 계층에서 충족. [재현] 첫 로드 이후 250건이 새로 쌓여도 페이징으로 291/291건이 모두 로드된다. 비교표는 같은 항목·출처끼리만 비교하고 n이 통계적 유의성이 아님을 밝힌다. **브라우저 렌더링 자체는 미검증** | [merge](../../../src/dev-workflow/workbench.tsx:64) |

## 검토 중 다른 작성자가 해소한 사항

23:11 이전 버전을 읽을 때 먼저 파일에 기록했던 결함들이다. 23:26 스냅샷에서 해소된 것을 재현으로 확인했다.

- 타임라인 새로고침 때 100건을 넘는 새 이벤트의 중간 구간이 영구 누락되던 문제 → 병합 로직 수정, 누락 0 확인.
- 실험 결론이 점수 없는 평가나 서로 다른 출처의 평가를 인정하던 문제 → 같은 출처의 점수 쌍을 요구하도록 수정.
- provider 응답 수신 후 기록 실패(예: NUL 문자)가 성공한 유료 응답을 오류로 바꾸던 문제 → NUL 이스케이프, savepoint, fallback으로 응답 반환 확인.
- 비JSON 오류 본문 누락, Blob 경로·JWT·`Key`·x-api-key 노출 → 해소.
- 같은 요청 ID에 다른 내용을 보내면 성공으로 응답하던 문제, UI가 재시도마다 새 ID를 만들던 문제 → 409 처리와 요청 키 재사용.

## 권고 순서

1. M1: 명시적 opt-in과 로컬 DB 조건을 추가하고 outbox에 호스트를 표시한다.
2. Minor 1: 수집 세션과 공백을 표시한다.
3. Minor 6: 보드 이벤트 변경 시에만 기록하고, flush 범위를 줄인다.
4. Minor 8: 실험의 비교 가능성 정보를 자동 기록한다.
5. 브라우저 실사용 검증: 격리된 로컬 DB로 랜딩 1회를 수행하고 타임라인·비교·실험 흐름을 확인한다.

그 뒤 다른 provider와 pre-project 수집을 넓힌다. 운영 활성화는 이전 리뷰의 B3·M10 조건을 따로 통과해야 한다.

## 검증 기록

- 격리 실행만 했다. 모두 `LOCAL_DATABASE_DIR=memory://`, OS 임시 디렉터리의 `WORKFLOW_TRACE_DIR`, `DATABASE_URL` 해제, 가짜 키를 썼다. 유료 AI 호출과 개발 서버 실행은 하지 않았다. 임시 디렉터리는 삭제를 확인했다.
  - `test/workflow-trace.test.ts`: 10/10 통과.
  - 전체 `test/*.test.ts`: 157/157 통과.
  - `tsc --noEmit --incremental false`: 오류 0. `tsconfig.tsbuildinfo`는 변경되지 않았다.
  - 리뷰용 재현 스크립트 2개(스크래치 디렉터리): 비JSON 본문, sanitizer 패턴, v1→v2 migration, fallback 순서, gap marker, 페이징.
- 23:26 스냅샷 SHA-256(앞 12자):

  | 파일 | 해시 |
  | --- | --- |
  | trace-store | `a5e9076f71d8` |
  | workflow-trace | `d004b46706d3` |
  | trace-policy | `0319b587eef2` |
  | trace-access | `9b9e53d1a647` |
  | workbench.tsx | `cb99d13b80c0` |
  | types | `6b867d925f58` |
  | page | `0a0075f3e83d` |
  | dev route | `1be90f5f15e8` |
  | db.ts | `43c0d62445bb` |
  | landing-workflow | `62a3707bbdd2` |
  | generation | `456088819aee` |
  | test | `255925a5daea` (23:28) |
- 출력에 자격 증명, env 값, 사용자 데이터를 포함하지 않았다. 쓰기는 이 파일 하나다.

## Addendum — M1 반영 확인 (23:45 변경분)

2026-09-28 23:47 · 위 본문과 23:26 스냅샷 판정은 그대로 둔다. 이번 확인 범위는 아래 4개 파일의 변경뿐이다. 전체 테스트는 반복하지 않았다. 마지막 변경의 trace 회귀 테스트와 build는 요청자가 실행 중이며, 그 결과는 이 문서에 포함하지 않았다.

| 파일(23:45:26) | SHA-256 앞 12자 |
| --- | --- |
| `src/service/trace-policy.ts` | `f5bd49def571` |
| `src/app/dev/workflows/page.tsx` | `2e3dc6d8999b` |
| `src/app/api/dev/workflows/[projectId]/route.ts` | `5758f1624dd8` |
| `src/dev-workflow/workbench.tsx` | `96872e43182e` |

나머지 trace 서비스 파일(`trace-store`, `workflow-trace`, `trace-access`)의 해시는 본문 스냅샷과 같다.

addendum을 쓰는 동안 `workbench.tsx`가 23:52:32에 다시 바뀌었다(`1986fa46afd4`). 이 판정은 23:45 버전을 읽고 내린 것이다. 23:52 버전에서는 아래 세 가지가 그대로 있는 것만 확인했다: 정렬 51행, 헤더 문구 79행, 배지 87행. 링크 라인 번호는 23:52 버전 기준으로 맞췄다. 그 밖의 23:52 변경은 검토하지 않았다.

**M1 판정: 해소(공유 DB에서는 수집하지 않는 방식).**

- [코드] `DATABASE_URL`이 비어 있지 않으면 `traceEnabled()`가 false를 반환한다. 명시적 우회 옵션은 없다 ([게이트](../../../src/service/trace-policy.ts:5)).
- [코드] 수집·전달·초기화·transport는 모두 이 함수로 먼저 반환한다([workflow-trace](../../../src/service/workflow-trace.ts:9)의 queue·init·capture·flush·transport 경로). dev API는 `requireTraceMode()`로 404를 낸다.
- [재현] 격리 스니펫 결과:
  - `DATABASE_URL`이 설정되면 개발 모드와 테스트 opt-in 모두 비활성, `requireTraceMode`는 404.
  - `queueTrace`·`flushUserTraces`는 DB에 쿼리하지 않고 반환한다(질의하면 예외를 던지는 가짜 tx로 확인).
  - `tracedResponsesFetch`는 원래 요청만 그대로 수행한다.
  - `DATABASE_URL`이 없거나 빈 문자열이면 활성이다. 이는 [db.ts](../../../src/service/db.ts:61)가 빈 값을 PGlite로 처리하는 조건과 일치한다.
- [코드] 개발 페이지는 production이면 `notFound`다. 게이트가 닫혀 있으면 사용자·프로젝트 조회 전에 로컬 PGlite 안내만 반환한다 ([page](../../../src/app/dev/workflows/page.tsx:12)).
- 남은 사항:
  - **공유 PostgreSQL 지원과 host 단위 outbox**는 요청자 결정대로 후속 범위다.
  - **이전 버전이 남긴 outbox 행:** 이전 버전을 공유 DB에 연결해 실행한 적이 있다면, 그때 쌓인 행은 이제 전달도 정리도 되지 않는다. 존재 여부는 확인하지 않았다 [미검증]. 필요하면 해당 DB에서 `project_trace_outbox`를 운영 절차로 비운다.

**함께 확인한 Minor 변경**

- **Minor 2(fallback 순서):** 대체로 해소. 타임라인 목록은 `at`, 동률이면 `seq` 순으로 정렬하고, fallback으로 기록된 이벤트에 "SQLite 직접 기록" 배지를 붙인다. 각주도 "관측 시각 정렬, 순번은 수집 순서"로 바뀌었다 ([정렬](../../../src/dev-workflow/workbench.tsx:51), [배지](../../../src/dev-workflow/workbench.tsx:87)). 비교용 이벤트 선택 목록은 저장된 seq 순서를 그대로 따른다. 이는 표시 편의 문제일 뿐이다.
- **Minor 1(수집 공백 미표시):** 부분 해소. 헤더가 "프로젝트 생성 시 초기화"로 바뀌었고, 다른 AI 제작, 생성 전 추천, **수집이 꺼졌던 기간은 포함하지 않는다**고 명시한다 ([헤더](../../../src/dev-workflow/workbench.tsx:79)). 공백이 **언제** 있었는지 알려 주는 수집 세션 기록은 아직 없다. 권고 사항으로 유지한다.
- **Minor 9(Origin `null`):** 해소. Origin을 파싱할 수 없거나 비어 있으면 host 비교 전에 403을 반환한다 ([route](../../../src/app/api/dev/workflows/[projectId]/route.ts:20)). HTTP로 직접 호출해 보지는 않았다 [미검증].

업무 정책과 provider 요청 본문은 이번 변경에서 바뀌지 않았다. 네 파일을 읽은 범위에서 확인한 내용이다. 이 addendum 이후에도 판정은 **개발용 foundation 진행 가능, Blocker 없음**이다. 남은 Major는 없다.

## Addendum 2 — 재저장 의도 보존 수정 확인 (23:52 변경분, 최종)

2026-09-28 23:57 · 확인 범위는 아래 세 파일의 관련 부분뿐이다. 코드 수정과 전체 테스트 재실행은 하지 않았다.

| 파일(23:52:32) | SHA-256 앞 12자 |
| --- | --- |
| `src/dev-workflow/workbench.tsx` | `1986fa46afd4` |
| `src/service/trace-store.ts` | `dfde3e1e69c6` |
| `test/workflow-trace.test.ts` | `d925f8266547` |

**판정: 의도한 동작을 충족한다. 새 결함은 없다. Minor edge 2건을 기록한다.**

- **UI 요청 ID** [코드]: 요청 ID는 같은 본문을 키로 재사용되고, 저장이 성공하면 키를 지운다 ([키 생성](../../../src/dev-workflow/workbench.tsx:59), [삭제](../../../src/dev-workflow/workbench.tsx:69)).
  - 응답을 받지 못한 재시도는 같은 ID로 가서 서버에서 멱등 처리된다.
  - 저장 성공 뒤 A→B→A는 새 ID를 받는다. 서버는 평가를 내용으로 중복 제거하지 않는다. 그래서 세 번째 A가 B를 대체하는 최신 평가가 되고, 이전 평가는 이력으로 남는다.
- **서버 결론 중복 제거** [코드]: 순서는 다음과 같다.
  1. 같은 ID면 원래 결론을 그대로 돌려준다([retry](../../../src/service/trace-store.ts:141)). 증거를 다시 검증하지 않는다.
  2. 새 ID가 **직전 결론**과 verdict·note·작성자·증거 스냅샷까지 같을 때만 기존 ID를 돌려준다([직전 결론](../../../src/service/trace-store.ts:148)).

  따라서 adopt→inconclusive→adopt의 세 번째 adopt는 새 이력으로 저장된다. `BEGIN IMMEDIATE` 안에서 `at DESC, rowid DESC`로 "직전"을 정하므로 같은 밀리초의 동시 저장에서도 순서가 결정적이다.
- **회귀 테스트** [코드]: 확인한 내용은 다음과 같다([test](../../../test/workflow-trace.test.ts:152)).
  - 같은 결론을 연속으로 두 번 보내면 1건만 남는다.
  - adopt→inconclusive→adopt는 이력 3건, 최신 adopt로 남는다.
  - 이후 평가를 바꿔도 이전 adopt의 증거 스냅샷은 유지된다.
  - 평가 쪽은 같은 ID 재시도 1건, 같은 ID에 다른 내용이면 409, 새 ID면 대체가 확인된다([test](../../../test/workflow-trace.test.ts:131)).
  - 평가 A→B→A 자체는 클라이언트 키 삭제에 달려 있다. UI 로직이라 자동 테스트는 없다.
- **요청자 제공 로그** [로그 확인]:
  - `/tmp/ohf-observability-qa/trace-final.log`: tests 12, pass 12, fail 0.
  - `/tmp/ohf-observability-qa/build-final.log`: Next.js 16 production build의 "Compiled successfully"와 경로 표. error·failed 0건.
  - 두 로그의 수정 시각(23:52:39, 23:52:44)은 세 소스의 최종 수정 시각(23:52:32)보다 뒤다. 실행 시작 시각까지는 로그로 증명되지 않는다. 리뷰어가 다시 실행하지는 않았다.

**Minor edge**

1. **키 삭제 위치** [코드·정적]: 키는 저장 POST 성공 뒤, **재조회 GET까지 성공한 다음**에 지운다. 그래서 POST는 성공하고 GET만 실패한 경우 키가 남는다. 그 뒤 사용자가 B를 저장하고 다시 A를 저장하면, A가 이전 ID를 재사용한다. 서버는 이를 같은 내용의 재시도로 보고 새로 넣지 않는다. 결과적으로 최신 평가가 B로 남고, 새 A 의도가 조용히 사라진다. 권고: POST 응답이 `ok`인 직후에 키를 지운다.
2. **증거 스냅샷 순서** [코드·정적]: 증거 조회에 `ORDER BY`가 없다. 그래서 JSON 문자열 비교에 의한 중복 제거는 SQLite의 반환 순서에 의존한다. 같은 데이터라면 순서가 실무상 유지되지만, 순서가 달라지면 동일 결론이 한 번 더 저장될 뿐이다. 이력만 늘어나고 데이터가 손실되지는 않는다. 권고: `ORDER BY id`로 정렬하고 비교한다.

**최종 판정 유지:** 개발용 foundation 진행 가능. Blocker 0, Major 0. 남은 Minor는 본문 Minor 1(수집 세션 기록), 3~8과 위 edge 2건이다. 운영 활성화는 여전히 범위 밖이다.
