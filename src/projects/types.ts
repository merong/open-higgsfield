export type FormatId = "card-news" | "reels" | "landing" | "product-detail";
export type Preset = "basic" | "editorial" | "impact" | "soft";
export type Ratio = "4:5" | "3:4" | "1:1" | "9:16";
export type Composition = "full" | "split" | "inset";
export interface Brief {
  topic: string;
  audience: string;
  tone: string;
  count: number;
  mustInclude: string;
}
export interface Media {
  url: string;
  kind: "image" | "video";
  name?: string;
}
export interface Slot {
  id: string;
  kind: string;
  title: string;
  body: string;
  kicker: string;
  prompt: string;
  cta: string;
  href: string;
  duration: number;
  trim: number;
  composition: Composition;
  dim: number;
  crop: number;
  readingLayout?: "balanced" | "text-first" | "image-first";
  imagePlan?: import("./landing-images").ImagePlan;
  media?: Media;
  appliedJobId?: string;
}
export interface Project {
  id: string;
  format: FormatId;
  title: string;
  brief: Brief;
  ratio: Ratio;
  preset: Preset;
  typography?: import("./typography").Typography;
  brand: string;
  caption: string;
  modelId: string;
  slots: Slot[];
  product?: import("./product-detail").ProductInfo;
  audio?: { url: string; name: string };
  createdAt: number;
  updatedAt: number;
  version: number;
}
export interface Job {
  id: string;
  request_id?: string;
  state: "submitting" | "pending" | "completed" | "failed" | "unknown";
  slot_id?: string;
  project_id?: string;
  cost: number;
  review_required?: boolean;
  result?: {
    status: string;
    images?: { url: string }[];
    video?: { url: string };
    error?: string;
  };
  created_at: number;
}
