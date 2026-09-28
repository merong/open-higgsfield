# 프로젝트별 SQLite 실행 로그 설계

2026-09-28 · 구현 전 설계안 · 신규 사용자 요구 반영

## 1. 요구와 현재 상태

사용자는 프로젝트마다 AI 턴 대화·추론 관련 정보·도구 호출을 남기고, 프로젝트 생성 시 별도 SQLite 파일과 초기 DB 구조를 함께 만들기를 요청했다. 개선 전 동작의 근거를 먼저 확보하는 것이 목적이다. 이 문서는 그 구현 계약 초안이며 앱에 로깅 기능을 설치한 결과가 아니다.

현재 [db.ts](../../src/service/db.ts:56)는 운영 PostgreSQL 또는 로컬 PGlite를 쓴다. 프로젝트·에셋·과금·워크플로우 상태·버전은 여기에 남긴다. [랜딩 이벤트](../../src/service/landing-workflow.ts:20)는 70개로 제한된 진행 요약이다. [모델 응답](../../src/service/landing-model.ts:61)은 파싱된 출력 중심이고 provider 전체 관측 정보를 반환하지 않는다. JSON 상태 이력과 완전한 턴 로그는 역할이 다르다.

**권고 구조:** 기존 업무 DB는 유지하고 프로젝트별 SQLite를 실행 추적 저장소로 추가한다. 추적 데이터로 과금·프로젝트 상태의 원장을 대체하지 않는다. 업무 DB의 임시 outbox는 두 저장소 사이의 전달 실패를 복구하기 위한 수단이며 최종 프로젝트 로그는 SQLite에 조회 가능하게 보존한다.

## 2. 저장 단위와 경로

제안 경로: `${PROJECT_TRACE_ROOT}/<project-uuid>/trace.sqlite3`. 미설정 시 개발 환경의 앱 `.data/project-traces/`를 사용하고 운영은 영속 로컬 볼륨을 명시한다. 경로와 드라이버는 구현 시 환경을 확인해 확정한다.

- 디렉터리는 서버가 발급한 프로젝트 UUID로만 만든다. 제목·사용자 입력 경로를 사용하지 않는다.
- 파일 내부 `project_meta`의 project ID와 소유자를 요청의 업무 DB 프로젝트와 대조한다. 파일 경로를 아는 것만으로 조회할 수 없게 한다.
- 신규 프로젝트는 최초 외부 호출과 생성 성공 응답 전에 DB 파일·스키마·생성 이벤트를 준비한다. 첫 로그 시점의 lazy init만으로 이 요구를 충족했다고 하지 않는다.
- 기존 프로젝트는 별도 도입 작업으로 초기화하고 `coverage_start`를 기록한다. 과거 원문 응답·reasoning을 복구한 것처럼 만들지 않는다. 기존 요약을 가져오면 `imported_summary` 출처를 표시한다.
- pre-project AI 호출이 있는 구성안/구형 agent는 초기에 프로젝트 ID와 숨겨진 준비 레코드를 예약하는 설계가 필요하다. 이후 최종 ID로 갈아끼우지 않는다. 성공한 프로젝트만 목록에 노출하며 실패한 준비 기록도 운영 추적에 남긴다.
- 프로젝트가 만들어지기 전의 독립 추천 호출도 조사한다. 프로젝트에 연결될 호출은 위 준비 ID를 사용한다. 생성 프로젝트가 전혀 없는 독립 요청을 임의의 다른 프로젝트에 붙이지 않는다.

## 3. 모든 생성 경로를 공통 초기화로 연결

| 경로 | 현 코드 | 변경 필요 |
| --- | --- | --- |
| 직접/템플릿 프로젝트 저장 | [createProject](../../src/service/projects.ts:37) | 공통 provision 함수로 프로젝트 레코드와 trace 초기화 |
| 랜딩·제품 상세 AI 제작 | [startLanding](../../src/service/landing-workflow.ts:52) | 직접 INSERT 우회 제거, 최초 understand 호출 전 ready 확인 |
| 카드 workflow | [startWorkflow](../../src/service/card-workflow.ts:68) | 신규 생성과 기존 프로젝트 연결 분기 모두 확인 |
| 릴스 workflow | [startReel](../../src/service/reel-workflow.ts:60) | 신규 생성 및 에셋 연결 전에 준비 |
| 단발 구성안/quick-card | [createAiProject](../../src/service/outline.ts:92) | 현재 provider 호출 후 프로젝트 생성. 호출 전 준비 ID·DB 확보로 순서 변경 필요 |
| 구형 card-agent | [card-agent](../../src/service/card-agent.ts:45) | 현재 최종 accept 시 프로젝트 연결. 첫 턴 이전 준비 ID와 실패 보존 필요 |
| seed/import/향후 복제 | scripts·API 생성 지점 조사 | 직접 INSERT 목록을 검사해 공통 경로 누락 방지; 복제는 새 DB와 원본 출처만 연결 |

