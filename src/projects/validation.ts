import { parseTypography } from "./typography-validation";
import { PRODUCT_FIELDS, isPageFormat, type ProductInfo } from "./product-detail";
import { IMAGE_SIZES, type ImagePlan } from "./landing-images";
import { FORMATS, PRESETS, formatFor, safeLink } from "./formats";
import type { Brief, FormatId, Media, Project, Slot } from "./types";
import { ServiceError, object, text } from "@/service/errors";
function choice<T extends string>(
  value: unknown,
  list: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !list.includes(value as T))
    throw new ServiceError(400, `${label} 값을 확인해 주세요.`);
  return value as T;
}
function number(value: unknown, min: number, max: number, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new ServiceError(400, `${label} 범위를 확인해 주세요.`);
  return value;
}
export function parseBrief(value: unknown): Brief {
  const b = object(value);
  return {
    topic: text(b.topic, "주제", 90, 1),
    audience: text(b.audience ?? "", "대상", 100),
    tone: choice(b.tone, ["friendly", "expert", "witty", "calm"], "톤"),
    count: number(b.count, 2, 20, "장수"),
    mustInclude: text(b.mustInclude ?? "", "필수 내용", 3000),
  };
}
export function mediaUrl(value: unknown): string {
  const url = text(value, "에셋 URL", 2048, 1);
  if (
    /^\/api\/workspace\/assets\/[a-zA-Z0-9-]+$/.test(url) ||
    /^\/content\/[a-zA-Z0-9.-]+$/.test(url) ||
    /^\/content\/thumbnails\/[a-zA-Z0-9_-]+\.(webp|jpg|png)$/.test(url)
  )
    return url;
  try {
    if (new URL(url).protocol === "https:") return url;
  } catch {
    /* Invalid remote asset. */
  }
  throw new ServiceError(400, "올바른 에셋 주소가 아닙니다.");
}
function parseMedia(value: unknown): Media | undefined {
  if (value === undefined || value === null) return undefined;
  const m = object(value);
  return {
    url: mediaUrl(m.url),
    kind: choice(m.kind, ["image", "video"], "에셋"),
    name: text(m.name ?? "", "파일명", 255),
  };
}
export function parseImagePlan(value: unknown): ImagePlan {
  const p = object(value);
  if (typeof p.enabled !== "boolean") throw new ServiceError(400, "이미지 포함 여부를 확인해 주세요.");
  return { enabled: p.enabled, ratio: choice(p.ratio, Object.keys(IMAGE_SIZES) as ImagePlan["ratio"][], "이미지 비율"), description: text(p.description, "이미지 설명", 500, 1) };
}
export function parseProject(value: unknown): Project {
  const p = object(value);
  const format = choice(
    p.format,
    FORMATS.map((f) => f.id),
    "포맷",
  ) as FormatId;
  const entry = formatFor(format);
  if (
    !Array.isArray(p.slots) ||
    p.slots.length < 1 ||
    p.slots.length > entry.max
  )
    throw new ServiceError(400, "슬롯 수를 확인해 주세요.");
  const slots: Slot[] = p.slots.map((value) => {
    const s = object(value);
    const href = text(s.href ?? "", "링크", 2048);
    if (href && !safeLink(href))
      throw new ServiceError(
        400,
        "버튼 링크는 http(s), mailto, tel 또는 #섹션 주소를 사용해 주세요.",
      );
    const lines =
      typeof s.body === "string"
        ? s.body.split("\n").filter(Boolean).length
        : 0;
    if ((s.kind === "list" && lines > 5) || (s.kind === "compare" && lines > 2))
      throw new ServiceError(
        400,
        s.kind === "list"
          ? "목록은 5개 이내로 작성해 주세요."
          : "비교 항목은 두 줄 이내로 작성해 주세요.",
      );
    return {
      id: text(s.id, "슬롯 ID", 80, 1),
      kind: choice(
        s.kind,
        entry.kinds.map((k) => k.id),
        "템플릿",
      ),
      title: text(s.title, "제목", 90),
      body: text(s.body, "본문", isPageFormat(format) ? 2000 : 360),
      kicker: text(s.kicker ?? "", "머리말", 60),
      prompt: text(s.prompt ?? "", "프롬프트", 3000),
      cta: text(s.cta ?? "", "버튼 문구", 50),
      href,
      duration: number(s.duration, 1, 15, "장면 길이"),
      trim: number(s.trim, 0, 3600, "시작 시간"),
      composition: choice(s.composition, ["full", "split", "inset"], "구도"),
      dim: number(s.dim, 0, 1, "어둡기"),
      crop: number(s.crop, 0, 100, "사진 위치"),
      ...(s.readingLayout ? { readingLayout: choice(s.readingLayout, ["balanced", "text-first", "image-first"] as const, "읽기 배치") } : {}),
      appliedJobId: s.appliedJobId
        ? text(s.appliedJobId, "생성 ID", 80, 1)
        : undefined,
      media: parseMedia(s.media),
      ...(s.imagePlan ? { imagePlan: parseImagePlan(s.imagePlan) } : {}),
    };
  });
  if (new Set(slots.map((s) => s.id)).size !== slots.length)
    throw new ServiceError(400, "슬롯 ID가 중복되었습니다.");
  const audio = p.audio ? object(p.audio) : undefined;
  return {
    id: text(p.id, "프로젝트 ID", 80, 1),
    format,
    title: text(p.title, "프로젝트 이름", 120, 1),
    brief: parseBrief(p.brief),
    preset: choice(
      p.preset,
      PRESETS.map((s) => s.id),
      "스타일",
    ),
    ...(p.typography ? { typography: parseTypography(p.typography) } : {}),
    ratio: choice(p.ratio, entry.ratios, "비율"),
    brand: text(p.brand ?? "", "브랜드", 60),
    caption: text(p.caption ?? "", "캡션", 5000),
    modelId: text(p.modelId, "모델", 100, 1),
    slots,
    ...(format === "product-detail" ? { product: parseProductInfo(p.product || {}) } : {}),
    audio: audio
      ? { url: mediaUrl(audio.url), name: text(audio.name, "오디오 이름", 255) }
      : undefined,
    version: number(p.version, 1, Number.MAX_SAFE_INTEGER, "버전"),
    createdAt: number(p.createdAt, 0, Number.MAX_SAFE_INTEGER, "생성 시간"),
    updatedAt: number(p.updatedAt, 0, Number.MAX_SAFE_INTEGER, "수정 시간"),
  };
}

export function parseProductInfo(input: unknown, required = false): ProductInfo {
  const d = object(input);
  return Object.fromEntries(PRODUCT_FIELDS.map(f => [f.key, text(d[f.key] ?? "", f.label, f.max, required && f.key === "name" ? 1 : 0)])) as unknown as ProductInfo;
}
