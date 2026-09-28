# 개발 모드 워크플로우 관찰·평가 기반

2026-09-28 · 구현 범위: 개발용 DB·수집·UI·수동 개선 검토 loop. 운영 로그 시스템 전체 또는 모든 AI 기능의 계측 완료를 뜻하지 않는다.

## 사용 방법

1. Node 22.13 이상, `DATABASE_URL`이 없는 로컬 PGlite 환경에서 기존 `dev` 스크립트를 실행하고 로그인한다. 이번 검증 환경은 Node 25.8.1이다.
2. 상단 **워크플로우 관찰실** 또는 `/dev/workflows`로 이동한다. 본인 소유의 프로젝트만 선택할 수 있다.
3. **실행 타임라인**에서 AI 입력·응답·저장 결과·사용자 선택·이미지 생성 이벤트를 확인한다. 같은 턴의 요청·응답을 연결해 볼 수 있다.
4. 영향을 확인할 지점에 평가를 남긴다. 원인이라고 의심하는 다른 지점을 `연결할 근거·전후 지점`에 지정한다.
5. 기준·후보를 지정한 뒤 **결과 비교·평가**에서 문서 미리보기와 같은 출처·항목·rubric의 점수를 비교한다.
6. 가설, 주 평가 항목, 성공 기준, 비교 조건을 적어 **개선 실험**을 등록한다. 도입 제안·도입하지 않음·판단 보류와 다음 조치를 남긴다.

실험 등록·검토는 AI 호출, 과금, 정책 적용을 실행하지 않는다. 이후 실제 개선을 구현하고 새 실행을 관찰하는 수동 loop의 기반이다. 검토 당시의 평가 ID·점수·근거를 별도로 보존하므로 나중에 평가가 수정되어도 당시 결론을 추적할 수 있다.

## 화면 구조

```text
프로젝트 선택 ─ 기록 범위 / 이벤트 수 / 평가 수 / 고객 의견 수
  ├─ 실행 타임라인
  │    검색·실행·기록종류 필터
  │    이벤트 순서 + 평가 표시 │ 선택 지점의 입력·응답·적용 결과
  │                          │ 전후 결과 미리보기·평가·연결 근거
  ├─ 결과 비교·평가
  │    기준 결과             │ 후보 결과
  │    같은 rubric·출처별 점수 차이 / 표본 수 / 개선 가설 등록
  └─ 개선 실험
       가설 → 성공 기준·통제 조건 → 검토 결론·당시 근거·후속 조치
```

기존 디자인 시스템을 재사용한다. canvas `#0a0a0b`, panel `#151719`, raised `#1a1d1f`, text `#edefef`, muted `#878e90`, accent `#d1fe17`를 새 값으로 복제하지 않고 semantic CSS token으로 참조한다. 본문·제목은 기존 workspace 서체, 실행 ID·시간은 작은 데이터용 표기를 사용한다. 핵심 시각 구조는 이벤트 순서 옆에 평가 표시를 붙이고 오른쪽 근거 패널로 연결하는 것이다. 모바일은 목록 위·근거 아래의 단일 열로 전환한다. 탭은 방향키/Home/End 이동을 지원한다.

- [데스크톱 실제 화면 — 합성 검증 데이터](evidence/desktop-timeline.png)
- [모바일 실험 검토 화면 — 합성 검증 데이터](evidence/mobile-experiment.png)
- [기준·후보 문서 비교 — 합성 검증 데이터](evidence/desktop-comparison.png)

## DB 구조와 일관성

기본 파일: `.data/workflow-traces/<project UUID>/trace.sqlite`. `WORKFLOW_TRACE_DIR`로 로컬 저장 루트를 변경할 수 있다. 업무 데이터·크레딧은 기존 PostgreSQL/PGlite를 사용한다.

