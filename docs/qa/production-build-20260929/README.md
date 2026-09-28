# 프로덕션 빌드와 데모 계정 브라우저 QA

2026-09-29. 최신 작업(32f3289) 및 아래 저장소 접근 수정으로 실제 `pnpm build`를 수행하고, `scripts/server.mjs --production`으로 빌드된 앱을 실행했다. 실행 중인 개발 서버의 `.next`를 덮어쓰지 않도록 별도 임시 복사본과 독립 PGlite 테스트 DB를 사용했다. 기존 Cloudflare 연결과 실제 작업 데이터는 유지했다.

검증 주소는 `http://localhost:3100`, 계정은 독립 DB에 시드한 `user1`이다. 로컬 검증에만 `ALLOW_LOCAL_DATABASE=1`을 지정했으며 실제 운영용 PostgreSQL 검증은 아니다. Ego Lite TaskSpace 27에서 로그인했다. 완료 후 로그아웃, 보호 페이지 리다이렉트 확인, 브라우저 작업 공간 종료, 임시 서버 종료를 수행했다.

## 발견 및 수정

최초 빌드는 성공했지만 Node 25.8.1의 서버 측 `localStorage` 접근으로 `--localstorage-file` 경고가 발생했다. `--trace-warnings`로 `src/generation/stores/browser-storage.ts`의 접근을 재현했다. 해당 저장소와 `browserLegacy()`에 브라우저 존재 검사를 추가했다. 서버에서 Storage getter 자체가 호출되지 않는 것을 확인했다.

수정 후 재빌드 성공, 오류·경고 없음. [빌드 로그](build.log).

## 실제 브라우저 확인

- 로그인 → 프로젝트 목록, 잔여 크레딧 50.
- 랜딩페이지 무료 직접 구성 → 프로젝트 생성 → 이름 변경 → 자동 저장 → 새로고침 후 이름 유지.
- HTML ZIP 준비 및 실제 다운로드 성공, 라이브러리에 1개 결과 표시.
- ZIP 2,071,624 bytes, 4개 엔트리, CRC 검사 정상, `index.html` 존재.
- ZIP SHA-256: `40e1a0664adb461c444fe7afff4e5cd080123f32f658eac1380e6b2f4cc20ac8`.
- 상품 상세·카드뉴스·릴스 제작 화면, 계정, 도움말 정상 진입.
- 도움말 없는 검색어 0개 결과, 콘텐츠 제작 필터 6개 결과.
- 데스크톱 1440px, 모바일 390px에서 가로 넘침 없음. 화면 캡처 직접 검토.
- 수집한 `console.error`, `console.warn`, `window.error`, `unhandledrejection` 모두 0개. 확인한 Resource Timing에서 HTTP 400 이상 리소스 없음.
- 개발 관찰실 `/dev/workflows`는 프로덕션에서 예상대로 404.
- 로그아웃 후 `/projects`가 `/login`으로 이동.

[화면별 기록](browser.json) · [편집기](editor-desktop.png) · [모바일 도움말](help-mobile.png) · [모바일 상품 폼](product-mobile.png).

무료 편집·저장·내보내기 및 화면 검증이다. 유료 AI 생성, 모델 응답 품질, 장시간 생성 단계의 모션을 프로덕션에서 끝까지 실행한 검증은 아니다. 이번 테스트 DB에는 외부 공급자 키를 연결하지 않았다. 이전 모션 컴포넌트 검증은 [별도 기록](../agent-motion-20260929/README.md)에 있다.
