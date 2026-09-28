# 우선 실험과 검증 계획

2026-09-28 · 제안만 작성 · 실행하지 않음

[도입 리뷰](adoption-review.md)의 D1~D7을 검증하는 좁은 PoC다. 아래 후보 수정 위치는 후속 구현 담당을 위한 안내이며 이번에 코드를 수정하거나 실행하지 않았다. 최종 선택은 리뷰 결과 인터뷰에서 결정한다. 모든 실험은 랜딩·제품 상세만 대상으로 한다.

## 순서와 통과 기준

먼저 P0의 수정 범위·저장·복원 계약을 검증한다. P1의 최소 질문과 P2의 배치·영역 피드백은 기존 기능 위에 연결한다. P3의 상품 이미지 편집 및 자동 적용은 원본 보존·비용 정책·복원 검증이 갖춰진 뒤 평가한다. P4는 전체 사용자 흐름의 효과를 확인한다. URL 입력은 P1에 포함하며 어려운 항목이라는 이유로 완료 범위에서 누락하지 않는다.

| 순서 | 해결할 위험·근거 | 후속 후보 위치 | 첫 실험과 합격/실패 기준 |
| --- | --- | --- | --- |
| P0 | 즉시 적용 후 연결 변경을 복원할 수 없음. snapshot은 있으나 일반 편집·완료 후 이미지 적용과 같은 이력 경로가 아님 | [landing-workflow.ts](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:26), [projects.ts](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/projects.ts:51), [use-project.ts](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/use-project.ts:16), [landing-images.ts](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-images.ts:140), [워크스페이스 API](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/app/api/workspace/[[...path]]/route.ts:164) | fixture 이미지 A→B와 연결 제목·crop 변경을 한 요청으로 저장/복원. A 바이트 해시·문구·배치 복구, 새 이력 생성, 재요청 중복 적용 0, 다른 창 변경 손실 0이면 통과. URL만 돌아오고 이미지 바이트가 다르거나 일반 저장 경로만 이력이 빠지면 실패 |
| P1 | 최소 입력이 의도·기획 승인을 강제하고, URL은 읽지 않으며 상품명 별도 필수 | [landing-model.ts](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-model.ts:15), [start/step/action](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:52), [입력 UI](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/landing-workflow-creator.tsx:90), [상품 검증](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/projects/validation.ts:153); URL 수집은 새 소규모 모듈 후보, 현재 구현으로 오해하지 않음 | 명확한 한 문장·설명+사진·읽힌 URL에서 필수 확인 0회로 초안 도달. 미제공 가격·규격은 빈 값/비노출, 가공 사실 0건. 여러 상품 사진에서 대상만 1개 짧은 질문 후 계속. URL 실패는 읽었다고 주장하지 않으며 Q3 정책에 따라 처리. 취향·누락 사양 질문, 동일 정보 재입력, 불명확 상품을 임의 선택하면 실패 |
| P2 | 영역 메모를 정확한 대상 및 배치/이미지 작업으로 연결하지 못함. 출력 크롭 문제 | [landing-preview.tsx](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/landing-preview.tsx:22), [landing-workflow-creator.tsx](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/landing-workflow-creator.tsx:112), [Slot](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/projects/types.ts:17), [ImagePlan](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/projects/landing-images.ts:3), [renderer](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/render/landing.ts:27), [제품 renderer](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/render/product-detail.ts:4) | ‘사진을 크게’ 중 배치만으로 충분한 사례는 생성 호출 0, 원본 해시 동일, 피사체 잘림·흐려짐 없음. 새 구도 필요 사례는 배치 성공으로 오판하지 않음. 영역/텍스트로 지시한 대상과 최종 변경 대상 일치, 비대상 필드 변경 0. 좌표 오류·오래된 이미지에 메모 적용·임의 재생성은 실패 |
| P3 | 상품 원본을 생성에 전달하지 않는데도 보존 기대가 있음. 모든 후보 수동 적용 | [imagePlane](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/projects/landing-images.ts:10), [stepBoardImages](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-images.ts:82), [applyLandingImages](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:249), [사진 저장](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/product-images.ts:46), [보드 UI](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/landing-image-board.tsx:47) | 원본 로고·형태·색이 있는 사진의 배경만 수정. 지원 경로의 실제 요청에서 원본 참조·필요한 마스크/합성 정보 확인, 보존 검사 후 별도 채택 클릭 없이 적용. 실패·불명확하면 기존 원본 유지, 원본 활용 대안 또는 필요한 질문. 생성 완료만으로 보존 통과, 비용 범위 초과, 원본 미전달, 검증 없이 자동 적용하면 실패 |
| P4 | 사용자 부담을 줄였으나 품질·대기·수정 비용이 나빠질 위험 | 기존 제작 화면·이미지 보드·공통 renderer의 통합 흐름 | 동일 입력의 기존 흐름과 제안 흐름을 비교. 명확한 요청에 불필요한 승인 0회, 상품 사실·외형 오류와 비대상 편집 손실 0건, 초안 후 수정·비교·복원·편집기 재진입 완료. 시간·호출·비용·품질은 실제 관측값 보고. 질문 수만 줄고 상품 오류가 늘면 실패 |