| 저장소 | 내용 | 제약 |
|---|---|---|
| 업무 DB `project_trace_outbox` | 정제된 이벤트, UUID, 프로젝트, 전송 순번 | 업무 변경과 같은 transaction에서 큐에 기록, SQLite 성공 후 삭제 |
| SQLite `metadata` | 프로젝트·소유자·수집 시작·신규/기존 부분 수집 | 프로젝트당 1행, 다른 소유자의 파일 재사용 거부 |
| `events` | 실행/턴/단계/종류, 실제 시각, 수집 순번, 정제된 JSON | 이벤트 ID UNIQUE, JSON CHECK, 종류 CHECK |
| `evaluations` | 대상·연결 지점, 출처, 항목, 점수, 영향 가설, 원문, 근거, rubric, 작성자 | 이벤트 FK, 점수 1~5 또는 NULL, 이전 평가 supersedes 보존 |
| `experiments` | 기준·후보 이벤트, 가설, 항목, 성공 기준, 비교 조건 | 같은 프로젝트 내 이벤트 FK, 기준≠후보 |
| `experiment_decisions` | 검토 결론, 근거, 작성자, 시각, 당시 평가 evidence | 실험 FK, append-only 검토 이력 |

실제 migration의 단일 기준은 [trace-store.ts](../../src/service/trace-store.ts)다. `user_version=2`; 신규 생성과 v1→v2 평가 근거 컬럼 추가를 지원한다. 모든 연결에서 foreign_keys를 활성화하고 STRICT table, WAL, synchronous FULL, 짧은 busy timeout을 사용한다. 기존 [project-trace-schema.sql](project-trace-schema.sql)은 장기 설계 초안이며 **실제 실행 DDL이 아니다**.

새 프로젝트의 여섯 생성 경로에서 실제 INSERT와 함께 초기 SQLite 파일을 만든다: 일반/템플릿 프로젝트, 랜딩·상세 workflow, 카드 workflow, 릴스 workflow, outline 완료, card-agent 최종 수락. 파일 초기화 실패 시 프로젝트 생성 transaction은 성공하지 않는다. 생성 transaction이 다른 이유로 rollback되면 빈 파일이 남을 수 있으나 업무 프로젝트가 없으므로 API로 접근할 수 없다. 자동 orphan 정리는 아직 없다.

기존 프로젝트는 첫 SQLite 접근 때 `legacy_partial`로 시작한다. 과거 대화·추론을 소급 생성하지 않는다. 수집 시작 시각은 실제 첫 관측 이벤트 이전으로 조정한다.

### 전달·실패 처리

- workspace API 종료 시 사용자 소유의 큐를 요청 단위로 전달한다. 관찰실 읽기·평가 저장도 해당 프로젝트 큐를 재전달한다. 별도 상시 worker는 없다.
- 한 번의 프로젝트 drain은 최대 400건. SQLite commit 후 업무 DB 큐를 삭제한다. 삭제 전 중단되어도 이벤트 ID로 중복 제거한다. 대기 건수와 재전달 오류를 UI에 표시한다.
- 수집 순번은 SQLite에 기록된 순서다. 타임라인 표시는 관측 시각 `at`→수집 순번으로 정렬하고 직접 SQLite fallback은 배지로 구분한다. 병렬 작업의 인과 순서를 보장하지 않으며 runId/turnId와 명시적인 평가 연결을 함께 사용한다.
- 업무 transaction 안의 로그 INSERT는 savepoint로 격리한다. 로그 INSERT 실패가 전체 업무 transaction을 중단시키지 않게 하고, 가능한 경우 SQLite에 `capture_gap` 진단을 남긴다. 아직 commit되지 않은 업무 결과를 직접 투영하지 않는다.
- provider 응답 같은 관측 사실은 업무 적용 transaction 밖에서 먼저 기록한다. outbox 실패 시 이미 존재하는 프로젝트 SQLite에 직접 보존하는 fallback이 있다. 두 저장소 모두 사용할 수 없으면 관측 누락을 서버 로그에 알리며, 이미 받은 응답을 로그 문제만으로 폐기하지 않는다.
- 유료 모델 호출 전 요청 기록을 어느 저장소에도 남기지 못하면 호출을 시작하지 않는다. `unknown`은 공급자의 수신·과금·성공 여부를 추정하지 않는 상태다.
- 모델 결과를 받았어도 lease가 바뀌어 적용하지 않으면 `late_discarded`로 구분한다. 모델 응답·구조화 결과와 실제 commit된 상태는 별개 이벤트다.

## 현재 수집 범위

