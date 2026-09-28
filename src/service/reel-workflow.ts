import { initializeProjectTrace } from "./workflow-trace";
import { agentTask } from "@/projects/agent-progress";
import { newEditorialLoop, editorialTargets, MAX_EDITORIAL_REPAIRS } from "@/projects/editorial-review";
import { recordEditorialReview } from "./editorial-review";
import { resolveProductImages } from "./product-images";
import { randomUUID } from "node:crypto";
import { reelTerminal, type ReelWorkflow, type ReelScene } from "@/projects/reel-workflow";
import { createDraft } from "@/projects/outline";
import { database, type Database } from "./db";
import { ledger } from "./credits";
import { object, text, ServiceError } from "./errors";
import { resolveOpenAi } from "./openai-settings";
import { reelModel, type ReelModel } from "./reel-model";
import { sourceResults, stringList } from "./workflow-model";
type Row = { data: ReelWorkflow; lease_token: string | null; lease_until: number | null };
export const reelEvent = (r: ReelWorkflow, title: string, message: string) => { r.events.push({ id: randomUUID(), title, message, at: Date.now(), revision: r.revision + 1 }); r.events = r.events.slice(-120); };
export async function reelRow(tx: Database, userId: string, id: string) {
  const [row] = await tx.query<Row>("SELECT data,lease_token,lease_until FROM reel_workflows WHERE id=$1 AND user_id=$2 FOR UPDATE", [id, userId]);
  if (!row) throw new ServiceError(404, "숏폼 제작 작업을 찾을 수 없습니다.");
  return row;
}
export async function saveReel(tx: Database, r: ReelWorkflow, reason: string, changed = false, lease: string | null = null, leaseMs = 75000) {
  if (changed) {
    r.contentVersion++; r.output = undefined; r.quality = undefined; r.artifacts = undefined;
    r.project.slots = r.scenes.length ? r.scenes.map((s, i) => ({ id: s.id, kind: i === 0 ? "cover" : i === r.scenes.length - 1 ? "cta" : "body", title: s.title, body: s.screenText, kicker: s.role, prompt: s.prompt, cta: "", href: "", duration: s.frames / 30, trim: 0, composition: "full", dim: .2, crop: s.crop, ...(s.asset ? { media: { kind: s.asset.kind, url: `/api/workspace/assets/${s.asset.id}`, name: s.asset.name } } : {}) })) : r.project.slots;
    const rows = await tx.query("UPDATE projects SET document=$1,version=version+1,updated_at=$2 WHERE id=$3 AND version=$4 AND deleted_at IS NULL RETURNING id", [JSON.stringify(r.project), Date.now(), r.projectId, r.project.version]);
    if (!rows.length) throw new ServiceError(409, "다른 편집기에서 프로젝트가 바뀌었습니다. 현재 결과를 보존했으니 새 작업으로 이어가 주세요.");
    r.project.version++; r.project.updatedAt = Date.now();
    await tx.query("INSERT INTO reel_workflow_versions (run_id,version,data,reason,created_at) VALUES ($1,$2,$3,$4,$5)", [r.id, r.contentVersion, JSON.stringify({ project: r.project, scenes: r.scenes, spec: r.spec, music: r.music }), reason, Date.now()]);
  }
  r.revision++; r.updatedAt = Date.now();
  await tx.query("UPDATE reel_workflows SET data=$1,lease_token=$2,lease_until=$3,updated_at=$4 WHERE id=$5", [JSON.stringify(r), lease, lease ? Date.now() + leaseMs : null, r.updatedAt, r.id]);
}
export async function getReel(userId: string, id: string) {
  return (await database()).transaction(async tx => {
    const row = await reelRow(tx, userId, id), r = row.data;
    if (row.lease_token && Number(row.lease_until) < Date.now()) {
      r.status = r.stage === "production" ? "ready" : "paused_budget";
      if (r.task) { r.task.state = "unknown"; r.task.error = "요청 응답을 확인하지 못했습니다. 결과 확인 전 자동으로 다시 결제하지 않습니다."; }
      r.error = "작업 응답 시간이 지났습니다. 저장된 대본·자산을 확인하고 재개해 주세요.";
      reelEvent(r, "작업 확인 필요", r.error); await saveReel(tx, r, "잠금 만료");
    }
    return r;
  });
}
export async function activeReel(userId: string) {
  const [r] = await (await database()).query<{ id: string }>("SELECT id FROM reel_workflows WHERE user_id=$1 AND data->>'status' NOT IN ('completed','cancelled','failed') ORDER BY updated_at DESC LIMIT 1", [userId]);
  return r ? getReel(userId, r.id) : null;
}
export async function reelVersions(userId: string, id: string) {
  await getReel(userId, id);
  return (await database()).query("SELECT version,reason,created_at FROM reel_workflow_versions WHERE run_id=$1 ORDER BY version DESC LIMIT 50", [id]);
}
export function requireReelRevision(r: ReelWorkflow, data: Record<string, unknown>) {
  if (r.revision !== data.revision) throw new ServiceError(409, "제작 상태가 변경되었습니다. 최신 상태에서 다시 선택해 주세요.");
  if (reelTerminal(r)) throw new ServiceError(409, "종료된 제작입니다. 후속 수정으로 새 작업을 시작해 주세요.");
}
function ask(r: ReelWorkflow, kind: NonNullable<ReelWorkflow["question"]>["kind"], message: string) { r.status = "waiting_user"; r.question = { id: randomUUID(), kind, text: message }; reelEvent(r, "함께 정해 주세요", message); }
export async function startReel(userId: string, input: unknown) {
  const d = object(input), key = text(d.key, "요청 ID", 100, 8), db = await database();
  const [old] = await db.query<{ id: string }>("SELECT r.id FROM reel_workflows r JOIN generation_jobs j ON j.id=r.id WHERE j.user_id=$1 AND j.idempotency_key=$2", [userId, key]);
  if (old) return getReel(userId, old.id);
  const source = d.sourceRunId ? await getReel(userId, text(d.sourceRunId, "이전 제작", 100, 1)) : undefined;
  if (source && (!source.planApproved || !source.scenes.length)) throw new ServiceError(409, "승인한 대본이 있는 결과에서 후속 제작을 시작할 수 있습니다.");
  if (source && !reelTerminal(source)) throw new ServiceError(409, "기존 제작을 먼저 마무리해 주세요.");
  const referenceImages = await resolveProductImages(userId, source ? source.referenceImages?.map(image => image.id) : d.referenceImageIds);
  const idea = source?.idea || text(d.idea || (referenceImages.length ? "첨부한 사진의 피사체와 분위기를 보존해 자연스러운 숏폼을 만들어 주세요. 사진으로 확인할 수 없는 사실은 추가하지 마세요." : ""), "주제와 조건", 3000, 2), duration = source?.spec.duration || Number(d.duration || 30);
  if (!source && ![15, 30, 60].includes(duration)) throw new ServiceError(400, "15·30·60초 중 선택해 주세요.");
  const config = await resolveOpenAi(), now = Date.now();
  const project = createDraft("reels", { topic: idea.slice(0, 60), audience: "", tone: "calm", count: duration === 15 ? 3 : duration === 30 ? 5 : 8, mustInclude: idea }, "editorial", "9:16");
  if (source) { Object.assign(project, structuredClone(source.project)); project.id = randomUUID(); project.version = 1; project.createdAt = now; }
  return db.transaction(async tx => {
    const [user] = await tx.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1 FOR UPDATE", [userId]);
    const [duplicate] = await tx.query<{ id: string }>("SELECT id FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2", [userId, key]);
    if (duplicate) { const [r] = await tx.query<Row>("SELECT data FROM reel_workflows WHERE id=$1", [duplicate.id]); if (r) return r.data; throw new ServiceError(409, "이미 사용된 요청 ID입니다."); }
    if (!user || user.credits < 1) throw new ServiceError(402, "AI 대본 제작에 1 크레딧이 필요합니다.");
    if ((await tx.query("SELECT id FROM reel_workflows WHERE user_id=$1 AND data->>'status' NOT IN ('completed','cancelled','failed')", [userId])).length) throw new ServiceError(409, "진행 중인 숏폼 제작을 이어가거나 종료해 주세요.");
    const id = randomUUID();
    const r: ReelWorkflow = { id, projectId: project.id, project, revision: 1, contentVersion: 1, status: source ? "ready" : "pending", stage: source ? "production" : "understand", idea, model: config.model, effort: config.effort || undefined,
      spec: source?.spec || { purpose: "", purposeOrigin: "ai_assumed", audience: "", duration, durationLocked: true, narration: d.narration === true, voice: ["coral", "sage", "cedar"].includes(String(d.voice)) ? d.voice as "coral" : "coral", constraints: [], mode: d.mode === "delegate" ? "delegate" : "guided" },
      referenceImages, scenes: source?.scenes || [], sources: source?.sources || [], researchNote: source?.researchNote || "", needResearch: false, events: [], responses: [], budget: { calls: 0, maxCalls: 12, generations: 0, maxGenerations: 16, voiceCalls: 0, maxVoiceCalls: 16, renders: 0, maxRenders: 12 }, feedback: "", targetIds: [], planApproved: !!source, sampleApproved: false, history: [], music: source?.music, createdAt: now, updatedAt: now };
    reelEvent(r, "제작을 시작했어요", "목적과 조건을 정리합니다. 대본 제작 1 크레딧, 이미지·영상·음성은 비용을 확인하고 선택합니다.");
    await tx.query("INSERT INTO projects (id,owner_id,document,updated_at) VALUES ($1,$2,$3,$4)", [project.id, userId, JSON.stringify(project), now]);
    await initializeProjectTrace(tx, project, userId, "reel-workflow");
    for (const image of referenceImages) await tx.query("UPDATE assets SET project_id=COALESCE(project_id,$1) WHERE id=$2 AND owner_id=$3", [project.id, image.id, userId]);
    if (referenceImages.length) reelEvent(r, "사진에서 컷을 구성해요", `${referenceImages.length}장의 원본을 분석하고 장면별 사진과 움직임을 제안합니다. 영상 생성은 컷 승인 후 선택합니다.`);
    await tx.query("UPDATE users SET credits=credits-1 WHERE id=$1", [userId]);
    await tx.query("INSERT INTO generation_jobs (id,user_id,idempotency_key,state,cost,plane,project_id,created_at) VALUES ($1,$2,$3,'submitting',1,$4,$5,$6)", [id, userId, key, JSON.stringify({ type: "outline", workflow: "reels", draft: project }), project.id, now]);
    await tx.query("INSERT INTO reel_workflows (id,project_id,user_id,data,updated_at) VALUES ($1,$2,$3,$4,$5)", [id, project.id, userId, JSON.stringify(r), now]);
    await tx.query("INSERT INTO reel_workflow_versions (run_id,version,data,reason,created_at) VALUES ($1,1,$2,'제작 시작',$3)", [id, JSON.stringify({ project, scenes: r.scenes, spec: r.spec }), now]);
    await ledger(tx, userId, -1, "hold", "참여형 숏폼 대본 예약", id); return r;
  });
}
export function parseReelScenes(value: unknown, r: ReelWorkflow, patch = false): ReelScene[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) throw new ServiceError(502, "장면 수가 올바르지 않습니다.");
  const result = value.map((raw, index) => {
    const s = object(raw), id = text(s.id, "장면 ID", 80, 1), old = r.scenes.find(s => s.id === id);
    const seconds = Number(s.seconds);
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 15) throw new ServiceError(502, "장면 길이는 1~15초여야 합니다.");
    const next: ReelScene = { id, role: text(s.role, "역할", 40), title: text(s.title, "화면 제목", 90, 1), screenText: text(s.screenText, "화면 설명", 140), narration: r.spec.narration ? text(s.narration, "대본", 200, 1) : "", prompt: text(s.prompt, "영상 구상", 1000, 1), frames: Math.round(seconds * 30), version: 1, copyLocked: false, durationLocked: true, subtitleStyle: "calm", textPosition: "lower", crop: 50, zoom: 100 };
    if (!patch && r.referenceImages?.length) {
      const sourceId = text(s.sourceImageId ?? r.referenceImages[index % r.referenceImages.length].id, "컷 원본 사진", 100, 1);
      const image = r.referenceImages.find(image => image.id === sourceId);
      if (!image) throw new ServiceError(502, "업로드한 사진 중에서 컷 원본을 선택해야 합니다.");
      next.sourceImageId = image.id; next.asset = { id: image.id, name: image.name, kind: "image", width: image.width, height: image.height };
    }
    if (patch) {
      if (!old || !r.targetIds.includes(id)) throw new ServiceError(502, "선택한 구간 밖의 수정은 적용하지 않습니다.");
      Object.assign(next, { ...old, ...(old.copyLocked ? {} : { title: next.title, screenText: next.screenText, narration: next.narration }), prompt: next.prompt, frames: old.durationLocked || r.spec.durationLocked ? old.frames : next.frames, version: old.version + 1 });
      if (next.narration !== old.narration) next.voice = undefined;
    }
    return next;
  });
  if (new Set(result.map(s => s.id)).size !== result.length || patch && result.length !== r.targetIds.length) throw new ServiceError(502, "장면 ID 또는 수정 범위를 확인할 수 없습니다.");
  if (!patch && r.referenceImages?.some(image => !result.some(scene => scene.sourceImageId === image.id))) throw new ServiceError(502, "컷 구성에 빠진 원본 사진이 있어요. 모든 사진을 연결하도록 다시 작성해 주세요.");
  if (!patch && result.reduce((n, s) => n + s.frames, 0) !== r.spec.duration * 30) throw new ServiceError(502, "대본의 합계 시간이 목표 길이와 다릅니다. 다시 작성해 주세요.");
  return patch ? r.scenes.map(s => result.find(n => n.id === s.id) || s) : result;
}
export async function stepReel(userId: string, id: string, revision: unknown, provider: ReelModel = reelModel) {
  const db = await database(), token = randomUUID();
  const claimed = await db.transaction(async tx => {
    const { data: r } = await reelRow(tx, userId, id);
    if (r.revision !== revision || r.status !== "pending") return { r, fresh: false };
    if (r.budget.calls >= r.budget.maxCalls) { r.status = "paused_budget"; r.error = "이번 작업의 AI 호출 한도에 도달했습니다. 대본을 직접 편집하거나 후속 제작으로 이어가 주세요."; await saveReel(tx, r, "호출 한도"); return { r, fresh: false }; }
    r.status = "running"; r.budget.calls++; r.error = undefined;
    const task = agentTask(r.stage);
    reelEvent(r, task.title, `${r.budget.calls}번째 AI 작업 · ${task.focus.join(" · ")}`);
    await saveReel(tx, r, "AI 시작", false, token); return { r, fresh: true };
  });
  if (!claimed.fresh) return claimed.r;
  try {
    const result = await provider(claimed.r, userId), d = object(result.value);
    return await db.transaction(async tx => {
      const row = await reelRow(tx, userId, id), r = row.data;
      if (row.lease_token !== token || r.status !== "running") return r;
      const summary = text(d.summary, "진행 요약", 1200); let changed = false;
      if (r.stage === "understand") {
        r.spec.purpose = text(d.purpose, "목적", 100); r.spec.purposeOrigin = d.purposeExplicit === true ? "user_explicit" : "ai_assumed"; r.spec.audience = text(d.audience, "대상", 100); r.spec.constraints = stringList(d.constraints, 8, 200); r.needResearch = d.needResearch === true;
        if (!d.purposeExplicit && r.spec.mode === "guided") ask(r, "purpose", "이 릴스를 보고 어떤 반응을 얻고 싶으세요?");
        else { r.stage = r.needResearch ? "research" : "plan"; r.status = "pending"; }
      } else if (r.stage === "research") {
        r.sources = sourceResults(d.sources, result.observedUrls); r.researchNote = summary + " " + stringList(d.warnings, 6, 400).join(" ");
        if (!r.sources.length) ask(r, "research", "확인 가능한 근거가 부족해요. 다시 조사하거나, 구체적 효능·수치 없이 연출 중심으로 만들까요?");
        else { r.stage = "plan"; r.status = "pending"; }
      } else if (r.stage === "plan") {
        r.scenes = parseReelScenes(d.scenes, r); r.project.title = text(d.title, "프로젝트 이름", 120, 1); r.project.caption = text(d.caption, "게시문", 5000); changed = true;
        r.editorial = newEditorialLoop(); r.stage = "review"; r.status = "pending"; r.question = undefined;
        reelEvent(r, "대본 초안을 독립적으로 검수해요", "읽기 속도·컷의 역할·원본 사진과의 정합성을 확인한 뒤 승인할 대본을 보여드릴게요.");
      } else if (r.stage === "patch" || r.stage === "refine") {
        const refine = r.stage === "refine", previous = r.scenes;
        if (refine) r.targetIds = r.editorial?.targetIds || [];
        const patches = refine && Array.isArray(d.scenes) ? d.scenes.map(raw => {
          const patch = object(raw), old = previous.find(s => s.id === patch.id);
          return old ? { ...patch, seconds: old.frames / 30, prompt: old.prompt, role: old.role } : patch;
        }) : d.scenes;
        r.scenes = parseReelScenes(patches, r, true);
        if (r.targetIds.includes(r.scenes[0].id)) r.sampleApproved = false;
        r.stage = "review"; r.status = "pending"; changed = true;
      } else if (r.stage === "review") {
        if (!Array.isArray(d.issues) || d.issues.length > 10) throw new ServiceError(502, "대본 검수 항목을 확인하지 못했습니다.");
        const issues = d.issues.map(raw => {
          const item = object(raw), targetId = text(item.sceneId, "검수 장면", 80), severity = String(item.severity);
          if (targetId && !r.scenes.some(s => s.id === targetId) || !["attention", "error"].includes(severity)) throw new ServiceError(502, "검수 장면이나 상태가 올바르지 않습니다.");
          return { targetId, severity: severity as "attention" | "error", message: text(item.message, "검수 의견", 500, 1) };
        });
        r.editorial ||= newEditorialLoop(r.targetIds);
        recordEditorialReview(r.editorial, d, issues);
        const targets = editorialTargets(r.editorial).filter(id => !r.scenes.find(s => s.id === id)!.copyLocked);
        if (targets.length && r.editorial.repairs < MAX_EDITORIAL_REPAIRS && r.budget.calls + 2 <= r.budget.maxCalls) {
          r.editorial.targetIds = targets; r.editorial.repairs++; r.stage = "refine"; r.status = "pending";
          reelEvent(r, "전달이 약한 컷을 다시 다듬어요", `${targets.length}개 컷 · ${r.editorial.repairs}/${MAX_EDITORIAL_REPAIRS}회 보정. 원본과 프롬프트·장면 길이는 유지합니다.`);
        } else if (r.planApproved) { r.stage = "production"; r.status = "ready"; }
        else { r.stage = "plan"; ask(r, "plan", "검수한 대본과 남은 확인 사항을 살펴보세요. 승인하면 문구를 보호하고 대표 샘플을 만듭니다."); }
      }
      reelEvent(r, "AI 작업을 마쳤어요", summary); await saveReel(tx, r, "대본·콘티 갱신", changed); return r;
    });
  } catch (error) {
    return db.transaction(async tx => { const row = await reelRow(tx, userId, id), r = row.data; if (row.lease_token !== token) return r; r.status = "paused_budget"; r.error = error instanceof ServiceError ? error.message : "AI 작업을 완료하지 못했습니다. 현재 대본에서 다시 시도해 주세요."; reelEvent(r, "작업을 멈췄어요", r.error); await saveReel(tx, r, "AI 실패"); return r; });
  }
}
export function rebalanceReel(r: ReelWorkflow, unlockDuration: boolean) {
  const mins = r.scenes.map(s => Math.max(30, Math.ceil(((s.voice?.durationMs || 0) + 250) / 1000 * 30)));
  const target = r.spec.duration * 30, required = mins.reduce((a, b) => a + b, 0);
  if (mins.some(n => n > 450)) throw new ServiceError(409, "15초를 넘는 발화가 있습니다. 문구 잠금을 풀고 해당 장면 대본을 나눠 주세요.");
  if (required > target && !unlockDuration) throw new ServiceError(409, "잠긴 길이 안에 발화가 들어가지 않습니다. 목표 길이 변경을 허용하거나 대본 변경을 선택해 주세요.");
  let remaining = Math.max(target, required) - required;
  const frames = [...mins];
  while (remaining > 0) { let added = false; for (let i = 0; i < frames.length && remaining; i++) if (frames[i] < 450) { frames[i]++; remaining--; added = true; } if (!added) throw new ServiceError(409, "장면당 15초 제한 안에 배분할 수 없습니다."); }
  for (const [i, s] of r.scenes.entries()) { s.frames = frames[i]; s.version++; }
  if (unlockDuration) { r.spec.durationLocked = false; r.spec.duration = frames.reduce((a, b) => a + b, 0) / 30; }
}
export async function actReel(userId: string, id: string, input: unknown) {
  const d = object(input), key = text(d.responseId, "응답 ID", 100, 8);
  return (await database()).transaction(async tx => {
    const { data: r } = await reelRow(tx, userId, id);
    if (r.responses.includes(key)) return r;
    requireReelRevision(r, d); const action = text(d.action, "작업", 40, 1); let changed = false;
    if (action === "cancel") {
      r.status = "cancelled"; r.question = undefined;
      const released = await tx.query("UPDATE generation_jobs SET state='failed',result=$1 WHERE id=$2 AND state='submitting' RETURNING id", [JSON.stringify({ status: "failed", error: "사용자 중단" }), r.id]);
      if (released.length) { await tx.query("UPDATE users SET credits=credits+1 WHERE id=$1", [userId]); await ledger(tx, userId, 1, "refund", "숏폼 대본 중단 · 환불", r.id); }
      reelEvent(r, "제작을 중단했어요", "새 요청을 멈췄습니다. 이미 접수된 생성 결과는 라이브러리에 남고 최신 장면에는 적용하지 않습니다.");
    } else {
      if (["running", "waiting_tool"].includes(r.status)) throw new ServiceError(409, "현재 작업을 마친 뒤 수정해 주세요.");
      if (action === "answer") {
        if (!r.question || d.requestId !== r.question.id || r.status !== "waiting_user") throw new ServiceError(409, "현재 질문과 응답이 다릅니다.");
        if (r.question.kind === "purpose") { r.spec.purpose = text(d.value, "목적", 200, 1); r.spec.purposeOrigin = "user_confirmed"; r.stage = r.needResearch ? "research" : "plan"; r.status = "pending"; }
        else if (r.question.kind === "research") { r.stage = d.value === "retry" ? "research" : "plan"; if (d.value !== "retry") r.spec.constraints.push("검증되지 않은 구체적 효능·안전·수치는 제외하고 연출 중심으로 구성"); r.status = "pending"; }
        else { r.planApproved = true; r.scenes.forEach(s => { s.copyLocked = true; }); r.stage = "production"; r.status = "ready"; changed = true; }
        r.question = undefined; reelEvent(r, "선택을 반영했어요", action === "answer" && r.planApproved ? "대본을 승인하고 문구를 보호합니다. 대표 장면의 이미지와 음성을 확인해 주세요." : "확정한 방향으로 이어갑니다.");
      } else if (action === "retry") { if (r.status !== "paused_budget") throw new ServiceError(409, "재시도할 작업이 없습니다."); r.status = r.stage === "production" ? "ready" : "pending"; r.error = undefined; }
      else if (action === "edit_scene") {
        const s = r.scenes.find(s => s.id === d.sceneId); if (!s) throw new ServiceError(404, "장면을 찾을 수 없습니다.");
        const p = object(d.scene);
        const title = text(p.title ?? s.title, "화면 제목", 90, 1), screenText = text(p.screenText ?? s.screenText, "화면 설명", 140), narration = text(p.narration ?? s.narration, "대본", 200);
        if (s.copyLocked && (title !== s.title || screenText !== s.screenText || narration !== s.narration) && p.copyLocked !== false) throw new ServiceError(409, "문구가 잠겨 있습니다. 문구 변경 허용을 먼저 선택해 주세요.");
        if (s.narration !== narration) s.voice = undefined;
        const frames = p.seconds === undefined ? s.frames : Math.round(Number(p.seconds) * 30);
        if (!Number.isSafeInteger(frames) || frames < 30 || frames > 450) throw new ServiceError(400, "장면 길이는 1~15초여야 합니다.");
        if (frames !== s.frames && (s.durationLocked || r.spec.durationLocked) && d.allowDuration !== true) throw new ServiceError(409, "길이가 잠겨 있습니다. 시간 변경 허용을 선택해 주세요.");
        if (frames !== s.frames) r.spec.durationLocked = false;
        Object.assign(s, { title, screenText, narration, frames, prompt: text(p.prompt ?? s.prompt, "이미지·영상 구상", 1000, 1), copyLocked: p.copyLocked !== false, durationLocked: p.durationLocked !== false, subtitleStyle: p.subtitleStyle === "emphasis" ? "emphasis" : "calm", textPosition: p.textPosition === "middle" ? "middle" : "lower", crop: Math.max(0, Math.min(100, Number(p.crop ?? s.crop))), zoom: Math.max(100, Math.min(150, Number(p.zoom ?? s.zoom ?? 100))) });
        if (!Number.isFinite(s.crop) || !Number.isFinite(s.zoom)) throw new ServiceError(400, "이미지 위치를 확인해 주세요.");
        s.version++; if (s.id === r.scenes[0].id) r.sampleApproved = false; changed = true; reelEvent(r, "이 장면만 수정했어요", "영상을 다시 합성합니다. 발화가 바뀐 장면만 음성을 다시 만들고 나머지 자산은 보존합니다.");
      } else if (action === "revise") {
        const ids = Array.isArray(d.sceneIds) ? d.sceneIds : [];
        if (!ids.length || ids.some(v => !r.scenes.some(s => s.id === v)) || new Set(ids).size !== ids.length) throw new ServiceError(400, "수정할 장면을 선택해 주세요.");
        r.targetIds = ids as string[]; r.editorial = newEditorialLoop(r.targetIds); r.feedback = text(d.feedback, "수정 의견", 1500, 2); r.stage = "patch"; r.status = "pending"; r.question = undefined;
      } else if (action === "revise_plan") { r.feedback = text(d.feedback, "기획 의견", 1500, 2); if (r.planApproved) throw new ServiceError(409, "승인한 대본은 장면별로 수정해 주세요."); r.stage = "plan"; r.status = "pending"; r.question = undefined; }
      else if (action === "approve_sample") { if (!r.sample || r.sample.version !== r.contentVersion) throw new ServiceError(409, "현재 버전의 샘플을 먼저 만들어 주세요."); if (r.sample.issues.some(i => i.severity === "error") || d.watched !== true) throw new ServiceError(409, "샘플을 재생하고 필수 오류를 수정해 주세요."); r.sampleApproved = true; reelEvent(r, "샘플을 승인했어요", "이 분위기로 나머지 장면을 제작할 수 있어요."); }
      else if (action === "retime") { const firstFrames = r.scenes[0].frames; rebalanceReel(r, d.unlockDuration === true); if (firstFrames !== r.scenes[0].frames) r.sampleApproved = false; changed = true; reelEvent(r, "발화 길이에 맞춰 재배분했어요", "문구·음성·영상 원본을 유지하고 장면 시간과 자막 배치만 갱신했습니다."); }
      else if (action === "music") {
        if (!d.assetId) r.music = undefined;
        else { const [a] = await tx.query<{ name: string }>("SELECT name FROM assets WHERE id=$1 AND owner_id=$2 AND mime LIKE 'audio/%'", [text(d.assetId, "음악", 100, 1), userId]); if (!a) throw new ServiceError(404, "내 음악 파일을 찾을 수 없습니다."); r.music = { assetId: String(d.assetId), name: a.name, gain: .15 }; }
        changed = true;
      } else throw new ServiceError(400, "지원하지 않는 제작 작업입니다.");
    }
    r.responses.push(key); r.responses = r.responses.slice(-150); await saveReel(tx, r, action, changed); return r;
  });
}
