import type { SlidePosition, ThumbState } from "@/index";

/* Original photographs generated for this showcase; see assets/README.md. */
const pool = `${import.meta.env.BASE_URL}images/pool-editorial.jpg`;
const sage = `${import.meta.env.BASE_URL}images/sage-still-life.jpg`;
export const PHOTOS = {
  sand: pool,
  bottle: sage,
  tile: sage,
  beach: pool,
  sunrise: pool,
} as const;

export type PhotoKey = keyof typeof PHOTOS;

export interface DeckSlide {
  kind: "cover" | "body" | "list" | "quote" | "cta";
  label: string;
  title: string;
  sub?: string;
  kicker?: string;
  body?: string;
  items?: { label: string; value?: string }[];
  source?: string;
  prompt: string;
  photo?: PhotoKey;
  dim?: number | "grad";
  position: SlidePosition;
}

export const TOPIC = "여름 자외선 차단제 고르는 법";
export const HANDLE = "@sunny.skin.lab";
export const TEMPLATES = ["표지", "본문", "목록", "인용", "CTA"] as const;

export const DECK: DeckSlide[] = [
  {
    kind: "cover",
    label: "표지",
    title: "SPF 숫자, 높을수록 좋을까?",
    sub: "자외선 차단제 고르는 법",
    kicker: "여름 피부 가이드",
    prompt: "한여름 해변, 강한 역광, 파라솔 그림자, 필름 톤",
    photo: "sand",
    dim: "grad",
    position: "end",
  },
  {
    kind: "body",
    label: "본문",
    title: "SPF와 PA는 다른 것을 막아요",
    body: "SPF는 피부를 태우는 UVB를, PA는 노화를 부르는 UVA를 막아요. 숫자 하나만 보고 고르면 절반만 막는 셈이에요.",
    prompt: "화장대 위 선크림 두 개, 부드러운 창가 빛, 얕은 심도",
    photo: "bottle",
    dim: 0.58,
    position: "end",
  },
  {
    kind: "list",
    label: "목록",
    title: "상황별 추천 지수",
    items: [
      { label: "출퇴근·실내", value: "SPF30 · PA++" },
      { label: "야외 활동", value: "SPF50+ · PA+++" },
      { label: "물놀이", value: "워터프루프" },
      { label: "민감성 피부", value: "무기자차" },
    ],
    prompt: "도심 출근길, 아침 햇살, 얕은 심도",
    photo: "tile",
    dim: 0.78,
    position: "mid",
  },
  {
    kind: "quote",
    label: "인용",
    title: "얼마나 센 걸 바르느냐보다, 2시간마다 덧바르느냐가 핵심입니다",
    source: "— 예시 문구 · 출처 확인 필요",
    prompt: "손등에 선크림을 짜는 클로즈업, 따뜻한 빛",
    photo: "beach",
    dim: 0.6,
    position: "mid",
  },
  {
    kind: "body",
    label: "본문",
    title: "흐린 날에도 발라야 하는 이유",
    body: "구름은 UVA를 거의 막지 못해요. 흐린 날의 자외선은 맑은 날의 80%까지 피부에 닿습니다.",
    prompt: "흐린 하늘 아래 도심 옥상, 확산광",
    photo: "sunrise",
    dim: 0.55,
    position: "end",
  },
  {
    kind: "body",
    label: "본문",
    title: "덧바르기, 이렇게 하면 쉬워요",
    body: "외출 전 15분, 그리고 2시간마다. 스틱형이나 쿠션형은 화장 위에도 덧바를 수 있어요.",
    prompt: "가방 속 스틱 선크림, 밝은 카페 테이블",
    photo: "bottle",
    dim: 0.55,
    position: "end",
  },
  {
    kind: "list",
    label: "목록",
    title: "성분표에서 확인할 것",
    items: [
      { label: "무기자차", value: "징크옥사이드" },
      { label: "유기자차", value: "아보벤존" },
      { label: "혼합", value: "둘 다 표기" },
    ],
    prompt: "선크림 뒷면 성분표 클로즈업, 매크로",
    photo: "sand",
    dim: 0.75,
    position: "mid",
  },
  {
    kind: "cta",
    label: "CTA",
    title: "저장해 두고 여름 내내 꺼내 보세요",
    sub: "다음 편: 선크림, 제대로 지우는 법",
    prompt: "",
    position: "mid",
  },
];

