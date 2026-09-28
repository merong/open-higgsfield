export interface ReelRecommendation {
  idea: string;
  shots: { sourceImageId: string; title: string; motion: string }[];
  observations: string[];
  uncertainties: string[];
}
export function reelRecommendedPrompt(result: ReelRecommendation, images: { id: string }[]) {
  return `${result.idea}\n\n컷 구성 제안\n${result.shots.map((s, i) => `${i + 1}. 사진 ${images.findIndex(image => image.id === s.sourceImageId) + 1} · ${s.title}: ${s.motion}`).join("\n")}`;
}
