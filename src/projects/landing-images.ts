import { MODELS, getModel, parseSettings, type GenerationPlane } from "@/generation/catalog";
import type { Slot, Media } from "./types";
export const IMAGE_SIZES = { "16:9": [1600, 900], "3:4": [900, 1200], "1:1": [1200, 1200] } as const;
export interface ImagePlan { enabled: boolean; ratio: keyof typeof IMAGE_SIZES; description: string }
export function imagePlan(s: Pick<Slot, "kind" | "title" | "imagePlan" | "media">): ImagePlan {
  return s.imagePlan || { enabled: !!s.media || ["hero", "features", "story", "usage"].includes(s.kind), ratio: s.kind === "hero" ? "3:4" : "16:9", description: s.title || "이 섹션의 메시지를 보여 주는 장면" };
}
export const PRODUCT_REFERENCE_MODEL = "marketing-image";
export function imageModels(ratio: ImagePlan["ratio"], reference = false) {
  return MODELS.filter(m => m.surface === "image" && (!reference || !!m.roles.reference && !!m.paths?.reference) && (!!m.paths?.text || m.id === "soul-2" || m.id === "soul-cinema") && m.settings.aspectRatio?.type === "enum" && m.settings.aspectRatio.values.includes(ratio));
}
export function imagePlane(modelId: string, prompt: string, ratio: ImagePlan["ratio"], references: { id: string; url: string }[] = []): GenerationPlane {
  if (!imageModels(ratio, references.length > 0).some(m => m.id === modelId)) throw new Error("선택한 비율을 지원하는 이미지 모델을 선택해 주세요.");
  const model = getModel(modelId), settings: Record<string, unknown> = { aspectRatio: ratio };
  for (const key of ["batchSize", "numImages"]) { const f = model.settings[key]; if (f) settings[key] = f.type === "enum" ? "1" : 1; }
  return { model: modelId, prompt: { text: prompt }, media: references.length ? { reference: references.map(r => ({ ...r, role: "reference" as const })) } : {}, settings: parseSettings(model, settings) };
}
export const imageFingerprint = (slot: Slot) => {
  const plan = imagePlan(slot);
  return JSON.stringify([slot.title, slot.body, slot.kind, slot.prompt, plan.enabled, plan.ratio, plan.description, slot.media?.kind || "", slot.media?.url || "", slot.appliedJobId || ""]);
};
export type ImageItemState = "idle" | "queued" | "submitting" | "pending" | "completed" | "failed" | "unknown";
export interface ImageItem {
  referenceImageIds?: string[];
  slotId: string; title: string; plan: ImagePlan; prompt: string; model: string; cost: number; fingerprint: string;
  state: ImageItemState; key?: string; jobId?: string; startedAt?: number; error?: string;
  candidate?: Media; applied?: boolean;
}
export interface ImageBoard { referenceImages?: import("./product-detail").ProductImage[]; projectId: string; revision: number; items: ImageItem[]; updatedAt: number }
export const imageBusy = (b: ImageBoard) => b.items.some(i => ["queued", "submitting", "pending"].includes(i.state));
export const imagePlaceholder = (plan: ImagePlan) => {
  const [width, height] = IMAGE_SIZES[plan.ratio];
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#e8e9e5"/><path d="M0 0L${width} ${height}M${width} 0L0 ${height}" stroke="#c5c9c0" stroke-width="1"/></svg>`)}`;
};

export function productImagePrompt(title: string, description: string) {
  return `Create a product photograph for this section: ${title}. Scene: ${description}. Use the attached product photo as the source of truth. Preserve the exact product shape, proportions, color, material, branding, logos and included parts. Only change the background, lighting and composition to suit the section. Do not invent product features, accessories or hidden details. Do not add text or new logos.`;
}
