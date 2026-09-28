# Open Design 도입 리뷰

2026-09-28 · 별도 도입 리뷰 · 정적 검토 완료

권고: 기존 랜딩·제품 상세 제작기를 유지하고 **조건부 질문, 영역 맥락, 수정 단위 복원**을 연결한다. 이미지 기획기·이미지 보드·원고 검수기를 새로 이식할 필요는 없다. Open Design의 기본 discovery, 고정 랜딩 템플릿, HTML 버전 복원만으로 현재 요구를 충족하지는 못한다.

## 기준과 증거 수준

- 기준 결정: [리뷰 지시서](../review-brief.md), [인터뷰 1~9](../interview-log.md). [분석 README](../README.md), [참여 흐름](../participation-workflow.md), [참고 카탈로그](../reference-catalog.md), [발견과 질문](../findings-and-questions.md), [분석 지시서](../agent-brief.md)를 읽었다. 과거 질문 Q1~Q4는 인터뷰 6~9로 갱신됐으므로 그대로 재질문하지 않는다.
- Open Design: `/Users/brian/works/github/open-design`, `main`, HEAD `56d51b8c99849eccc0bb247dc99ef43a83938da1`, 검토 시 clean. 로컬 코드가 이번 판단 기준이며 upstream 최신성·원격 출처는 재조회하지 않았다.
- 현재 앱: `/Users/brian/works/agent/openhigsfield/open-higgsfield`, `main`, HEAD `b16a0efe4d7e2707b56f8ccb02387fd2a9d2eddf`. `src/service/`, `src/projects/`, `src/editors/`, `src/render/`, `test/` 등 미추적 작업과 추적 파일 변경이 다수 있다. **커밋이 아닌 현재 작업 트리**를 비교했다. 아래 핵심 파일 해시로 관찰 버전을 보완한다.
- 사실 = 직접 읽은 코드·테스트 소스. 추론 = 그 계약에서 예상되는 영향. 제안 = 후속 구현·실험 후보. 미확인 = 이번 경로에서 근거가 없거나 실행 검증하지 않은 사항. 저장소 전체에 기능이 절대 없다는 뜻은 아니다.
- 서비스·브라우저·테스트·빌드·모델·외부 URL 수집을 실행하지 않았다. 파일·링크 검사는 문서 검증이다. 과거 QA 결과는 당시 관찰 기록이며 현재 재현 결과가 아니다.

## 확정 원칙과 초기안

설명+사진 / 상품·서비스 URL / 요청 한 문장 중 하나로 시작한다. 스타일·색상·배치는 AI가 정하며 의도·기획·대표 시안 승인을 필수 관문으로 만들지 않는다. 미제공 가격·규격은 제외하고 판매 대상이 모호할 때만 대상을 짧게 묻는다. 여기서 판매 대상은 구매 고객층보다 **무엇을 판매·소개하는지**의 식별을 우선 뜻하며, 고객층 필드를 새 필수 질문으로 바꾸지 않는다.

명확한 수정은 바로 실행한다. 이미지 크기는 의도·품질을 충족하는 최소 변경으로 해결하며 잘림·흐려짐을 성공으로 처리하지 않는다. 상품 색상·형태·로고는 기본 보존하고, 어려우면 원본 활용 배경 교체·합성을 검토한다. 상품 자체 변경이 필요할 때만 묻는다.

인터뷰 9의 **즉시 적용 + 선택적 비교·되돌리기 + 연결 문구·배치 복원**은 채택된 초기안이다. 다음의 복원·검증 제안은 이를 실현하기 위한 검토안이지 이후 독립 수정 보호 정책·보존 기간까지 확정됐다는 뜻이 아니다. 즉시 적용은 요청·범위·검증을 통과한 결과를 별도 채택 클릭 없이 반영하는 것이며, 생성 API 성공을 상품 보존 성공으로 취급하는 뜻이 아니다.

## 현재 앱: 충족한 기능과 부족한 연결

