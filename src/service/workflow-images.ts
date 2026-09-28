import { database } from "./db";
import { object, ServiceError, text } from "./errors";
import { getWorkflow, persistWorkflow, workflowEvent, workflowRow } from "./card-workflow";
import { statusesFor, submitJob, validatePlane } from "./generation";
import { quote } from "./credits";
import { workflowTerminal, type CardWorkflow } from "@/projects/card-workflow";
import type { Job } from "@/projects/types";
import type { createPlatformClient } from "@/generation/platform";
type Client = ReturnType<typeof createPlatformClient>;
export function workflowImagePlane(r: CardWorkflow, cardId: string) {
  const slot = r.project.slots.find(s => s.id === cardId);
  if (!slot) throw new ServiceError(404, "카드를 찾을 수 없습니다.");
  const framing = slot.composition === "full" ? "Compose a full-bleed portrait photograph; preserve the requested subject position and leave quiet negative space for separately rendered card copy." : "Keep the main subject fully visible with breathing room for the card image area and cropping.";
  return validatePlane({ model: "soul-2", prompt: { text: `${slot.prompt}. Photograph the requested real scene or subject, not a finished card layout or a page mockup. Books, notebooks, or packaging may appear when they are part of the requested subject. No added captions, typography, logos, or watermarks; incidental writing should be indistinct. ${framing} Preserve the scene-specific camera distance, lighting and palette described above.` }, settings: { aspectRatio: "3:4", resolution: "720p", batchSize: "1", enhancePrompt: false }, media: {} });
}
export async function workflowImageQuote(userId: string, id: string, cardId: string) {
  const r = await getWorkflow(userId, id), credits = quote(workflowImagePlane(r, cardId));
  const missing = r.project.slots.filter(s => s.media?.kind !== "image");
  return { credits, missingCount: missing.length, batchCredits: missing.reduce((sum, s) => sum + quote(workflowImagePlane(r, s.id)), 0) };
}
export async function startWorkflowImage(userId: string, id: string, input: unknown, client?: Client) {
  const data = object(input), key = text(data.responseId, "이미지 요청 ID", 100, 8), db = await database();
  const claimed = await db.transaction(async tx => {
    const { data: r } = await workflowRow(tx, userId, id);
    if (r.visual?.key === key) return { r, fresh: false };
    if (r.imageBatch?.state === "running" && key !== `${r.imageBatch.key}:${r.imageBatch.cardIds[r.imageBatch.index]}`) throw new ServiceError(409, "이미지 일괄 생성이 진행 중입니다.");
    if (r.revision !== data.revision) throw new ServiceError(409, "최신 제작 상태에서 다시 시도해 주세요.");
    if (!(r.status === "ready" || r.status === "waiting_user" && r.question?.kind === "style")) throw new ServiceError(409, "표지 선택 또는 카드 검수 후 이미지를 만들 수 있어요.");
    if (r.visual && !["completed", "failed", "discarded"].includes(r.visual.state)) throw new ServiceError(409, "접수된 이미지의 상태를 먼저 확인해 주세요.");
    if (r.budget.images >= r.budget.maxImages) throw new ServiceError(400, "이번 작업의 이미지 생성 한도에 도달했습니다. 업로드 이미지를 사용할 수 있어요.");
    const cardId = text(data.cardId, "카드", 100, 1), plane = workflowImagePlane(r, cardId);
    if (data.credits !== quote(plane)) throw new ServiceError(409, "이미지 비용이 바뀌었습니다. 최신 비용을 확인하고 다시 선택해 주세요.");
    r.visual = { key, cardId, version: r.project.version, startedAt: Date.now(), state: "submitting", returnStatus: r.status };
    r.budget.images++; r.status = "waiting_tool";
    workflowEvent(r, "tool.started", "이미지 생성 접수 중", "별도 이미지 크레딧을 사용합니다. 확인되지 않은 요청을 자동으로 다시 제출하지 않습니다.");
    await persistWorkflow(tx, r, "이미지 요청"); return { r, fresh: true };
  });
  if (!claimed.fresh) return pollWorkflowImage(userId, id, client);
  try { await submitJob(userId, workflowImagePlane(claimed.r, claimed.r.visual!.cardId), key, { projectId: claimed.r.projectId, slotId: claimed.r.visual!.cardId }, client); }
  catch (error) {
    // Submission may have reached the provider. A durable job must be reconciled, never resubmitted.
    const existing = await db.query("SELECT id FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2", [userId, key]);
    if (!existing.length) return db.transaction(async tx => {
      const { data: r } = await workflowRow(tx, userId, id);
      if (r.visual?.key !== key) return r;
      r.visual.state = "failed"; r.visual.error = error instanceof ServiceError ? error.message : "이미지 요청을 접수하지 못했습니다.";
      if (r.status === "waiting_tool") r.status = r.visual.returnStatus;
      workflowEvent(r, "tool.failed", "이미지 접수 실패", r.visual.error); await persistWorkflow(tx, r, "이미지 접수 실패"); return r;
    });
  }
  return pollWorkflowImage(userId, id, client);
}
export async function pollWorkflowImage(userId: string, id: string, client?: Client) {
  const current = await getWorkflow(userId, id), visual = current.visual, db = await database();
  if (!visual || ["completed", "failed", "discarded"].includes(visual.state)) return current;
  const lookup = async () => (await db.query<Job>("SELECT id,request_id,state,result FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2", [userId, visual.key]))[0];
  let job = await lookup(); let statusError: string | undefined;
  if (job?.request_id && !["completed", "failed"].includes(job.state)) {
    const [result] = await statusesFor(userId, [job.request_id], client); statusError = "error" in result ? result.error : undefined; job = await lookup();
  }
  return db.transaction(async tx => {
    const { data: r } = await workflowRow(tx, userId, id);
    if (r.visual?.key !== visual.key || ["completed", "failed", "discarded"].includes(r.visual.state)) return r;
    const v = r.visual; v.jobId = job?.id; v.requestId = job?.request_id;
    v.state = job?.state || (Date.now() - v.startedAt > 60000 ? "unknown" : "submitting");
    v.error = statusError || (v.state === "unknown" ? "접수 여부를 확인 중입니다. 중복 과금 방지를 위해 다시 생성하지 않습니다. 생성 내역에서 확인해 주세요." : undefined);
    let changed = false;
    if (job?.state === "completed") {
      const url = job.result?.images?.[0]?.url;
      if (!workflowTerminal(r) && r.project.version === v.version && url && /^https:\/\//.test(url)) {
        const slot = r.project.slots.find(s => s.id === v.cardId);
        if (slot) { slot.media = { kind: "image", url, name: "AI 생성 이미지" }; slot.appliedJobId = job.id; slot.composition = "split"; slot.dim = .08; slot.crop = 50; v.mediaUrl = url; changed = true; }
      }
      if (!changed) v.state = "discarded";
      workflowEvent(r, "tool.completed", changed ? "이미지를 적용했어요" : "이전 조건의 이미지를 보관했어요", changed ? "텍스트는 편집 가능한 상태로 이미지와 분리했습니다." : "제작 조건이 바뀌어 현재 카드는 변경하지 않았습니다. 이미지는 생성 내역에서 확인할 수 있어요.");
    } else if (job?.state === "failed") { v.error = job.result?.error || "생성 실패 크레딧이 환불되었습니다."; workflowEvent(r, "tool.failed", "이미지 생성 실패", v.error); }
    if (["completed", "failed", "discarded", "unknown"].includes(v.state) && r.status === "waiting_tool") r.status = v.returnStatus;
    await persistWorkflow(tx, r, "이미지 상태 확인", changed); return r;
  });
}

