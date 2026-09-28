import { queueTrace } from "./workflow-trace";
import { isPageFormat } from "@/projects/product-detail";
import { randomUUID } from "node:crypto";
import { imagePlan, imagePlane, imageModels, imageBusy, imageFingerprint, productImagePrompt, type ImageBoard, type ImageItem } from "@/projects/landing-images";
import type { Job, Project } from "@/projects/types";
import { createPlatformClient } from "@/generation/platform";
import { database, type Database } from "./db";
import { getProject } from "./projects";
import { ServiceError, object, text } from "./errors";
import { quote } from "./credits";
import { submitJob, statusesFor } from "./generation";
import { applyLandingImages } from "./landing-workflow";
import { remoteMedia, mediaFormat } from "./reel-media";
import { saveAsset } from "./assets";
import { uploadProductReference } from "./product-images";
import { resolveProvider } from "./provider-settings";
import type { LandingWorkflow } from "@/projects/landing-workflow";
type Client = ReturnType<typeof createPlatformClient>;
type Row = { data: ImageBoard; lease_token: string | null; lease_until: number | null };
const actionable = (i: ImageItem) => ["queued", "submitting", "pending", "unknown"].includes(i.state);
async function row(tx: Database, userId: string, projectId: string) {
  const [r] = await tx.query<Row>("SELECT b.data,b.lease_token,b.lease_until FROM project_image_boards b JOIN projects p ON p.id=b.project_id WHERE b.project_id=$1 AND b.user_id=$2 AND p.deleted_at IS NULL FOR UPDATE OF b", [projectId, userId]);
  if (!r) throw new ServiceError(404, "이미지 제작 목록을 찾을 수 없습니다.");
  return r;
}
async function projectIn(tx: Database, userId: string, id: string): Promise<Project> {
  const [r] = await tx.query<{ document: Project; version: number }>("SELECT document,version FROM projects WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL", [id, userId]);
  if (!r) throw new ServiceError(404, "프로젝트를 찾을 수 없습니다.");
  return { ...r.document, version: r.version };
}
async function save(tx: Database, b: ImageBoard, token: string | null = null) {
  b.revision++; b.updatedAt = Date.now();
  await tx.query("UPDATE project_image_boards SET data=$1,lease_token=$2,lease_until=$3 WHERE project_id=$4", [JSON.stringify(b), token, token ? Date.now() + 90000 : null, b.projectId]);
  await queueTrace(tx, { projectId: b.projectId, runId: b.projectId, phase: "image_board" }, "workflow.state", "이미지 후보·적용 상태", { board: b }, `image-board:${b.projectId}:${b.revision}`);
  return b;
}
function itemFor(p: Project, slot: Project["slots"][number]): ImageItem {
  const plan = imagePlan(slot), model = imageModels(plan.ratio).some(m => m.id === p.modelId) ? p.modelId : "soul-2", prompt = slot.prompt || `${plan.description}. No text, no logos.`;
  return { slotId: slot.id, title: slot.title, plan, model, prompt, cost: quote(imagePlane(model, prompt, plan.ratio)), fingerprint: imageFingerprint(slot), state: "idle", candidate: slot.media?.kind === "image" ? slot.media : undefined, applied: !!slot.media };
}
export async function getImageBoard(userId: string, projectId: string) {
  const p = await getProject(userId, projectId);
  if (!isPageFormat(p.format)) throw new ServiceError(400, "페이지 이미지 제작에서 이용해 주세요.");
  const db = await database();
  const [workflow] = p.format === "product-detail" ? await db.query<{ data: LandingWorkflow }>("SELECT data FROM landing_workflows WHERE project_id=$1 AND user_id=$2 ORDER BY updated_at DESC LIMIT 1", [projectId, userId]) : [];
  const references = workflow?.data.referenceImages || [];
  const initial: ImageBoard = { projectId, referenceImages: references, revision: 1, items: p.slots.filter(s => imagePlan(s).enabled).map(s => itemFor(p, s)), updatedAt: Date.now() };
  await db.query("INSERT INTO project_image_boards (project_id,user_id,data) VALUES ($1,$2,$3) ON CONFLICT (project_id) DO NOTHING", [projectId, userId, JSON.stringify(initial)]);
  return db.transaction(async tx => {
    const found = await row(tx, userId, projectId), b = found.data;
    const p = await projectIn(tx, userId, projectId);
    if (references.length && !b.referenceImages?.length) { b.referenceImages = references; await save(tx, b); }
    // Preserve unconfirmed candidates and in-flight requests; synchronize only untouched/applied slots.
    if (!b.items.some(actionable) && !found.lease_token) {
      const items = p.slots.filter(s => imagePlan(s).enabled || b.items.some(i => i.slotId === s.id && i.candidate && !i.applied)).map(s => {
        const old = b.items.find(i => i.slotId === s.id);
        return old && (!old.applied && old.candidate || old.fingerprint === imageFingerprint(s)) ? old : itemFor(p, s);
      });
      if (JSON.stringify(items) !== JSON.stringify(b.items)) { b.items = items; await save(tx, b); }
    }
    return b;
  });
}
export async function generateBoardImages(userId: string, projectId: string, input: unknown) {
  const d = object(input), key = text(d.key, "요청 ID", 60, 8), db = await database();
  return db.transaction(async tx => {
    const found = await row(tx, userId, projectId), b = found.data;
    if (b.items.some(i => i.key?.startsWith(`${key}:`))) return b;
    if (b.revision !== d.revision || b.items.some(actionable) || found.lease_token) throw new ServiceError(409, "이전 이미지 상태를 먼저 확인해 주세요. 새로고침 후 다시 선택할 수 있어요.");
    if (!Array.isArray(d.items) || !d.items.length || d.items.length > 12) throw new ServiceError(400, "생성할 이미지를 선택해 주세요.");
    const project = await projectIn(tx, userId, projectId);
    const selected = d.items.map(raw => {
      const edit = object(raw), i = b.items.find(i => i.slotId === edit.slotId), s = project.slots.find(s => s.id === edit.slotId);
      if (!i || !s || !imagePlan(s).enabled || i.fingerprint !== imageFingerprint(s)) throw new ServiceError(409, "섹션 내용이 바뀌었어요. 이전 후보를 보관 해제하고 새 구성으로 시작해 주세요.");
      const model = text(edit.model, "이미지 모델", 100, 1), prompt = text(edit.prompt, "이미지 프롬프트", 3000, 1);
      const referenceImageIds = i.referenceImageIds?.length ? i.referenceImageIds : d.useReferences === true ? [(b.referenceImages || []).find(image => image.url === s.media?.url) || b.referenceImages?.[0]].flatMap(image => image ? [image.id] : []) : [];
      if (d.useReferences === true && (!referenceImageIds.length || project.format !== "product-detail")) throw new ServiceError(400, "먼저 상품 사진을 업로드하고 기획을 완료해 주세요.");
      if (!imageModels(i.plan.ratio, referenceImageIds.length > 0).some(m => m.id === model)) throw new ServiceError(400, "이 비율을 지원하는 이미지 모델을 선택해 주세요.");
      return { i, model, prompt, referenceImageIds, cost: quote(imagePlane(model, prompt, i.plan.ratio)) };
    });
    if (new Set(selected.map(s => s.i.slotId)).size !== selected.length) throw new ServiceError(400, "중복 이미지 요청입니다.");
    const total = selected.reduce((sum, s) => sum + s.cost, 0);
    if (d.credits !== total) throw new ServiceError(409, "생성 비용을 다시 확인해 주세요.");
    const [u] = await tx.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [userId]);
    if (!u || u.credits < total) throw new ServiceError(402, `전체 생성에 ${total} 크레딧이 필요합니다.`);
    selected.forEach(({ i, model, prompt, cost, referenceImageIds }, n) => Object.assign(i, { model, prompt, cost, referenceImageIds, key: `${key}:${n}`, state: "queued", error: undefined, candidate: undefined, applied: false, jobId: undefined, startedAt: Date.now() }));
    return save(tx, b);
  });
}
export async function stepBoardImages(userId: string, projectId: string, client?: Client, archive: (userId: string, projectId: string, url: string) => Promise<string> = archiveImage) {
  const db = await database(), token = randomUUID();
  const claim = await db.transaction(async tx => {
    const found = await row(tx, userId, projectId), b = found.data;
    if (found.lease_token && Number(found.lease_until) > Date.now()) return { b };
    const i = b.items.find(actionable);
    if (!i) { if (found.lease_token) await save(tx, b); return { b }; }
    if (i.state === "queued") i.state = "submitting";
    await save(tx, b, token); return { b, i };
  });
  if (!claim.i) return claim.b;
  const i = claim.i;
  let patch: Partial<ImageItem> = {};
  const lookup = async () => (await db.query<Job>("SELECT id,request_id,state,result,created_at FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2", [userId, i.key]))[0];
  try {
    let job = await lookup();
    // A recorded provider job is never submitted again, including unknown outcomes.
    if (!job) {
      if (quote(imagePlane(i.model, i.prompt, i.plan.ratio)) !== i.cost) throw new ServiceError(409, "이미지 생성 단가가 변경됐어요. 비용을 다시 확인해 주세요.");
      let provider = client;
      const references: { id: string; url: string }[] = [];
      if (i.referenceImageIds?.length) {
        provider ||= createPlatformClient(await resolveProvider(userId));
        for (const id of i.referenceImageIds) references.push({ id, url: await uploadProductReference(userId, id, provider) });
      }
      await submitJob(userId, imagePlane(i.model, references.length ? productImagePrompt(i.title, i.prompt) : i.prompt, i.plan.ratio, references), i.key!, { projectId, slotId: i.slotId, reviewRequired: true }, client);
      job = await lookup();
    }
    if (job?.request_id && !["completed", "failed"].includes(job.state)) {
      const [status] = await statusesFor(userId, [job.request_id], client);
      if (status && "error" in status) patch.error = status.error;
      job = await lookup();
    }
    if (!job) throw new ServiceError(502, "생성 요청이 저장되지 않았습니다.");
    patch = { ...patch, state: job.state, jobId: job.id };
    if (job.state === "submitting" && Date.now() - Number(job.created_at) > 90000) { patch.state = "unknown"; patch.error = "접수 결과 확인이 필요합니다. 자동으로 다시 결제하지 않아요."; }
    if (job.state === "unknown") patch.error = "접수 결과가 불명확합니다. 생성 내역에서 확인 후 관리자에게 문의해 주세요. 중복 요청을 차단했습니다.";
    if (job.state === "failed") patch.error = job.result?.error || "이미지 생성에 실패했어요. 예약 크레딧은 환불됩니다.";
    if (job.state === "completed") {
      const url = job.result?.images?.[0]?.url;
      if (!url || !url.startsWith("https://")) throw new ServiceError(502, "생성 파일 주소를 확인할 수 없습니다.");
      try { patch.candidate = { kind: "image", url: await archive(userId, projectId, url), name: i.plan.description }; }
      catch { patch.state = "pending"; patch.error = "이미지는 생성됐지만 보관하지 못했어요. 상태 다시 확인으로 저장만 재시도합니다. 추가 결제는 없습니다."; }
    }
  } catch (error) {
    const job = await lookup();
    patch.state = job?.state === "completed" ? "pending" : job?.state || "failed";
    patch.jobId = job?.id; patch.error = error instanceof ServiceError ? error.message : "이미지 상태를 확인하지 못했어요. 상태 다시 확인을 눌러 주세요.";
  }
  return db.transaction(async tx => {
    const found = await row(tx, userId, projectId), b = found.data;
    if (found.lease_token !== token) return b;
    const current = b.items.find(n => n.key === i.key);
    if (current) Object.assign(current, patch);
    return save(tx, b);
  });
}
async function archiveImage(userId: string, projectId: string, url: string) {
  const bytes = await remoteMedia(url), format = mediaFormat(bytes);
  const mime = ({ png_pipe: "image/png", jpeg_pipe: "image/jpeg", webp_pipe: "image/webp" } as Record<string, string>)[format];
  if (!mime) throw new ServiceError(400, "이미지 파일이 아닙니다.");
  const asset = await saveAsset(userId, new File([new Uint8Array(bytes)], `landing-${randomUUID()}.${mime.split("/")[1]}`, { type: mime }), true);
  await (await database()).query("UPDATE assets SET project_id=$1 WHERE id=$2 AND owner_id=$3", [projectId, asset.id, userId]);
  return asset.url;
}
export async function applyBoardImages(userId: string, projectId: string, input: unknown) {
  const d = object(input);
  return (await database()).transaction(async tx => {
    const found = await row(tx, userId, projectId), b = found.data;
    if (b.revision !== d.revision || imageBusy(b) || found.lease_token) throw new ServiceError(409, "이미지 생성이 끝난 뒤 최신 목록에서 확인해 주세요.");
    const items = b.items.filter(i => i.state === "completed" && i.candidate && !i.applied);
    if (!items.length) throw new ServiceError(400, "적용할 새 이미지가 없습니다.");
    const project = await applyLandingImages(tx, userId, projectId, items);
    for (const i of items) { i.applied = true; i.fingerprint = imageFingerprint(project.slots.find(s => s.id === i.slotId)!); }
    await save(tx, b); return { board: b, project };
  });
}
export async function resetBoardImages(userId: string, projectId: string, input: unknown) {
  const d = object(input);
  return (await database()).transaction(async tx => {
    const found = await row(tx, userId, projectId), b = found.data;
    if (b.revision !== d.revision || b.items.some(actionable) || found.lease_token) throw new ServiceError(409, "접수된 요청의 상태부터 확인해 주세요.");
    const p = await projectIn(tx, userId, projectId);
    b.items = p.slots.filter(s => imagePlan(s).enabled).map(s => itemFor(p, s));
    return save(tx, b);
  });
}

