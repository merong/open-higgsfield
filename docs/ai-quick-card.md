# 카드뉴스 AI 제작

현재 기본 화면은 멀티턴 에이전트입니다. 동작과 검증 범위는 [카드뉴스 에이전트](card-news-agent.md)를 참고하세요. 아래는 기존 단일 요청 API와 모델 설정의 구현 기록이며 기존 `/quick-card` API는 호환성을 위해 유지합니다.

# 주제 한 칸으로 카드뉴스 만들기

## 사용자 흐름

1. 새 프로젝트 → 카드뉴스 → **AI 빠른 제작**. 주제어, 제품 메모, 일부 원고 중 하나만 입력한다.
2. **5장 자동 작성 · 1 크레딧**. 기본 5장·4:5·친근한 말투·에디토리얼 디자인. 세부 설정을 열면 3/5/7/10장, 말투, 디자인, 독자를 선택할 수 있다.
3. 작성된 프로젝트의 편집기가 열린다. 전체 제목·본문·배경 프롬프트·캡션이 채워져 있으며 필요한 부분만 수정하고 PNG/ZIP으로 내보낸다.

이미지 생성은 문구 작성과 분리한다. 문구 작성은 텍스트 카드로 바로 사용 가능하며, 편집기의 에셋 선택 또는 남은 배경 생성으로 이미지를 추가할 수 있다. 사용자가 동의 없이 여러 이미지 생성 비용을 부담하지 않도록 한다. 기존 9종 템플릿과 직접 구성 방식도 유지한다. 템플릿 직접 진입 URL은 `/projects/new?format=card-news&start=templates`이다.

## OpenAI 연결

- 관리자 `/admin/settings#openai-settings`에서 **키 저장 · 모델 불러오기**를 누르면 서버가 `GET https://api.openai.com/v1/models`를 호출한다. 인증과 호환 모델을 확인한 후 키를 저장하고 목록을 표시한다. 설정 화면을 다시 열거나 **모델 목록 새로고침**을 눌러도 저장된 키로 조회한다.
- **작성 모델**에서 계정에 실제로 조회된 모델을 선택하고, 지원 모델이면 **추론 강도 (reasoning effort)**를 선택해 **모델 설정 저장**을 누른다. 기본 모델은 사용 가능할 경우 `gpt-5-mini`, 빠른 작성을 위한 앱 기본 effort는 `low`이며 모델이 지원하지 않으면 해당 모델의 유효한 값으로 시작한다. 기존 모델·effort를 새 키도 지원하면 유지한다.
- 모델 목록 API에는 endpoint·effort 지원 정보가 없으므로 `src/service/openai-models.ts`에 공식 문서 기반의 명시적 호환 프로필을 둔다. Responses API와 Structured Outputs가 확인된 모델만 활성화하며 나머지는 목록에서 선택 불가로 표시한다. 신규 모델은 공식 지원 정보 확인 후 프로필을 갱신한다. 전용 이미지·음성 모델을 문구 작성에 사용하거나, 알 수 없는 모델에 effort를 추정해 보내지 않는다.
- 모델·effort 저장 시 서버가 해당 키의 모델 목록을 다시 조회하고 모델 가용성 및 effort 허용값을 검증한다. 목록 조회 오류·빈 목록·호환 모델 부재·유효하지 않은 선택은 기존 키와 설정을 변경하지 않는다. 연결 실패·인증·요청 한도 오류를 표시하며 관리자/IP 권한 및 조회·저장 빈도 제한을 적용한다.
- `text_provider_settings` 테이블의 provider=`openai` 행에 AES-256-GCM 암호문과 모델, `reasoning_effort`를 저장한다. 기존 테이블에는 서버 시작 시 nullable 컬럼을 추가하며 기존 모델과 키를 보존한다. 기존 Higgsfield 설정과 별도이며 같은 서버 암호화 키, 다른 AAD scope를 사용한다.
- 조회는 설정 유무·모델·effort·시간과 모델 목록만 반환한다. 관리자 역할 및 기존 실제 접속 IP 검증을 통과해야 설정을 조회·변경·삭제할 수 있다.
- 환경변수 `OPENAI_API_KEY`, `OPENAI_OUTLINE_MODEL`, `OPENAI_REASONING_EFFORT`도 서버 fallback으로 지원한다. DB 설정이 우선이다. 기존 Claude 구성안은 OpenAI가 없는 기존 직접 구성 흐름에서 유지하며, AI 빠른 제작은 OpenAI만 사용한다.
- 새 테이블은 서버 DB 초기화 시 생성한다. 실행 중인 개발 서버에는 재시작이 필요하다.
- 연결 점검은 선택 모델 조회만 수행한다. 조회 성공을 실제 문구 생성·잔액 검증으로 간주하지 않는다.

## 생성 및 검증

`POST /api/workspace/quick-card`는 로그인, 동일 출처, 요청 빈도를 확인하고 입력을 검증한다. 주제는 2~3000자, 장수는 3~10 정수, 말투·디자인은 허용 값만 받는다. 서버가 기존 Project 초안을 만들어 클라이언트가 각 카드를 조립할 필요가 없다.

Responses API에 자동 편집 지침, 사용자 원문 전체와 장수를 전송한다. 저장한 추론 강도를 `reasoning.effort`로 전달하며 GPT-4.1 등 비추론 모델에서는 reasoning 필드를 생략한다. `store:false`, 구조화된 JSON 출력, 45초 타임아웃을 사용한다. 표지·본문·마무리 흐름, 짧은 카드 문구, 영문 이미지 프롬프트를 지시한다. 첫 장과 마지막 장, 장수, 빈 항목, 프로젝트 유효성을 다시 검사한 후 계정 소유 프로젝트로 저장한다.

