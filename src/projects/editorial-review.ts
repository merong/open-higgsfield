export const EDITORIAL_CRITERIA = {
  intent: "의도 반영", facts: "사실·원문 보호", narrative: "흐름과 차별성",
  visual: "이미지와 메시지", readability: "읽기와 전달 밀도",
} as const;
export type EditorialCriterion = { key: keyof typeof EDITORIAL_CRITERIA; status: "pass" | "attention" | "fail"; evidence: string };
export type EditorialIssue = { targetId: string; severity: "attention" | "error"; message: string };
export type EditorialReview = { round: number; summary: string; criteria: EditorialCriterion[]; issues: EditorialIssue[]; at: number };
export type EditorialLoop = { repairs: number; scopeIds: string[]; targetIds: string[]; reviews: EditorialReview[] };
export const newEditorialLoop = (scopeIds: string[] = []): EditorialLoop => ({ repairs: 0, scopeIds, targetIds: [], reviews: [] });
export const MAX_EDITORIAL_REPAIRS = 2;
export function editorialTargets(loop: EditorialLoop) {
  return [...new Set(loop.reviews.at(-1)?.issues.filter(i => i.severity === "error" && i.targetId && (!loop.scopeIds.length || loop.scopeIds.includes(i.targetId))).map(i => i.targetId) || [])];
}
