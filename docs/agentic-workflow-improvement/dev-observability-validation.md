# 개발 관찰실 구현 검증

2026-09-28 · 격리된 로컬 검증, 유료 AI 호출 없음. 기존 사용자 프로젝트 DB·세션을 fixture로 사용하지 않았다.

## 현재 확인한 결과

| 검증 | 결과 |
|---|---|
| TypeScript `tsc --noEmit` | 통과 |
| Next.js production build | 통과, `/dev/workflows`와 개발 API는 dynamic route |
| 계측 활성 상태의 기존 제작·이미지·workspace + trace 회귀 | 82/82 통과 |
| 이후 확장한 trace 전용 회귀 | 12/12 통과 (상위 테스트 포함, 11개 시나리오) |
| 독립 리뷰 에이전트의 전체 테스트 | 157/157 통과 보고; 최종 리뷰 문서의 실행 근거 참조 |
| 프로젝트 생성 → SQLite 파일 존재 → 재오픈 | 통과 |
| 타인 소유/삭제 프로젝트 접근 | 서비스 통합 테스트 통과 |
| v1→v2 migration·FK·CHECK·integrity | 통과 |
| rollback 결과의 오기록 방지·SQLite commit 후 미ACK 재전달 | 통과, 이벤트 중복 없음 |
| outbox 장애 + SQLite fallback / 업무 transaction savepoint | 통과, provider 성공 응답 보존·누락 진단 |
| 비밀값·NUL·이미지 바이트·공개 blob 참조·긴 중첩 JSON 정제 | 통과 |
| 비정상 JSON/HTTP body·요약 미요청·공개 요약·tool·usage | 통과 |
| 평가 출처·숫자 점수·동일 저장 ID 충돌·이력 보존 | 통과 |
| 실험 결론 당시의 평가 근거 보존 | 이후 점수 변경에도 당시 근거 유지 |

회귀 실행은 `NODE_ENV=test WORKFLOW_TRACE_TEST=1 WORKFLOW_TRACE_DIR=<격리 디렉터리> node --import tsx --test`로 다음 파일을 대상으로 했다: `workflow-trace`, `landing-workflow`, `landing-images`, `workspace`, `card-agent`, `card-workflow`, `reel-workflow`. 각 업무 DB는 테스트의 `memory://` 설정을 사용했다. trace 전용 테스트는 자체 임시 SQLite 디렉터리를 만들고 정리한다.

이번 변경 전부터 존재하던 다수의 dirty/untracked 소스는 유지했다. 기존 코드와 신규 계측 코드가 함께 있는 서비스 파일은 `git diff`만으로 변경 범위가 모두 보이지 않을 수 있다. 운영 배포·커밋·push는 수행하지 않았다.

## 실제 브라우저·HTTP 검증

`ego-browser` 전용 TaskSpace, 별도 PGlite/SQLite 저장 디렉터리와 합성 프로젝트를 사용했다. fixture 데이터와 실제 고객 평가를 혼동하지 않도록 화면에 표시했다.

1. 익명 `/dev/workflows` 접근 시 로그인 화면으로 이동.
2. 로그인 후 프로젝트의 실제 SQLite 이벤트 7건 조회.
3. 후보 지점에 개발자 이미지 적합성 4점 저장. 기존 기준 2점과 비교하여 +2.0 표시. 후보 고객 만족은 평가가 없으므로 `평가 부족` 표시.
4. 비교 쌍으로 실험 생성, 도입 제안과 후속 검증 내용을 저장. 새로고침 후 실험 1개·검토 1개·당시 평가 근거 2개 재조회 확인.
5. 390×844 모바일 및 1440×1000 데스크톱에서 document scrollWidth가 viewport와 동일. 가로 overflow 없음.
6. 7건 로드 후 별도 SQLite 연결에서 검증 이벤트 150건 추가. 새로고침 시 107/157건과 `이전 기록 더 보기` 확인. 추가 로드 후 순번 1~157이 모두 존재하고 중복 0건, 누락 0건, 다음 페이지 없음 확인.
7. 방향키로 탭 이동 시 선택 탭과 키보드 focus가 함께 이동.
8. 기준·후보의 저장 문서를 각각 sandbox iframe으로 재구성하여 비교.

HTTP 검증:

- 익명 trace API: 401.
- Origin 없는 POST, 다른 Origin의 POST: 403.
- 소유자 GET: 200, `Cache-Control: private, no-store`.
- 존재하지 않는 프로젝트 GET: 404. 실제 타인 소유 ID는 서비스 통합 테스트에서 별도로 검증.
- 개발자 출처로 고객 만족 점수 저장: 400.
- 별도 production 서버의 화면·API: 모두 404. trace 디렉터리도 생성하지 않음.
- 마지막 M1 보완 후, PostgreSQL 연결이 설정된 development 서버: 설정 안내 페이지 200, trace API 404, SQLite 디렉터리 미생성. 접근할 수 없는 검증용 DB 주소를 사용해 실제 DB 연결 없이 차단됨을 확인.
- 마지막 보완 후 Origin `null`: 403, 인증된 로컬 페이지 SSR의 초기화·수집 공백 안내 문구 확인.

