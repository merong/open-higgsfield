import { isPageFormat } from "@/projects/product-detail";
import {
  MODELS,
  getModel,
  parseSettings,
  type GenerationPlane,
} from "@/generation/catalog";
import type { Project, Slot } from "./types";
export function projectModels(project: Pick<Project, "format" | "ratio">) {
  const candidates =
    project.ratio === "4:5"
      ? ["4:5", "3:4", "1:1"]
      : isPageFormat(project.format)
        ? ["16:9", "4:3", "3:4"]
        : [project.ratio];
  return MODELS.filter(
    (m) =>
      m.surface === (project.format === "reels" ? "video" : "image") &&
      !/motion|edit|extend/.test(m.id) &&
      m.settings.aspectRatio?.type === "enum" &&
      candidates.some(
        (r) =>
          m.settings.aspectRatio.type === "enum" &&
          m.settings.aspectRatio.values.includes(r),
      ),
  );
}
export function planeFor(project: Project, slot: Slot): GenerationPlane {
  const model = getModel(project.modelId),
    field = model.settings.aspectRatio;
  const candidates =
    isPageFormat(project.format)
      ? ["16:9", "4:3", "3:4"]
      : project.ratio === "4:5"
        ? ["4:5", "3:4", "1:1"]
        : [project.ratio];
  const ratio =
    field?.type === "enum"
      ? candidates.find((r) => field.values.includes(r))
      : undefined;
  if (!ratio) throw new Error("선택한 모델은 이 비율을 지원하지 않습니다.");
  const values: Record<string, unknown> = { aspectRatio: ratio };
  for (const key of ["batchSize", "numImages"]) {
    const field = model.settings[key];
    if (field?.type === "enum") values[key] = "1";
    else if (field?.type === "range") values[key] = 1;
  }
  const duration = model.settings.duration;
  if (duration?.type === "range")
    values.duration = Math.max(
      duration.min,
      Math.min(duration.max, Math.round(slot.duration)),
    );
  else if (duration?.type === "enum")
    values.duration =
      duration.values.find((v) => Number(v) >= slot.duration) ||
      duration.default;
  return {
    model: model.id,
    prompt: { text: slot.prompt },
    media: {},
    settings: parseSettings(model, values),
  };
}
