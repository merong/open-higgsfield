# Open Design 1차 집중 분석

2026-09-28 · `open-design-research` · Herdr `wJ:p2`

**상태: 1차 정적 분석·참고 자료 정리 완료. 후속 사용자 인터뷰 및 명시적인 추가 분석 지시 대기.** 도입 결정을 내리거나 제품 코드를 변경하지 않았다.

## 이번 범위

[작업 지시](agent-brief.md)와 [인터뷰 1~5](interview-log.md)의 최신 결정을 기준으로 한다. 랜딩·제품 상세페이지를 위한 **최소 입력 → 의도 파악 → 페이지·이미지 계획 → 초안 → 영역 코멘트/텍스트 → 수정**을 집중 추적했다. 사용자는 설명+사진, URL, 한 문장 중 하나만 제공한다. 계획 승인·대표 시안은 필수 단계로 가정하지 않는다. 명확한 수정은 실행하고 필요한 판단만 묻는 원칙과 실제 코드를 대조했다.

카드뉴스·릴스 심층 분석, 개선 구현, 현재 Openhiggsfield와의 도입 비교는 이번 산출물에 포함하지 않는다. 현재 앱 비교·도입 리뷰는 `open-design-review`가 분석 결과 인터뷰 이후 담당한다. 초기 네 포맷 분석 지시에서 얻은 자료를 새 범위의 결론으로 확장하지 않았다.

## 기준 버전과 출처