| 항목 | 직접 확인한 기존 기능 | 부족한 연결·영향 |
| --- | --- | --- |
| 최소 입력·사진 해석 | `startLanding`이 메모와 소유권 검증된 사진 ID를 받는다. 랜딩은 사진만으로도 시작 가능하며 분석용 실제 이미지 바이트를 각 모델 단계에 전달한다. [입력](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:52), [비전](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-model.ts:48), [사진 처리](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/product-images.ts:46) | 제품 상세는 별도 상품명과 2자 이상 설명이 필요하다. 한 문장에서 상품명·사실을 구조화하는 공통 입력 변환은 없다. 사진 분석 자체를 새로 만들 필요는 없다. [상품명 검증](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/projects/validation.ts:153) |
| URL 입력 | 원문에 URL을 적을 수 있다. CTA 링크 검증은 존재한다. | 모델 지시에 외부 URL을 읽지 않는다고 명시한다. URL 수집·상품 사실 추출과 CTA 주소 저장은 다르다. URL만으로 제작하려면 별도 읽기 결과와 출처 계약이 필요하다. [현재 모델 요청](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-model.ts:41) |
| 의도·질문 | `explicit`으로 사용자 언급과 제안을 일부 구분하고 방문자·문제·가치·목표를 구조화한다. | understand와 plan 후 무조건 `waiting_user`, `confirm_intent`와 `confirm_plan`을 거쳐야 한다. 판매 대상 불확실성을 짧은 질문으로 반환하는 구조화 결과는 없다. [상태 전이](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:147), [승인 처리](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:213), [UI](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/landing-workflow-creator.tsx:104) |
| 이미지 수량·내용·비율 | 3~8개 섹션별 `enabled/ratio/description`, 사진 `sourceImageId`, 장면 prompt가 저장된다. 필요 이미지 수는 enabled의 합이며 원본·새 이미지 수도 표시한다. [기획 스키마·지시](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-model.ts:17), [기획 검증](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:94), [기획 UI](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/landing-workflow-creator.tsx:138) | 범용 기획이 이미 있다. 다만 한 섹션 한 이미지 중심이며 생성 픽셀·페이지 표시 크기·피사체 안전 영역을 구분하지 않는다. 더 많은 이미지가 더 좋은 결과라는 근거는 없다. |
| 이미지 생성·후보 | 이미지별 모델·prompt, 빈 이미지 일괄 생성, 선택 재생성, 파일 보관, idempotency, 실패·unknown 분기, 수동 적용, stale 후보 거부가 있다. [보드 서비스](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-images.ts:57), [보드 UI](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/landing-image-board.tsx:42) | 원하는 변화의 자연어를 모델·크기·원본 활용·배치 변경으로 분류하는 연결이 없다. 매번 모델/prompt 편집과 ‘확인하고 적용’이 노출된다. 비용·모델 선택 정책은 미정이다. |
| 문구 수정·보호 | `revise → patch → review`로 한 섹션을 바로 변경하고 재검수한다. ID·개수·순서를 검증하며 다른 섹션, media, imagePlan, CTA는 보존한다. [적용](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:111), [수정 진입](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:227) | `feedback + targetId`만 전달하고 이미지 좌표/영역/원본 버전은 없다. patch가 prompt를 바꿀 수 있어도 이미지 재생성 호출로 이어지지 않는다. 선택 섹션 본문 안의 확정 문구 보존은 프롬프트 중심이며 필드 단위 불변 검사와 다르다. |
| 이미지 크기·미리보기 | 비율별 placeholder, 세로 `crop`, 같은 HTML renderer를 쓰는 미리보기·출력이 있다. 제품 hero는 `contain`을 쓴다. [renderer](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/render/landing.ts:27), [제품 스타일](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/render/product-detail.ts:4), [미리보기](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/landing-preview.tsx:22) | `IMAGE_SIZES`는 표시/placeholder 목표치이고 `imagePlane`은 ratio만 전달한다. 실제 생성 해상도 보장이 아니다. 가로 위치·안전 영역·반응형별 표현이 없고 일반 사진은 cover·최대 높이 제한을 쓴다. 이미지 파일만 검수하면 최종 잘림을 놓칠 수 있다. [이미지 계약](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/projects/landing-images.ts:3) |
| 상품 외형 | 업로드 원본을 별도 에셋으로 저장하고 선택 원본을 그대로 배치한다. 원고 수정은 media를 유지한다. | 페이지 보드의 `imagePlane`은 `media: {}`다. 분석에 사진을 보낸 사실을 생성 모델 참조로 오해하면 안 된다. 텍스트 기반 새 생성으로 상품 외형을 보장할 수 없다. 마스크·상품 보존 검증은 이 경로에서 미확인이다. [생성 요청](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/projects/landing-images.ts:10) |
| 이력·복원 | 변경 시 `project/intent/plan`을 `landing_workflow_versions`에 저장한다. 원본·생성 파일은 새 UUID 에셋으로 보관한다. 동시 편집은 프로젝트 version 비교로 거부한다. [스냅샷](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:26), [에셋](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/assets.ts:18) | 랜딩 API와 action에는 버전 조회/restore 경로가 없다. 일반 편집 저장과 완료된 워크플로우의 이미지 적용은 같은 이력 기록을 거치지 않는다. 후보는 이미지당 현재 한 개이며 과거 이미지·연결 변경·이후 독립 수정의 관계가 없다. [API](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/app/api/workspace/[[...path]]/route.ts:164), [일반 저장](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/projects.ts:51), [이미지 적용](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:249) |

