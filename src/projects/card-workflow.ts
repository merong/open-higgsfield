import type { EditorialLoop } from "./editorial-review";
import type { Project, Preset } from "./types";
import type { ReasoningEffort } from "@/service/openai-models";

export type Origin = "user_explicit" | "user_confirmed" | "ai_assumed" | "default";
export type SpecValue = { value: string; origin: Origin };
export type WorkflowStage = "understand" | "research" | "plan" | "write" | "review" | "patch";
export type WorkflowStatus = "pending" | "running" | "waiting_user" | "waiting_tool" | "ready" | "completed" | "paused_budget" | "failed" | "cancelled";
export type WorkflowQuestion = { id: string; kind: "purpose" | "plan" | "style" | "research"; text: string; options: { value: string; label: string; description: string }[] };
export type WorkflowSource = { url: string; title: string; claim: string; accessedAt: number };
export type WorkflowEvent = { id: string; type: string; title: string; message: string; at: number; revision: number };
export type CardWorkflow = {
  editorial?: EditorialLoop;
  typographyRecommendations?: import("./typography").TypographyRecommendation[];
  id: string; projectId: string; revision: number; status: WorkflowStatus; stage: WorkflowStage; project: Project;
  idea: string; mode: "guided" | "delegate"; model: string; effort: ReasoningEffort | null;
  spec: { purpose: SpecValue; audience: SpecValue; channel: SpecValue; count: SpecValue; constraints: string[] };
  question?: WorkflowQuestion; responses: string[]; events: WorkflowEvent[];
  plan: { role: string; title: string; message: string; imagePrompt?: string }[]; needsResearch: boolean; sources: WorkflowSource[]; researchNote: string;
  feedback: string; targetIds: string[]; review: { summary: string; issues: { cardId: string; message: string }[]; warnings: string[] } | null;
  budget: { calls: number; maxCalls: number; activeMs: number; maxActiveMs: number; repairs: number; maxRepairs: number; images: number; maxImages: number };
  cardVersions: Record<string, number>; sourceRunId?: string; error?: string;
  visual?: { key: string; cardId: string; version: number; startedAt: number; jobId?: string; requestId?: string; state: string; error?: string; returnStatus: WorkflowStatus; mediaUrl?: string };
  patchMode?: "layout" | "copy";
  imageBatch?: { key: string; state: "running" | "completed" | "stopped"; cardIds: string[]; index: number; credits: number; prices?: Record<string, number>; results: { cardId: string; state: string }[] };
  quality?: { state: "running" | "ready" | "failed"; projectVersion: number; assetId: string; zipHash: string; summary?: string; cards?: CardQuality[]; output?: OutputCheck[]; error?: string; reviewedAt?: number; acknowledged?: boolean; imageException?: string };
  artifacts?: { projectVersion: number; zipUrl: string; files: { name: string; url: string }[]; width: number; height: number };
  createdAt: number; updatedAt: number;
};
export const QUALITY_LABELS = { matching: "텍스트 매칭", typography: "타이포그래피", content: "내용 검수", output: "출력 검수", protection: "문구 보호" } as const;
export type QualityCriterion = keyof typeof QUALITY_LABELS;
export type QualityFinding = { criterion: QualityCriterion; status: "pass" | "attention" | "fail"; evidence: string; suggestion: string };
export type CardQuality = { cardId: string; findings: QualityFinding[] };
export type OutputCheck = { cardId: string; mobileBodyPx: number; issues: string[] };
export const WORKFLOW_LABELS: Record<WorkflowStage, string> = { understand: "요청 이해", research: "근거 조사", plan: "장별 기획", write: "카드 작성", review: "내용 검수", patch: "선택 카드 수정" };
export const ORIGIN_LABELS: Record<Origin, string> = { user_explicit: "직접 입력", user_confirmed: "사용자 확정", ai_assumed: "AI 추정", default: "기본값" };
export const COVER_STYLES: { id: Preset; label: string; description: string }[] = [
  { id: "editorial", label: "담백한 매거진", description: "여백과 짧은 문구로 핵심을 전달해요." },
  { id: "soft", label: "부드러운 이야기", description: "차분한 색감으로 친근하게 설명해요." },
  { id: "impact", label: "선명한 메시지", description: "크고 분명한 제목으로 시선을 모아요." },
];
export const workflowTerminal = (r: CardWorkflow) => ["completed", "failed", "cancelled"].includes(r.status);