실시간 웹 검색은 하지 않는다. 제공되지 않은 가격·통계·후기·최신 사실을 창작하지 않고 확인 필요로 표시하도록 지시한다. 이는 모델에 대한 지침이며 사실성 보장은 아니므로 사용자에게 게시 전 확인을 안내한다. 사용자가 준 URL을 캡션에 보존하도록 지시하지만 URL의 원문을 가져와 읽는 기능은 없다.

기존 원장 트랜잭션으로 1 크레딧 예약 → 성공 확정 / 실패 환불을 처리한다. 동일 요청 키를 다시 보내면 기존 결과를 반환하고 진행 중 요청은 재호출하지 않는다. UI는 중복 클릭을 잠그며 전송 결과를 알 수 없는 네트워크 실패는 요청 키를 유지해 재시도한다. 상태가 실패로 확정된 요청은 다시 차감하지 않는다.

## 확인 기록

- 자동 테스트 42개 통과: 한 칸 입력, 기본값, 잘못된 입력, 키 암호화·관리자 권한, 실제 요청 형식, 전체 카드 저장, 소유권, 중복·동시 요청, 거절·미완성·잘못된 결과·인증·한도 오류의 단일 환불, 키 미등록 무과금.
- 모델 설정 확장 테스트: 등록 키 기반 모델 조회, 관리자 권한, 전용 모델 비활성화, 날짜 스냅샷 호환, 허용되지 않은 모델/effort 차단, 조회 실패 시 기존 설정 보존, key-only 초기화, 키 교체 시 선택 유지, effort 저장·재조회·실제 요청 payload 반영, 비추론 모델 필드 생략.
- 위 API 테스트는 고정된 모의 Responses API 응답을 사용한다. 실제 GPT 콘텐츠 품질이나 공급자 결제 상태를 검증한 결과는 아니다.
- 브라우저: 예시 메모 입력, 7장·전문적인 말투 선택, 탭을 오가도 메모 유지, 9종 템플릿 보존, 미등록 안내와 생성 버튼 비활성화 확인.
- 초기 구현 검증에서는 관리자 설정 API HTTP 200과 키 미등록 상태를 확인했다. 키 값은 응답에 포함하지 않는다.
- 일반 계정의 OpenAI 설정 조회는 HTTP 403. 키 미등록 상태의 실제 빠른 제작 요청은 HTTP 503이며 기존 잔액과 원장이 변하지 않았음을 확인했다.
- 타입 검사와 프로덕션 빌드 통과.
- 2026-09-20 모델 선택 확장 검증: 현재 등록된 실제 키로 모델 목록 API HTTP 200, 총 147개 / 카드뉴스 호환 47개를 조회했다. 모델 수는 계정 권한과 조회 시점에 따라 달라진다. 실제 Responses 생성은 이 확장 검증에서 호출하지 않았다.
- 실제 설정 API: GPT-4.1 mini/effort 없음과 GPT-5 mini/high를 저장·재조회하고 기존 GPT-5 mini/low로 복원했다. 일반 사용자 목록 GET 및 설정 PUT은 모두 HTTP 403.
- 브라우저: 실제 모델 목록 표시, GPT-4.1 mini 선택 시 effort 숨김, GPT-5 Pro 선택 시 high만 표시, GPT-5 mini/medium 저장 후 새로고침 유지, 원래 low로 복원하는 흐름을 확인했다.
- 추론 강도 컬럼 추가 후 개발 서버를 재시작했으며 모델 선택 확장 후에도 자동 테스트 42개, 타입 검사, 프로덕션 빌드가 통과했다.

## 참고

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [GPT-5 mini 모델 지원 기능](https://developers.openai.com/api/docs/models/gpt-5-mini)

### 모델 지원 정보 확인 (2026-09-20)

- [모델 목록 API](https://developers.openai.com/api/reference/resources/models/methods/list): 사용 가능 모델 ID 조회, effort 정보 없음.
- [Reasoning 가이드](https://developers.openai.com/api/docs/guides/reasoning): 모델별 effort 차이, 응답 시간·토큰 사용의 관계.
- [GPT-5](https://developers.openai.com/api/docs/models/gpt-5), [GPT-5.1](https://developers.openai.com/api/docs/models/gpt-5.1), [GPT-5.2](https://developers.openai.com/api/docs/models/gpt-5.2): minimal / none / xhigh의 세대별 차이.
- [GPT-5 Pro](https://developers.openai.com/api/docs/models/gpt-5-pro): high만 지원. [GPT-5.5 Pro](https://developers.openai.com/api/docs/models/gpt-5.5-pro): medium/high/xhigh. 5.2 Pro와 5.4 Pro는 Structured Outputs 미지원으로 비활성.
- [GPT-5.4](https://developers.openai.com/api/docs/models/gpt-5.4), [GPT-5.5](https://developers.openai.com/api/docs/models/gpt-5.5), [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra): 해당 세대의 명시적 허용 effort.
- [GPT-5.2 Codex](https://developers.openai.com/api/docs/models/gpt-5.2-codex), [GPT-5.3 Codex](https://developers.openai.com/api/docs/models/gpt-5.3-codex): low/medium/high/xhigh.
