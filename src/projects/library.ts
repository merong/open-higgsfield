export const LIBRARY_FEATURES = {
  "studio-image": "스튜디오 · 이미지",
  "studio-video": "스튜디오 · 영상",
  "card-news": "카드뉴스",
  reels: "숏폼 · 릴스",
  landing: "랜딩 페이지",
  "product-detail": "제품 상세 페이지",
  files: "보관 파일",
} as const;
export type LibraryFeature = keyof typeof LIBRARY_FEATURES;
export type LibraryItem = {
  id: string; ownerId: string; ownerName: string; username: string | null;
  feature: LibraryFeature; kind: "image" | "video" | "audio" | "file";
  name: string; prompt: string; model: string; url: string;
  projectId: string | null; projectDeleted: boolean; createdAt: number;
};
export type LibraryResult = { items: LibraryItem[]; total: number; page: number; pages: number };
