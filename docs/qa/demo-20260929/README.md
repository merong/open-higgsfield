# 데모 계정 Ego Lite 검증 — 2026-09-29

대상: https://openhigsfield.oootool.com/ (Cloudflare Tunnel → 로컬 개발 서버). Ego Lite TaskSpace 24에서 데모 사용자 `user1`로 수행했다. 테스트 종료 후 로그아웃하고 브라우저 작업 공간을 종료했다.

## 실제 수행 결과

| 항목 | 결과 |
| --- | --- |
| 로그인 및 프로젝트 목록 | 정상 진입 |
| 랜딩페이지 직접 구성 | 짧은 설명으로 5개 섹션 프로젝트 생성 |
| 프로젝트 이름 변경 및 자동 저장 | 저장 완료 표시 후 새로고침에서도 이름 유지 |
| HTML ZIP 내보내기 | 파일 준비 후 ‘완성된 파일 저장’ 클릭으로 실제 다운로드 완료 |
| 내 라이브러리 | 새 ZIP과 기존 이미지, 총 2개 결과 표시 |
| 워크플로우 관찰실 | 새 프로젝트의 `project.created` 이벤트 1개 확인 |
| 상품 상세·카드뉴스·릴스 제작 화면 | 진입 및 입력 화면 표시 정상 |
| 모바일 390×844 | 관찰실·상품 상세 화면의 문서 너비가 뷰포트와 동일; 입력 폼 확인 |
| 로그아웃 및 보호 페이지 | `/projects` 재진입 시 `/login`으로 이동 |

관찰한 화면에서 `window.error`, `unhandledrejection` 수집 결과는 비어 있었다. 확인 시점의 Resource Timing에서 HTTP 400 이상 응답도 관찰되지 않았다. 이 초기 검증은 `console.error`/`console.warn`을 수집하지 않았으므로 React hydration 콘솔 경고의 부재를 입증하지 않는다. 확인한 화면과 동작 범위에 대한 스모크 검증이며 전체 요청의 네트워크 감사는 아니다.

## 남긴 결과물과 근거

- [검증 프로젝트](https://openhigsfield.oootool.com/projects/fb6c5ebc-4659-4d45-babd-5466d1868c75): `QA-20260929 맑은방 상담 · 저장 확인`. 데모 계정에서 다시 확인할 수 있도록 보존했다.
- ZIP: 2,071,656 bytes, 4개 엔트리. CRC 검사 정상, `index.html` 및 `project.json` 존재, HTML에 프로젝트 이름 포함.
- ZIP SHA-256: `847175d2280836244f70bdd4bc69c0e9897cf6558538e50546f047a99e149575`.
- [모바일 관찰실](workflow-mobile.png), [모바일 상품 제작 화면](product-mobile.png), [모바일 상품 입력 폼](product-form-mobile.png), [화면별 관찰 JSON](routes.json).

다운로드 버튼은 즉시 파일을 내려받는 방식이 아니라 파일을 준비하고 저장 링크를 제공한다. 최초 자동화의 다운로드 대기가 시간 초과되어 현재 UI를 확인한 뒤 실제 저장 링크로 다운로드했다. 앱 오류로 분류하지 않았다.

## 검증 범위의 한계

유료 AI·이미지·영상 생성과 그 결과 품질, 모델 변경·재생성, 사용자 피드백의 전체 AI 턴 기록은 이번 실행에서 검증하지 않았다. 잔여 크레딧은 시작과 종료 모두 50이다. 직접 구성으로 생성했으므로 관찰실의 이벤트 확인만으로 AI 에이전틱 워크플로우 전체 기록을 입증하지 않는다. 후속 AI E2E는 [준비된 시나리오](../agentic-scenarios/README.md)에서 선택해 실행한다.

## 후속 수정: RHWP 확장 프로그램의 루트 속성 (2026-09-29)

사용자가 `/help`에서 `data-hwp-extension="rhwp"`, `data-hwp-extension-version="0.8.6"` 차이로 발생한 hydration 콘솔 경고를 제보했다. 초기 `window.error` 감시로는 이 `console.error` 경고를 포착하지 못했다.

Ego Lite TaskSpace 25에서 문서 생성 시점의 스크립트와 MutationObserver로 동일한 두 속성을 React hydration 전에 주입했다. 실제 확장 프로그램을 설치한 검증은 아니며, 제보된 DOM 변경을 재현한 것이다.

- 수정 전: 주입 성공, hydration 콘솔 경고 1개 재현. `window.error`는 0개로 초기 관찰의 사각지점도 확인했다.
- 수정: `src/app/layout.tsx`의 `<html>`에만 `suppressHydrationWarning` 추가. 루트 속성 불일치를 허용한다. 특정 RHWP 속성만 선별하는 옵션은 아니므로 향후 앱 자체의 루트 속성 변경도 별도 점검해야 한다. 본문 이하의 hydration 검사는 유지한다.
- 수정 후: 두 속성이 남아 있는 상태에서 `console.error`/`console.warn` 0개, `window.error` 0개. 도움말 관리자 필터 2개, 존재하지 않는 검색어 입력 후 0개 결과로 React 상호작용 정상 확인.
- `tsc --noEmit --incremental false` 통과. 이번 국소 수정에서는 전체 빌드를 반복하지 않았다.
- 근거: [재현 전후 기록](hydration-extension.json), [Next.js hydration 지침](https://nextjs.org/docs/messages/react-hydration-error).
