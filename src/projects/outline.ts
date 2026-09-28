import { isPageFormat, emptyProduct, PRODUCT_LABELS } from "./product-detail";
import type { Brief, FormatId, Project, Preset, Ratio } from "./types";
import { formatFor, newSlot } from "./formats";

/* This draft is deliberately deterministic; it never pretends to be LLM copy. */
export function createDraft(
  format: FormatId,
  brief: Brief,
  preset: Preset = "editorial",
  ratio?: Ratio,
): Project {
  const f = formatFor(format);
  const count = Math.max(2, Math.min(f.max, brief.count));
  const points = brief.mustInclude
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const slots = Array.from({ length: count }, (_, i) => {
    const kind =
      isPageFormat(format)
        ? i === 0
          ? "hero"
          : i === count - 1
            ? "cta"
            : (format === "product-detail" ? ["features", "story", "usage", "specs", "shipping", "faq"] : ["features", "story", "faq"])[(i - 1) % (format === "product-detail" ? 6 : 3)]
        : i === 0
          ? "cover"
          : i === count - 1
            ? "cta"
            : "body";
    const slot = newSlot(kind);
    if (format === "product-detail") return {
      ...slot, title: i === 0 ? brief.topic : PRODUCT_LABELS[kind],
      body: kind === "specs" ? "상품 정보에서 확인된 규격을 입력해 주세요." : kind === "shipping" ? "상품 정보에서 배송·반품 안내를 입력해 주세요." : i === 0 ? brief.audience : points[i - 1] || "상품의 실제 정보를 바탕으로 설명을 완성해 주세요.",
      cta: ["hero", "cta"].includes(kind) ? "구매하러 가기" : "",
      prompt: ["hero", "features", "story", "usage"].includes(kind) ? `${brief.topic}. Product detail photography, natural light. No text, no logos.` : "",
      imagePlan: { enabled: ["hero", "features", "story", "usage"].includes(kind), ratio: kind === "hero" ? "1:1" as const : "16:9" as const, description: `${brief.topic} · ${PRODUCT_LABELS[kind]}` },
    };
    return {
      ...slot,
      title:
        i === 0
          ? brief.topic
          : i === count - 1
            ? isPageFormat(format)
              ? "지금, 시작해 보세요"
              : "다음 이야기도 함께해요"
            : points[i - 1]?.slice(0, 90) ||
              [
                "어떤 점이 달라질까요?",
                "하나씩 살펴보세요",
                "나에게 맞는 선택",
              ][(i - 1) % 3],
      body:
        i === 0
          ? brief.audience
            ? `${brief.audience}을 위한 ${brief.topic}`
            : "전하고 싶은 핵심 메시지를 담아 보세요."
          : points[i - 1] ||
            "브랜드의 실제 정보와 경험을 바탕으로 이 문장을 완성해 주세요.",
      kicker: i === 0 ? "" : String(i).padStart(2, "0"),
      prompt: `${brief.topic}. ${points[i - 1] || "Editorial composition, natural light, refined material detail"}. No text, no logos.`,
      composition: format === "reels" ? ("full" as const) : ("split" as const),
    };
  });
  return {
    id: crypto.randomUUID(),
    format,
    title: brief.topic,
    brief: { ...brief, count },
    ratio: ratio || f.ratios[0],
    preset,
    brand: "",
    caption: `${brief.topic}\n\n${points.join("\n")}`,
    modelId: format === "reels" ? "kling-3-turbo" : "soul-2",
    slots,
    ...(format === "product-detail" ? { product: { ...emptyProduct(), name: brief.topic } } : {}),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}
