# 상품 상세 사진 기반 자동 생성 QA

2026-09-29. 사용자 선택인 **초안 완성 후 한 번 클릭**을 구현하고 검증했다.

## 빌드·서비스 테스트

- `pnpm exec tsc --noEmit` 통과.
- [프로덕션 빌드](build.log) 성공. 실행 중인 개발 서버의 `.next`를 변경하지 않도록 별도 체크아웃 복사본에서 빌드했다. 임시 복사본의 불완전한 의존성을 lockfile 기준으로 다시 설치한 후 성공했다.
- 독립 메모리 DB에서 서비스 테스트 **41/41 통과**. [테스트 로그](tests.log).
- 명령: `env -u DATABASE_URL NODE_ENV=test LOCAL_DATABASE_DIR=memory:// node --import tsx --test test/product-auto-images.test.ts test/landing-images.test.ts test/product-images.test.ts test/product-detail.test.ts test/landing-workflow.test.ts test/admin-provider.test.ts`.
- 사진·초안·이미지 수·총액·잔액 검증, 사용자 소유권, 섹션별 참조 ID/비율, 원본 파일·적용 전 페이지 보존, 중복 접수 차단, 업로드 실패 무과금, 단가 변경 차단, 재생성 시 참조 유지, 기존 미적용 후보 보호를 검증했다.
- 관리자가 저장한 공급자 키를 참조 업로드 후 생성 작업에도 보존하고 같은 키로 상태 조회하는 테스트를 포함했다.

## Ego Lite 실제 화면

프로덕션 앱을 독립 DB와 `http://localhost:3100`에서 실행하고 `user1` 계정으로 로그인했다. TaskSpace 28. 완료 후 작업 공간과 임시 서버를 종료했다. 기존 개발 서버와 Cloudflare 터널은 유지했다.

- 사진 두 장과 이미지 섹션 두 개(1:1, 16:9)를 가진 완성 초안을 테스트 서비스 응답으로 준비했다.
- 초안을 열었을 때 생성 요청 0건. 버튼 옆에 `2장 × 4 = 8 크레딧` 표시.
- ‘섹션 이미지 자동 생성’ 한 번 클릭 → 후보 두 장 생성. 모달에서 생성 중·대기 상태 표시 확인.
- 새로고침 이후 큐/후보 복원 확인. 공급자 접수는 총 2건이며 이미지마다 다른 `image_urls`와 승인한 비율이 전달됐다.
- 적용 전 프로젝트 JSON은 클릭 전과 완전히 동일했다.
- 모바일에서 ‘확인하고 2장 적용’ 클릭 → 후보로 교체, 재접속 후 적용 상태 유지.
- 테스트 잔액은 199 → 191. 새로고침이나 결과 확인·적용으로 추가 차감되지 않았다.
- 콘솔 error/warn, window error/unhandled rejection 0개. 수집한 Resource Timing의 HTTP 400 이상 응답 0개.
- 1440px 데스크톱 및 390px 모바일 화면 직접 검토. 모바일 문서 폭 390px, 모달 폭/스크롤 폭 358px로 가로 넘침 없음.

[검증 수치](browser.json) · [생성 전](desktop-before.png) · [생성 진행](desktop-generating.png) · [후보](desktop-candidates.png) · [모바일 검수](mobile-review.png) · [적용 후](mobile-applied.png).

## 검증 범위

공급자 업로드·생성·상태 응답과 생성 파일 다운로드만 임시 서버의 fetch fixture로 대체했다. 실제 로그인, 워크플로우 API, DB 큐·리스·결제 기록, 플랫폼 입력 매핑, 파일 보관, 브라우저 폴링, 검수·적용·복원은 앱 코드를 실행했다. fixture는 외부 fetch를 차단하며 저장소의 제품 코드에는 포함하지 않았다.

색상 블록 이미지는 테스트 fixture다. 실사진을 사용한 유료 모델 생성, 상품 외형 일치, 장면별 미적 품질은 이번 검증 범위에 포함하지 않는다. 이미지 모델 연결 계약은 공식 API 명세를 확인했으며, 실제 계정의 모델 접근 권한·생성 품질은 실사용에서 별도 확인이 필요하다.
