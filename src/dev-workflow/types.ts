export const RUBRIC = "workflow-quality-v1";
export const dimensions = {
  intent: "의도 일치", factuality: "사실·상품 보존", visual: "시각 품질",
  image_fit: "이미지 적합성", effort: "사용자 부담", satisfaction: "고객 만족",
} as const;
export type Dimension = keyof typeof dimensions;
export type TraceKind = "project.created" | "workflow.state" | "user.action" | "model.request" | "model.response" | "model.error" | "model.parsed" | "tool.result" | "generation.request" | "generation.result" | "diagnostic";
export interface TraceEvent {
  id: string; seq: number; runId: string; turnId: string | null; phase: string;
  kind: TraceKind; label: string; at: number; data: Record<string, unknown>;
}
export interface TraceEvaluation {
  id: string; eventId: string; relatedEventId: string | null; author: string;
  source: "developer" | "customer_report"; dimension: Dimension; score: number | null;
  effect: "improved" | "degraded" | "unchanged" | "unknown";
  note: string; quote: string; rubric: string; at: number;
}
export interface TraceExperiment {
  id: string; baselineId: string; candidateId: string | null; hypothesis: string;
  dimension: Dimension; target: string; controls: string; at: number;
  decisions: { id: string; verdict: "adopt" | "reject" | "inconclusive"; note: string; author: string; at: number; evidence: { id: string; eventId: string; dimension: Dimension; source: TraceEvaluation["source"]; score: number | null; rubric: string; note: string }[] }[];
}
export interface TraceSnapshot {
  projectId: string; coverageStart: number; coverage: "new_project" | "legacy_partial";
  events: TraceEvent[]; total: number; nextBefore: number | null;
  evaluations: TraceEvaluation[]; experiments: TraceExperiment[];
  pending: number; relayError: boolean;
  captureGaps: number;
}
