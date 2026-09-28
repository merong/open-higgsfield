import { initializeProjectTrace } from "./workflow-trace";
import { agentTask } from "@/projects/agent-progress";
import { newEditorialLoop } from "@/projects/editorial-review";
import { recordEditorialReview } from "./editorial-review";
import { parseTypography, proposeTypography } from "@/projects/typography-validation";
import { randomUUID } from "node:crypto";
import { COVER_STYLES, WORKFLOW_LABELS, workflowTerminal, type CardWorkflow, type WorkflowQuestion } from "@/projects/card-workflow";
import { createQuickCardDraft } from "@/projects/quick-card";
import { parseProject } from "@/projects/validation";
import { database, type Database } from "./db";
import { ledger } from "./credits";
import { resolveOpenAi } from "./openai-settings";
import { object, ServiceError, text } from "./errors";
import { applyOutline } from "./outline";
import { sourceResults, stringList, workflowModel, type WorkflowModel } from "./workflow-model";

type Row = { data: CardWorkflow; lease_token: string | null; lease_until: number | null };
export function workflowEvent(r: CardWorkflow, type: string, title: string, message: string) {
  r.events.push({ id: randomUUID(), type, title, message, at: Date.now(), revision: r.revision + 1 });
}
export async function workflowRow(tx: Database, userId: string, id: string) {
  const [row] = await tx.query<Row>("SELECT data,lease_token,lease_until FROM card_workflows WHERE id=$1 AND user_id=$2 FOR UPDATE", [id, userId]);
  if (!row) throw new ServiceError(404, "제작 작업을 찾을 수 없습니다.");
  return row;
}
export async function persistWorkflow(tx: Database, r: CardWorkflow, reason: string, changed = false, lease: string | null = null) {
  if (changed) {
    r.project = parseProject(r.project);
    const rows = await tx.query("UPDATE projects SET document=$1,version=version+1,updated_at=$2 WHERE id=$3 AND version=$4 AND deleted_at IS NULL RETURNING version", [JSON.stringify(r.project), Date.now(), r.projectId, r.project.version]);
    if (!rows.length) throw new ServiceError(409, "편집기에서 프로젝트가 바뀌었습니다. 기존 결과를 보존했으니 편집기에서 확인해 주세요.");
    r.project.version++; r.project.updatedAt = Date.now(); r.artifacts = undefined; r.quality = undefined;
    await tx.query("INSERT INTO card_workflow_versions (run_id,version,document,reason,created_at) VALUES ($1,$2,$3,$4,$5)", [r.id, r.project.version, JSON.stringify(r.project), reason, Date.now()]);
  }
  r.revision++; r.updatedAt = Date.now();
  await tx.query("UPDATE card_workflows SET data=$1,lease_token=$2,lease_until=$3,updated_at=$4 WHERE id=$5", [JSON.stringify(r), lease, lease ? Date.now() + 75000 : null, r.updatedAt, r.id]);
}
async function releaseCredit(tx: Database, userId: string, r: CardWorkflow, label: string) {
  const rows = await tx.query("UPDATE generation_jobs SET state='failed',result=$1 WHERE id=$2 AND state='submitting' RETURNING id", [JSON.stringify({ status: "failed", error: label }), r.id]);
  if (rows.length) { await tx.query("UPDATE users SET credits=credits+1 WHERE id=$1", [userId]); await ledger(tx, userId, 1, "refund", label, r.id); }
}
export async function getWorkflow(userId: string, id: string) {
  return (await database()).transaction(async tx => {
    const row = await workflowRow(tx, userId, id), r = row.data;
    if (r.status === "running" && Number(row.lease_until) < Date.now()) {
      r.status = r.quality?.state === "running" ? "ready" : "paused_budget"; if (r.quality?.state === "running") { r.quality.state = "failed"; r.quality.error = "출력 검수 응답을 확인하지 못했습니다. 다시 검수할 수 있어요."; } r.budget.activeMs += 75000; r.error = "요청 확인 시간이 지났습니다. 이전 응답은 최신 결과를 덮어쓰지 않습니다. 현재 결과를 확인하고 재개할 수 있어요.";
      workflowEvent(r, "run.paused", "작업 확인 필요", r.error); await persistWorkflow(tx, r, "잠금 만료");
    } else if (!workflowTerminal(r) && r.updatedAt < Date.now() - 7 * 86400000) {
      r.status = "failed"; r.error = "7일간 입력이 없어 작업을 종료하고 제작 1 크레딧을 환불했습니다.";
      await releaseCredit(tx, userId, r, "참여형 카드뉴스 만료 · 환불"); await persistWorkflow(tx, r, "대기 만료");
    }
    return r;
  });
}
export async function activeWorkflow(userId: string) {
  const [row] = await (await database()).query<{ id: string }>("SELECT id FROM card_workflows WHERE user_id=$1 AND data->>'status' NOT IN ('completed','failed','cancelled') ORDER BY updated_at DESC LIMIT 1", [userId]);
  return row ? getWorkflow(userId, row.id) : null;
}
export async function workflowVersions(userId: string, id: string) {
  await getWorkflow(userId, id);
  return (await database()).query("SELECT version,reason,created_at FROM card_workflow_versions WHERE run_id=$1 ORDER BY version DESC LIMIT 50", [id]);
}
function question(r: CardWorkflow, kind: WorkflowQuestion["kind"], label: string, options: WorkflowQuestion["options"] = []) {
  r.question = { id: randomUUID(), kind, text: label, options }; r.status = "waiting_user";
  workflowEvent(r, "input.requested", "함께 정해 주세요", label);
}
function afterPurpose(r: CardWorkflow) { r.question = undefined; r.stage = r.needsResearch ? "research" : "plan"; r.status = "pending"; }
function afterPlan(r: CardWorkflow) {
  if (r.mode === "delegate") { r.stage = "write"; r.status = "pending"; r.question = undefined; }
  else question(r, "style", "표지의 분위기를 골라 주세요.", COVER_STYLES.map(s => ({ value: s.id, label: s.label, description: s.description })));
}
export async function startWorkflow(userId: string, input: unknown) {
  const data = object(input), key = text(data.key, "요청 키", 100, 8), db = await database();
  const old = await db.query<{ id: string }>("SELECT r.id FROM card_workflows r JOIN generation_jobs j ON j.id=r.id WHERE j.user_id=$1 AND j.idempotency_key=$2", [userId, key]);
  if (old.length) return getWorkflow(userId, old[0].id);
  const source = data.sourceRunId ? await getWorkflow(userId, text(data.sourceRunId, "이전 작업", 100, 1)) : null;
  if (source && !workflowTerminal(source)) throw new ServiceError(409, "진행 중인 작업부터 마무리해 주세요.");
  const draft = source ? structuredClone(source.project) : createQuickCardDraft(data);
  const config = await resolveOpenAi(); await activeWorkflow(userId);
  if (data.referenceAssetId) {
    const [asset] = await db.query<{ id: string; name: string }>("SELECT id,name FROM assets WHERE id=$1 AND owner_id=$2 AND mime LIKE 'image/%'", [text(data.referenceAssetId, "참고 이미지", 100, 1), userId]);
    if (!asset) throw new ServiceError(404, "참고 이미지를 찾을 수 없습니다.");
    draft.slots = draft.slots.map(s => ({ ...s, media: { kind: "image", url: `/api/workspace/assets/${asset.id}`, name: asset.name }, composition: "split", dim: .15 }));
  }
  return db.transaction(async tx => {
    const [user] = await tx.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1 FOR UPDATE", [userId]);
    const [duplicate] = await tx.query<{ id: string }>("SELECT id FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2", [userId, key]);
    if (duplicate) { const [saved] = await tx.query<Row>("SELECT data FROM card_workflows WHERE id=$1", [duplicate.id]); if (saved) return saved.data; throw new ServiceError(409, "다른 작업의 요청 키입니다."); }
    if (!user || user.credits < 1) throw new ServiceError(402, "제작에는 1 크레딧이 필요합니다.");
    if ((await tx.query("SELECT id FROM card_workflows WHERE user_id=$1 AND data->>'status' NOT IN ('completed','failed','cancelled')", [userId])).length) throw new ServiceError(409, "진행 중인 제작을 이어가거나 종료해 주세요.");
    if (source) {
      const [p] = await tx.query<{ document: typeof draft; version: number }>("SELECT document,version FROM projects WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL", [source.projectId, userId]);
      if (!p) throw new ServiceError(404, "프로젝트를 찾을 수 없습니다.");
      Object.assign(draft, p.document, { version: p.version });
    } else { draft.id = randomUUID(); await tx.query("INSERT INTO projects (id,owner_id,document,updated_at) VALUES ($1,$2,$3,$4)", [draft.id, userId, JSON.stringify(draft), Date.now()]); await initializeProjectTrace(tx, draft, userId, "card-workflow"); }
    const id = randomUUID(), now = Date.now();
    const r: CardWorkflow = { id, projectId: draft.id, revision: 1, status: source ? "ready" : "pending", stage: source ? "review" : "understand", project: draft,
      idea: source?.idea || draft.brief.mustInclude, mode: data.mode === "delegate" ? "delegate" : "guided", model: config.model, effort: config.effort,
      spec: source?.spec || { purpose: { value: "", origin: "ai_assumed" }, audience: { value: draft.brief.audience, origin: draft.brief.audience ? "user_explicit" : "ai_assumed" }, channel: { value: "", origin: "ai_assumed" }, count: { value: String(draft.slots.length), origin: data.count ? "user_explicit" : "default" }, constraints: [] },
      question: undefined, responses: [], events: [], plan: source?.plan || [], needsResearch: source?.needsResearch || false, sources: source?.sources || [], researchNote: source?.researchNote || "", feedback: "", targetIds: [], review: null,
      budget: { calls: 0, maxCalls: 12, activeMs: 0, maxActiveMs: 600000, repairs: 0, maxRepairs: 2, images: 0, maxImages: 12 }, cardVersions: source?.cardVersions || Object.fromEntries(draft.slots.map(s => [s.id, 1])), sourceRunId: source?.id, createdAt: now, updatedAt: now };
    workflowEvent(r, "brief.updated", source ? "후속 수정 시작" : "아이디어 접수", "조건을 정리하고 필요한 선택부터 안내합니다. 제작 1 크레딧을 예약했습니다.");
    await tx.query("UPDATE users SET credits=credits-1 WHERE id=$1", [userId]);
    await tx.query("INSERT INTO generation_jobs (id,user_id,idempotency_key,state,cost,plane,project_id,created_at) VALUES ($1,$2,$3,'submitting',1,$4,$5,$6)", [id, userId, key, JSON.stringify({ type: "outline", agent: true, workflow: 2, draft }), draft.id, now]);
    await tx.query("INSERT INTO card_workflows (id,project_id,user_id,data,updated_at) VALUES ($1,$2,$3,$4,$5)", [id, draft.id, userId, JSON.stringify(r), now]);
    await tx.query("INSERT INTO card_workflow_versions (run_id,version,document,reason,created_at) VALUES ($1,$2,$3,'제작 시작',$4)", [id, draft.version, JSON.stringify(draft), now]);
    await ledger(tx, userId, -1, "hold", "참여형 카드뉴스 제작 예약", id); return r;
  });
}
export function contentIssues(r: CardWorkflow) {
  return r.project.slots.flatMap((s) => {
    const issues: { cardId: string; message: string }[] = [];
    if (!s.title || !s.body || !s.prompt) issues.push({ cardId: s.id, message: "제목·본문·이미지 구상을 모두 채워 주세요." });
    // Length alone is not a quality failure. Preserve copy and inspect the rendered layout.
    if (r.spec.purpose.value === "educate" && /구매하기|구매하세요|구매해\s*보|지금\s*구매|장바구니|할인|₩|\d[\d,]*\s*원(?:부터|에|\s|$)/.test(`${s.title} ${s.body} ${s.cta}`)) issues.push({ cardId: s.id, message: "정보 전달 목적에 맞게 가격·구매 유도를 빼고 저장/실천을 안내하세요." });
    return issues;
  });
}
export function applyTargetPatch(r: CardWorkflow, input: unknown) {
  const data = object(input);
  if (!Array.isArray(data.cards) || data.cards.length !== r.targetIds.length) throw new ServiceError(502, "선택한 카드의 수정 결과가 부족합니다.");
  const cards = data.cards.map(object), ids = cards.map(c => text(c.id, "카드 ID", 100, 1));
  if (new Set(ids).size !== ids.length || ids.some(id => !r.targetIds.includes(id))) throw new ServiceError(502, "수정 범위를 벗어난 카드가 반환되었습니다.");
  if (r.patchMode === "layout") {
    return parseProject({ ...r.project, slots: r.project.slots.map(s => {
      const card = cards.find(c => c.id === s.id);
      return card ? { ...s, composition: card.composition ?? s.composition, dim: card.dim ?? s.dim, crop: card.crop ?? s.crop, readingLayout: card.readingLayout ?? s.readingLayout } : s;
    }) });
  }
  const merged = applyOutline(r.project, { title: r.project.title, caption: r.project.caption, slots: r.project.slots.map(s => cards.find(c => c.id === s.id) || s) });
  // Unselected cards are copied byte-for-byte, including image, layout and text.
  merged.slots = merged.slots.map((s, i) => r.targetIds.includes(s.id) ? s : r.project.slots[i]);
  for (const card of cards) {
    const slot = merged.slots.find(s => s.id === card.id)!;
    if (card.composition !== undefined) Object.assign(slot, { composition: card.composition, dim: card.dim, crop: card.crop, readingLayout: card.readingLayout ?? slot.readingLayout });
  }
  return parseProject(merged);
}
export async function stepWorkflow(userId: string, id: string, revision: unknown, provider: WorkflowModel = workflowModel) {
  const db = await database(), token = randomUUID();
  const claimed = await db.transaction(async tx => {
    const { data: r } = await workflowRow(tx, userId, id);
    if (r.revision !== revision || r.status !== "pending") return { r, run: false };
    if (r.budget.calls >= r.budget.maxCalls || r.budget.activeMs >= r.budget.maxActiveMs) {
      r.status = "paused_budget"; r.error = "이번 실행의 작업 한도에 도달했습니다. 현재 결과를 확인하거나 한도를 한 번 늘려 이어갈 수 있어요.";
      workflowEvent(r, "run.paused", "작업 한도 도달", r.error); await persistWorkflow(tx, r, "예산 중단"); return { r, run: false };
    }
    r.status = "running"; r.budget.calls++; r.error = undefined;
    const task = agentTask(r.stage);
    workflowEvent(r, "progress.updated", task.title, `${r.budget.calls}번째 AI 작업 · ${task.focus.join(" · ")}`);
    await persistWorkflow(tx, r, "모델 시작", false, token); return { r, run: true };
  });
  if (!claimed.run) return claimed.r;
  const started = Date.now();
  try {
    const result = await provider(claimed.r), data = object(result.value), r = structuredClone(claimed.r); let changed = false;
    r.budget.activeMs += Date.now() - started;
    if (r.stage === "understand") {
      for (const field of ["purpose", "audience", "channel"] as const) {
        if (r.spec[field].origin !== "user_explicit") r.spec[field] = { value: text(data[field], field, 150, field === "purpose" ? 0 : 1), origin: data[`${field}Explicit`] === true ? "user_explicit" : "ai_assumed" };
      }
      r.spec.constraints = stringList(data.constraints, 8, 150); r.needsResearch = data.needResearch === true;
      if (data.countExplicit === true && r.spec.count.origin === "default" && Number.isInteger(data.count) && Number(data.count) >= 3 && Number(data.count) <= 10) {
        const draft = createQuickCardDraft({ idea: r.idea, count: data.count, tone: r.project.brief.tone, audience: r.spec.audience.value.slice(0,100) });
        r.project.slots = draft.slots.map((s, i) => r.project.slots[i] || s); r.project.brief.count = draft.slots.length; r.spec.count = { value: String(data.count), origin: "user_explicit" }; changed = true;
      }
      workflowEvent(r, "brief.updated", "이렇게 이해했어요", text(data.summary, "요약", 500, 1));
      if (data.purposeExplicit !== true && r.mode === "guided") {
        const validOptions = Array.isArray(data.options) && data.options.length === 3 && new Set(data.options.map(v => object(v).value)).size === 3 && data.options.every(v => ["educate","conversion","branding"].includes(String(object(v).value)));
        const options = validOptions ? (data.options as unknown[]).map(v => { const o = object(v); return { value: text(o.value,"선택",100,1), label: text(o.label,"선택",100,1), description: text(o.description,"설명",200,1) }; }) : [
          { value: "educate", label: "정보 전달", description: "유용해서 저장하고 다시 보는 이야기를 만들어요." },
          { value: "conversion", label: "상품 관심", description: "제품이나 서비스를 더 알아보고 싶게 만들어요." },
          { value: "branding", label: "브랜드 소개", description: "브랜드의 분위기와 가치를 기억하게 만들어요." },
        ];
        question(r, "purpose", validOptions && data.question ? text(data.question, "목적 질문", 300, 1) : "이 카드뉴스로 어떤 반응을 얻고 싶으세요?", options);
      } else afterPurpose(r);
    } else if (r.stage === "research") {
      r.sources = sourceResults(data.sources, result.observedUrls); r.researchNote = text(data.summary,"조사 요약",800,1);
      const warnings = stringList(data.warnings, 6);
      if (!r.sources.length) { r.researchNote = "확인 가능한 검색 근거를 확보하지 못했습니다. 구체적인 사실을 제외한 일반 안내로 진행할 수 있습니다."; question(r,"research",r.researchNote); }
      else { workflowEvent(r,"sources.updated","근거를 확인했어요", `${r.sources.length}개 출처 · ${r.researchNote}${warnings.length ? ` · 확인 사항: ${warnings.join(" / ")}` : ""}`); r.stage="plan";r.status="pending"; }
    } else if (r.stage === "plan") {
      if (!Array.isArray(data.cards) || data.cards.length !== r.project.slots.length) throw new ServiceError(502,"기획 장수가 일치하지 않습니다.");
      r.typographyRecommendations = proposeTypography(r.project, data.typographyRecommendations);
      r.plan = data.cards.map(v => {const c=object(v);return {role:text(c.role,"역할",60,1),title:text(c.title,"제목",90,1),message:text(c.message,"핵심",300,1),...(c.imagePrompt ? {imagePrompt:text(c.imagePrompt,"이미지 구상",700,1)} : {})};});
      r.project.slots = r.project.slots.map((s,i)=>({...s,title:r.plan[i].title,body:r.plan[i].message,prompt:r.plan[i].imagePrompt || s.prompt})); changed=true;
      workflowEvent(r,"preview.ready","장별 기획을 준비했어요",text(data.summary,"요약",600,1));
      if(r.mode==="delegate")afterPlan(r);else question(r,"plan",`${r.plan.length}장 구성입니다. 이 흐름으로 만들까요?`);
    } else if(r.stage==="write") {
      r.editorial = newEditorialLoop(); r.project=applyOutline(r.project,data); changed=true;
      if(r.project.slots[0].kind!=="cover"||r.project.slots.at(-1)?.kind!=="cta")throw new ServiceError(502,"표지와 마무리 구성이 맞지 않습니다.");
      workflowEvent(r,"card.updated","전체 카드 초안을 만들었어요","확정한 목적과 기획에 맞는지 검수합니다."); r.stage="review";r.status="pending";
    } else if(r.stage==="patch") {
      r.project=applyTargetPatch(r,data); changed=true;
      for(const id of r.targetIds)r.cardVersions[id]=(r.cardVersions[id]||1)+1;
      workflowEvent(r,"card.updated","선택한 카드만 수정했어요",text(data.summary,"수정 요약",600,1));
      r.stage="review";r.status=r.patchMode==="layout"?"ready":"pending";
      if(r.patchMode==="layout"){r.review=null;workflowEvent(r,"preview.ready","문구를 보존한 배치를 확인해 주세요","원고를 다시 쓰지 않았습니다. 이미지 교체가 필요하면 해당 카드만 생성하고 실제 출력물을 다시 검수하세요.");}
    } else {
      if(!Array.isArray(data.issues)||data.issues.length>10)throw new ServiceError(502,"검수 응답이 올바르지 않습니다.");
      const issues=data.issues.map(v=>{const x=object(v),cardId=text(x.cardId,"카드",100,1);if(!r.project.slots.some(s=>s.id===cardId))throw new ServiceError(502,"검수 대상이 잘못되었습니다.");return {cardId,message:text(x.message,"검수",400,1)};});
      // A selected-card revision cannot cause automatic changes to unrelated cards.
      r.editorial ||= newEditorialLoop(r.targetIds);
      const allIssues=[...issues,...contentIssues(r)];
      recordEditorialReview(r.editorial,data,allIssues.map(i=>({targetId:i.cardId,severity:"error",message:i.message})));
      const scoped=allIssues.filter(i=>!r.editorial!.scopeIds.length||r.editorial!.scopeIds.includes(i.cardId));
      r.review={summary:text(data.summary,"검수 요약",700,1),issues:scoped,warnings:[...stringList(data.warnings,6),...allIssues.filter(i=>!scoped.includes(i)).map(i=>`선택 범위 밖의 확인 사항: ${i.message}`)].slice(0,10)};
      workflowEvent(r,"validation.updated","내용 검수 결과",r.review.summary);
      if(scoped.length&&r.patchMode!=="layout"&&r.budget.repairs<r.budget.maxRepairs&&r.budget.calls+2<=r.budget.maxCalls){r.targetIds=[...new Set(scoped.map(i=>i.cardId))];r.budget.repairs++;r.editorial.repairs=r.budget.repairs;r.editorial.targetIds=r.targetIds;r.stage="patch";r.status="pending";}
      else if(scoped.length){r.status="paused_budget";r.error=r.patchMode==="layout"?"확정 문구는 유지했습니다. 내용 지적을 확인하고 필요한 경우 문구 수정을 허용해 주세요.":"자동 보정 한도에 도달했습니다. 표시된 카드 문구를 직접 수정하거나 다시 검수해 주세요.";}
      else {r.status="ready";r.error=undefined;workflowEvent(r,"preview.ready","카드를 확인해 주세요","원하는 카드만 고치거나 파일을 준비할 수 있어요. 파일 생성이 끝나면 제작이 완료됩니다.");}
    }
    return db.transaction(async tx=>{const current=await workflowRow(tx,userId,id);if(current.lease_token!==token||current.data.status!=="running")return current.data;await persistWorkflow(tx,r,WORKFLOW_LABELS[claimed.r.stage],changed);return r;});
  } catch(error) {
    return db.transaction(async tx=>{const {data:r,lease_token}=await workflowRow(tx,userId,id);if(lease_token!==token)return r;
      r.budget.activeMs+=Date.now()-started;
      if(r.stage==="research"){question(r,"research","검색을 완료하지 못했습니다. 다시 조사하거나 구체적 사실을 제외한 일반 안내로 진행할까요?");r.error=error instanceof ServiceError?error.message:"검색 연결을 확인해 주세요.";}
      else {
        // Provider/validation failures are recoverable. Keep the last committed
        // draft and approval state; retrying must not create another paid run.
        r.status="paused_budget";
        r.error=`${error instanceof ServiceError && error.status !== 400 ? error.message : "AI 응답이 제작 규격에 맞지 않아 반영하지 않았습니다."} 저장된 단계에서 다시 시도할 수 있어요. 작업 종료를 선택하면 제작 1 크레딧을 환불합니다.`;
        workflowEvent(r,"run.paused","AI 응답을 다시 확인해 주세요",r.error);
      }
      await persistWorkflow(tx,r,"도구 오류");return r;});
  }
}