P0 통과 전에도 문서/fixture 수준의 P1·P2 설계는 가능하다. 실제 즉시 적용 출시를 복원 없이 먼저 완료로 처리하지 않는다. 이는 새 사용자 승인 관문을 추가하는 제안이 아니라 구현 검증의 의존 순서다.

## P0: 복원 충돌과 저장 경계

현재 [imageFingerprint](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/projects/landing-images.ts:18)는 title/body/kind/prompt/이미지 계획/media/job를 포함하지만 crop·kicker·CTA·글꼴·전체 배치는 포함하지 않는다. 현재 이미지 전용 적용은 이 필드를 쓰지 않으므로 이것만으로 결함을 단정하지 않는다. 그러나 연결 문구·배치를 바꾸는 새 요청에는 쓰기 대상별 기준값 검사가 추가로 필요하다. 기존의 stale 거부를 없애면 안 된다.

제안하는 검증 사례:

1. active 워크플로우에서 이미지 A→B, 같은 요청의 제목·crop 변경 후 되돌린다. 이전 에셋 실바이트·제목·crop을 비교하고 미리보기와 다운로드 HTML 모두 A를 가리키는지 확인한다.
2. 완료/편집기 인계 뒤 같은 실험을 반복한다. 현재 active snapshot에만 의존한 구현은 이 사례에서 실패해야 한다.
3. 변경 B 이후 다른 섹션의 제목 C를 수정한 뒤 B만 되돌린다. C를 자동으로 덮어쓰지 않는 안을 권고하며 이는 Q2에서 사용자에게 확정할 정책이다.
4. B 이후 **같은 제목 필드**를 D로 수정했다면 이전 값으로 강제 덮어쓰지 않고 충돌 대상을 표시한다. Q2에서 정한 선택을 적용한다. 필드가 겹치지 않아도 문구가 새 이미지의 장면을 설명하는 등 의미 의존성이 있으면 검토 대상으로 기록한다.
5. 한쪽 창 autosave 진행 중 다른 쪽에서 이미지 적용/복원을 요청한다. 기존 version 충돌 검사를 유지하고, 부분 적용·보드와 프로젝트의 불일치가 없어야 한다.
6. 파일 보관 실패·중복 요청·늦은 응답·프로젝트 삭제·에셋 누락을 fixture로 넣는다. 원본 손실 없이 실패를 알리고, 이미 제출한 유료 작업을 복원 과정에서 재호출하지 않는다.

보관 정책은 구현 전 좁은 추가 분석이 필요하다. [saveAsset](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/assets.ts:37)는 계정 보관 한도 500MB를 검사한다. 따라서 이전 버전을 무기한 보관하거나 조용히 제거하는 어느 쪽도 이번에 확정하지 않는다. 예산을 넘겼을 때 원본·복원 대상은 유지하고 새 작업을 실패시키는 계약부터 검증할 것을 제안한다. 보존 기간·정리 UX의 최종 정책은 사용량 근거 후 결정한다.