공통 함수 이름 제안은 `provisionProjectWithTrace`다. 업무 DB에서 owner+creation request ID의 멱등성을 확보하고 같은 생성 요청은 같은 프로젝트/DB로 돌아온다. 이 이름은 현재 존재하는 함수가 아니다.

## 4. 초기화와 두 저장소의 일관성

PostgreSQL/PGlite 트랜잭션과 SQLite 파일 생성은 단일 원자적 트랜잭션이 아니다. 무조건 순서대로 두 번 쓰고 성공 처리하지 않는다.

제안 생명주기:

1. 업무 DB 트랜잭션에서 UUID, 멱등 생성 키, `trace_state=initializing`, 비노출 프로젝트 준비 레코드와 초기화 작업을 기록한다. 업무 과금은 기존 예약·환불 계약을 따르며 초기화 실패로 유료 호출을 시작하지 않는다.
2. 해당 UUID 디렉터리의 SQLite를 만들고 migration을 한 트랜잭션으로 적용한다. metadata와 최초 이벤트를 멱등 기록한다. 파일만 존재하고 테이블이 없는 상태를 ready로 취급하지 않는다.
3. schema version·project ID·write probe를 확인한 후 업무 DB 상태를 `ready`로 바꾼다. 그 후 생성 성공 응답/첫 AI 턴을 허용한다.
4. 중간 종료·실패는 `initializing/failed`로 남기고 같은 키로 재시도한다. 이미 성공한 SQLite를 재사용하며 초기화 중인 프로젝트를 목록이나 모델 호출에 내보내지 않는다.
5. 복구 작업은 미완료 registry와 파일을 대조한다. 메타데이터 불일치·손상은 새 빈 파일로 덮어쓰지 않고 격리·오류 보고한다. orphan은 진행 중 여부 확인 전 삭제하지 않는다.

업무 상태 변경과 로그 이벤트를 같은 업무 DB 트랜잭션의 **outbox**로 기록한다. 최소 항목은 `event_id, project_id, run_id, producer_seq, event_type, occurred_at, schema_version, sanitized_payload, delivery_state`이며 프로젝트별 순서를 유지한다. SQLite writer는 event ID의 UNIQUE 제약으로 재전달 중복을 제거하고 event+파생 조회 테이블을 한 SQLite 트랜잭션으로 반영한 뒤 ack한다. SQLite commit 후 ack 전 종료돼도 재전달은 하나로 수렴한다. delivered payload의 정리·보존 기간은 운영 측정 후 정한다.

AI/도구 시작 이벤트는 durable outbox에 기록한 뒤 외부 작업을 호출하고, 응답 수신 이벤트는 파싱/검증 전에 비밀 제거 후 기록한다. 업무 적용 이벤트는 실제 적용 트랜잭션과 함께 기록한다. 모델 응답 수신과 프로세스 종료 사이의 미기록 구간은 완전히 없앨 수 없으므로 request ID·시작 이벤트로 `unknown/interrupted`를 식별하며 응답을 만들어내지 않는다.

SQLite 일시 장애에는 outbox가 보존하는 동안 전달을 재시도한다. 프로젝트 DB가 ready가 아니거나 outbox에 시작 이벤트조차 저장하지 못하면 새 외부 호출은 시작하지 않는다. 장애 중 이미 진행 중인 작업은 기존 결과·상태를 보호하며 재전송으로 유료 호출을 반복하지 않는다. 운영에는 outbox 적체·trace 지연·disk full·손상·마지막 전달 위치가 드러나야 한다. 장애 정책의 지연/용량 임계값은 측정 후 확정한다.

## 5. 기록 모델과 의미

초기 DDL은 [project-trace-schema.sql](project-trace-schema.sql)에 있다. 테이블 이름과 필드는 리뷰 대상이며 앱 migration에 아직 연결되지 않았다.

