# 에이전틱 워크플로우 개선안

2026-09-28 · 상태: 개선안·Opus 5.5 high 설계 리뷰 이후, **개발용 관찰·평가 DB/UI 기반을 구현**했다. 실제 수집 범위와 남은 운영·provider 계측 범위는 아래 구현 문서를 따른다.

목표는 기존 제작기의 기능을 활용해 랜딩·제품 상세페이지 품질을 높이고, 개선 전후를 프로젝트별 실행 기록으로 비교할 수 있게 하는 것이다. 개발 모드의 기록·평가 기반이 추가되었으며, 실제 유료 모델 실행을 통한 품질 향상이나 운영 로그 배포는 아직 검증하지 않았다.

## 문서

- [랜딩·상세 사용자 참여 테스트 시나리오 10개](../qa/agentic-scenarios/README.md): 선택 가능한 입력·피드백·평가 기준과 실행 기록 양식.
- [개발용 관찰실 구현·DB/UI 구조·사용법](dev-observability.md)
- [구현 검증·리뷰 반영 상태](dev-observability-validation.md)
- [Opus 개발 관찰실 독립 리뷰](reviews/dev-observability-opus-review.md)
- [리뷰 반영 작업 목록 — 먼저 읽기](review-followups.md): 초안보다 우선하는 구현 전 보완·의사결정 목록.
- [Opus 5.5 high 독립 리뷰](reviews/opus-5.5-high-review.md)
- [개선 항목과 순서](improvement-backlog.md)
- [프로젝트별 SQLite 실행 로그 설계](project-trace-design.md)
- [프로젝트 DB 초기 스키마 초안](project-trace-schema.sql)
- [리뷰 지시서](review-brief.md)
- [문서·초기 스키마 검증 기록](validation-notes.md)
- [검토 기준 소스 해시](source-snapshot.md)

## 입력 근거

- [Open Design 도입 리뷰](../reference/open-design/review/adoption-review.md)
- [기존 검증 계획](../reference/open-design/review/validation-plan.md)
- [사용자 인터뷰 결정](../reference/open-design/interview-log.md)
- [독립 디자인 워크플로우 참고서](../reference/open-design/design-participation-reference.md)

사용자 추가 요구: 프로젝트별 AI 턴·대화·추론 관련 정보·도구 실행 내역을 기록하고, 프로젝트 생성 시 프로젝트별 SQLite 파일과 초기 구조를 생성한다. 이 요구를 선행 개선 W00으로 둔다. 업무 데이터·크레딧 원장은 기존 PostgreSQL/PGlite를 유지하고 프로젝트 SQLite는 실행 추적을 담당하는 안이다.

추론 기록은 제공자가 반환하는 공개 가능한 reasoning 요약·사용량·effort와 애플리케이션의 결정 근거를 구분한다. 제공되지 않는 비공개 내부 사고 원문은 수집하거나 만들어내지 않는다. 단순 단계 요약을 실제 모델 reasoning이라고 표시하지 않는다.

## 이번 검토에서 확정할 것

기존 기능 재사용 범위, W00의 생명주기·초기화 누락·업무 DB와 로그 DB의 일관성, 공통 턴/도구 기록 계약, 이후 품질 개선 순서와 합격 기준을 검토한다. 비용 한도·복원 충돌 등의 사용자 정책은 기존 미정 상태를 유지한다.

## 리뷰 결과

독립 리뷰는 전달 주체·순서(B1), reasoning 요청/반환 상태(B2), 운영 영속 디스크 확인(B3)을 우선 항목으로 지적했다. B3은 운영 활성화 조건이며 로컬 PoC 자체를 막지 않는다. 생성 전 호출의 예약 ID, API 요청 키 수명, 원문 수집 transport, schema/migration, 실제 이미지 입력 보관을 추가 보완해야 한다. 후속 문서의 작업 목록은 수정 계획이며 해결·재검증 완료를 뜻하지 않는다.

실제 리뷰 실행은 Herdr `workflow-fable-review`의 `claude-opus-5-5` / high로 확인했다. 사용자의 요청 표기 중 Fable을 이 모델 ID와 동일한 것으로 단정하지 않는다.