// The queue records the user's exact scope and quoted maximum. Polling never retries
// uncertain or failed provider submissions and never replaces an existing image.
export async function startWorkflowImageBatch(userId: string, id: string, input: unknown, client?: Client) {
  const data = object(input), key = text(data.responseId, "일괄 요청 ID", 80, 8), db = await database();
  await db.transaction(async tx => {
    const { data: r } = await workflowRow(tx, userId, id);
    if (r.responses.includes(key)) return;
    if (r.status !== "ready" || r.revision !== data.revision || r.imageBatch?.state === "running") throw new ServiceError(409, "최신 카드가 준비된 뒤 이미지를 채워 주세요.");
    if (r.visual && !["completed", "failed", "discarded"].includes(r.visual.state)) throw new ServiceError(409, "이전 이미지 요청의 상태부터 확인해 주세요.");
    const cards = r.project.slots.filter(s => s.media?.kind !== "image");
    if (!cards.length) throw new ServiceError(400, "모든 카드에 이미지가 있어요.");
    const cost = cards.reduce((sum, s) => sum + quote(workflowImagePlane(r, s.id)), 0);
    if (cost !== data.credits) throw new ServiceError(409, "장수나 비용이 바뀌었습니다. 최신 예상 비용을 확인해 주세요.");
    if (r.budget.images + cards.length > r.budget.maxImages) throw new ServiceError(400, "남은 이미지 생성 한도보다 카드가 많습니다. 일부 카드는 업로드해 주세요.");
    const [user] = await tx.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1 FOR UPDATE", [userId]);
    if (!user || user.credits < cost) throw new ServiceError(402, "모든 이미지를 생성할 크레딧이 부족합니다.");
    r.imageBatch = { key, state: "running", cardIds: cards.map(s => s.id), index: 0, credits: cost, prices: Object.fromEntries(cards.map(s => [s.id, quote(workflowImagePlane(r, s.id))])), results: [] };
    r.responses.push(key); r.responses = r.responses.slice(-100);
    workflowEvent(r, "images.started", "카드마다 이미지를 채웁니다", `${cards.length}장 · 예상 ${cost} 크레딧. 기존 이미지와 문구는 보존하며 장별로 순차 생성합니다.`);
    await persistWorkflow(tx, r, "일괄 이미지 승인");
  });
  return pollWorkflowImageBatch(userId, id, client);
}
export async function pollWorkflowImageBatch(userId: string, id: string, client?: Client): Promise<CardWorkflow> {
  let r = await getWorkflow(userId, id);
  if (r.imageBatch?.state !== "running" || workflowTerminal(r)) return r;
  if (r.visual && !["completed", "failed", "discarded"].includes(r.visual.state)) r = await pollWorkflowImage(userId, id, client);
  r = await (await database()).transaction(async tx => {
    const { data: current } = await workflowRow(tx, userId, id), batch = current.imageBatch;
    if (batch?.state !== "running" || workflowTerminal(current)) return current;
    const expected = `${batch.key}:${batch.cardIds[batch.index]}`, v = current.visual;
    if (v?.key === expected) {
      if (!["completed", "failed", "discarded", "unknown"].includes(v.state)) return current;
      if (v.state === "unknown") { batch.state = "stopped"; workflowEvent(current, "images.paused", "이미지 접수 확인 필요", "확인되지 않은 요청과 남은 이미지를 자동 재결제하지 않습니다. 생성 상태를 확인한 뒤 빈 이미지만 다시 채울 수 있어요."); }
      else { batch.results.push({ cardId: batch.cardIds[batch.index], state: v.state }); batch.index++; }
    }
    if (batch.index >= batch.cardIds.length) {
      batch.state = "completed";
      workflowEvent(current, "images.completed", "이미지 채우기를 마쳤어요", `${batch.results.filter(x => x.state === "completed").length}/${batch.cardIds.length}장 적용. 실패한 카드는 업로드하거나 빈 카드 채우기로 다시 요청할 수 있어요.`);
    }
    if (v?.key === expected) await persistWorkflow(tx, current, "일괄 이미지 진행");
    return current;
  });
  const batch = r.imageBatch;
  if (batch?.state !== "running" || r.status !== "ready") return r;
  const cardId = batch.cardIds[batch.index];
  const approvedCost = batch.prices?.[cardId] ?? batch.credits / batch.cardIds.length;
  if (approvedCost !== quote(workflowImagePlane(r, cardId))) return (await database()).transaction(async tx => {
    const { data: current } = await workflowRow(tx, userId, id);
    if (current.imageBatch?.key !== batch.key || current.imageBatch.state !== "running") return current;
    current.imageBatch.state = "stopped"; workflowEvent(current, "images.paused", "이미지 비용이 바뀌었어요", "남은 이미지 생성은 중단했습니다. 최신 전체 비용을 확인하고 다시 선택해 주세요.");
    await persistWorkflow(tx, current, "일괄 비용 변경 중단"); return current;
  });
  if (r.project.slots.find(s => s.id === cardId)?.media?.kind === "image") return r;
  try { return await startWorkflowImage(userId, id, { revision: r.revision, responseId: `${batch.key}:${cardId}`, cardId, credits: approvedCost }, client); }
  catch (e) { if (e instanceof ServiceError && e.status === 409) return getWorkflow(userId, id); throw e; }
}
