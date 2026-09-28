import { agentTask } from "@/projects/agent-progress";
import { parsePairedCopy } from "@/projects/paired-copy";
import { newEditorialLoop, editorialTargets, MAX_EDITORIAL_REPAIRS } from "@/projects/editorial-review";
import { recordEditorialReview } from "./editorial-review";
import { parseTypography, proposeTypography } from "@/projects/typography-validation";
import { isPageFormat, PRODUCT_KINDS, type PageFormat, type ProductImage } from "@/projects/product-detail";
import { randomUUID } from "node:crypto";
import { LANDING_KINDS, landingTerminal, type LandingWorkflow, type LandingIntent, type LandingSection } from "@/projects/landing-workflow";
import { createDraft } from "@/projects/outline";
import { newSlot, safeLink, PRESETS } from "@/projects/formats";
import { imagePlan, imagePlane, PRODUCT_REFERENCE_MODEL } from "@/projects/landing-images";
import { parseImagePlan, parseProductInfo, parseProject } from "@/projects/validation";
import { database, type Database } from "./db";
import { ledger, quote } from "./credits";
import { object, ServiceError, text } from "./errors";
import { resolveOpenAi } from "./openai-settings";
import { landingModel, type LandingModel } from "./landing-model";
import { resolveProductImages } from "./product-images";
import { initializeProjectTrace, queueTrace, captureTrace } from "./workflow-trace";

