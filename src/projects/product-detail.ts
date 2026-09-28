export type PageFormat = "landing" | "product-detail";
export const PRODUCT_IMAGE_LIMIT = 6;
export const PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
export interface ProductImage { id: string; name: string; url: string; width: number; height: number }
export const isPageFormat = (format: string): format is PageFormat => format === "landing" || format === "product-detail";
export const PRODUCT_KINDS = ["hero", "features", "story", "usage", "specs", "shipping", "faq", "cta"] as const;
export const PRODUCT_LABELS: Record<string, string> = { hero: "상품 소개", features: "구매 포인트", story: "상품 디테일", usage: "사용 방법", specs: "상품 규격", shipping: "배송·반품", faq: "구매 전 질문", cta: "구매 연결" };
export interface ProductInfo {
  name: string; category: string; price: string; options: string; specs: string; usage: string; shipping: string; returns: string;
}
export const emptyProduct = (): ProductInfo => ({ name: "", category: "", price: "", options: "", specs: "", usage: "", shipping: "", returns: "" });
export const PRODUCT_FIELDS = [
  { key: "name", label: "상품명", hint: "예: 모닝 세라믹 머그", max: 90 },
  { key: "category", label: "카테고리", hint: "예: 주방·테이블웨어", max: 100 },
  { key: "price", label: "판매 가격", hint: "예: 28,000원 · 부가세 포함", max: 120 },
  { key: "options", label: "옵션·구성", hint: "예: 아이보리 / 차콜, 머그 1개", max: 600 },
  { key: "specs", label: "소재·크기·상품 규격", hint: "한 줄에 항목 | 값\n소재 | 도자기\n용량 | 300 ml", max: 1800 },
  { key: "usage", label: "사용법·주의 사항", hint: "확인된 사용 방법과 관리 요령을 입력해 주세요.", max: 1200 },
  { key: "shipping", label: "배송 안내", hint: "배송비, 출고 소요 기간, 배송 가능 지역 등", max: 1000 },
  { key: "returns", label: "교환·반품 안내", hint: "접수 방법, 기간, 비용과 예외 조건 등", max: 1000 },
] as const;
export const PRODUCT_EXAMPLES = [
  { label: "리빙·주방", idea: "손에 편안한 곡선과 차분한 색을 가진 모닝 세라믹 머그입니다. 집에서 커피를 즐기는 사람에게 소재와 사용 장면을 보여 주세요. 확인되지 않은 내열 수치나 인증, 후기는 넣지 마세요.", product: { ...emptyProduct(), name: "모닝 세라믹 머그", category: "리빙·주방", price: "28,000원", options: "아이보리 / 차콜 · 머그 1개", specs: "소재 | 도자기\n용량 | 300 ml", usage: "부드러운 스펀지로 손세척해 주세요." } },
  { label: "패션·잡화", idea: "가볍게 외출할 때 사용하는 캔버스 토트백입니다. 노트와 소지품을 담는 일상 장면과 실제 수납 구성을 중심으로 소개해 주세요.", product: { ...emptyProduct(), name: "데일리 캔버스 토트", category: "패션·잡화", specs: "소재 | 면 캔버스", options: "내추럴 / 블랙" } },
  { label: "식물·원예", idea: "첫 반려식물을 분갈이하려는 사람을 위한 작은 원예 도구 세트입니다. 각 구성품의 쓰임과 보관법을 쉽게 소개해 주세요. 성장 효과를 보장하는 표현은 제외해 주세요.", product: { ...emptyProduct(), name: "첫 분갈이 도구 세트", category: "식물·원예", options: "모종삽 1개 · 작업 매트 1개 · 이름표 5개" } },
];
