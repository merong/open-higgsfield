import type { EditorialLoop } from "./editorial-review";
import { PRODUCT_KINDS, type ProductInfo, type ProductImage } from "./product-detail";
import { imagePlan, type ImagePlan } from "./landing-images";
import type { Preset, Project } from "./types";
import { safeLink } from "./formats";

export const LANDING_GOALS = ["상담 문의", "구매·상품 보기", "참여·신청", "브랜드·서비스 소개"];
export const LANDING_KINDS = ["hero", "features", "story", "faq", "cta"] as const;
export interface LandingIntent {
  brand: string; audience: string; problem: string; value: string; goal: string;
  product?: ProductInfo;
  ctaLabel: string; ctaHref: string; traffic: string; facts: string; tone: string; preset: Preset;
}
export interface LandingSection {
  sourceImageId?: string;
  id: string; kind: typeof LANDING_KINDS[number] | typeof PRODUCT_KINDS[number]; title: string; question: string; message: string; imagePlan?: ImagePlan;
}
export interface LandingIssue { sectionId: string; message: string; severity: "attention" | "error" }
export interface LandingWorkflow {
  editorial?: EditorialLoop;
  typographyRecommendations?: import("./typography").TypographyRecommendation[];
  referenceImages?: ProductImage[];
  id: string; projectId: string; project: Project; revision: number; contentVersion: number;
  status: "pending" | "running" | "waiting_user" | "ready" | "paused" | "completed" | "cancelled";
  stage: "understand" | "plan" | "write" | "review" | "patch" | "refine";
  idea: string; model: string; effort?: string; intent: LandingIntent; explicit: string[];
  intentApproved: boolean; planApproved: boolean; plan: LandingSection[];
  events: { id: string; title: string; message: string; at: number }[];
  responses: string[]; calls: number; maxCalls: number; feedback: string; targetId: string;
  review?: { version: number; summary: string; issues: LandingIssue[] };
  hasDraft: boolean; error?: string; createdAt: number; updatedAt: number;
}
export const landingTerminal = (r: LandingWorkflow) => r.status === "completed" || r.status === "cancelled";
export function landingChecks(r: LandingWorkflow): LandingIssue[] {
  const issues: LandingIssue[] = [];
  const href = r.intent.ctaHref;
  if (!href || !safeLink(href)) issues.push({ sectionId: r.project.slots.at(-1)?.id || "", severity: "attention", message: "행동 버튼의 연결 주소가 아직 없어요. 편집기에서 실제 상담·신청·구매 주소를 추가하세요." });
  else if (href.startsWith("#") && !r.project.slots.some((_, i) => href === `#section-${i + 1}`)) issues.push({ sectionId: "", severity: "error", message: "연결한 페이지 내부 섹션이 없습니다. 버튼 주소를 수정해 주세요." });
  const missing = r.project.slots.filter(s => imagePlan(s).enabled && s.media?.kind !== "image");
  if (r.hasDraft && missing.length) issues.push({ sectionId: missing[0].id, severity: "attention", message: `계획한 이미지 중 ${missing.length}장이 비어 있어요. 전체 이미지 제작에서 생성·확인하거나 편집기에서 업로드하세요.` });
  if (r.project.format === "product-detail") {
    const p = r.project.product || r.intent.product;
    for (const [key, label] of [["price", "판매 가격"], ["specs", "상품 규격"], ["shipping", "배송 안내"], ["returns", "교환·반품 안내"]] as const) {
      if (!p?.[key]?.trim()) issues.push({ sectionId: "", severity: "attention", message: `${label}가 비어 있어요. 판매 전 실제 정보를 추가해 주세요.` });
    }
    if (r.project.slots.some(s => s.appliedJobId)) issues.push({ sectionId: "", severity: "attention", message: "AI 연출 이미지의 외형·색상·구성품이 실제 판매 상품과 일치하는지 확인해 주세요." });
  }
  return issues;
}
