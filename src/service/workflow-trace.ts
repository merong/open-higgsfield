import { randomUUID } from "node:crypto";
import { database, type Database } from "./db";
import { traceEnabled, sanitizeTrace, traceHash } from "./trace-policy";
import type { TraceKind } from "../dev-workflow/types";
import type { TraceEnvelope } from "./trace-store";

export interface TraceContext { projectId: string; runId: string; turnId?: string; phase: string }
export async function queueTrace(tx: Database, context: TraceContext, kind: TraceKind, label: string, data: unknown, id: string = randomUUID()) {
  if (!traceEnabled()) return;
  const envelope: TraceEnvelope = { id, runId: context.runId, turnId: context.turnId || null, phase: context.phase, kind, label, at: Date.now(), data: sanitizeTrace(data) as Record<string, unknown> };
  // Logging failures must not turn a successful paid result into a failed turn.
  // PostgreSQL requires a savepoint to recover from a failed statement inside
  // the application's transaction (merely catching it leaves the tx aborted).
  if (tx.inTransaction) await tx.query("SAVEPOINT workflow_trace_write");
  try {
    await tx.query("INSERT INTO project_trace_outbox(id,project_id,envelope,created_at) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING", [id, context.projectId, JSON.stringify(envelope), envelope.at]);
    if (tx.inTransaction) await tx.query("RELEASE SAVEPOINT workflow_trace_write");
    return true;
  } catch {
    if (tx.inTransaction) {
      await tx.query("ROLLBACK TO SAVEPOINT workflow_trace_write");
      await tx.query("RELEASE SAVEPOINT workflow_trace_write");
    }
    console.warn("[workflow-trace] capture gap", context.projectId, kind);
    try {
      const { projectTraceFallback } = await import("./trace-store");
      // A transaction can still roll back. Never project its uncommitted result.
      const fallback = tx.inTransaction ? { ...envelope, id: randomUUID(), kind: "diagnostic" as const, label: "기록 누락 가능 · 업무 결과 확인 필요", data: { outcome: "capture_gap", missedKind: kind, note: "업무 트랜잭션의 로그 큐 저장에 실패했습니다. 해당 변경의 적용 여부는 이 진단만으로 알 수 없습니다." } } : { ...envelope, data: { ...envelope.data, traceDelivery: "sqlite_fallback" } };
      return projectTraceFallback(context.projectId, fallback);
    } catch { return false; }
  }
}
// Use inside the same business transaction as INSERT projects. The file exists
// before creation returns; only committed outbox events are projected. A rolled
// back creation can leave an empty, inaccessible file, never a phantom project.
export async function initializeProjectTrace(tx: Database, project: { id: string; format: string; title: string }, userId: string, source: string) {
  if (!traceEnabled()) return;
  const { projectTraceCreated } = await import("./trace-store");
  projectTraceCreated(project.id, userId);
  await queueTrace(tx, { projectId: project.id, runId: project.id, phase: "created" }, "project.created", "프로젝트 기록 시작", { source, format: project.format, title: project.title, instrumentation: "trace-v1", policy: "existing-workflow" }, `created:${project.id}`);
}
export async function captureTrace(context: TraceContext, kind: TraceKind, label: string, data: unknown) {
  if (!traceEnabled()) return;
  // Provider observations survive a later business-apply rollback.
  return queueTrace(await database(), context, kind, label, data);
}
export async function flushProjectTrace(projectId: string, ownerId: string) {
  if (!traceEnabled()) return { pending: 0, relayError: false };
  const db = await database();
  let relayError = false;
  try {
    const { projectTraceAppend } = await import("./trace-store");
    // Bounded request-time drain. A later read retries unacknowledged rows.
    for (let batch = 0; batch < 4; batch++) {
      const rows = await db.query<{ id: string; envelope: TraceEnvelope }>("SELECT id,envelope FROM project_trace_outbox WHERE project_id=$1 ORDER BY ordinal LIMIT 100", [projectId]);
      if (!rows.length) break;
      projectTraceAppend(projectId, ownerId, rows.map(r => r.envelope));
      // Commit SQLite before acknowledging: replay after a crash is idempotent.
      await db.query("DELETE FROM project_trace_outbox WHERE id=ANY($1::text[])", [rows.map(r => r.id)]);
    }
  } catch { relayError = true; console.warn("[workflow-trace] projection pending", projectId); }
  const [pending] = await db.query<{ n: string }>("SELECT count(*) AS n FROM project_trace_outbox WHERE project_id=$1", [projectId]);
  return { pending: Number(pending.n), relayError };
}
export async function flushUserTraces(userId: string) {
  if (!traceEnabled()) return;
  const projects = await (await database()).query<{ id: string }>("SELECT DISTINCT p.id FROM projects p JOIN project_trace_outbox o ON o.project_id=p.id WHERE p.owner_id=$1 LIMIT 12", [userId]);
  for (const p of projects) await flushProjectTrace(p.id, userId);
}
export async function tracedResponsesFetch(context: TraceContext, request: Record<string, unknown>, perform: () => Promise<Response>) {
  if (!traceEnabled()) return perform();
  const start = Date.now();
  const reasoning = request.reasoning as { summary?: string } | undefined;
  const recorded = await captureTrace(context, "model.request", "AI 요청 · 실제 입력", { request, requestHash: traceHash(JSON.stringify(sanitizeTrace(request))), instrumentation: "trace-v1", reasoningAvailability: reasoning?.summary ? "requested" : "not_requested" });
  if (!recorded) throw new Error("Trace request could not be persisted before provider call");
  let response: Response;
  try { response = await perform(); }
  catch (error) {
    await captureTrace(context, "model.error", "AI 응답 확인 불가", { durationMs: Date.now() - start, outcome: "unknown", error: error instanceof Error ? error.name : "UnknownError", note: "공급자 수신·과금 여부는 확인되지 않았습니다." });
    throw error;
  }
  let payload: Record<string, unknown> = {};
  try {
    const body = await response.clone().text();
    try { const raw: unknown = JSON.parse(body); payload = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : { invalidPayload: raw }; }
    catch { payload = { format: "non_json", body, characters: body.length }; }
  } catch { payload = { omitted: "response_body_unreadable" }; }
  const output = Array.isArray(payload.output) ? payload.output.filter((o): o is Record<string, unknown> => !!o && typeof o === "object" && !Array.isArray(o)) : [];
  const summaries = output.filter(o => o.type === "reasoning").flatMap(o => Array.isArray(o.summary) ? o.summary : []);
  // Keep only publicly returned summaries of reasoning, never hidden/encrypted content.
  const publicPayload = { ...payload, output: output.map(o => o.type === "reasoning" ? { type: o.type, id: o.id, summary: o.summary } : o) };
  await captureTrace(context, "model.response", response.ok ? "AI 응답 수신 · 적용 전" : "AI HTTP 오류", { httpStatus: response.status, requestId: response.headers.get("x-request-id"), durationMs: Date.now() - start, payload: publicPayload, reasoningAvailability: summaries.length ? "returned" : reasoning?.summary ? "requested_not_returned" : "not_requested", reasoningSummary: summaries });
  for (const item of output.filter(o => typeof o.type === "string" && /(?:_call|_result)$/.test(o.type))) {
    await captureTrace(context, "tool.result", `도구 기록 · ${item.type}`, { providerReported: true, item });
  }
  return response;
}