화면 증거는 [타임라인](evidence/desktop-timeline.png), [모바일 검토](evidence/mobile-experiment.png), [결과 비교](evidence/desktop-comparison.png)에 저장했다. 전부 합성 데이터이며 실제 생성 품질 향상을 증명하는 자료가 아니다.

두 미리보기 iframe에서 각각 `취향에 맞춰 만나는 원두`, `우리 집 커피, 나만의 취향으로` 제목을 확인했다. 브라우저·개발/production 검증 서버는 검증 후 종료했다. 코드 22개 파일의 [SHA-256 목록](evidence/source-sha256.txt)을 보관했다.

화면 캡처는 마지막 수집 범위 문구·정렬 보완 직전의 검증 화면이다. 최종 범위 안내 문구는 이후 HTTP SSR로 확인했고 최종 trace 회귀 12/12, TypeScript와 production build도 다시 통과했다.

## 리뷰 반영

Herdr `workflow-fable-review`의 기존 Opus 5.5 high 세션에 독립 리뷰를 요청했다. 아래 항목은 구현자가 반영·검증한 내용이며, 리뷰어의 최종 판정과 구분한다.

| 초기 발견 | 반영 |
|---|---|
| 100건 넘는 신규 이벤트 refresh에서 중간 페이지 누락 | cursor 병합 수정, 실제 브라우저 157건 무누락 확인 |
| 미평가·다른 출처가 실험 결론 게이트 통과 | 동일 항목·rubric·출처의 양쪽 숫자 점수 요구 |
| 로그 실패가 이미 수신한 유료 응답을 폐기 | savepoint, 직접 SQLite fallback, capture_gap, 사전 요청 기록 실패 시 호출 중단 |
| 누락된 credential key·NUL·긴 JSON·blob URL | 정제 범위 보완과 회귀 추가 |
| non-JSON HTTP 오류 body 미보존 | 정제·제한한 body로 보존 |
| 같은 저장 ID로 다른 내용 제출 시 성공 응답 | 409 충돌 처리 |
| 재전송 시 실험/검토 중복 | 미확인 재시도만 요청 ID 재사용, 성공 후 해제. 검토 내용 중복 제거는 직전 검토에 한정 |
| 평가·결론을 이전 값으로 되돌릴 때 새 의도가 사라짐 | 성공한 요청 ID 해제, 도입→보류→도입을 새 검토 이력 3건으로 보존하는 회귀 통과 |
| 나중의 평가 변경이 과거 검토 근거를 바꿈 | v2 migration으로 검토 시점 evidence 별도 보존 |
| M1: 공유 PostgreSQL 개발 서버가 같은 outbox를 서로 다른 로컬 디스크로 소비 | DATABASE_URL 설정 시 수집·drain·API 차단. 페이지는 DB 조회 전 로컬 환경 안내. 공유 PG 지원은 별도 과제로 제한 |
| fallback 이벤트의 수집 순서와 관측 순서 혼동 | 타임라인 at→seq 정렬 + SQLite 직접 기록 배지 |
| 수집 비활성 기간을 생성부터 연속 수집으로 오해 | "프로젝트 생성 시 초기화"와 비활성 기간 미포함 문구로 교정 |
| Origin `null` 처리 | 새 dev API에서는 403으로 명확히 거부 |

최종 독립 리뷰: [Opus 리뷰 문서](reviews/dev-observability-opus-review.md). 리뷰 문서에 기록된 스냅샷 이후 변경 여부를 함께 확인한다.

최종 addendum 판정은 개발용 기반 진행 가능, Blocker 0·Major 0이다. addendum 2의 Minor 두 건은 이후 구현자가 반영했다: POST 성공 응답을 받은 즉시 요청 ID를 해제하여 뒤따르는 GET 실패와 재입력 의도를 분리했고, 검토 근거 조회를 `ORDER BY e.id`로 고정했다. 이 두 수정은 독립 재리뷰 대상에는 포함되지 않는다. 최종 관련 회귀·TypeScript·build 결과는 위 검증 표를 따른다.

## 아직 증명하지 않은 것

실제 유료 모델/이미지 요청의 품질·비용 효과, 운영 PostgreSQL 장애 주입, 운영 영속 디스크·다중 호스트, 장기간 retention/대용량 부하, 모든 provider의 수집 완전성, 불변 미디어 재현, 고객 수 기반 통계 및 인과 효과는 이번 검증 범위가 아니다. 수집·화면·수동 평가 loop 기반의 동작 검증이다.