‘바로 제작’ 부재의 범위: `NewProject`의 ‘직접 구성하기’에는 랜딩용 단발 AI 구성안 선택도 있다. 그러나 사진·최소 질문·이미지 계획을 연결한 기존 ‘AI와 함께 제작’의 승인 생략 경로는 아니며 제품 상세에는 해당 단발 AI 선택이 없다. 별도 빠른 제작기를 추가하면 중복된다. [진입 분기](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/editors/new-project.tsx:86)

## Open Design 주요 주장 교차 확인

| 1차 분석의 주장 | 직접 대조한 코드 | 독립 판정·적용 경계 |
| --- | --- | --- |
| discovery는 기본 질문, 바로 제작 예외 존재 | [discovery.ts:42](/Users/brian/works/github/open-design/apps/daemon/src/prompts/discovery.ts:42), [예외:148](/Users/brian/works/github/open-design/apps/daemon/src/prompts/discovery.ts:148) | 동의. 풍부한 입력에도 기본 질문을 요구하므로 그대로 도입하면 확정 원칙에 어긋난다. 질문 생략 전략만 차용한다. 모델이 규칙을 지킬지는 미검증. |
| 슬롯 계획을 실제 생성 크기로 연결 | [imagegen.ts:201](/Users/brian/works/github/open-design/design-templates/open-design-landing/scripts/imagegen.ts:201), [생성 루프:290](/Users/brian/works/github/open-design/design-templates/open-design-landing/scripts/imagegen.ts:290) | 동의. width/height가 `image_size`에 들어간다. 다만 고정 템플릿이며 force는 같은 파일을 덮어쓴다. 현재 앱의 가변 계획을 이 템플릿으로 교체할 이유는 없다. |
| URL 브랜드 추출·실패 신호 | [prefetch.ts:53](/Users/brian/works/github/open-design/apps/daemon/src/brands/prefetch.ts:53), [실행:750](/Users/brian/works/github/open-design/apps/daemon/src/brands/prefetch.ts:750) | 동의. `thin/blocked/finalUrl/materialMd` 분리는 참고 가치가 있다. 색·폰트·로고 중심이며 상품 가격·규격의 검증된 추출기로 사용할 근거는 없다. |
| 영역 맥락을 수정 실행에 전달 | [타깃 계약](/Users/brian/works/github/open-design/packages/contracts/src/api/comments.ts:56), [정규화](/Users/brian/works/github/open-design/apps/daemon/src/runtimes/chat-prompt-inputs.ts:477), [프롬프트](/Users/brian/works/github/open-design/apps/daemon/src/runtimes/chat-prompt-inputs.ts:540) | 동의. selector·위치·현재 문구·스타일·메모의 묶음은 유용하다. hard scope 문장은 변경 결과를 검사하는 코드가 아니다. 현재 앱의 slot ID·범위 검증을 유지하며 확장해야 한다. |
| Mark는 인페인팅과 다름 | [스크린샷 합성](/Users/brian/works/github/open-design/apps/web/src/components/PreviewDrawOverlay.tsx:633), [전송](/Users/brian/works/github/open-design/apps/web/src/components/PreviewDrawOverlay.tsx:677), [미디어 인자](/Users/brian/works/github/open-design/apps/daemon/src/media/index.ts:312) | 동의. 화면 위 표시를 PNG로 합성하며 공통 생성 인자에 mask가 없다. OpenAI 직접 요청은 imageRef가 없고 fal 요청은 image_url을 전달한다. [OpenAI](/Users/brian/works/github/open-design/apps/daemon/src/media/index.ts:878), [fal](/Users/brian/works/github/open-design/apps/daemon/src/media/index.ts:3632). 참조 전달도 외형 보존의 증명은 아니다. |
| 코멘트별 큐·성공 뒤 needs_review | [큐](/Users/brian/works/github/open-design/apps/web/src/components/ProjectView.tsx:5558), [상태](/Users/brian/works/github/open-design/apps/web/src/components/ProjectView.tsx:4815) | 동의. 묶음 의견도 코멘트별 task다. 이를 가져오면 호출·대기가 늘 수 있다(추론). needs_review를 모든 결과의 필수 채택 버튼으로 이식하지 않는다. |
| HTML 버전 복원 | [restore route](/Users/brian/works/github/open-design/apps/daemon/src/routes/project/index.ts:3228) | 동의. 문자열을 다시 쓰고 복원 버전을 남긴다. 이미지 바이트·연결 문구·배치의 수정 단위 복구, 이후 편집 보존까지 해결한 기능은 아니다. |