| 경로 | 현재 기록 | 남은 범위 |
|---|---|---|
| 신규 프로젝트 생성 6경로 | 프로젝트별 파일·스키마 초기화, 생성 이벤트 | 생성 이전 AI 호출의 예약 프로젝트/세션 연결 |
| 랜딩·제품 상세 AI 제작 | 실제 Responses 요청, 응답, 공개 reasoning 요약 반환 여부, usage/request ID/시간, 구조화 출력, commit된 단계·결정·변경 문서 | 모든 외부 호출을 포괄하는 공통 transport adapter |
| 랜딩·상세 사용자 참여 | 최초 요청/사진 참조, 방향·기획 확인, 수정·취소 등 입력과 변경 상태 | 고객용 명시적 만족도 위젯, 영역 코멘트 자체 기능의 고도화 |
| 프로젝트 연결 이미지·영상 생성 | 실제 매핑 요청, 모델·설정·slot, 내부 크레딧, 공급자 request ID, 접수 불명, 완료·실패 결과 | 모든 polling 중간 응답 원문, 외부 공급자별 실제 요금 |
| 랜딩 이미지 보드 | 후보·모델·프롬프트·비율·적용 상태와 revision | 불변 이미지 바이트 보존·완전한 이미지 복원 |
| 카드/릴스/outline text provider·추천·음성·렌더 QA | 이 단계의 상세 AI 턴은 미수집, 프로젝트 파일은 초기화 | 후속 계측 adapter와 생성 전 session registry |
| 일반 편집기 수동 저장 | AI 제작 단계의 문서 스냅샷과는 별개이며 일반 저장 이력을 전부 수집하지 않음 | manual edit/undo와 사용자 부담 지표 연결 |
| 프로젝트 없는 스튜디오 생성 | 프로젝트 trace 대상 아님 | 별도 작업/세션 관측 체계 |

Responses 도구 실행은 공급자가 실제 반환한 `*_call`/`*_result` 항목만 기록한다. 랜딩 provider가 도구를 호출하지 않는 경우 도구 기록을 만들어내지 않는다. 현재 앱의 원고 `summary`는 assistant 출력 또는 application 결과이며, 모델 reasoning으로 표시하지 않는다. 기존 요청의 모델·effort·prompt 정책을 바꾸지 않았고 reasoning summary 요청도 추가하지 않았다. 요청하지 않은 요약은 `not_requested`로 표시한다.

## 평가 데이터의 의미

고정 rubric: `workflow-quality-v1`. 항목은 의도 일치, 사실·상품 보존, 시각 품질, 이미지 적합성, 사용자 부담, 고객 만족이다. 점수는 1 매우 부족, 2 부족, 3 수용 가능, 4 좋음, 5 매우 좋음. 사용자 부담은 높을수록 부담이 적다. 미평가는 NULL이며 0점으로 집계하지 않는다.

`developer`는 개발자의 판단, `customer_report`는 개발자가 원문·출처를 함께 입력한 고객 의견이다. 후자는 고객 본인이 인증해서 제출한 이벤트와 동일하지 않다. 고객 만족은 명시적인 고객 원문 없이 저장할 수 없다. 취소, 재생성, 승인, 수정 횟수를 만족/불만족으로 자동 환산하지 않는다.

`improved/degraded/unchanged/unknown`은 평가자의 영향 가설이다. 원인 입증이나 통계적 유의성이 아니다. 현재 점수 비교의 n은 유효한 평가 기록 수이며, 고객 수가 아니다. 같은 작성자·출처·항목의 평가 변경은 이전 평가를 보존하고 최신 평가만 비교에 사용한다.

도입/거절 결론을 남기려면 양쪽 지점에 같은 항목·rubric·출처의 숫자 점수가 필요하다. 판단 보류는 근거 부족 상태에서도 기록할 수 있다. 비교 조건 일치·평가자 일치·표본 대표성·교란요인 통제는 아직 자동으로 검증하지 않는다. 통제 조건과 제한을 사람이 기록한다. 결과 하나의 점수 차이만으로 개선 정책을 자동 배포하지 않는다.

## 보관·접근 범위

