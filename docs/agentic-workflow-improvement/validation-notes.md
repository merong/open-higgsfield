# 문서 및 스키마 검증 기록

2026-09-28 · 구현 전 설계 검증

검증 도구: Python sqlite3 / SQLite 3.53.4. 대상 앱 드라이버·통합 검증이 아니다. 임시 디렉터리에서만 실행하고 종료 시 삭제했다.

- 임시 SQLite 파일에서 DDL 실행 및 테이블 9개 생성
- event ID 중복 거부
- 없는 run의 turn 참조 거부
- 잘못된 JSON 거부
- 동일 logical turn/attempt 중복 거부
- close/reopen 지속성, integrity/foreign-key 검사, backup API 스냅샷 읽기
- 문서 로컬 링크·소스 라인 28개 검사, 누락 0건.

미검증: 실제 앱 생성 경로, outbox 전달 및 장애 복구, 권한·민감정보 필터, provider 로그, 동시 writer, 운영 디스크·성능. SQL 파일은 초기 schema 초안이며 기존 프로젝트 DB 생성 또는 운영 migration을 수행하지 않았다.