type Row = { data: LandingWorkflow; lease_token: string | null; lease_until: number | null };
const event = (r: LandingWorkflow, title: string, message: string) => { r.events.push({ id: randomUUID(), title, message, at: Date.now() }); r.events = r.events.slice(-70); };
async function row(tx: Database, userId: string, id: string) {
  const [r] = await tx.query<Row>("SELECT w.data,w.lease_token,w.lease_until FROM landing_workflows w JOIN projects p ON p.id=w.project_id WHERE w.id=$1 AND w.user_id=$2 AND p.deleted_at IS NULL FOR UPDATE OF w", [id, userId]);
  if (!r) throw new ServiceError(404, "랜딩 제작 작업을 찾을 수 없습니다.");
  return r;
}
async function save(tx: Database, r: LandingWorkflow, reason: string, changed = false, lease: string | null = null) {
  if (changed) {
    r.contentVersion++; r.review = undefined; r.project.updatedAt = Date.now();
    r.project = parseProject(r.project);
    const updated = await tx.query("UPDATE projects SET document=$1,version=version+1,updated_at=$2 WHERE id=$3 AND version=$4 AND deleted_at IS NULL RETURNING id", [JSON.stringify(r.project), r.project.updatedAt, r.projectId, r.project.version]);
    if (!updated.length) throw new ServiceError(409, "다른 창에서 프로젝트를 변경했어요. 기존 편집 내용을 보호하기 위해 이 AI 작업을 멈췄습니다. 제작을 종료하고 편집기에서 이어가 주세요.");
    r.project.version++;
    await tx.query("INSERT INTO landing_workflow_versions (run_id,version,data,reason,created_at) VALUES ($1,$2,$3,$4,$5)", [r.id, r.contentVersion, JSON.stringify({ project: r.project, intent: r.intent, plan: r.plan }), reason, Date.now()]);
  }
  r.revision++; r.updatedAt = Date.now();
  await tx.query("UPDATE landing_workflows SET data=$1,lease_token=$2,lease_until=$3,updated_at=$4 WHERE id=$5", [JSON.stringify(r), lease, lease ? Date.now() + 75000 : null, r.updatedAt, r.id]);
  await queueTrace(tx, { projectId: r.projectId, runId: r.id, turnId: r.calls ? `${r.id}:${r.calls}` : undefined, phase: r.stage }, "workflow.state", reason, {
    status: r.status, revision: r.revision, contentVersion: r.contentVersion, changed,
    calls: r.calls, model: r.model, effort: r.effort, summary: r.events.at(-1)?.message,
    summaryKind: "application_result", error: r.error, intent: r.intent, plan: r.plan,
    review: r.review, editorial: r.editorial, autoImages: r.autoImages, ...(changed ? { project: r.project } : {}),
  }, `landing:${r.id}:${r.revision}`);
}
export async function getLanding(userId: string, id: string) {
  return (await database()).transaction(async tx => {
    const found = await row(tx, userId, id), r = found.data;
    if (found.lease_token && Number(found.lease_until) < Date.now()) {
      r.status = "paused"; r.error = "작업 응답 시간이 지났어요. 저장된 내용을 확인하고 재시도해 주세요.";
      event(r, "응답 확인 필요", r.error); await save(tx, r, "응답 시간 초과");
    }
    return r;
  });
}
export async function activeLanding(userId: string, format: PageFormat = "landing") {
  const [r] = await (await database()).query<{ id: string }>("SELECT w.id FROM landing_workflows w JOIN projects p ON p.id=w.project_id WHERE w.user_id=$1 AND p.deleted_at IS NULL AND p.document->>'format'=$2 AND w.data->>'status' NOT IN ('completed','cancelled') ORDER BY w.updated_at DESC LIMIT 1", [userId, format]);
  return r ? getLanding(userId, r.id) : null;
}
export async function startLanding(userId: string, input: unknown) {
  const d = object(input), key = text(d.key, "요청 ID", 100, 8), enteredIdea = text(d.idea ?? "", "페이지 소개", 3000), db = await database();
  const format = d.format === undefined ? "landing" : d.format;
  if (typeof format !== "string" || !isPageFormat(format)) throw new ServiceError(400, "페이지 형식을 확인해 주세요.");
  const label = format === "product-detail" ? "제품 상세" : "랜딩";
  const product = format === "product-detail" ? parseProductInfo(d.product, true) : undefined;
  const [old] = await db.query<{ id: string }>("SELECT w.id FROM landing_workflows w JOIN generation_jobs j ON j.id=w.id WHERE j.user_id=$1 AND j.idempotency_key=$2", [userId, key]);
  if (old) { const saved = await getLanding(userId, old.id); if (saved.project.format !== format) throw new ServiceError(409, "다른 형식에 사용된 요청 ID입니다."); return saved; }
  const referenceImages = await resolveProductImages(userId, d.referenceImageIds);
  if (enteredIdea.length === 1 || enteredIdea.length < 2 && (format === "product-detail" || !referenceImages.length)) throw new ServiceError(400, "페이지 소개를 두 글자 이상 입력하거나 참고 이미지를 올려 주세요.");
  const idea = enteredIdea.length >= 2 ? enteredIdea : "업로드한 이미지를 바탕으로 소개할 내용과 방문자에게 전할 가치를 제안하고, 차분한 랜딩 페이지를 함께 기획해 주세요. 사진만으로 알 수 없는 사실은 확인해 주세요.";
  const config = await resolveOpenAi(), now = Date.now();
  const project = createDraft(format, { topic: product?.name || idea.slice(0, 60), audience: "", tone: "calm", count: 5, mustInclude: idea }, "editorial");
  if (product) project.product = product;
  // An analysis draft must not pretend that unrelated demo images are generated assets.
  project.slots.forEach(s => { delete s.media; s.href = ""; });
  return db.transaction(async tx => {
    const [user] = await tx.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1 FOR UPDATE", [userId]);
    const [duplicate] = await tx.query<{ id: string }>("SELECT id FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2", [userId, key]);
    if (duplicate) { const [old] = await tx.query<Row>("SELECT data FROM landing_workflows WHERE id=$1", [duplicate.id]); if (old) { if (old.data.project.format !== format) throw new ServiceError(409, "다른 형식에 사용된 요청 ID입니다."); return old.data; } throw new ServiceError(409, "이미 사용된 요청 ID입니다."); }
    if (!user || user.credits < 1) throw new ServiceError(402, `${label} 원고 제작에 1 크레딧이 필요합니다.`);
    if ((await tx.query("SELECT w.id FROM landing_workflows w JOIN projects p ON p.id=w.project_id WHERE w.user_id=$1 AND p.deleted_at IS NULL AND p.document->>'format'=$2 AND w.data->>'status' NOT IN ('completed','cancelled')", [userId, format])).length) throw new ServiceError(409, `진행 중인 ${label} 제작을 이어가거나 종료해 주세요.`);
    const id = randomUUID();
    const r: LandingWorkflow = { id, projectId: project.id, project, referenceImages, revision: 1, contentVersion: 1, status: "pending", stage: "understand", idea, model: config.model, effort: config.effort || undefined,
      intent: { ...(product ? { product } : {}), brand: "", audience: "", problem: "", value: "", goal: "", ctaLabel: "", ctaHref: "", traffic: "", facts: "", tone: "calm", preset: "editorial" }, explicit: [], intentApproved: false, planApproved: false, plan: [], events: [], responses: [], calls: 0, maxCalls: 12, feedback: "", targetId: "", hasDraft: false, createdAt: now, updatedAt: now };
    event(r, "메모에서 제작 방향을 찾아요", "방문자와 원하는 행동을 제안합니다. 방향과 섹션 기획을 확인한 뒤 원고를 만들어요.");
    await tx.query("INSERT INTO projects (id,owner_id,document,updated_at) VALUES ($1,$2,$3,$4)", [project.id, userId, JSON.stringify(project), now]);
    await initializeProjectTrace(tx, project, userId, "landing-workflow");
    await queueTrace(tx, { projectId: project.id, runId: id, phase: "understand" }, "user.action", "제작 요청", { idea, referenceImages, product, model: r.model, effort: r.effort, policy: "existing-workflow", project });
    for (const image of referenceImages) await tx.query("UPDATE assets SET project_id=COALESCE(project_id,$1) WHERE id=$2 AND owner_id=$3", [project.id, image.id, userId]);
    if (referenceImages.length) event(r, product ? "상품 사진을 함께 읽어요" : "참고 이미지를 함께 읽어요", product ? `업로드한 ${referenceImages.length}장의 사진과 상품명·설명을 함께 분석합니다. 대표 사진은 상품 소개에 우선 배치하고 기획에서 확인받아요.` : `업로드한 ${referenceImages.length}장의 이미지와 메모에서 페이지 방향을 제안합니다. 원본 이미지의 섹션 배치는 기획에서 직접 확인할 수 있어요.`);
    await tx.query("UPDATE users SET credits=credits-1 WHERE id=$1", [userId]);
    await tx.query("INSERT INTO generation_jobs (id,user_id,idempotency_key,state,cost,plane,project_id,created_at) VALUES ($1,$2,$3,'submitting',1,$4,$5,$6)", [id, userId, key, JSON.stringify({ type: "outline", workflow: format, draft: project }), project.id, now]);
    await tx.query("INSERT INTO landing_workflows (id,project_id,user_id,data,updated_at) VALUES ($1,$2,$3,$4,$5)", [id, project.id, userId, JSON.stringify(r), now]);
    await tx.query("INSERT INTO landing_workflow_versions (run_id,version,data,reason,created_at) VALUES ($1,1,$2,'제작 시작',$3)", [id, JSON.stringify({ project, intent: r.intent, plan: [] }), now]);
    await ledger(tx, userId, -1, "hold", `참여형 ${label} 원고 제작 예약`, id); return r;
  });
}
export function parseLandingIntent(input: unknown, format: PageFormat = "landing"): LandingIntent {
  const d = object(input), href = text(d.ctaHref, "버튼 연결 주소", 2048);
  if (href && (!safeLink(href) || href.startsWith("#") && !/^#section-[1-8]$/.test(href))) throw new ServiceError(400, "https:// 주소, 이메일(mailto:), 전화(tel:) 또는 #section-번호를 입력해 주세요.");
  if (!PRESETS.some(p => p.id === d.preset) || !["friendly", "expert", "witty", "calm"].includes(String(d.tone))) throw new ServiceError(400, "스타일과 문장 톤을 선택해 주세요.");
  return { ...(format === "product-detail" ? { product: parseProductInfo(d.product, true) } : {}), brand: text(d.brand, "브랜드", 60), audience: text(d.audience, "방문자", 180, 1), problem: text(d.problem, "방문자 고민", 180, 1), value: text(d.value, "핵심 가치", 180, 1), goal: text(d.goal, "행동 목표", 100, 1), ctaLabel: text(d.ctaLabel, "버튼 문구", 50, 1), ctaHref: href, traffic: text(d.traffic, "유입 경로", 100), facts: text(d.facts, "실제 근거·필수 문구", 3000), tone: d.tone as string, preset: d.preset as LandingIntent["preset"] };
}
export function parseLandingPlan(value: unknown, previous?: LandingSection[], format: PageFormat = "landing", references: ProductImage[] = []): LandingSection[] {
  if (!Array.isArray(value) || value.length < 3 || value.length > 8) throw new ServiceError(400, "섹션은 3~8개로 구성해 주세요.");
  const plan = value.map(raw => {
    const d = object(raw), kind = text(d.kind, "섹션 역할", 30, 1);
    if (!(format === "product-detail" ? PRODUCT_KINDS : LANDING_KINDS).some(k => k === kind)) throw new ServiceError(400, "지원하지 않는 섹션 역할입니다.");
    const id = previous ? text(d.id, "섹션 ID", 80, 1) : randomUUID();
    if (previous && !previous.some(s => s.id === id && s.kind === kind)) throw new ServiceError(400, "기획의 섹션 ID와 역할을 유지해 주세요.");
    const plan = d.imagePlan ? parseImagePlan(d.imagePlan) : imagePlan({ kind, title: String(d.title) });
    let sourceImageId = d.sourceImageId === undefined ? "" : text(d.sourceImageId, "원본 사진", 80);
    if (sourceImageId && !references.some(image => image.id === sourceImageId)) throw new ServiceError(400, format === "product-detail" ? "업로드한 상품 사진 중에서 선택해 주세요." : "업로드한 참고 이미지 중에서 선택해 주세요.");
    if (!previous && kind === "hero" && references.length) { sourceImageId = references[0].id; plan.enabled = true; }
    if (!plan.enabled) sourceImageId = "";
    return { id, kind: kind as LandingSection["kind"], title: text(d.title, "섹션 제목", 90, 1), question: text(d.question, "방문자 질문", 150, 1), message: text(d.message, "핵심 메시지", 500, 1), imagePlan: plan, ...(format === "product-detail" || references.length ? { sourceImageId } : {}) };
  });
  if (new Set(plan.map(s => s.id)).size !== plan.length || plan[0].kind !== "hero" || plan.at(-1)!.kind !== "cta" || plan.slice(1, -1).some(s => s.kind === "hero" || s.kind === "cta")) throw new ServiceError(400, "첫 히어로와 마지막 행동 유도 섹션을 유지해 주세요.");
  return plan;
}
export function applyLandingCopy(r: LandingWorkflow, value: unknown, patch: boolean) {
  const ids = patch ? r.stage === "refine" ? r.editorial?.targetIds || [] : [r.targetId] : r.plan.map(s => s.id);
  if (!Array.isArray(value) || value.length !== ids.length) throw new ServiceError(502, "승인한 섹션 수와 AI 응답이 다릅니다.");
  const sections = value.map(raw => object(raw));
  if (new Set(sections.map(s => s.id)).size !== ids.length || sections.some((s, i) => s.id !== ids[i])) throw new ServiceError(502, "AI가 승인된 섹션 ID 또는 순서를 변경했습니다. 원본을 유지합니다.");
  const slots = (patch ? r.project.slots : r.plan.map(s => {
    const source = r.referenceImages?.find(image => image.id === s.sourceImageId);
    if (s.sourceImageId && !source) throw new ServiceError(400, "승인한 원본 사진을 찾지 못했습니다.");
    return { ...newSlot(s.kind), id: s.id, imagePlan: s.imagePlan, ...(source && imagePlan(s).enabled ? { media: { kind: "image" as const, url: source.url, name: source.name } } : {}) };
  })).map(s => {
    const d = sections.find(d => d.id === s.id);
    if (!d) return s;
    const updated = { ...s, title: text(d.title, "제목", 90, 1), body: text(d.body, "본문", 2000, 1), kicker: text(d.kicker, "상단 문구", 60), prompt: r.stage === "refine" ? s.prompt : text(d.prompt, "이미지 구상", 1000, imagePlan(s).enabled && !s.media ? 1 : 0), cta: ["hero", "cta"].includes(s.kind) ? r.intent.ctaLabel : "", href: ["hero", "cta"].includes(s.kind) ? r.intent.ctaHref : "" };
    if (["faq", "specs"].includes(s.kind) && !parsePairedCopy(updated.body, s.kind === "faq")) throw new ServiceError(502, "질문·답변 또는 규격의 항목·값 형식을 확인하지 못했어요.");
    return updated;
  });
  r.project = parseProject({ ...r.project, brand: r.intent.brand, preset: r.intent.preset, ...(r.intent.product ? { product: r.intent.product } : {}), brief: { ...r.project.brief, audience: r.intent.audience.slice(0, 100), tone: r.intent.tone, count: slots.length, mustInclude: r.intent.facts || r.idea }, slots });
}
export async function stepLanding(userId: string, id: string, revision: unknown, provider: LandingModel = r => landingModel(r, userId)) {
  const db = await database(), token = randomUUID();
  const claim = await db.transaction(async tx => {
    const { data: r } = await row(tx, userId, id);
    if (r.revision !== revision || r.status !== "pending") return { r, fresh: false };
    if (r.calls >= r.maxCalls) { r.status = "paused"; r.error = "이번 제작의 AI 호출 한도에 도달했어요. 현재 초안이 있으면 편집기에서 직접 완성할 수 있습니다."; await save(tx, r, "호출 한도"); return { r, fresh: false }; }
    r.status = "running"; r.calls++; r.error = undefined;
    const task = agentTask(r.stage);
    event(r, task.title, `${r.calls}번째 AI 작업 · ${task.focus.join(" · ")}`);
    await save(tx, r, "AI 시작", false, token); return { r, fresh: true };
  });
  if (!claim.fresh) return claim.r;
  try {
    const d = object(await provider(claim.r));
    await captureTrace({ projectId: claim.r.projectId, runId: id, turnId: `${id}:${claim.r.calls}`, phase: claim.r.stage }, "model.parsed", "구조화된 AI 결과 · 적용 전", { result: d, summaryKind: "assistant_output" });
    return await db.transaction(async tx => {
      const found = await row(tx, userId, id), r = found.data;
      if (found.lease_token !== token || r.status !== "running") {
        await queueTrace(tx, { projectId: r.projectId, runId: id, turnId: `${id}:${claim.r.calls}`, phase: claim.r.stage }, "diagnostic", "늦은 응답 · 적용하지 않음", { outcome: "late_discarded", revision: r.revision }); return r;
      }
      const summary = text(d.summary, "작업 요약", 1000, 1); let changed = false;
      if (r.stage === "understand") {
        for (const key of ["brand", "audience", "problem", "value", "goal", "ctaLabel", "traffic"] as const) r.intent[key] = text(d[key], "의도 분석", key === "brand" ? 60 : key === "ctaLabel" ? 50 : key === "goal" || key === "traffic" ? 100 : 180);
        r.explicit = Array.isArray(d.explicit) ? d.explicit.filter((v): v is string => typeof v === "string" && Object.hasOwn(r.intent, v)) : [];
        r.status = "waiting_user";
      } else if (r.stage === "plan") {
        r.typographyRecommendations = proposeTypography(r.project, d.typographyRecommendations);
        try { r.plan = parseLandingPlan(d.sections, undefined, r.project.format as PageFormat, r.referenceImages); }
        catch (error) {
          // Field sizes only: diagnose provider contract failures without logging
          // user copy, uploaded images, or credentials.
          console.warn("[landing-plan:invalid]", JSON.stringify({ count: Array.isArray(d.sections) ? d.sections.length : null, descriptions: Array.isArray(d.sections) ? d.sections.map(s => { const p = (s as { imagePlan?: { description?: unknown } })?.imagePlan; return typeof p?.description === "string" ? p.description.length : typeof p?.description; }) : [] }));
          throw error;
        }
        r.status = "waiting_user"; changed = true;
      } else if (["write", "patch", "refine"].includes(r.stage)) {
        const patch = r.stage !== "write";
        if (!patch) r.editorial = newEditorialLoop();
        if (!patch) r.project.title = text(d.title, "프로젝트 이름", 90, 1);
        applyLandingCopy(r, d.sections, patch); r.hasDraft = true; changed = true; r.stage = "review"; r.status = "pending";
        const settled = await tx.query("UPDATE generation_jobs SET state='completed',result=$1 WHERE id=$2 AND state='submitting' RETURNING id", [JSON.stringify({ status: "completed", projectId: r.projectId }), r.id]);
        if (settled.length) await ledger(tx, userId, 0, "settle", `${r.project.format === "product-detail" ? "제품 상세" : "랜딩"} 원고 제작 완료`, r.id);
      } else {
        if (!Array.isArray(d.issues) || d.issues.length > 10) throw new ServiceError(502, "검수 결과 형식이 맞지 않습니다.");
        const issues = d.issues.map(raw => { const issue = object(raw), sectionId = text(issue.sectionId, "검수 섹션", 80); if (sectionId && !r.project.slots.some(s => s.id === sectionId) || !["attention", "error"].includes(String(issue.severity))) throw new ServiceError(502, "검수 대상이 올바르지 않습니다."); return { sectionId, severity: issue.severity as "attention" | "error", message: text(issue.message, "검수 의견", 500, 1) }; });
        r.review = { version: r.contentVersion, summary, issues }; r.status = "ready";
        r.editorial ||= newEditorialLoop();
        recordEditorialReview(r.editorial, d, issues.map(i => ({ ...i, targetId: i.sectionId })));
        const targets = editorialTargets(r.editorial);
        if (targets.length && r.editorial.repairs < MAX_EDITORIAL_REPAIRS && r.calls + 2 <= r.maxCalls) {
          r.editorial.targetIds = r.project.slots.filter(s => targets.includes(s.id)).map(s => s.id);
          r.editorial.repairs++; r.stage = "refine"; r.status = "pending";
          event(r, "검수 의견을 반영해 한 번 더 다듬어요", `${targets.length}개 섹션 · ${r.editorial.repairs}/${MAX_EDITORIAL_REPAIRS}회 보정. 원본 사진·상품 정보·연결 주소는 유지합니다.`);
        } else if (issues.some(i => i.severity === "error")) {
          event(r, "남은 지적은 함께 확인해 주세요", "자동 보정 범위 또는 한도 밖의 지적이 남았습니다. 검수 내용과 초안을 보고 직접 수정하거나 섹션별 의견을 주세요.");
        }
      }
      event(r, "작업 결과를 저장했어요", summary); await save(tx, r, claim.r.stage === "patch" ? "선택 섹션 수정" : "AI 결과 저장", changed); return r;
    });
  } catch (error) {
    return db.transaction(async tx => {
      const found = await row(tx, userId, id), r = found.data;
      if (found.lease_token !== token) return r;
      r.status = "paused"; r.error = error instanceof ServiceError ? error.message : "AI 작업을 완료하지 못했어요. 저장된 내용에서 다시 시도해 주세요.";
      event(r, "현재 내용을 보존했어요", r.error); await save(tx, r, "AI 실패"); return r;
    });
  }
}
export async function actLanding(userId: string, id: string, input: unknown) {
  const d = object(input), key = text(d.responseId, "응답 ID", 100, 8);
  return (await database()).transaction(async tx => {
    const { data: r } = await row(tx, userId, id);
    if (r.responses.includes(key)) return r;
    if (r.revision !== d.revision || landingTerminal(r)) throw new ServiceError(409, "제작 상태가 변경되었어요. 최신 상태에서 다시 선택해 주세요.");
    const action = text(d.action, "작업", 30, 1); let changed = false;
    if (action === "cancel") {
      r.status = "cancelled";
      const refunded = await tx.query("UPDATE generation_jobs SET state='failed',result=$1 WHERE id=$2 AND state='submitting' RETURNING id", [JSON.stringify({ status: "failed", error: "사용자 중단" }), id]);
      if (refunded.length) { await tx.query("UPDATE users SET credits=credits+1 WHERE id=$1", [userId]); await ledger(tx, userId, 1, "refund", `${r.project.format === "product-detail" ? "제품 상세" : "랜딩"} 원고 생성 전 중단 · 환불`, id); }
      event(r, "AI 제작을 종료했어요", r.hasDraft ? "작성한 초안은 프로젝트에서 이어서 편집할 수 있어요." : "예약한 1 크레딧을 돌려드렸어요.");
    } else {
      if (["pending", "running"].includes(r.status)) throw new ServiceError(409, "진행 중인 작업이 끝나면 수정할 수 있어요.");
      if (action === "typography") {
        if(!["waiting_user","ready","paused"].includes(r.status)) throw new ServiceError(409,"현재 작업이 끝난 뒤 글꼴을 바꿔 주세요.");
        r.project.typography={...parseTypography(d.typography),confirmed:true}; changed=true;
        event(r,"글꼴 조합을 선택했어요","문구와 원본 이미지는 보존했습니다. 새 글꼴의 줄바꿈과 모바일 화면을 확인해 주세요.");
      } else if (action === "confirm_intent") {
        if (r.stage !== "understand" || r.status !== "waiting_user") throw new ServiceError(409, "현재는 제작 방향을 확인하는 단계가 아닙니다.");
        r.intent = parseLandingIntent(d.intent, r.project.format as PageFormat); if (r.intent.product) r.project.product = r.intent.product; r.intentApproved = true; r.stage = "plan"; r.status = "pending"; changed = true;
        event(r, "방문자와 목표를 확정했어요", `${r.intent.audience}에게 ${r.intent.value}를 전하고, ${r.intent.goal}로 연결합니다.`);
      } else if (action === "confirm_plan") {
        if (r.stage !== "plan" || r.status !== "waiting_user" || !r.intentApproved) throw new ServiceError(409, "섹션 기획을 먼저 확인해 주세요.");
        r.plan = parseLandingPlan(d.plan, r.plan, r.project.format as PageFormat, r.referenceImages); r.planApproved = true; if(r.project.typography)r.project.typography.confirmed=true; r.stage = "write"; r.status = "pending"; changed = true;
        event(r, "섹션 흐름을 승인했어요", `${r.plan.length}개 섹션의 역할과 순서를 보호하며 본문을 작성합니다.`);
      } else if (action === "auto_images") {
        if (!r.autoImages) {
          if (r.project.format !== "product-detail" || !r.referenceImages?.length || r.status !== "ready") throw new ServiceError(409, "상품 사진과 완성된 초안을 먼저 확인해 주세요.");
          const count = r.project.slots.filter(s => imagePlan(s).enabled).length;
          const credits = count * quote(imagePlane(PRODUCT_REFERENCE_MODEL, "Product reference", "1:1"));
          if (!count || d.imageCredits !== credits) throw new ServiceError(409, "생성할 이미지 수와 비용을 다시 확인해 주세요.");
          r.autoImages = { state: "queued", model: PRODUCT_REFERENCE_MODEL, credits, key: randomUUID() };
          const { queueAutomaticProductImages } = await import("./landing-images");
          await queueAutomaticProductImages(tx, userId, r);
          event(r, "섹션별 상품 이미지를 제작해요", `${count}장 · ${credits} 크레딧. 업로드 원본을 참고해 후보를 만들며, 확인한 뒤 적용할 수 있어요.`);
        }
      } else if (action === "revise_plan") {
        if (r.stage !== "plan" || r.status !== "waiting_user" || r.planApproved) throw new ServiceError(409, "승인 전 기획만 다시 제안할 수 있어요.");
        r.feedback = text(d.feedback, "기획 의견", 1500, 2); r.status = "pending";
        event(r, "기획 의견을 받았어요", r.feedback);
      } else if (action === "back_intent") {
        if (r.hasDraft || r.status !== "waiting_user" || r.stage !== "plan") throw new ServiceError(409, "초안 생성 전 기획 단계에서 방향을 바꿀 수 있어요.");
        r.stage = "understand"; r.intentApproved = false; r.plan = []; r.feedback = ""; changed = true;
      } else if (action === "revise") {
        if (!r.hasDraft || !r.planApproved || r.status !== "ready") throw new ServiceError(409, "초안 검수가 끝나면 섹션을 수정할 수 있어요.");
        r.targetId = text(d.sectionId, "수정 섹션", 80, 1);
        if (!r.project.slots.some(s => s.id === r.targetId)) throw new ServiceError(400, "수정할 섹션을 선택해 주세요.");
        r.editorial = newEditorialLoop([r.targetId]);
        r.feedback = text(d.feedback, "수정 요청", 1500, 2); r.stage = "patch"; r.status = "pending";
        event(r, "이 섹션에 의견을 반영해요", r.feedback);
      } else if (action === "retry") {
        if (r.status !== "paused" || r.calls >= r.maxCalls) throw new ServiceError(409, "재시도 가능한 작업이 없어요. 초안을 편집기로 이어가거나 제작을 종료해 주세요.");
        r.status = "pending"; r.error = undefined;
      } else if (action === "handoff") {
        if (!r.hasDraft || !["ready", "paused"].includes(r.status) || d.acknowledged !== true) throw new ServiceError(409, "초안과 남은 확인 사항을 확인해 주세요.");
        r.status = "completed"; event(r, "화면 편집으로 이어갑니다", "초안을 보존했습니다. 이미지·링크와 모바일 화면을 확인하고 HTML 파일로 출력해 주세요.");
      } else throw new ServiceError(400, "지원하지 않는 제작 작업입니다.");
    }
    const copyReview = action === "typography" ? r.review : undefined;
    r.responses.push(key); r.responses = r.responses.slice(-100); await save(tx, r, action, changed);
    await queueTrace(tx, { projectId: r.projectId, runId: id, phase: r.stage }, "user.action", `사용자 선택 · ${action}`, { action, input: d, revision: r.revision, satisfaction: "not_inferred" }, `action:${id}:${key}`);
    if(copyReview){r.review={...copyReview,version:r.contentVersion};await save(tx,r,"원고 검수 유지");}
    return r;
  });
}

// Applying candidates and the workflow snapshot is one transaction. Lock order matches save().
export async function applyLandingImages(tx: Database, userId: string, projectId: string, items: import("@/projects/landing-images").ImageItem[]) {
  const { imageFingerprint } = await import("@/projects/landing-images");
  const [active] = await tx.query<{ data: LandingWorkflow }>("SELECT data FROM landing_workflows WHERE project_id=$1 AND user_id=$2 AND data->>'status' NOT IN ('completed','cancelled') FOR UPDATE", [projectId, userId]);
  if (active && (!active.data.hasDraft || !["ready", "paused"].includes(active.data.status))) throw new ServiceError(409, "AI 원고 작업이 끝난 뒤 이미지를 적용해 주세요.");
  const [row] = await tx.query<{ document: import("@/projects/types").Project; version: number }>("SELECT document,version FROM projects WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL FOR UPDATE", [projectId, userId]);
  if (!row) throw new ServiceError(404, "프로젝트를 찾을 수 없습니다.");
  const project = { ...row.document, version: row.version, updatedAt: Date.now() };
  for (const i of items) {
    const slot = project.slots.find(s => s.id === i.slotId);
    if (!slot || imageFingerprint(slot) !== i.fingerprint || !imagePlan(slot).enabled) throw new ServiceError(409, "이미지 요청 후 섹션 내용이 바뀌었어요. 기존 후보는 라이브러리에 보관됩니다. 목록을 새 구성으로 갱신해 주세요.");
    slot.media = i.candidate; slot.prompt = i.prompt; slot.imagePlan = i.plan; slot.appliedJobId = i.jobId;
  }
  if (active) {
    const r = active.data;
    if (r.project.version !== project.version) throw new ServiceError(409, "다른 창에서 초안이 변경되었습니다. 최신 초안에서 다시 확인해 주세요.");
    const review = r.review;
    r.project = project; event(r, "이미지를 확인하고 적용했어요", `${items.length}장 · 확정 문구는 유지했습니다. 이미지와 문구의 조화·모바일 배치를 직접 확인해 주세요.`);
    await save(tx, r, "이미지 확인 적용", true);
    // Image-only changes do not warrant another paid copy review; no visual review is claimed.
    if (review) { r.review = { ...review, version: r.contentVersion }; await save(tx, r, "원고 검수 유지"); }
    return r.project;
  }
  const validated = parseProject(project); validated.version++;
  await tx.query("UPDATE projects SET document=$1,version=$2,updated_at=$3 WHERE id=$4", [JSON.stringify(validated), validated.version, validated.updatedAt, projectId]);
  return validated;
}