## P1: 입력·질문 시나리오

| 입력 fixture | 기대 경로 | 남겨야 할 근거 |
| --- | --- | --- |
| ‘욕실 수납 상담을 소개하고 문의받는 랜딩을 만들어 주세요’ | 스타일 질문 없이 의도·이미지 계획·초안 | 사용자가 준 사실/추론/빈 값, 필수 질문 수, 계획 이미지 수와 역할 |
| 단일 상품 사진 + ‘이 크림색 용기 상세페이지’ | 사진 분석 재사용, 없는 가격·용량·소재는 생성하지 않음 | 원본 asset ID, 실제 비전 입력 연결, 제공되지 않은 주장 목록 0 |
| 세 용기 사진 + ‘이 제품 상세페이지’ | 판매할 용기만 짧게 확인, 답 이후 재질문 없이 계속 | 선택한 객체/원본 연결, 질문 이유, 선택 전 생성이 진행되지 않은 증거 |
| 성공한 상품 URL | 출처 문구·사진을 정규화하고 원본과 추론 분리 | 요청/최종 URL, 읽기 상태, 추출 근거, 사진 소유/보관 경로 |
| 차단 URL + 상품명이 별도 설명에 있음 | Q3에 따라 가용 정보 초안 또는 짧은 대체 입력 요청 | 차단 페이지 문구를 상품 사실로 쓰지 않음, 미제공 정보 비노출 |
| URL만 있고 읽기 실패, 상품 불명 | 대상을 확인할 최소 자료 요청 | 도메인 이름만으로 상품을 꾸며내지 않음 |

모델이 반환한 임의 confidence 숫자만으로 진행시키지 않는다. 사용자 입력과 출처에 비춰 대상을 특정했는지, 사실 없는 필드를 비웠는지, 제작 가능한 이미지 경로가 있는지 검사한다. 완전 자동 사진 식별의 정확도는 실행 전 미검증이다.

## P2: 크기·영역·최종 화면

세 가지 크기를 각각 관측한다: 요청한 생성 비율/크기, 실제 반환 파일의 픽셀, 페이지에서 표시되는 크기/크롭. 현재 IMAGE_SIZES와 실제 provider 출력을 동일시하지 않는다.

영역 실험에는 360·768·1280px 화면, 미리보기 축소, iframe 스크롤, contain 여백, cover 크롭, 세로 crop 이동, 원본 EXIF 방향을 포함한다. 사용자 표시가 원본 어느 부분에 해당하는지 시각적으로 대조하고 좌표계를 기록한다. 픽셀 마스크가 없는 경로에서는 코멘트를 ‘부분 픽셀 수정’으로 표시하지 않는다.

‘대표 사진을 더 크게’, ‘하단 소품이 잘리지 않게’, ‘상품은 그대로 두고 오른쪽 배경만 밝게’, ‘제목을 이 문구로 바꿔 줘’를 구분한다. 앞의 두 요청은 원본 유지 배치 가능성, 세 번째는 원본 보존 capability, 마지막은 정확한 문구 치환과 범위 보호를 검증한다. 수정안 요약을 보여주더라도 명확한 요청의 실행을 승인 버튼으로 막지 않는다.

합격 증거는 생성 파일 단독 화면이 아니라 최종 HTML의 화면 크기별 스크린샷, 실제 이미지 크기·로드, 피사체 잘림, 문구 대응, CTA 주소, 변경 전후 프로젝트 필드 비교다. 과거 [웹페이지 품질 사례](/Users/brian/works/agent/openhigsfield/open-higgsfield/docs/agentic-quality-evaluation-20260927.md)를 fixture 선정 근거로만 쓴다.

## P3: 상품 보존·비용·적용

먼저 네트워크 없는 fake provider로 요청 매핑·파일 보관·적용/실패 상태를 확인하도록 제안한다. 실제 모델 평가는 후속으로 명시된 범위와 예산이 있을 때만 수행하며 이번 작업 권한에 포함되지 않는다.