export function subline(s: DeckSlide): string {
  if (s.kind === "body") return s.body ?? "";
  if (s.kind === "list") return (s.items ?? []).map((i) => i.label).join(" · ");
  if (s.kind === "quote") return s.source ?? "";
  return s.sub ?? "";
}

export interface ProjectSample {
  title: string;
  meta: string;
  status: string;
  tone: "done" | "live" | "draft";
  deck: { state: ThumbState; photo?: PhotoKey }[];
}

export const PROJECTS: ProjectSample[] = [
  {
    title: "여름 자외선 차단제 고르는 법",
    meta: "카드뉴스 · 4:5 · 8장 · 12분 전",
    status: "3장 생성 중",
    tone: "live",
    deck: [
      { state: "image", photo: "sand" },
      { state: "image", photo: "bottle" },
      { state: "pending" },
      { state: "empty" },
    ],
  },
  {
    title: "아침 루틴 5가지",
    meta: "카드뉴스 · 1:1 · 6장 · 어제",
    status: "내보냄",
    tone: "done",
    deck: [
      { state: "image", photo: "sunrise" },
      { state: "image", photo: "tile" },
      { state: "image", photo: "beach" },
      { state: "flat" },
    ],
  },
  {
    title: "카페 신메뉴 소개",
    meta: "카드뉴스 · 4:5 · 6장 · 2일 전",
    status: "구성안",
    tone: "draft",
    deck: [
      { state: "flat" },
      { state: "empty" },
      { state: "empty" },
      { state: "empty" },
    ],
  },
  {
    title: "헬스장 첫 달 가이드",
    meta: "카드뉴스 · 4:5 · 10장 · 지난주",
    status: "완성",
    tone: "done",
    deck: [
      { state: "image", photo: "tile" },
      { state: "image", photo: "sand" },
      { state: "image", photo: "bottle" },
      { state: "flat" },
    ],
  },
  {
    title: "제주 3박 4일 코스",
    meta: "카드뉴스 · 4:5 · 8장 · 2주 전",
    status: "내보냄",
    tone: "done",
    deck: [
      { state: "image", photo: "beach" },
      { state: "image", photo: "sunrise" },
      { state: "image", photo: "sand" },
      { state: "flat" },
    ],
  },
];

export const PACKS = [
  { name: "스타터", credits: "1,000", price: "가격 책정 예정", best: false },
  { name: "크리에이터", credits: "3,000", price: "가격 책정 예정", best: true },
  { name: "스튜디오", credits: "10,000", price: "가격 책정 예정", best: false },
];

export const LEDGER: {
  when: string;
  what: string;
  detail: string;
  amount: string;
  tone: "minus" | "plus" | "refund";
}[] = [
  {
    when: "오늘 14:02",
    what: "이미지 생성 4장",
    detail: "여름 자외선 차단제 고르는 법 · Flux 2",
    amount: "16",
    tone: "minus",
  },
  {
    when: "오늘 14:02",
    what: "실패 환불",
    detail: "슬라이드 5 · 생성 실패",
    amount: "4",
    tone: "refund",
  },
  {
    when: "오늘 13:51",
    what: "구성안 생성",
    detail: "여름 자외선 차단제 고르는 법",
    amount: "1",
    tone: "minus",
  },
  {
    when: "어제 21:10",
    what: "이미지 생성 6장",
    detail: "아침 루틴 5가지 · Flux 2",
    amount: "24",
    tone: "minus",
  },
  {
    when: "9월 15일",
    what: "크레딧 충전",
    detail: "스타터 · 카드 결제",
    amount: "1,000",
    tone: "plus",
  },
  {
    when: "9월 12일",
    what: "가입 보너스",
    detail: "",
    amount: "300",
    tone: "plus",
  },
];