UI/API/수집은 `NODE_ENV=development`의 로컬 PGlite 환경에서 활성화된다. `DATABASE_URL`이 설정된 PostgreSQL 환경에서는 개발 모드여도 수집·drain·API가 비활성화되고 페이지에는 로컬 환경 설정 안내만 표시한다. 여러 서버가 공유 PG 큐를 각자의 디스크로 가져가는 문제를 막는 범위 제한이다. 공유 PostgreSQL 지원을 위한 우회 옵션은 제공하지 않는다. 테스트는 `NODE_ENV=test`와 `WORKFLOW_TRACE_TEST=1`을 함께 사용하고 `DATABASE_URL`을 해제한다. production은 UI와 API 모두 404이며 수집도 비활성이다. 관리자 여부만으로 타인의 trace 접근을 허용하지 않는다. 기존 세션·관리자 IP 규칙과 프로젝트 소유권·삭제 상태를 확인한다. 쓰기는 같은 Origin을 요구하고 응답은 no-store다.

수집 비활성 기간을 자동 복원하거나 세션 단위로 탐지하지 않는다. UI의 신규 프로젝트 표시는 "프로젝트 생성 시 초기화"이며 전 기간의 수집 완전성을 뜻하지 않는다. 이 제한을 화면에도 표시한다.

정제한 프롬프트·대화·출력·사용자 의견은 로컬 파일에 남는다. 일반 사용자 문구의 개인정보를 완전히 익명화하는 시스템은 아니다. 알려진 자격증명 키, Authorization, JWT, URL query/userinfo, 공개 blob의 접근 URL, encrypted reasoning을 제거한다. 실제 AI 입력 이미지의 변환된 바이트는 저장하지 않고 MIME·길이·SHA-256으로 남긴다. 과도한 텍스트/배열/깊이는 누락 표시와 함께 제한한다. 정제된 기록이므로 완전한 byte replay를 보장하지 않는다.

문서 미리보기는 기록된 프로젝트를 현재 렌더러로 다시 그린다. 당시 screenshot이 아니고, 숨긴 에셋 참조는 생략되며 외부 이미지 URL은 만료될 수 있다. 아직 보존 기간·암호화 at rest·영구 삭제·archive 연계 purge·백업 스케줄은 구현하지 않았다. 개발 파일은 기본적으로 남아 있고 프로젝트 archive 후에는 API 접근이 막힌다. 운영 활성화 전에 기존 [리뷰 후속 항목](review-followups.md)의 디스크·보관·삭제·범위 결정을 마쳐야 한다.

기술 근거: [Node SQLite API](https://nodejs.org/api/sqlite.html), [SQLite WAL](https://sqlite.org/wal.html). WAL 파일은 같은 호스트의 로컬 저장소를 전제로 하며 운영 공유 디스크 적합성은 이번 작업에서 검증하지 않았다.

## 주요 코드

- [수집·outbox·transport](../../src/service/workflow-trace.ts)
- [SQLite 스키마·평가·실험 검토](../../src/service/trace-store.ts)
- [정제·개발 모드 정책](../../src/service/trace-policy.ts)
- [프로젝트 소유권 확인](../../src/service/trace-access.ts)
- [개발 API](../../src/app/api/dev/workflows/[projectId]/route.ts)
- [관찰실 UI](../../src/dev-workflow/workbench.tsx), [공유 데이터 계약](../../src/dev-workflow/types.ts), [스타일](../../src/dev-workflow/workbench.css)
- [회귀 테스트](../../test/workflow-trace.test.ts)

## 후속 개선 순서

1. 현재 정책+계측을 유지한 실제 랜딩·상세 작업 표본을 모으고, 결과를 보며 사용자 딥 인터뷰로 평가 항목·성공 기준을 보정한다.
2. 높은 비용/불만족과 연결된 가설을 우선 선정한다. 최소 입력, 조건부 확인, 이미지 계획·변경 범위·재생성 선택의 개선안을 기존 backlog에 연결한다.
3. 입력·모델·prompt/application 정책 버전을 고정한 baseline/candidate 실험 단위를 도입한다. 현재는 이벤트 쌍과 사람이 입력한 조건을 사용한다.
4. 생성 전 세션과 모든 provider 계측, 불변 이미지·렌더 증거, 명시적 고객 피드백 수집을 확대한다.
5. 고객 수/표본 구간/분모가 명확한 집계, 운영 로그 수명·접근·보관 정책을 확정한 뒤 운영 활성화를 별도 검증한다.

검증 결과와 독립 리뷰의 최종 상태는 [구현 검증 기록](dev-observability-validation.md)에 정리한다.
