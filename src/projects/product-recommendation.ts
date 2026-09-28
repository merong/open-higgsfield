import type { ProductInfo } from "./product-detail";
export const PRODUCT_RECOMMENDATION_FIELDS = [
  { key: "name", label: "상품명" },
  { key: "category", label: "카테고리" },
  { key: "description", label: "상품 설명" },
] as const;
export type ProductRecommendationField = typeof PRODUCT_RECOMMENDATION_FIELDS[number]["key"];
export interface ProductRecommendation {
  name: string; category: string; description: string;
  observations: string[]; uncertainties: string[];
}
export function applyProductRecommendation(product: ProductInfo, description: string, suggestion: ProductRecommendation, fields: ProductRecommendationField[]) {
  return {
    product: { ...product, ...(fields.includes("name") && suggestion.name ? { name: suggestion.name } : {}), ...(fields.includes("category") && suggestion.category ? { category: suggestion.category } : {}) },
    description: fields.includes("description") && suggestion.description ? suggestion.description : description,
  };
}
