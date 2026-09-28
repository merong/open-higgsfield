# 카드뉴스와 랜딩 페이지 생성기를 위한 무료 웹폰트 가이드

**한글 10종과 영문 10종의 선택 기준과 웹 적용 방법**

조사 기준 2026년 9월 21일  |  대상 기획자와 프론트엔드 개발자

생성기의 폰트 목록은 상업적으로 사용할 수 있는 웹폰트를 중심으로 구성하고, 제목·본문·숫자 등 역할에 맞춰 추천해야 합니다. 초기에는 한글 10종과 영문 10종을 제공하되, 기본값과 조합 프리셋을 함께 운영하는 방식을 권합니다.

이 문서는 폰트별 강점과 추천 요소, 웹 적용 코드, 라이선스 관리, 편집 화면과 이미지 출력의 일관성을 다룹니다. 폰트의 지원·배포 정보와 디자인 추천을 구분하며, 표의 굵기는 전체 지원 범위가 아닌 권장 사용값입니다.

## 초기 기본값

| 용도 | 권장 시작점 | 선택 이유 |
| --- | --- | --- |
| 한글 본문 | Pretendard 또는 SUIT | 가독성과 정보 위계를 안정적으로 구성 |
| 영문 본문과 숫자 | Inter | UI 가독성과 숫자 정렬 기능 |
| 강한 카드뉴스 제목 | Black Han Sans | 짧은 문구에 두꺼운 형태로 집중 |
| 감성적인 한글 제목 | Gowun Batang | 식물과 라이프스타일 콘텐츠에 적합 |
| 격식 있는 영문 제목 | Playfair Display | 브랜드와 에디토리얼 분위기 |

## 무료 사용과 배포 조건

목록의 폰트는 명시된 배포본 기준으로 상업적 사용이 가능한 무료 폰트입니다. OFL 1.1은 웹 사용·임베딩·재배포를 허용하지만 폰트 파일을 배포할 때는 저작권과 라이선스 정보를 보존해야 합니다. 폰트 자체만 판매할 수 없으며, 수정본에는 예약 폰트명 조건 등이 적용될 수 있습니다. [1–3]

이미지로 완성된 카드뉴스와 폰트 파일이 포함된 HTML·템플릿 패키지는 구분해서 관리합니다. 생성된 디자인에 OFL을 적용할 의무는 없지만, 패키지에 함께 배포하는 폰트 파일에는 해당 조건이 계속 적용됩니다. [2–3]

## 문서 구성

- 한글 웹폰트 10종
- 영문 웹폰트 10종
- 용도별 폰트 조합과 타이포그래피
- 웹폰트 적용 방법
- 생성기 구현과 출력 검증
- 공식 출처와 확인 범위

## 한글 웹폰트 10종

아래 폰트는 모두 OFL 1.1 배포본입니다. GF는 Google Fonts 제공, CDN은 제작자가 안내하는 웹폰트 CSS 제공을 뜻합니다. 폰트명을 클릭하면 공식 배포처나 견본으로 이동합니다.

