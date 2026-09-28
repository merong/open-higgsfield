import type { Project } from "./types";
import type { ReasoningEffort } from "@/service/openai-models";

export const AGENT_STAGES = [
  { id: "brainstorm", title: "의도 정리", description: "메모에서 독자와 목적을 찾고 세 가지 방향을 제안합니다." },
  { id: "write", title: "초안 작성", description: "선택한 방향과 추가 의견을 각 카드에 반영합니다." },
  { id: "review", title: "편집 검수", description: "의도 반영, 흐름, 중복 표현과 확인할 사실을 점검합니다." },
  { id: "refine", title: "원고 개선", description: "검수 의견으로 문구와 이미지 프롬프트를 다듬습니다." },
] as const;
export type AgentStage = typeof AGENT_STAGES[number]["id"];
export type AgentStatus = "pending" | "running" | "awaiting_direction" | "ready" | "completed" | "cancelled" | "failed";
export type AgentPlan = {
  intent: string; audience: string; goal: string; assumptions: string[]; question: string;
  directions: { title: string; approach: string; hook: string }[];
};
export type AgentReview = { summary: string; strengths: string[]; changes: string[]; warnings: string[] };
export type AgentEvent = { id: string; stage: AgentStage; title: string; message: string; at: number };
export type CardAgentRun = {
  id: string; revision: number; status: AgentStatus; stage: AgentStage;
  model: string; effort: ReasoningEffort | null; draft: Project;
  plan?: AgentPlan; direction?: number; feedback: string; revisionFeedback: string;
  review?: AgentReview; preview?: Project; improvements: string[]; warnings: string[];
  refinementCount: number; turns: number; events: AgentEvent[];
  projectId?: string; error?: string; createdAt: number; updatedAt: number;
};
export const agentTerminal = (run: CardAgentRun) => ["completed", "cancelled", "failed"].includes(run.status);
