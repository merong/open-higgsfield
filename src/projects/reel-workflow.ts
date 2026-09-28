import type { EditorialLoop } from "./editorial-review";
import type { ProductImage } from "./product-detail";
import type { Project } from "./types";
import type { WorkflowSource } from "./card-workflow";
export const REEL_FPS = 30;
export type ReelStatus = "pending" | "running" | "waiting_user" | "waiting_tool" | "ready" | "paused_budget" | "failed" | "cancelled" | "completed";
export type ReelStage = "understand" | "research" | "plan" | "patch" | "review" | "refine" | "production";
export interface ReelCue { id: string; startMs: number; endMs: number; text: string }
export interface ReelScene {
  id: string; role: string; title: string; screenText: string; narration: string; prompt: string;
  sourceImageId?: string;
  frames: number; version: number; copyLocked: boolean; durationLocked: boolean;
  subtitleStyle: "calm" | "emphasis"; textPosition: "lower" | "middle"; crop: number; zoom?: number;
  asset?: { id: string; kind: "image" | "video"; duration?: number; width: number; height: number; name: string };
  voice?: { assetId: string; durationMs: number; transcript: string; cues: ReelCue[]; matches: boolean; voice: string; alignmentError?: string };
}
export interface ReelIssue { sceneId: string; layer: string; severity: "error" | "attention"; message: string }
export interface ReelRender {
  id: string; version: number; sceneIds: string[]; kind: "sample" | "full";
  assetId: string; coverId: string; duration: number; frames: number; audio: boolean;
  issues: ReelIssue[]; checks: string[]; createdAt: number; reviewed?: boolean;
}
export interface ReelWorkflow {
  editorial?: EditorialLoop;
  id: string; projectId: string; project: Project; revision: number; contentVersion: number;
  status: ReelStatus; stage: ReelStage; idea: string; model: string; effort?: string;
  spec: { purpose: string; purposeOrigin: string; audience: string; duration: number; durationLocked: boolean; narration: boolean; voice: "coral" | "sage" | "cedar"; constraints: string[]; mode: "guided" | "delegate" };
  referenceImages?: ProductImage[];
  scenes: ReelScene[]; sources: WorkflowSource[]; researchNote: string; needResearch: boolean;
  question?: { id: string; kind: "purpose" | "plan" | "research"; text: string };
  events: { id: string; title: string; message: string; at: number; revision: number }[];
  responses: string[]; budget: { calls: number; maxCalls: number; generations: number; maxGenerations: number; voiceCalls: number; maxVoiceCalls: number; renders: number; maxRenders: number };
  feedback: string; targetIds: string[]; planApproved: boolean; sampleApproved: boolean;
  sample?: ReelRender; output?: ReelRender; history: ReelRender[];
  music?: { assetId: string; name: string; gain: number };
  task?: { key: string; kind: "image" | "video" | "voice" | "render"; sceneId: string; sceneVersion: number; version: number; state: string; startedAt: number; jobId?: string; error?: string; scope?: "sample" | "full"; renderStep?: string };
  quality?: { version: number; renderId: string; summary: string; issues: ReelIssue[] };
  reviews?: NonNullable<ReelWorkflow["quality"]>[];
  artifacts?: { zipId: string; videoId: string; coverId: string };
  error?: string; createdAt: number; updatedAt: number;
}
export const reelTerminal = (r: ReelWorkflow) => ["completed", "cancelled", "failed"].includes(r.status);
export function reelOverlayDescription(s: ReelScene) { return { id: s.id, version: s.version, title: s.title, screenText: s.screenText, subtitleStyle: s.subtitleStyle, textPosition: s.textPosition, frames: s.frames, cues: s.voice?.cues || [] }; }
export function reelTimeline(scenes: ReelScene[]) {
  let frame = 0;
  return scenes.map(s => { const start = frame; frame += s.frames; return { ...s, start, end: frame }; });
}
export function reelIssues(r: ReelWorkflow, ids = r.scenes.map(s => s.id)): ReelIssue[] {
  const issues: ReelIssue[] = [];
  for (const s of r.scenes.filter(s => ids.includes(s.id))) {
    const add = (layer: string, message: string, severity: ReelIssue["severity"] = "error") => issues.push({ sceneId: s.id, layer, severity, message });
    if (!s.asset) add("visual", "장면에 이미지나 영상을 추가해 주세요.");
    if (s.asset?.kind === "video" && (s.asset.duration || 0) * REEL_FPS + 1 < s.frames) add("timeline", "원본 영상보다 장면이 깁니다. 장면 시간을 줄이거나 긴 영상을 사용해 주세요.");
    if (r.spec.narration) {
      if (!s.voice) add("audio", "승인한 대본의 음성을 만들어 주세요.");
      else {
        if (!s.voice.cues.length) add("subtitles", "음성은 보관했지만 자막 정렬이 필요합니다. 음성을 다시 만들지 않고 정렬만 재시도해 주세요.");
        if (s.voice.durationMs + 180 > s.frames / REEL_FPS * 1000) add("timing", "실제 음성이 장면보다 깁니다. 문구를 보호하고 시간을 재배분해 주세요.");
        if (!s.voice.matches) add("pronunciation", "대본과 실제 음성 전사에 차이가 있습니다. 발음과 자막을 듣고 확인해 주세요.", "attention");
      }
    }
    if ((s.title + s.screenText).replace(/\s/g, "").length / (s.frames / REEL_FPS) > 10) add("reading", "화면 문구를 읽을 시간이 짧을 수 있습니다. 길이를 재배분하거나 문구 변경을 허용해 주세요.", "attention");
  }
  if (ids.length === r.scenes.length && r.spec.durationLocked && r.scenes.reduce((sum, s) => sum + s.frames, 0) !== r.spec.duration * REEL_FPS) issues.push({ sceneId: "", layer: "timeline", severity: "error", message: "잠긴 목표 길이와 시간축 길이가 다릅니다." });
  return issues;
}
export function reelSubtitles(r: ReelWorkflow, vtt = false) {
  const time = (ms: number) => new Date(Math.round(ms)).toISOString().slice(11, 23).replace(".", vtt ? "." : ",");
  let count = 0;
  return (vtt ? "WEBVTT\n\n" : "") + reelTimeline(r.scenes).flatMap(s => (s.voice?.cues || []).map(c => `${++count}\n${time(s.start / REEL_FPS * 1000 + c.startMs)} --> ${time(s.start / REEL_FPS * 1000 + c.endMs)}\n${c.text}\n`)).join("\n");
}

export function reelSourceImageId(scene: ReelScene) { return scene.asset?.kind === "image" ? scene.asset.id : scene.sourceImageId; }