// Called while the owning landing workflow is locked; queue and consent commit together.
export async function queueAutomaticProductImages(tx: Database, userId: string, r: LandingWorkflow) {
  const consent = r.autoImages;
  if (!consent || consent.state !== "queued" || r.project.format !== "product-detail" || !r.referenceImages?.length || r.status !== "ready") throw new ServiceError(409, "상품 사진과 완성된 원고, 이미지 생성 선택을 먼저 확인해 주세요.");
  const project = await projectIn(tx, userId, r.projectId);
  if (project.version !== r.project.version) throw new ServiceError(409, "페이지가 변경됐어요. 최신 초안에서 이미지 제작을 선택해 주세요.");
  const [existing] = await tx.query<Row>("SELECT data,lease_token,lease_until FROM project_image_boards WHERE project_id=$1 FOR UPDATE", [r.projectId]);
  if (existing && (existing.lease_token || existing.data.items.some(i => actionable(i) || i.candidate && !i.applied))) throw new ServiceError(409, "먼저 전체 이미지 제작에서 진행 중인 작업과 미적용 후보를 확인해 주세요.");
  const items = project.slots.filter(s => imagePlan(s).enabled).map((s, n) => {
    const plan = imagePlan(s), source = r.plan.find(p => p.id === s.id)?.sourceImageId || r.referenceImages![0].id;
    if (!r.referenceImages!.some(image => image.id === source)) throw new ServiceError(400, "승인한 상품 사진을 찾지 못했어요.");
    const prompt = productImagePrompt(s.title, `${plan.description}. Section message: ${r.plan.find(p => p.id === s.id)?.message || ""}`);
    return { ...itemFor(project, s), model: consent.model, prompt, cost: quote(imagePlane(consent.model, prompt, plan.ratio)), referenceImageIds: [source], state: "queued" as const, candidate: undefined, applied: false, key: `${consent.key}:${n}`, startedAt: Date.now() };
  });
  const total = items.reduce((sum, i) => sum + i.cost, 0);
  if (!items.length || total !== consent.credits) throw new ServiceError(409, "이미지 수나 비용이 변경됐어요. 초안에서 생성 비용을 다시 확인해 주세요.");
  const [user] = await tx.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [userId]);
  if (!user || user.credits < total) throw new ServiceError(402, `이미지 생성에 ${total} 크레딧이 필요합니다. 크레딧 확인 후 다시 시작해 주세요.`);
  const board: ImageBoard = { projectId: r.projectId, referenceImages: r.referenceImages, revision: existing?.data.revision || 1, items, updatedAt: Date.now() };
  if (!existing) await tx.query("INSERT INTO project_image_boards (project_id,user_id,data) VALUES ($1,$2,$3)", [r.projectId, userId, JSON.stringify(board)]);
  await save(tx, board);
}