그 외 Jury·런타임·브랜드 시스템 전체는 [카탈로그 R14~R15](../reference-catalog.md#r14)의 구조 수준 참고로 한정했다. 이번 리뷰에서 재감사하거나 모델 품질을 검증하지 않았다. 코드·프롬프트 전체 복사는 권고하지 않으며 이후 실제 발췌 재사용 시 파일별 출처·조건은 [재사용 조건](../reference-catalog.md)을 다시 확인해야 한다.

## 채택·변형·보류 권고

‘채택’은 아래 전략의 리뷰 권고다. 사용자 확정 원칙과 후속 구현 승인·검증을 구분한다.

| 후보 | 권고와 최소 범위 | 품질 효과·사용자 개입 | 도입 부담·실패 경계 | 검증 |
| --- | --- | --- | --- | --- |
| D1 최소 입력 → 조건부 질문 | **변형 도입**. 기존 understand 스키마·상태에 판매 대상 식별, 사실 출처, 진행 가능/질문 이유를 추가. 현재 승인 화면은 선택 검토로 남기고 같은 제작기에 바로 진행 분기 연결 | 필수 승인 2회를 줄이고 대상 오인만 먼저 해소. 취향·빈 가격·규격 질문 없음 | 중간. 상품명 필수 DTO와 기존 승인 플래그 변경 필요. 자동 결정과 실제 사용자 승인을 같은 값으로 기록하면 안 됨 | P1 |
| D2 이미지 계획 → 실행·배치 | **전략 채택, 기존 기능 확장**. 이미지별 역할/내용·원본 재사용·생성 비율/실제 크기·표시 방식/피사체 안전 영역을 구분 | 장수 선택을 강요하지 않고 AI가 계획. ‘크게’는 원본 유지 배치로 해결 가능한지 먼저 판단 | 중간. 현재 renderer의 고정 배치·세로 crop만으로 모든 요청을 처리할 수 없음. 생성 목표 픽셀을 실제 산출치처럼 표시하지 않음 | P2 |
| D3 영역 코멘트 + 텍스트 | **변형 도입**. Open Design의 대상 맥락 묶음만 차용, 기존 slot ID 기반 수정기를 확장. 영역 없이 텍스트만도 허용 | 대상 재설명 부담 감소. 명확하면 즉시 수행하고 필요한 경우만 짧은 질문 | 중간~높음. iframe 축척, 스크롤, contain 여백, cover crop, 원본 교체 후 오래된 코멘트 처리 필요. DOM 좌표를 픽셀 마스크로 쓰면 오수정 | P2 |
| D4 상품 외형 보존 | **요구 채택, 생성 연결은 검증 전 보류**. 원본 배치·재사용은 기존 구현 활용. 새 배경 합성/편집 capability와 보존 판정 추가 | 상품 외형 변경 필요 시만 사용자 판단. 모델 선택을 매번 강요하지 않음 | 높음. 현재 보드는 text-to-image이며 원본 참조 없음. 참조 프롬프트 강화만으로 보존을 보장하지 않음. 원본 활용 대안의 가용성도 미검증 | P3 |
| D5 즉시 적용 + 비교·복원 | **초기안 유지, 변형 구현 권고**. 기존 snapshot·UUID 에셋·version 충돌 검사 위에 수정 단위 이력/범위 복원을 연결 | 결과마다 채택 클릭 없이 반영. 비교·복원은 사용자가 원할 때만 | 높음. 현재 ‘수동 적용 필수’ 테스트 계약을 의도적으로 바꿔야 함. active/완료/편집기 저장 간 일관성, 에셋 보관 한도, 후속 수정 충돌 미정 | P0·P3 |
| D6 URL 출처·실패 결과 | **전략 채택, 브랜드 수집기 전체 이식 보류**. read/partial/blocked/failed와 출처를 최소 입력 계약에 연결 | 읽힌 사실만 사용. 대상 모호함만 질문. 대상이 알려진 접근 실패의 진행 방식은 Q3 | 중간~높음. 현재 앱에 URL 수집 경로 없음. 로그인·차단·여러 상품·상품과 광고 문구 분리 미검증 | P1 |
| D7 기본 discovery·고정 16슬롯·별도 이미지 보드·별도 원고 검수기·코멘트별 실행 큐 | **보류**. 앞의 기능은 원칙 충돌 또는 중복이고 큐의 묶음 정책은 미정 | 질문·대기·이중 상태를 늘릴 가능성. 기존 검수 루프 활용 | 전체 이식 부담 큼. 품질 개선 근거 없음. 필요한 최종 화면 검수만 기존 루프와 구분해 실험 | P2~P4 |

## 제안하는 최소 연결 계약

다음은 구현된 타입이 아니라 PoC에서 검증할 설계 제안이다. 기존 Project/Slot/ImageBoard/워크플로우/원장을 각각 대체하지 않는다.

1. **입력 정규화:** 선택 입력 종류, 원문·사진·URL 출처, 식별한 판매 대상, 제공 사실·관찰·추론·미확인을 구분한다. `explicit`만으로 가격/규격/상품 식별 출처까지 보장하지 않는다. URL 수집 결과와 사용자 원문이 충돌하면 출처를 잃지 않는다.
2. **수정 요청:** `slotId`, 대상 asset ID와 버전/해시, 기준 project version, 영역의 좌표계·렌더링 변환, 메모, 유지해야 할 상품 속성을 묶는다. 확대된 iframe 좌표는 원본 픽셀 좌표와 별도로 보관한다.
3. **실행 결정:** 문구 / 배치·크롭 / 원본 교체 / 이미지 편집·생성으로 구분하고 예상 변경 필드·비용·검증 방법을 기록한다. 생성 단계에 전달할 수 없는 크기·참조 조건을 약속하지 않는다. 모델의 판단을 검증 가능한 변경 범위와 능력 검사로 제한한다.
4. **적용·복원:** 하나의 요청 ID에 이전·이후 asset 참조, 실제 바뀐 문구·배치, 변경 필드 목록, base/after version, 검증 결과를 묶는다. 후보 보관이 끝난 후 기존 트랜잭션·동시 편집 검사로 적용한다. 모델 실패·보관 실패 시 기존 화면은 유지한다. 원복도 새 이력으로 남긴다.
5. **질문 분기:** 대상이 불명확하거나 상품 자체 변경·상충한 요청·후속 편집 충돌·허용 비용 범위를 넘는 선택에만 질문한다. 저장 충돌·네트워크 실패는 취향 질문으로 포장하지 않고 실행 문제로 표시한다. 비용 기준과 충돌 선택은 [후속 질문](interview-questions.md)에 미정으로 남긴다.

원고 자동 보정은 이미 존재한다. [applyLandingCopy](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:111)의 범위 보호와 [검수 분기](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:168)를 유지하고, 이미지 적용 때 기존 원고 검수 결과를 유지하는 동작을 새 이미지의 시각 검수 통과로 표시하지 않는다. [현재 명시적 구분](/Users/brian/works/agent/openhigsfield/open-higgsfield/src/service/landing-workflow.ts:270)

## 기존 품질 평가와 이번 판단의 관계

[9월 27일 평가](/Users/brian/works/agent/openhigsfield/open-higgsfield/docs/agentic-quality-evaluation-20260927.md)는 랜딩의 데스크톱 크롭에서 소품이 빠지고 제품 상세에서 여러 용기 중 판매 대상이 모호했다고 기록한다. 이번에는 해당 화면을 재실행하지 않았다. 다만 현재 코드에서도 cover·중앙 가로 위치와 대상 불확실성 전용 질문 계약 부재를 확인했으므로 P1·P2의 회귀 사례로 삼는 것이 타당하다. [9월 22일 평가](/Users/brian/works/agent/openhigsfield/open-higgsfield/docs/agentic-quality-review.md)의 원고 검수·보정 루프는 현 코드에 존재한다. 별도 Jury 도입보다 최종 배치에서의 상품·이미지·문구 대응을 검증하는 연결이 우선이다.

읽은 테스트 소스는 [승인·범위·충돌](/Users/brian/works/agent/openhigsfield/open-higgsfield/test/landing-workflow.test.ts:30), [이미지 수동 적용·부분 실패·stale 거부](/Users/brian/works/agent/openhigsfield/open-higgsfield/test/landing-images.test.ts:42)다. 기존 테스트가 수동 승인을 요구한다는 사실은 새 원칙의 반증이 아니라 변경해야 할 이전 계약의 위치다. 이번 테스트 통과 수는 **없음(실행하지 않음)**이다.

## 관찰 버전 보완

현재 앱의 미추적 핵심 파일은 커밋 링크로 재현되지 않는다. 다음 SHA-256은 이번 정적 검토 파일 식별용이며 실행 결과가 아니다.

| 앱 상대 경로 | SHA-256 |
| --- | --- |
| src/service/landing-workflow.ts | d1fba0ac9ccd65fafff52963e26685afd1861b6f3b1e2bdab7816a7b0972a6b5 |
| src/service/landing-model.ts | d83150cff1776c75da36a512408e7b52d507cb9f1cc06edfaf0f5aeaef2c695a |
| src/service/landing-images.ts | e23f968f4019bd291b4550614e8f2dd21a503e1c734f498cae9dda3a35454cdf |
| src/projects/landing-images.ts | c1f1acd01149f25757fe7dadc6465de4423bd559f000f629ef7a9b86b9c60b46 |
| src/editors/landing-workflow-creator.tsx | 0673f5465d2e17d9fd9c9350ab16237d2475f86367e1991b9634b213d4fdf95f |
| src/render/landing.ts | 30770adaaddbae5a8d00be8ed5ac19d629a8d6741850f665e71a8a5f3fe5acc4 |
| src/service/projects.ts | cf2e4ecafd736f7fa4f69599c2923f7e342eb0490a0bea22a8b983557d715192 |
| src/editors/use-project.ts | f2fcf787049f95942826a84f77403f3edd27a879d0519e18ca026c42ca6ef4cb |
| src/projects/validation.ts | 191de11f37e876269f05da02cf40e15aee3ec51ee9cb3e31aa7d3446214a2342 |
| src/service/assets.ts | e680842480eaed0bc94f33e3fba99f284813f7e50f128d1b76c45dc835ae0e82 |

실험 순서·합격 기준은 [validation-plan.md](validation-plan.md), 미정 사용자 선택과 좁은 추가 분석 요청은 [interview-questions.md](interview-questions.md)에 분리했다.