export async function actWorkflow(userId:string,id:string,input:unknown){
  const data=object(input), action=text(data.action,"행동",40,1), db=await database();
  return db.transaction(async tx=>{
    const {data:r}=await workflowRow(tx,userId,id);
    const responseId=text(data.responseId,"응답 ID",100,8);
    if(r.responses.includes(responseId))return r;
    if(r.revision!==data.revision)throw new ServiceError(409,"다른 창에서 작업이 변경되었습니다. 최신 상태를 불러와 주세요.");
    if(workflowTerminal(r))throw new ServiceError(409,"종료된 실행입니다. 새 수정 실행으로 이어가 주세요.");
    let changed=false;
    if (r.imageBatch?.state === "running" && !["cancel", "spec"].includes(action)) throw new ServiceError(409, "이미지 일괄 생성이 끝난 뒤 수정해 주세요.");
    if (["cancel", "spec"].includes(action) && r.imageBatch) r.imageBatch.state = "stopped";
    if(action==="cancel") {r.status="cancelled";r.question=undefined;await releaseCredit(tx,userId,r,"참여형 카드뉴스 취소 · 환불");workflowEvent(r,"run.cancelled","작업을 종료했어요","제작 1 크레딧은 환불했습니다. 이미 접수된 이미지 작업은 생성 내역에 남습니다.");}
    else if(action==="typography") {
      if(!["waiting_user","ready","paused_budget"].includes(r.status)||r.visual && ["submitting","pending","unknown"].includes(r.visual.state))throw new ServiceError(409,"현재 작업이 끝난 뒤 글꼴을 바꿔 주세요.");
      r.project.typography={...parseTypography(data.typography),confirmed:true};changed=true;
      workflowEvent(r,"typography.updated","글꼴 조합을 선택했어요","제목·본문·영문 강조를 구분해 적용했습니다. 문구와 이미지는 유지하며 출력물은 새 글꼴로 다시 검수합니다.");
    }
    else if(action==="answer") {
      if(r.status!=="waiting_user"||!r.question||data.requestId!==r.question.id)throw new ServiceError(409,"이미 처리됐거나 오래된 질문입니다.");
      const answer=object(data.answer),kind=r.question.kind, mode=text(answer.mode,"응답 방법",30,1);
      if(!["select","free","delegate","approve","retry","skip"].includes(mode))throw new ServiceError(400,"응답 방법이 올바르지 않습니다.");
      const value=text(answer.value??"","선택",1200);
      const answerLabel = r.question.options.find(o => o.value === value)?.label || value;
      if(mode==="delegate")r.mode="delegate";
      if(kind==="purpose"){
        if(!["select","free","delegate"].includes(mode))throw new ServiceError(400,"목적을 선택해 주세요.");
        if(mode==="select"&&!r.question.options.some(o=>o.value===value))throw new ServiceError(400,"유효한 목적을 선택해 주세요.");
        if(mode==="free"&&value.length<2)throw new ServiceError(400,"목적을 적어 주세요.");
        r.spec.purpose={value:mode==="delegate"?(r.spec.purpose.value||r.question.options[0].value):value,origin:mode==="delegate"?"ai_assumed":"user_confirmed"}; afterPurpose(r);
      }else if(kind==="plan"){
        if(mode==="free"){r.feedback=text(value,"기획 의견",1200,2);r.stage="plan";r.status="pending";r.question=undefined;}
        else if(mode==="approve"||mode==="delegate"){if(mode==="approve"&&r.project.typography){r.project.typography.confirmed=true;changed=true;}afterPlan(r);}else throw new ServiceError(400,"기획을 승인하거나 수정 의견을 주세요.");
      }else if(kind==="style"){
        const style=mode==="delegate"?COVER_STYLES[0]:COVER_STYLES.find(s=>s.id===value);
        if(!style||!["delegate","select"].includes(mode))throw new ServiceError(400,"표지 스타일을 선택해 주세요.");
        r.project.preset=style.id;r.stage="write";r.status="pending";r.question=undefined;changed=true;
      }else{if(mode!=="retry"&&mode!=="skip")throw new ServiceError(400,"조사 방법을 선택해 주세요.");r.stage=mode==="retry"?"research":"plan";r.status="pending";r.question=undefined;if(mode==="skip"){r.sources=[];r.spec.constraints.push("검증되지 않은 구체적 사실과 안전성 단정은 제외하고 일반 안내로 작성");r.researchNote="사용자가 근거 없는 구체적 주장을 제외한 일반 안내로 진행하기로 했습니다.";}}
      r.error=undefined;workflowEvent(r,"brief.updated","의견을 반영했어요",mode==="delegate"?"추천값을 가정으로 기록하고 이어갑니다.":answerLabel|| (kind === "research" ? "조사 진행 방법을 선택했습니다." : "현재 기획을 승인했습니다."));
    } else if(action==="spec"){
      const spec=object(data.spec);r.spec.purpose={value:text(spec.purpose,"목적",150,1),origin:"user_confirmed"};r.spec.audience={value:text(spec.audience,"대상",100,1),origin:"user_confirmed"};
      r.spec.constraints=stringList(spec.constraints,8,150);
      const count=Number(spec.count);if(!Number.isInteger(count)||count<3||count>10)throw new ServiceError(400,"장수는 3~10장입니다.");
      const fresh=createQuickCardDraft({idea:r.idea,count,audience:r.spec.audience.value,tone:r.project.brief.tone,preset:r.project.preset});
      r.project.slots=fresh.slots.map((s,i)=>r.project.slots[i]||s);r.project.brief.count=count;r.project.brief.audience=r.spec.audience.value;r.spec.count={value:String(count),origin:"user_confirmed"};
      r.plan=[];r.review=null;r.targetIds=[];r.patchMode=undefined;r.budget.repairs=0;r.question=undefined;r.stage="plan";r.status="pending";r.error=undefined;changed=true;
      workflowEvent(r,"brief.updated","제작 조건을 바꿨어요","이전 결과는 버전에 보관합니다. 바뀐 조건으로 기획을 다시 준비합니다.");
    }else if(action==="revise"){
      if(!["ready","paused_budget"].includes(r.status))throw new ServiceError(409,"현재 작업이 끝난 뒤 수정해 주세요.");
      r.targetIds=stringList(data.cardIds,10,100);if(!r.targetIds.length||new Set(r.targetIds).size!==r.targetIds.length||r.targetIds.some(id=>!r.project.slots.some(s=>s.id===id)))throw new ServiceError(400,"수정할 카드를 선택해 주세요.");
      r.patchMode=data.allowCopy===true?"copy":"layout";r.editorial=newEditorialLoop(r.targetIds);r.feedback=text(data.feedback,"수정 의견",1200,2);r.stage="patch";r.status="pending";r.review=null;r.budget.repairs=0;r.error=undefined;
      workflowEvent(r,"input.received","선택 카드 수정 요청",`${r.targetIds.map(id => r.project.slots.findIndex(s => s.id === id) + 1).join(", ")}장 수정 · ${r.feedback}`);
    }else if(action==="image_prompt"){
      if(r.status!=="ready")throw new ServiceError(409,"카드가 준비되면 이미지 구상을 바꿀 수 있어요.");
      const slot=r.project.slots.find(s=>s.id===data.cardId);if(!slot)throw new ServiceError(404,"카드를 찾을 수 없습니다.");
      slot.prompt=text(data.prompt,"이미지 구상",3000,5);changed=true;
      workflowEvent(r,"card.updated","이미지 구상 수정","원고와 현재 이미지는 보존했습니다. 이미지 생성 버튼을 누르면 새 구상으로 교체합니다.");
    }else if(action==="continue_visual"){
      if(r.status!=="paused_budget"||r.patchMode!=="layout")throw new ServiceError(409,"문구 보호 수정에서만 이어갈 수 있어요.");
      r.status="ready";r.error=undefined;r.review=null;workflowEvent(r,"preview.ready","원고를 유지하고 시각 검수로 이어갑니다","이미지와 배치를 조정한 뒤 실제 출력 검수에서 모든 항목을 다시 확인하세요.");
    }else if(action==="extend_quality"){
      if(r.status!=="ready"||r.budget.maxCalls>=20)throw new ServiceError(400,"이번 작업의 확장 한도에 도달했습니다.");
      r.budget.maxCalls=20;r.budget.maxActiveMs=900000;workflowEvent(r,"run.resumed","출력 검수 한도 확장","최대 20회 호출·활성 15분 안에서 수정과 출력 검수를 이어갑니다.");
    }else if(action==="layout"){
      if(r.status!=="ready")throw new ServiceError(409,"카드가 준비되면 배치를 바꿀 수 있어요.");
      const slot=r.project.slots.find(s=>s.id===data.cardId);if(!slot)throw new ServiceError(404,"카드를 찾을 수 없습니다.");
      const layout=text(data.readingLayout,"읽기 배치",30,1);if(!["balanced","text-first","image-first"].includes(layout))throw new ServiceError(400,"배치를 선택해 주세요.");
      const crop=Number(data.crop);if(!Number.isFinite(crop)||crop<0||crop>100)throw new ServiceError(400,"사진 위치를 확인해 주세요.");
      slot.readingLayout=layout as typeof slot.readingLayout;slot.crop=crop;slot.composition="split";slot.dim=.08;changed=true;
      workflowEvent(r,"card.updated","문구를 보존하고 재배치했어요","글자 크기와 원고를 유지하고 사진·본문 공간 및 사진 위치만 조정했습니다.");
    }else if(action==="edit"){
      if(!["ready","paused_budget"].includes(r.status))throw new ServiceError(409,"작성이 끝나면 직접 수정할 수 있어요.");
      const cardId=text(data.cardId,"카드",100,1),slot=r.project.slots.find(s=>s.id===cardId);if(!slot)throw new ServiceError(404,"카드를 찾을 수 없습니다.");
      slot.title=text(data.title,"제목",90,1);slot.body=text(data.body,"본문",360,1);slot.cta=text(data.cta??slot.cta,"행동 안내",50);r.cardVersions[cardId]=(r.cardVersions[cardId]||1)+1;
      r.review=null;r.targetIds=[cardId];r.status="ready";r.error=undefined;changed=true;workflowEvent(r,"card.updated","카드 문구 저장","선택한 카드만 변경했습니다. 파일 준비 전에 배치를 다시 확인합니다.");
    }else if(action==="reorder"){
      if(r.status!=="ready")throw new ServiceError(409,"카드가 준비된 뒤 순서를 바꿔 주세요.");
      const ids=stringList(data.cardIds,10,100);if(ids.length!==r.project.slots.length||new Set(ids).size!==ids.length||ids.some(id=>!r.project.slots.some(s=>s.id===id)))throw new ServiceError(400,"카드 순서가 올바르지 않습니다.");
      r.project.slots=ids.map(id=>r.project.slots.find(s=>s.id===id)!);r.review=null;changed=true;workflowEvent(r,"card.updated","카드 순서 변경","카드 ID와 이미지는 유지했습니다.");
    }else if(action==="asset"){
      if(!["ready","waiting_user","paused_budget"].includes(r.status))throw new ServiceError(409,"현재 작업이 끝나면 이미지를 바꿀 수 있어요.");
      const [asset]=await tx.query<{id:string;name:string}>("SELECT id,name FROM assets WHERE id=$1 AND owner_id=$2 AND mime LIKE 'image/%'",[text(data.assetId,"이미지",100,1),userId]);if(!asset)throw new ServiceError(404,"이미지를 찾을 수 없습니다.");
      const slot=r.project.slots.find(s=>s.id===data.cardId);if(!slot)throw new ServiceError(404,"카드를 찾을 수 없습니다.");
      slot.media={url:`/api/workspace/assets/${asset.id}`,kind:"image",name:asset.name};slot.composition="split";slot.dim=.08;slot.crop=50;changed=true;workflowEvent(r,"card.updated","이미지를 적용했어요","선택한 카드의 이미지만 변경했습니다.");
    }else if(action==="resume"){
      if(r.status!=="paused_budget")throw new ServiceError(409,"대기 중인 작업이 아닙니다.");
      if(r.budget.calls>=20||r.budget.activeMs>=900000)throw new ServiceError(400,"확장 한도에도 도달했습니다. 편집기에서 결과를 마무리하거나 새 작업으로 시작해 주세요.");
      r.budget.maxCalls=20;r.budget.maxActiveMs=900000;r.budget.repairs=0;r.status="pending";r.error=undefined;workflowEvent(r,"run.resumed","작업을 이어갑니다","호출 최대 20회·활성 15분 안에서 이어갑니다.");
    }else if(action==="restore"){
      if(!["ready","paused_budget"].includes(r.status))throw new ServiceError(409,"현재 작업이 끝나면 이전 버전을 불러올 수 있어요.");
      const [saved]=await tx.query<{document:typeof r.project}>("SELECT document FROM card_workflow_versions WHERE run_id=$1 AND version=$2",[id,Number(data.version)]);if(!saved)throw new ServiceError(404,"버전을 찾을 수 없습니다.");
      r.project={...saved.document,version:r.project.version};r.spec.count={value:String(r.project.slots.length),origin:"user_confirmed"};r.spec.audience={value:r.project.brief.audience||r.spec.audience.value,origin:"user_confirmed"};r.targetIds=[];r.review=null;r.status="ready";changed=true;workflowEvent(r,"card.updated","이전 버전 복원","복원한 결과도 새 버전으로 보관합니다.");
    }else throw new ServiceError(400,"지원하지 않는 제작 행동입니다.");
    r.responses.push(responseId);r.responses=r.responses.slice(-100);await persistWorkflow(tx,r,({typography:"글꼴 선택",cancel:"작업 종료",answer:"선택 반영",spec:"제작 조건 변경",revise:"AI 수정 요청",edit:"문구 직접 수정",layout:"문구 보존 재배치",image_prompt:"이미지 구상 변경",extend_quality:"검수 한도 확장",continue_visual:"문구 보존 검수 전환",reorder:"순서 변경",asset:"이미지 적용",resume:"작업 재개",restore:"이전 버전 복원"} as Record<string,string>)[action],changed);return r;
  });
}