| 테이블 | 목적 |
| --- | --- |
| project_meta / schema_migrations | 프로젝트·소유자·생성·기록 시작·스키마 버전 |
| runs | 제작/수정/검수의 한 실행. 원래 workflow/job ID와 연결 |
| turns | 실제 모델 호출 1회와 attempt. provider/model/effort, request ID, 시간, 상태, usage, 요청·응답·검증 결과 |
| messages | 사용자 입력, 앱이 실제 보낸 system/developer/input, assistant 출력, 도구 결과, 제공자 reasoning 요약 등 순서별 내용 |
| tool_calls | 모델 도구 요청, provider 내장 도구, 앱이 실행한 이미지/렌더/검색 등. 종류를 구분하고 arguments/result·실행 시간·오류를 연결 |
| artifacts | 사진·스크린샷·결과 파일의 asset ID·해시·크기·참조. 대용량 바이너리는 기존 에셋 저장소 사용 |
| events | append-only 타임라인과 전달 중복 제거. 원인 event/사용자 action과 실행 결과 연결 |
| change_refs | 적용·복원한 업무 변경의 ID와 버전·영향 필드·에셋 참조. 업무 복원 원장 자체는 아님 |

턴은 **실제 API 시도**다. 한 사용자 요청은 여러 run/turn/tool을 만들 수 있다. 재시도는 새 turn ID와 같은 logical turn key/증가한 attempt를 가진다. UI 메시지 한 줄을 임의로 한 턴으로 만들지 않는다. 클라이언트의 클릭은 user action ID를 갖고, event/turn/job/change ID로 인과관계를 연결한다.

기록할 내용:

- 사용자가 입력한 원문과 영역 코멘트·질문 답변, 해당 프로젝트/asset의 기준 버전.
- 실제 전송한 지시·입력·모델 설정·도구 정의·응답 스키마와 prompt version/hash. 보낸 맥락을 재구성할 수 있어야 한다.
- 응답의 공개 출력과 파싱 전 텍스트, provider response/request ID, completion/refusal/incomplete, usage와 오류 분류. 비정상 JSON도 파싱 실패 전에 보관한다.
- provider가 반환한 reasoning summary·reasoning usage·effort. 반환하지 않으면 unavailable/not_returned로 표기한다. 숨겨진 사고 원문이나 암호화된 reasoning 블록의 해독·추정은 하지 않는다.
- 앱의 라우팅·질문 필요성·원본 보존·검수 결정은 별도 `decision_summary`와 근거 ID로 기록한다. 모델 reasoning과 혼동하지 않는다.
- 도구 arguments/result는 관측한 값만 기록한다. provider 내부 검색은 제공된 call ID·query·sources·status 범위만 남기며 내부 실행 전체를 본 것처럼 쓰지 않는다.
- provider 비용과 앱 크레딧은 별도 필드/ledger 참조다. 가격표 기반 추정은 estimated, 청구 확인값은 measured로 구분하고 미측정 비용은 0 대신 null이다.
- 시작·완료·사용자 대기·재시도·취소·unknown·검증 거부·stale 결과 폐기·적용·복원·환불을 구분한다.

## 6. 계측 지점

모델 통신을 한 번에 새 프레임워크로 교체하지 않는다. `TraceContext(projectId, runId, actionId, stage, attempt)`를 전달하는 공통 wrapper로 먼저 요청/응답/오류를 기록하고 기존 파싱·보호·과금 처리는 유지한다.

- 랜딩/상세: `landing-model.ts`, `landing-workflow.ts`, `landing-images.ts`.
- 카드/릴스: `workflow-model.ts`, `reel-model.ts`, `card-agent-provider.ts`, 해당 workflow action/step.
- 도구: `generation.ts` 제출·폴링·unknown, 이미지 보관/적용, 검색 output, 렌더·시각 검수 경계.
- 단발/보조 AI: `outline.ts`, `openai-outline.ts`, `product-recommendation.ts`, `landing-recommendation.ts`, `typography.ts`, `workflow-quality.ts` 등을 호출 목록에 넣고 프로젝트 연결 여부를 표시한다. 누락을 지원 완료로 감추지 않는다.
- 공통 생성, 사용자 action, 수동 편집, 최종 적용/복원/프로젝트 archive 지점도 기록한다. UI 최근 이벤트 제한과 독립적으로 보존한다.

## 7. 보관·접근·운영 제약