| 패밀리 | 웹 제공 | 강점과 추천 요소 | 권장 굵기 |
| --- | --- | --- | --- |
| [Pretendard](https://github.com/orioncactus/pretendard) | CDN | 중립적이고 균형 있는 고딕<br>본문·버튼·상품 설명·범용 제목 | 본문 400·500<br>제목 700·800 |
| [SUIT](https://github.com/sun-typeface/SUIT) | CDN | 정돈된 UI용 고딕<br>랜딩 본문·폼·FAQ·기능 설명 | 본문 400<br>제목 600·700 |
| [Noto Sans KR](https://fonts.google.com/specimen/Noto+Sans+KR) | GF | 안정적인 범용 고딕<br>정보형 카드뉴스·다국어 페이지 | 본문 400·500<br>제목 700 |
| [IBM Plex Sans KR](https://fonts.google.com/specimen/IBM+Plex+Sans+KR) | GF | 기술적이고 체계적인 인상<br>B2B·SaaS·데이터 설명 | 본문 400<br>제목 600·700 |
| [Nanum Gothic](https://fonts.google.com/specimen/Nanum+Gothic) | GF | 익숙하고 단정한 고딕<br>교육·생활정보·안내문 | 본문 400<br>제목 700·800 |
| [Noto Serif KR](https://fonts.google.com/specimen/Noto+Serif+KR) | GF | 차분하고 격식 있는 명조<br>브랜드 스토리·인용문·제목 | 본문 400<br>제목 600·700 |
| [Nanum Myeongjo](https://fonts.google.com/specimen/Nanum+Myeongjo) | GF | 문학적이고 전통적인 명조<br>문화·출판·공예·브랜드 선언문 | 본문 400<br>제목 700·800 |
| [Gowun Batang](https://fonts.google.com/specimen/Gowun+Batang) | GF | 따뜻하고 섬세한 인상<br>식물·라이프스타일·감성 카피 | 본문 400<br>제목 700 |
| [Black Han Sans](https://fonts.google.com/specimen/Black+Han+Sans) | GF | 네모지고 두꺼운 제목용<br>표지·핵심 질문·프로모션 | 400<br>원래 두꺼운 형태 |
| [Do Hyeon](https://fonts.google.com/specimen/Do+Hyeon) | GF | 간판처럼 또렷하고 개성 있음<br>이벤트·혜택 문구·친근한 광고 | 400<br>단일 굵기 |

### 한글 지원 범위를 별도로 관리

Gowun Batang은 현대 한글 11,172자를 지원한다고 명시합니다. Black Han Sans의 원 제작자 배포본은 한글 2,580자를 명시합니다. 동일한 이름이어도 배포본이 다를 수 있으므로 실제 채택 파일에서 상품명·인명·신조어의 누락 글자를 확인해야 합니다. [6–7]

Pretendard는 동적 서브셋과 가변 폰트를 제공합니다. SUIT는 UI 본문용으로 설계되어 본문 기본값 후보로 적합합니다. [4–5]

## 영문 웹폰트 10종

아래 목록은 모두 Google Fonts에서 웹폰트로 제공됩니다. 라이선스는 해당 배포본의 OFL 1.1 기준입니다. 한글용 폰트가 아니므로 한글 패밀리와 조합해 사용합니다.

| 패밀리 | 강점과 추천 요소 | 권장 굵기 |
| --- | --- | --- |
| [Inter](https://fonts.google.com/specimen/Inter) | UI 가독성과 숫자 기능<br>영문 본문·가격표·통계 | 본문 400·500<br>제목 600·700 |
| [DM Sans](https://fonts.google.com/specimen/DM+Sans) | 간결하고 부드러운 인상<br>서비스 소개·설명·버튼 | 본문 400<br>제목 600·700 |
| [Manrope](https://fonts.google.com/specimen/Manrope) | 기하학적이고 정제된 인상<br>제품 랜딩·기능 제목·짧은 카피 | 본문 400·500<br>제목 700·800 |
| [Montserrat](https://fonts.google.com/specimen/Montserrat) | 대문자의 존재감이 강함<br>캠페인 제목·섹션명·브랜드 문구 | 제목<br>600·700·800 |
| [Poppins](https://fonts.google.com/specimen/Poppins) | 원형 중심의 밝고 친근한 형태<br>소비자 앱·교육·라이프스타일 | 본문 400<br>제목 600·700 |
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | 기술적이면서 개성 있는 형태<br>AI·개발 도구·핵심 숫자 | 제목<br>500·600·700 |
| [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) | 획 대비가 큰 클래식 세리프<br>패션·뷰티·프리미엄 제품 제목 | 제목<br>500·600·700 |
| [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) | 섬세하고 우아한 세리프<br>꽃·향수·공예·에디토리얼 표지 | 큰 제목<br>500·600 |
| [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) | 폭이 좁고 긴 대문자 형태<br>SALE·할인율·스포츠·이벤트 | 400 |
| [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | 고정폭과 코드 가독성<br>코드 예제·기술 사양 | 400·500·700 |

### Manrope는 배포 버전별로 라이선스가 다름

Google Fonts 배포본은 OFL 1.1입니다. 제작자 사이트의 Manrope V5는 별도 라이선스로, 상업적 사용과 웹 임베딩은 무료지만 폰트 수정은 금지됩니다. 재배포 시 원본과 이름을 유지하고 지정 출처를 표시해야 합니다. 자동 서브셋·변환 대상에는 배포본을 구분해 등록합니다. [8–9]

Inter는 표의 숫자를 정렬하는 tabular figures를 제공합니다. Bebas Neue는 무료판과 유료 Pro를 혼동하지 않도록 배포 출처를 함께 기록합니다. [10–11]

## 용도별 폰트 조합과 타이포그래피

아래는 생성기의 기본 프리셋으로 사용할 수 있는 디자인 제안입니다. 각 칸은 폰트명과 권장 굵기를 뜻합니다. 영문 제목용 폰트는 해당 요소에만 적용합니다.

| 목적 | 한글 제목 | 한글 본문 | 영문과 숫자 |
| --- | --- | --- | --- |
| 범용과 깔끔함 | Pretendard 800 | Pretendard 400 | Inter 600 |
| 전문성과 기술 | IBM Plex Sans KR 600 | SUIT 400 | Space Grotesk 600 |
| 강한 프로모션 | Black Han Sans 400 | Pretendard 500 | Bebas Neue 400 |
| 프리미엄 | Noto Serif KR 600 | Pretendard 400 | Playfair Display 600 |
| 자연과 감성 | Gowun Batang 700 | SUIT 400 | Cormorant Garamond 600 |
| 밝고 친근함 | Do Hyeon 400 | Noto Sans KR 400 | Poppins 600 |

### 폰트 선택과 레이아웃을 함께 결정

본문용 1종과 제목·강조용 1종부터 시작합니다. 폰트를 바꾸면 글자 폭과 줄바꿈도 바뀌므로 크기·행간·자간·텍스트 영역의 너비를 함께 검토해야 합니다. 같은 굵기 숫자라도 서체마다 시각적 무게가 다릅니다.

| 요소 | 권장 운영 규칙 |
| --- | --- |
| 표지와 히어로 제목 | 큰 크기로 문구를 실제 렌더링하고, 의미 단위 줄바꿈과 줄 수를 확인 |
| 본문과 설명 | 모바일 크기에서 읽기 편한 굵기와 행간을 선택하고 과도한 자간 축소를 피함 |
| 가격과 통계 | 정렬이 필요한 표·카운터에는 tabular figures 지원 여부 확인 |
| 명조와 디스플레이 | 얇은 획이 축소 출력에서도 남는지 확인하고 작은 안내문에는 신중하게 사용 |
| 버튼과 CTA | 라벨 길이가 변해도 잘리지 않도록 패딩과 최소 높이를 함께 검토 |

### 미리보기 문구

같은 문구를 여러 폰트로 비교하면 형태 차이를 쉽게 판단할 수 있습니다. 아래처럼 한글, 영문, 숫자, 통화와 문장부호를 함께 보여주는 방식을 권합니다.

```text
오늘의 초록을 발견하세요
나에게 맞는 식물 3가지
Find Your Green Style
₩29,900  ·  30%  ·  0123456789
```

식물 콘텐츠는 자연과 감성 프리셋을 브랜드 스토리에, 범용 프리셋을 관리법에, 강한 프로모션 프리셋을 짧은 행사 문구에 적용하는 식으로 구분할 수 있습니다.

## 웹폰트 적용 방법

### Google Fonts로 필요한 패밀리와 굵기 로드

다음 예시는 한글 본문과 영문 제목을 함께 로드합니다. 실제 선택한 패밀리·굵기만 요청하고, 목록의 모든 폰트를 처음부터 내려받지 않습니다. [12]

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&amp;family=Playfair+Display:wght@600;700&amp;display=swap">
```

```css
body {
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 400;
}
.english-title {
  font-family: "Playfair Display", "Noto Sans KR", serif;
  font-weight: 600;
}
```

### Pretendard 가변 동적 서브셋 적용

제작자가 안내하는 가변 동적 서브셋 CSS입니다. 이 버전의 패밀리명은 Pretendard Variable입니다. 버전을 고정해 사용합니다. [4]

```html
<link rel="stylesheet" crossorigin
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
```

```css
body {
  font-family: "Pretendard Variable", sans-serif;
}
```

### 한글과 영문 혼용

```css
.mixed-text {
  font-family: "Inter", "Pretendard Variable", sans-serif;
}
```

Inter가 로드되어 있으면 지원하는 영문·숫자·문장부호를 먼저 담당하고, 한글은 뒤의 폰트가 담당합니다. 한영 제목의 크기나 기준선을 각각 조정해야 한다면 span 등 별도 요소로 나누어 지정합니다.

### 자체 호스팅 운영

운영 서비스에서는 검증된 웹폰트 파일과 CSS를 보관하고 버전·해시를 고정하는 방식을 권합니다. 한글은 공급자가 제공하는 서브셋 구성을 우선 검토하고, 직접 변환·서브셋을 만들 때는 해당 배포본의 수정 및 예약 폰트명 조건을 확인합니다. [2–3]

## 생성기 구현과 출력 검증

사용자에게는 용도·분위기·추천 조합을 보여주고, 내부에는 배포 정보와 지원 범위를 저장합니다. 폰트명만 저장하면 버전 변경이나 렌더링 환경 차이를 추적하기 어렵습니다.

| 관리 항목 | 저장하거나 표시할 정보 |
| --- | --- |
| 식별과 배포 | 고유 ID, CSS 패밀리명, 공급처, 버전, 파일 해시 |
| 문자 지원 | 한글·영문 지원과 채택 파일의 실제 글리프 범위 |
| 스타일 | 실제 지원 굵기, 이탤릭 유무, 가변 축 |
| 추천 정보 | 제목·본문·숫자·코드 역할, 분위기, 조합 프리셋 |
| 라이선스 | 원문 URL, 저작권 고지, 수정·재배포 조건, 확인일 |
| 실문구 미리보기 | 사용자 제목·본문·가격을 같은 조건에서 비교 |

### 지원하지 않는 굵기와 기울임 제한

Black Han Sans와 Do Hyeon처럼 단일 굵기인 폰트는 선택 가능한 굵기를 제한합니다. 브라우저가 가짜 굵기나 기울임을 합성하지 않게 하려면 아래 속성을 사용합니다. 필요한 실제 스타일 파일을 로드하는 작업은 별도로 해야 합니다. [14]

```css
.design-text { font-synthesis: none; }
```

### 폰트 로딩 완료 후 레이아웃과 이미지 출력

폰트 CSS가 등록된 뒤 실제 텍스트와 굵기를 전달해 로딩을 기다립니다. 아래 예시는 Pretendard를 사용하는 제목 한 개에 대한 처리입니다. 여러 요소를 출력할 때는 사용된 모든 폰트·굵기·문구 조합에 적용합니다. [13]

```javascript
const title = "오늘의 초록을 발견하세요";
const faces = await document.fonts.load(
  '700 64px "Pretendard Variable"', title
);
if (faces.length === 0) {
  throw new Error("Requested font is not registered");
}
await document.fonts.ready;
// Now measure text, verify overflow, and export.
```

load()는 개별 글자의 존재 여부까지 검증하지 않습니다. 누락 글자는 별도로 검사하고, 로딩 실패 때 대체 폰트로 조용히 내보내지 않도록 오류를 처리합니다. [13]

출력 전에는 폰트·굵기 일치, 누락 글자, 줄바꿈, 영역 넘침, 작은 글자 가독성을 확인합니다. 편집 화면과 서버 렌더러에는 같은 파일을 사용하고, 엄격한 재현성이 필요하면 브라우저·렌더러 버전도 고정합니다.

## 공식 출처와 확인 범위

조사 기준일은 2026년 9월 21일입니다. 한글 및 영문 웹폰트 표의 폰트명에는 공식 배포처 또는 Google Fonts 견본 링크를 연결했습니다. 아래 번호는 본문에 인용한 라이선스와 구현 자료입니다.

[\[1\] Google Fonts 이용 안내](https://developers.google.com/fonts)  |  상업용과 비상업용 프로젝트의 사용 안내

[\[2\] SIL Open Font License 공식 원문](https://openfontlicense.org/open-font-license-official-text/)  |  OFL 1.1의 사용과 재배포 조건

[\[3\] OFL FAQ](https://openfontlicense.org/ofl-faq/)  |  웹폰트 배포와 서브셋 및 예약 폰트명

[\[4\] Pretendard 공식 저장소](https://github.com/orioncactus/pretendard)  |  웹폰트와 가변 동적 서브셋 적용

[\[5\] SUIT 공식 저장소](https://github.com/sun-typeface/SUIT)  |  UI 본문 설계와 웹폰트 적용

[\[6\] Gowun Batang 공식 저장소](https://github.com/yangheeryu/Gowun-Batang)  |  설계 의도와 현대 한글 지원 범위

[\[7\] Black Han Sans 원 제작자 저장소](https://github.com/zesstype/Black-Han-Sans)  |  제목용 설계와 원 배포본 문자 범위

[\[8\] Google Fonts Manrope 라이선스](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt)  |  Google Fonts 배포본의 OFL 원문

[\[9\] Manrope 제작자 사이트](https://www.sharanda.com/manrope)  |  Manrope V5의 별도 라이선스

[\[10\] Inter 공식 사이트](https://rsms.me/inter/)  |  웹 사용과 OpenType 숫자 기능

[\[11\] Bebas Neue 공식 저장소](https://github.com/dharmatype/Bebas-Neue)  |  무료판과 유료 계열의 구분

[\[12\] Google Fonts CSS API](https://developers.google.com/fonts/docs/css2)  |  패밀리와 굵기 및 가변 폰트 요청

[\[13\] MDN FontFaceSet load](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/load)  |  웹폰트 로딩과 글리프 검사 한계

[\[14\] MDN font synthesis](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-synthesis)  |  합성 굵기와 기울임 제어

### 도입 시 확인할 범위

무료 여부와 웹 사용 가능 여부는 명시된 배포본 기준입니다. 실제 서비스에 포함할 파일의 버전, 라이선스, 문자 지원 범위를 확정한 뒤 등록합니다. 이 문서의 폰트 강점·추천 조합·권장 굵기는 제품 설계를 위한 제안이며, 실제 문구와 화면 크기로 최종 검토합니다.

본문의 코드는 적용 예시입니다. 서비스의 이미지 내보내기 엔진과 브라우저 환경에서 폰트 로딩·줄바꿈·글리프 누락을 함께 검증해야 합니다.
