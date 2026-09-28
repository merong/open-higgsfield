import type { ProductImage } from "./product-detail";

export interface LandingRecommendation {
  idea: string;
  sections: { sourceImageId: string; title: string; purpose: string }[];
  observations: string[];
  uncertainties: string[];
}

export function landingRecommendedPrompt(result: LandingRecommendation, images: ProductImage[]) {
  return `${result.idea}\n\n이미지 활용 제안:\n${result.sections.map(section => `사진 ${images.findIndex(image => image.id === section.sourceImageId) + 1} · ${section.title}: ${section.purpose}`).join("\n")}`;
}