로그에는 사용자 원문과 프롬프트가 있으므로 서버 측 프로젝트 소유권 또는 명시적 관리자 권한으로 조회한다. API 키·Authorization·쿠키·서명 URL 쿼리·credential 필드는 저장 전에 제거한다. 이미지 data URL/base64는 asset ID·해시로 바꾸되 실제 입력 연결을 유지한다. 삭제·마스킹·크기 제한은 redaction/truncated 사유를 남긴다. 실패 응답에서도 같은 처리를 한다.

큰 텍스트도 조용히 버리지 않는다. 상한 초과 시 분할/외부 payload 파일과 해시를 사용하는 정책을 정하고, SQLite에는 수집 완료 여부를 남긴다. 외부 payload 및 원본 에셋이 없어져 재현할 수 없을 때도 명시한다. 사용자 화면의 간결한 진행 상태와 개발·관리용 trace UI는 구분한다.

프로젝트 archive는 로그의 즉시 물리 삭제가 아니다. 영구 삭제 시 registry·outbox·DB와 WAL/SHM·payload·에셋 참조를 연동하고, 보존 기간/용량은 사용자 정책과 운영 측정 후 결정한다. trace DB 내보내기도 인증된 일관된 스냅샷으로 수행한다.

SQLite WAL은 같은 호스트의 로컬 파일을 쓰는 구조를 전제로 한다. 네트워크 파일시스템·여러 호스트에서 동일 프로젝트 DB를 임의 공유하지 않는다. 다중 인스턴스 운영이면 프로젝트별 writer 소유권과 라우팅이 먼저 필요하다. 짧은 쓰기 트랜잭션, 한 프로젝트의 직렬 writer, bounded connection cache, checkpoint·busy/backpressure 지표를 둔다. WAL을 켰다고 다중 writer 문제가 사라지는 것은 아니다. [SQLite WAL 공식 문서](https://sqlite.org/wal.html)

live DB 파일 하나만 복사해서 백업 완료로 처리하지 않는다. 드라이버가 제공하는 일관된 backup API 또는 적절한 스냅샷 절차로 복사하고 복구 테스트를 한다. [SQLite Backup 공식 문서](https://sqlite.org/backup.html)

SQLite driver와 Node 버전, 영속 디스크 배포 형태는 구현 전 확인 항목이다. 현재 package.json의 Node 타입 버전만으로 런타임 SQLite 지원을 단정하지 않는다. 구체적인 pragma·busy timeout·보존 수치는 실험 없이 성능 해결책으로 고정하지 않는다.

## 8. 합격 조건

1. 신규 생성 경로 전부에서 성공 반환 전 trace 파일·스키마·metadata·project.created 이벤트 확인. 첫 모델 호출 실패도 기록되며 준비 ID로 찾을 수 있다.
2. 같은 생성 키 재요청과 동시 초기화에서 프로젝트/DB 하나만 생성. 생성 각 단계에서 종료 후 정상 복구하며 실패 프로젝트가 성공 목록에 노출되지 않음.
3. 실제 사용자 메시지→모델 요청→응답→도구→검증→적용 관계를 ID로 조회. reasoning 미지원·부분 도구 관측·미측정 비용을 사실대로 표시.
4. malformed JSON, refusal, HTTP 오류, timeout, cancel, 늦은 응답, stale 버전, unknown generation을 별도 기록. 같은 요청 재시도는 별도 attempt이며 중복 외부 실행을 유발하지 않음.
5. outbox→SQLite commit 후 ack 전 종료를 재현해 이벤트·조회 테이블 중복 0. 적용된 업무 변경은 전달 지연 후 대응 이벤트로 수렴.
6. trace 쓰기 실패 시 durable outbox 상태 또는 기록 불가 상태가 드러남. 단순 console.warn 후 성공으로 감추지 않음. 지속 불가 때 새 외부 작업 시작 차단.
7. 프로젝트 A/B 접근·파일 경로 조작·내보내기 권한 검사. 비밀 값·base64가 DB/outbox/error 로그에 남지 않음.
8. 70개 이상의 랜딩 이벤트 뒤에도 초기 턴을 조회. 기존 프로젝트는 도입 시점 전 공백을 표시. archive/복구/영구삭제와 에셋 참조를 검증.
9. UI 최근 상태와 trace가 구분되고, 질문 횟수·사용자 대기/AI 실행 시간·성공률·호출/재생성·토큰·크레딧을 계산할 수 있음.
10. 지속성·백업·동시 접근·파일 핸들·디스크 용량을 실제 대상 환경에서 검증. 이 문서의 DDL 문법 검사만으로 앱 통합 완료를 주장하지 않음.