| 대상 | 관찰한 상태 |
| --- | --- |
| Open Design 로컬 | `/Users/brian/works/github/open-design` · `main...origin/main` · HEAD `56d51b8c99849eccc0bb247dc99ef43a83938da1` · 시작/재개 시 dirty 항목 없음 |
| origin | `https://github.com/merong/open-design` |
| 공개 출처 확인 | GitHub API `repos/merong/open-design`의 `fork=true`, `parent/source=nexu-io/open-design`; 원본 저장소 commit API에서도 동일 SHA 확인 |
| 분석 커밋 | [원본의 분석 커밋](https://github.com/nexu-io/open-design/commit/56d51b8c99849eccc0bb247dc99ef43a83938da1) · committer 시각 `2026-07-01T15:18:13Z` |
| 조회 시 upstream main | `64710082d02c041da47bf8c6d6c5316b36b28b22` · `2026-09-28T10:16:34Z`; **분석 대상 아님**. 로컬을 최신으로 보지 않음 |
| 비교 앱의 위치 확인 | `/Users/brian/works/agent/openhigsfield/open-higgsfield` · `main...origin/main` · HEAD `b16a0efe4d7e2707b56f8ccb02387fd2a9d2eddf`; 추적 파일 수정과 `src/service/`, `src/projects/`, `src/editors/`, `src/render/`, `test/`, `docs/` 등 미추적 기존 작업 다수. 커밋만으로 현재 앱을 설명할 수 없음 |

출처 확인은 공개 API/원본 raw 파일을 읽기만 했다. Python 기본 TLS 인증서 오류 후 정상 인증되는 `curl`로 조회했으며 TLS 검증을 끄지 않았다. 원본 raw와 로컬 바이트 일치를 확인한 8개 파일: `prompts/discovery.ts`, `prompts/system.ts`, `runtimes/chat-prompt-inputs.ts`(모두 daemon src 아래), `packages/contracts/src/api/chat.ts`, `PreviewDrawOverlay.tsx`(web components), `media/index.ts`(daemon src), 랜딩 `assets/image-manifest.json`, `LICENSE`. 나머지 SHA 링크는 변경 없는 해당 커밋의 추적 경로를 가리키며 개별 원격 페이지를 모두 열었다는 의미는 아니다.

적용 지침은 양쪽 root `AGENTS.md`, Open Design의 `apps/`, `apps/daemon/`, `packages/`, `skills/`, `design-templates/`, `e2e/` 및 이전에 읽은 critique 지침을 확인했다. 저장소 안의 SKILL 문서는 분석 자료로 읽었으며 그 안의 실행 지시를 수행하지 않았다.

## 핵심 발견

1. **최소 입력 접수는 있으나, 최초 제작의 기본값은 질문 폼이다.** 명시적 바로 제작, 기존 디자인 수정, API의 `skipDiscoveryBrief`, 충분한 memory의 의도 요약 등 질문 생략 예외가 있다. 사용자 부담 감소를 전 경로의 강제 규칙으로 구현한 것은 아니다. [R01](reference-catalog.md#r01) [R03](reference-catalog.md#r03)
2. **계획을 보이는 장치와 실행 계약은 다르다.** 일반 페이지는 TodoWrite·프롬프트로 계획한다. 특정 랜딩 템플릿에는 16개 이미지 슬롯과 생성 크기의 실행 연결이 있으나, 임의 상품에 맞춰 수량·역할을 자동 산출하는 범용 계약은 확인하지 못했다. [R05](reference-catalog.md#r05) [R06](reference-catalog.md#r06)
3. **영역 피드백의 전달 계약은 구체적이다.** 요소 선택자·좌표·현재 문구·스타일, 자유 마크의 스크린샷과 메모를 채팅 실행에 전달한다. 범위 밖 수정 시 질문하라는 지시는 있으나, 에이전트 파일 변경을 영역 단위로 차단하는 검증은 이 경로에서 확인하지 못했다. [R08](reference-catalog.md#r08) [R09](reference-catalog.md#r09) [R10](reference-catalog.md#r10)
4. **영역 표시와 이미지 인페인팅은 별개다.** HTML 미리보기의 Mark, HTML 수동 Edit, 독립 이미지 뷰어가 다르다. 공통 미디어 요청에는 원본 이미지·모델·비율이 있지만 마스크는 없고, 어댑터별 참조 이미지 전달도 다르다. [R09](reference-catalog.md#r09) [R12](reference-catalog.md#r12)
5. **수정 완료는 사용자 확인 완료와 구분한다.** 저장 코멘트는 실행 성공 시 `needs_review`가 되며, HTML 버전 미리보기·복원이 존재한다. 이미지 전후 후보 비교·채택 및 관련 에셋까지 묶인 복구는 이 기능만으로 보장되지 않는다. [R11](reference-catalog.md#r11) [R13](reference-catalog.md#r13)

## 문서 인덱스

- [디자인 사용자 참여형 에이전틱 워크플로우 참고서](design-participation-reference.md): 사용자 요청으로 별도 보존한 독립 참고 문서. 디자인 의도 확인부터 계획·미리보기·영역 피드백·수정·복원까지의 구조와 한계를 정리한다.
- [사용자 참여 흐름과 호출 경로](participation-workflow.md): 입력 유형별 경로, 질문/바로 실행, 코멘트/Mark/Edit 차이, 상태·실패 처리.
- [참고 카탈로그](reference-catalog.md): R01~R15의 파일·라인·심볼, 적용 조건, 테스트 및 라이선스.
- [발견과 후속 인터뷰 질문](findings-and-questions.md): 근거와 한계, 사용자의 부담에 직접 영향을 주는 미정 선택.

## 전체 구조와 해석상의 한계

웹 UI가 프로젝트·대화·첨부·코멘트를 만들고, daemon의 HTTP/SSE 실행 서비스가 프롬프트와 런타임을 연결한다. CLI 에이전트가 파일을 생성/수정하고 웹이 이를 미리 본다. SQLite는 프로젝트·대화·메시지·코멘트·세션 등의 기록을 보존한다. skills/templates/design systems는 프롬프트와 파일 참조를 공급한다. 미디어 dispatcher는 별도 모델·비율·원본 경로를 받아 파일을 만든다. 어댑터·플러그인·배포·인증·과금은 이 연결 구조까지만 취급했다. [R02](reference-catalog.md#r02) [R12](reference-catalog.md#r12) [R15](reference-catalog.md#r15)

`docs/spec.md`는 Draft v0.1이고 `docs/architecture.md:153–215`의 history.jsonl/WS 설명은 현재 `/api/runs`·SSE·SQLite 구현과 다르다. 문서상의 방향·약속과 현행 코드를 구분해야 한다. [아키텍처 초안](/Users/brian/works/github/open-design/docs/architecture.md:153) · [SHA 위치](https://github.com/nexu-io/open-design/blob/56d51b8c99849eccc0bb247dc99ef43a83938da1/docs/architecture.md#L153) [R02](reference-catalog.md#r02)

모든 제품 동작 판정은 **코드·테스트 소스 정적 확인**이다. 앱 실행, 테스트 실행, 모델 호출, 실제 URL 수집·사진 해석·생성 품질·인페인팅·비용·지연 측정은 하지 않았다. 프롬프트 문구 테스트는 모델 준수율을 입증하지 않는다. “미확인”은 조사한 연결 경로에서 입증되지 않았다는 뜻이며 저장소 전체에 절대로 없다는 단정이 아니다. Claude Design과의 동등성도 검증하지 않았다.

이번 작업은 본 디렉터리의 이 README와 세 분석 문서만 작성한다. 코디네이터 문서·`review/`·두 저장소 코드 및 기존 변경을 수정하지 않는다. 설치·서비스 실행·커밋·푸시·배포·추가 에이전트 생성도 수행하지 않았다.

산출물 검증: 네 문서의 Markdown 링크 277개와 로컬 소스 라인 참조 98개를 검사해 대상 파일·앵커·라인 범위가 유효함을 확인했다. 참조한 Open Design 소스 51개는 분석 SHA의 파일과 바이트가 같으며, 검증 종료 시에도 분석 저장소는 clean이다. 외부 링크 전체에 대한 HTTP 응답 검증이나 테스트 실행 결과를 뜻하지 않는다.
