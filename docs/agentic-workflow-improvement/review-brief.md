# Opus 5.5 high 개선안 리뷰 지시

2026-09-28 · 사용자 요청 표기: opus 5.5 fable high
Herdr agent: workflow-fable-review / pane wJ:p4
실행: claude --model opus --effort high --permission-mode acceptEdits
확인: 터미널 Opus 5.5 with high effort, 응답 모델 ID claude-opus-5-5. CLI 표기와 실제 모델 ID를 그대로 기록하며 별도 모델 ID를 추측하지 않는다.

## 담당과 소유권

사용자가 기존 Open Design 도입 리뷰를 바탕으로 개선 항목을 작성하고 이 모델에게 리뷰하도록 요청했다. 추가 요구는 프로젝트별 SQLite 실행 로그와 프로젝트 생성 시 초기 DB 준비다. 본인은 구현 전 독립 설계 리뷰 담당이다.

입력: 이 디렉터리의 README.md, improvement-backlog.md, project-trace-design.md, project-trace-schema.sql. 기존 근거는 루트 docs/reference/open-design/review/의 3개 문서와 interview-log.md, 현재 앱 소스다. 적용되는 AGENTS.md/CLAUDE.md를 읽고 현재 작업 트리를 기준으로 검토한다.

쓰기 소유권은 이 디렉터리의 reviews/opus-5.5-high-review.md 하나다. 다른 에이전트와 공유하므로 기존 코드·문서·변경을 되돌리거나 덮어쓰지 않는다. 추가 에이전트 생성, 제품 구현, 설치, 서비스 실행, 유료 모델 호출, 커밋·푸시·배포는 하지 않는다. 로컬 임시 DB를 쓰는 비파괴 DDL 확인은 필요하면 가능하다.

## 리뷰 질문

1. 기존 제작기·이미지 보드·상태/검수 보호를 재사용하는 개선 항목이 사용자 인터뷰에 맞는가? 순서와 의존성이 실제 구현 가능한가?
2. 프로젝트 초기화가 직접 생성, 랜딩/상세, 카드/릴스, 단발 구성안, 최종 저장 시점이 늦은 구형 agent, seed/import 및 생성 전 추천 호출을 놓치지 않는가?
3. 프로젝트별 SQLite를 추가하면서 기존 PostgreSQL/PGlite와 dual write·초기화 실패·재시작·중복 생성·중복 과금·outbox 전달 실패를 제대로 처리하는가? 불필요한 복잡성이 있으면 구체적인 대안을 제시하라.
4. schema의 run/turn/attempt/message/tool/event/asset/change 연결과 idempotency, 순서, JSON/참조 제약, migration·백업·삭제·멀티프로세스가 충분한가?
5. 실제 전송한 프롬프트·원문 응답·오류·usage·공개 reasoning 요약·tool 호출을 잃지 않고 기록하는가? provider가 주지 않는 내부 사고나 내부 tool 상세를 관측했다고 가정하지 않는가?
6. 로그 기록이 실패했을 때 이미 진행 중인 provider 작업·기존 사용자 작업을 보호하면서 누락을 가시화하는가? 응답 파싱 전 오류 원문, cancelled/stale/unknown, 상태 적용과 로그 수렴을 확인하라.
7. 원본 사진·프로젝트 정보의 접근 제어, 비밀/서명 URL/base64 제거, 로그 접근자, 보관/복원 가능성, trace 기록과 업무 복원 원장의 분리가 맞는가?
8. 개선 전 기준선을 남길 최소 구현과 이후 확대 범위를 제안하라. 사용자 정책 미정을 기술 판단으로 임의 확정하지 말라.

## 산출물

한국어로 결론(진행 가능/수정 후 진행/보류), severity별 구체적 발견과 근거 파일·라인, 수정 권고, 권고 구현 순서, 여전히 사용자 판단이 필요한 질문을 작성한다. 현재 코드에 존재하는 것과 문서 제안·정적 추론·실행 미검증을 구분한다. blockers가 없으면 없다고 명시한다. 마지막에 문서 링크와 소스 경로 검증 결과를 기록한다.

완료 보고 후 대기한다. 본인이 추가 인터뷰를 직접 시작하지 않는다.
