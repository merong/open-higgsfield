import { PRODUCT_KINDS, PRODUCT_LABELS } from "./product-detail";
import type { FormatId, Ratio, Slot } from "./types";
export interface FormatEntry {
  id: FormatId;
  label: string;
  noun: string;
  description: string;
  output: string;
  thumbnail: string;
  artworkTitle: string;
  artworkBadge: string;
  defaultCount: number;
  max: number;
  ratios: Ratio[];
  kinds: { id: string; label: string }[];
}
export const FORMATS: FormatEntry[] = [
  {
    id: "card-news",
    label: "카드뉴스",
    noun: "슬라이드",
    description: "한 장씩 읽히는 이야기. 문장과 사진의 균형을 만드세요.",
    output: "PNG · ZIP",
    thumbnail: "/content/pool-editorial.jpg",
    artworkTitle: "STORY\nIN SLIDES",
    artworkBadge: "4:5",
    defaultCount: 5,
    max: 20,
    ratios: ["4:5", "3:4", "1:1", "9:16"],
    kinds: [
      { id: "cover", label: "표지" },
      { id: "body", label: "본문" },
      { id: "list", label: "목록" },
      { id: "quote", label: "인용" },
      { id: "metric", label: "숫자" },
      { id: "compare", label: "비교" },
      { id: "cta", label: "마무리" },
    ],
  },
  {
    id: "reels",
    label: "숏폼 · 릴스",
    noun: "장면",
    description: "첫 장면의 훅부터 마지막 한마디까지. 짧고 선명하게.",
    output: "MP4 · 자막 · ZIP",
    thumbnail: "/content/thumbnails/record-dancer.webp",
    artworkTitle: "MAKE\nIT MOVE",
    artworkBadge: "9:16",
    defaultCount: 4,
    max: 12,
    ratios: ["9:16"],
    kinds: [
      { id: "cover", label: "오프닝" },
      { id: "body", label: "장면" },
      { id: "cta", label: "마무리" },
    ],
  },
  {
    id: "landing",
    label: "랜딩 페이지",
    noun: "섹션",
    description: "브랜드의 첫인상부터 행동까지. 한 페이지로 연결하세요.",
    output: "반응형 HTML · ZIP",
    thumbnail: "/content/thumbnails/landing-workspace.webp",
    artworkTitle: "YOUR\nFIRST PAGE",
    artworkBadge: "WEB",
    defaultCount: 5,
    max: 12,
    ratios: ["4:5"],
    kinds: [
      { id: "hero", label: "히어로" },
      { id: "features", label: "특징" },
      { id: "story", label: "스토리" },
      { id: "testimonial", label: "후기" },
      { id: "pricing", label: "가격" },
      { id: "faq", label: "자주 묻는 질문" },
      { id: "cta", label: "행동 유도" },
    ],
  },
  {
    id: "product-detail", label: "제품 상세 페이지", noun: "섹션",
    description: "상품의 매력부터 규격과 구매 안내까지. 선택할 이유를 전하세요.",
    output: "반응형 HTML · ZIP", thumbnail: "/content/sage-still-life.jpg",
    artworkTitle: "DETAILS\nTHAT SELL", artworkBadge: "PRODUCT",
    defaultCount: 7, max: 12, ratios: ["4:5"],
    kinds: PRODUCT_KINDS.map(id => ({ id, label: PRODUCT_LABELS[id] })),
  },
];
export const formatFor = (id: FormatId) => FORMATS.find((f) => f.id === id)!;
export const PRESETS = [
  { id: "basic", label: "시그니처" },
  { id: "editorial", label: "에디토리얼" },
  { id: "impact", label: "임팩트" },
  { id: "soft", label: "소프트" },
] as const;
export const DIMENSIONS: Record<Ratio, [number, number]> = {
  "4:5": [1080, 1350],
  "3:4": [1080, 1440],
  "1:1": [1080, 1080],
  "9:16": [1080, 1920],
};
export const newSlot = (kind = "body"): Slot => ({
  id: crypto.randomUUID(),
  kind,
  title: "새로운 이야기",
  body: "전하고 싶은 내용을 적어 주세요.",
  kicker: "",
  prompt: "",
  cta: "자세히 알아보기",
  href: "",
  duration: 4,
  trim: 0,
  composition: "split",
  dim: 0.5,
  crop: 0,
});
export function safeLink(value: string) {
  if (/^#[a-zA-Z0-9_-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol)
      ? value
      : "";
  } catch {
    return "";
  }
}