원본 활용 배치/합성은 원본 파일 해시와 유지 영역 픽셀 검사를 남긴다. 생성형 편집에서 배경·조명이 달라지면 전체 픽셀 동일성은 합격 기준이 될 수 없다. 상품 실루엣·색·로고·표기·구성품의 전후 비교 및 사용자 평가를 별도로 기록하고, 자동 판정의 불확실성을 남긴다. 예제 수나 점수 임계값을 근거 없이 ‘보존 보장’으로 승격하지 않는다. 실패 시 원본 유지가 가능한지부터 평가한다.

Q1의 비용 정책을 받아서 모델 전환·재생성 한도·한도 초과 질문을 검증한다. 현재 서버는 전달된 credits와 새 quote를 대조한다. [generateBoardImages](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-images.ts:57). UI는 모델 편집 시에도 `i.cost`로 합계를 보내므로, 모델 비용이 다른 경우의 견적 갱신 경로를 좁게 재확인할 필요가 있다. [generate](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/landing-image-board.tsx:42). 이는 정적 의심이며 실제 가격 차이·사용자 오류 재현은 하지 않았다.

실패한 후보는 적용하지 않고 새 유료 제출 없이 보관 재시도한다. unknown 결과는 기존처럼 중복 요청을 막는다. 생성 성공→보존 판정→보관→버전 검사→즉시 적용을 구분하고 각각 결과를 기록한다. 사용자가 원할 때 같은 화면·배율로 전후 이미지와 연결 문구·배치를 비교·복원할 수 있어야 한다.

## 기록할 지표와 기존 검사 재사용

- 품질: 미제공 사실 생성 수, 상품 정체성 위반 수, 요청한 대상/변경 일치율, 최종 배치 잘림, 문구·이미지 대응, 비대상 필드 손실, 복원 해시·필드 일치.
- 부담: 초기 입력 필드 수, 필수 질문/승인 수, 재입력 횟수, 초안 도달·수정 완료 시간, 사용자 대기와 실제 모델 시간 구분.
- 실행: 텍스트/이미지 호출 수, 모델·실제 크기·원본 전달, 앱 크레딧과 측정 가능한 provider 비용 구분, 실패/재시도/unknown, 적용·복원 요청 ID.
- 사용자 평가: 원하는 변화가 이뤄졌는지, 별도 설명이나 재수정이 필요한지, 비교·복원 결과를 신뢰할 수 있는지. 질문이 적다는 이유만으로 품질 개선을 주장하지 않는다.

기존 [landing-workflow.test.ts](/Users/brian/works/agent/openhigsfield/open-higgsfield/test/landing-workflow.test.ts:30), [landing-images.test.ts](/Users/brian/works/agent/openhigsfield/open-higgsfield/test/landing-images.test.ts:42)는 승인·수동 적용·범위·동시 편집·중복 과금 방지의 이전 계약이다. 새 자동 경로를 추가하더라도 기존 보호 조건을 지우지 않고, 수동 검토 경로와 조건부 자동 경로를 구분해서 검사해야 한다. 이 문서는 테스트 코드를 추가·수정·실행한 결과가 아니다.

## 이번 문서 검증

세 결과 문서의 Markdown 링크 101개, 그중 소스 라인 참조 84개와 명시적 앵커 1개를 검사해 누락·잘못된 라인·앵커 0건을 확인했다. 리뷰에 기록한 현재 앱 핵심 소스 SHA-256 10개도 재대조해 일치했다. 종료 전 Open Design 작업 트리는 clean이며 현재 앱의 Git 상태 목록은 시작 시와 같았다. 이는 모든 미추적 파일의 변경 이력까지 감사했다는 뜻은 아니다. 이 작업의 쓰기는 review/의 세 문서로 한정했다.

제품 테스트·시각 QA·모델 품질·URL 수집·성능·비용 측정은 전부 미실행이다. 문서 검증 통과를 제품 기능·품질 검증 통과로 해석하지 않는다. 리뷰 완료 후 명시적인 후속 지시를 기다린다.
