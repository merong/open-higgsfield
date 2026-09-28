"use client";
import { AgentThinking, AgentReviewPanel } from "./agent-thinking";
import { TypographyPanel } from "./typography-panel";
import { PRODUCT_EXAMPLES, PRODUCT_LABELS, emptyProduct, type PageFormat, type ProductInfo, type ProductImage } from "@/projects/product-detail";
import { ProductImageUpload, ProductImageStrip } from "./product-image-upload";
import { LandingImageRecommendation } from "./landing-image-recommendation";
import { ProductImageRecommendation } from "./product-image-recommendation";
import { applyProductRecommendation } from "@/projects/product-recommendation";
import { ProductInfoFields } from "./product-info-fields";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Segment, Textarea } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { PRESETS } from "@/projects/formats";
import { LANDING_GOALS, landingChecks, landingTerminal, type LandingWorkflow, type LandingIntent, type LandingSection } from "@/projects/landing-workflow";
import { imagePlan, imagePlaceholder } from "@/projects/landing-images";
import { LandingImageBoard, ImagePlanFields } from "./landing-image-board";
import { LandingPreview } from "./landing-preview";
import { useSession } from "@/shell/workspace-shell";
import "./landing-workflow.css";

const stages = ["방향 정하기", "방문자 흐름", "초안과 검수", "화면 편집"];
const labels: Record<string, string> = { hero: "첫인상", features: "핵심 가치", story: "이해와 공감", faq: "망설임 해소", cta: "다음 행동" };
const examples = [
  { label: "클래스·행사", idea: "초보자를 위한 반려식물 분갈이 클래스 소개 페이지. 작은 집에서도 식물을 잘 키우고 싶은 직장인이 대상이에요. 직접 분갈이를 해보는 경험을 소개하고 참가 문의로 연결하고 싶어요. 가격·일정은 아직 미정입니다." },
  { label: "서비스·상담", idea: "작은 브랜드를 위한 제품 사진 촬영 서비스. 온라인 판매를 시작하는 1인 사업자가 대상이에요. 상품의 질감과 사용 장면을 보여주는 사진을 제안하고 상담 문의를 받고 싶어요. 차분하고 전문적인 느낌으로 만들어 주세요." },
  { label: "브랜드 소개", idea: "일상에서 오래 사용하는 수제 도자기 브랜드를 소개하고 싶어요. 제품의 형태와 제작 과정을 중심으로, 과장이나 할인 문구 없이 차분한 첫인상을 만들고 싶어요." },
];
type Props = { format?: PageFormat; active: boolean; onWorkspaceChange: (value: boolean) => void; onBusyChange: (value: boolean) => void };
export function LandingWorkflowCreator({ format = "landing", active, onWorkspaceChange, onBusyChange }: Props) {
  const router = useRouter();
  const isProduct = format === "product-detail", pageLabel = isProduct ? "제품 상세 페이지" : "랜딩 페이지";
  const [product, setProduct] = useState(emptyProduct);
  const [referenceImages, setReferenceImages] = useState<ProductImage[]>([]), [uploading, setUploading] = useState(false), [recommending, setRecommending] = useState(false);
  const sectionLabels = isProduct ? PRODUCT_LABELS : labels;
  const session = useSession(), refreshSession = useRef(session.refresh); refreshSession.current = session.refresh;
  const [run, setRun] = useState<LandingWorkflow | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [idea, setIdea] = useState(""), [available, setAvailable] = useState(false), [selected, setSelected] = useState(""), [mobile, setMobile] = useState(false), [feedback, setFeedback] = useState(""), [ack, setAck] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const current = useRef(run), inFlight = useRef(false), startKey = useRef(""); current.current = run;
  const accept = useCallback((next: LandingWorkflow) => setRun(old => !old || old.id !== next.id || next.revision >= old.revision ? next : old), []);
  useEffect(() => {
    let gone = false;
    const id = new URLSearchParams(window.location.search).get("landingWorkflow");
    Promise.all([id ? api<LandingWorkflow>(`landing-workflow/${encodeURIComponent(id)}`) : api<{ run: LandingWorkflow | null }>(`landing-workflow?format=${format}`).then(r => r.run), api<{ quickCardReady: boolean }>("session")])
      .then(([r, s]) => { if (!gone) { if (r && r.project.format !== format) throw new Error("다른 제작 형식의 작업입니다. 프로젝트 목록에서 다시 열어 주세요."); setRun(r); setAvailable(s.quickCardReady); } }).catch(e => !gone && setError(e.message)).finally(() => !gone && setLoading(false));
    return () => { gone = true; };
  }, []);
  const locked = busy || uploading || recommending || !!run && ["pending", "running"].includes(run.status);
  useEffect(() => { onWorkspaceChange(active && !!run); onBusyChange(active && locked); }, [active, !!run, locked, onWorkspaceChange, onBusyChange]);
  useEffect(() => {
    if (!run) return;
    const url = new URL(window.location.href); url.searchParams.set("landingWorkflow", run.id); window.history.replaceState(null, "", url);
    if (!run.project.slots.some(s => s.id === selected)) setSelected(run.project.slots[0]?.id || "");
  }, [run?.id, run?.contentVersion, selected]);
  useEffect(() => { setAck(false); }, [run?.contentVersion]);
  const call = useCallback(async (data: Record<string, unknown>) => {
    const r = current.current; if (!r) return;
    setBusy(true); setError("");
    try { const next = await api<LandingWorkflow>(`landing-workflow/${r.id}`, { method: "POST", body: JSON.stringify({ revision: r.revision, responseId: crypto.randomUUID(), ...data }) }); accept(next); if (data.action === "cancel") void refreshSession.current().catch(() => {}); return next; }
    catch (e) { setError((e as Error).message); const latest = await api<LandingWorkflow>(`landing-workflow/${r.id}`).catch(() => null); if (latest) accept(latest); }
    finally { setBusy(false); }
  }, [accept]);
  useEffect(() => {
    if (!active || !run || landingTerminal(run)) return;
    const timer = setTimeout(async () => {
      const r = current.current; if (!r || inFlight.current || busy) return;
      inFlight.current = true;
      try {
        if (r.status === "pending") await call({ action: "step" });
        else if (r.status === "running") accept(await api<LandingWorkflow>(`landing-workflow/${r.id}`));
      } catch (e) { setError((e as Error).message); } finally { inFlight.current = false; }
    }, run.status === "pending" ? 300 : 3000);
    return () => clearTimeout(timer);
  }, [active, run, busy, call, accept]);
  // Also observe a request running in another tab, without issuing another model call.
  useEffect(() => {
    if (!active || !run || landingTerminal(run)) return;
    const timer = setInterval(() => { const r = current.current; if (r && (busy || r.status === "running")) api<LandingWorkflow>(`landing-workflow/${r.id}`).then(accept).catch(() => {}); }, 4000);
    return () => clearInterval(timer);
  }, [active, run?.id, busy, accept]);
  async function start() {
    if (uploading || recommending || busy) return;
    setBusy(true); setError(""); startKey.current ||= crypto.randomUUID();
    try { accept(await api<LandingWorkflow>("landing-workflow", { method: "POST", body: JSON.stringify({ idea, format, referenceImageIds: referenceImages.map(image => image.id), ...(isProduct ? { product } : {}), key: startKey.current }) })); startKey.current = ""; void refreshSession.current().catch(() => {}); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function handoff() { const r = await call({ action: "handoff", acknowledged: ack }); if (r?.status === "completed") router.push(`/projects/${r.projectId}`); }
  if (loading) return <AgentThinking stage="restore" />;
  if (!run) return <section className={`lf-entry${isProduct ? " lf-entry--product" : " lf-entry--images"}`} aria-label={`AI와 함께 ${pageLabel} 시작`}>
    <div className="lf-intro"><span className="ws-eyebrow">{isProduct ? "FROM PRODUCT TO PURCHASE" : "FROM IMAGES TO A PAGE"}</span><h2>{isProduct ? <>상품을 이해하고,<br />선택할 이유를.</> : <>이미지에서,<br />페이지의 방향을.</>}</h2><p>{isProduct ? "가지고 있는 상품 사진을 올리고, 상품명과 설명을 적어 주세요. 사진 속 특징과 고객의 구매 고민을 연결해 상세 페이지를 완성해요." : "페이지에 담을 이미지를 올려 주세요. AI가 특징과 분위기를 읽고, 누구에게 무엇을 전할지 함께 제안해요."}</p><ProductImageUpload purpose={isProduct ? "product" : "landing"} images={referenceImages} onChange={setReferenceImages} disabled={busy || recommending} onBusyChange={setUploading} />{!isProduct && <LandingImageRecommendation key={referenceImages.map(image => image.id).join(",")} images={referenceImages} idea={idea} available={available} disabled={busy || uploading} onBusyChange={setRecommending} onApply={setIdea} />}{isProduct && <div className="lf-mini-flow"><span>{isProduct ? "구매자의 고민" : "방문자의 질문"}</span><i aria-hidden="true">↓</i><strong>{isProduct ? "상품이 가진 차이" : "우리의 답변"}</strong><i aria-hidden="true">↓</i><span>{isProduct ? "확신을 갖고 선택" : "하나의 분명한 행동"}</span></div>}</div>
    <form className="lf-start ws-card ws-form" onSubmit={e => { e.preventDefault(); void start(); }}>{isProduct && <ProductImageRecommendation key={referenceImages.map(image => image.id).join(",")} images={referenceImages} product={product} description={idea} available={available} disabled={busy || uploading} onBusyChange={setRecommending} onApply={(result, fields) => { const next = applyProductRecommendation(product, idea, result, fields); setProduct(next.product); setIdea(next.description); }} />}{isProduct && <ProductInfoFields value={product} onChange={setProduct} disabled={busy} compact />}<Field label={isProduct ? "상품 설명" : "어떤 페이지를 만들고 싶으세요?"} htmlFor="landing-idea"><Textarea id="landing-idea" required={isProduct || !referenceImages.length} minLength={2} maxLength={3000} rows={6} value={idea} onChange={e => { setIdea(e.target.value); }} disabled={locked} placeholder={isProduct ? "이 상품은 어떤 제품인가요? 특징, 사용 장면, 어떤 고객에게 필요한지 적거나 기존 상품 설명을 붙여 넣어 주세요. 사진만으로 알 수 없는 정보는 함께 알려 주세요." : "이미지 기반 추천을 적용하거나 원하는 페이지를 직접 설명해 주세요. 대상·목표·꼭 지킬 조건을 함께 적으면 더 잘 맞아요. 이미지가 있으면 비워 두고 시작해도 좋아요."} /></Field><div className="lf-examples"><span>가볍게 시작해 보세요</span>{(isProduct ? PRODUCT_EXAMPLES : examples).map(e => <button key={e.label} type="button" disabled={locked} onClick={() => { setIdea(e.idea); if ("product" in e) setProduct(e.product as ProductInfo); }}>{e.label} ↗</button>)}</div><p className="lf-note">AI가 제안하면, 내가 방향을 정해요.<br />방향 확인 → 섹션 승인 → 원고 생성·검수</p>{error && <Alert>{error}</Alert>}{busy && <AgentThinking stage="start" />}<Button type="submit" variant="primary" size="lg" loading={busy} disabled={!available || uploading || recommending}>{isProduct ? "AI와 상품 기획하기" : "AI와 페이지 기획하기"} · 1 크레딧</Button><small className="ws-muted">원고 제작 1 크레딧 · 이미지 생성은 초안 확인 후 별도 선택<br />초안 생성 전 중단 시 예약 크레딧을 돌려드려요.</small>{!available && <p className="ws-muted">관리자가 OpenAI API를 연결하면 시작할 수 있어요.</p>}</form>
  </section>;
  const done = landingTerminal(run), step = run.status === "completed" ? 3 : run.stage === "understand" ? 0 : run.stage === "plan" ? 1 : 2;
  const slot = run.project.slots.find(s => s.id === selected), checks = [...(run.review?.version === run.contentVersion ? run.review.issues : []), ...landingChecks(run)];
  return <section className="lf-workspace" aria-label={`AI와 함께 ${pageLabel} 제작`}>
    <header className="lf-header"><div><span className="ws-eyebrow">{isProduct ? "PRODUCT WORKSPACE" : "LANDING WORKSPACE"}</span><h2>{run.hasDraft ? run.project.title : (isProduct ? "상품을 선택하게 되는 순서" : "방문자의 마음을 움직이는 순서")}</h2></div><span className="lf-saved">제작 단계 저장됨</span>{!done && <Button size="sm" disabled={busy} onClick={() => void call({ action: "cancel" })}>제작 종료</Button>}</header>
    <ol className="lf-steps">{(isProduct ? ["상품·고객 확인", "구매 흐름 기획", "초안과 검수", "화면 편집"] : stages).map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined} className={i <= step ? "is-reached" : ""}><b>{i < step ? "✓" : `0${i + 1}`}</b><span>{s}</span></li>)}</ol>
    {(error || run.error) && <Alert>{error || run.error}</Alert>}
    {locked && <AgentThinking key={`${run.stage}:${run.calls}`} stage={["pending", "running"].includes(run.status) ? run.stage : "save"} queued={run.status === "pending"} turn={["pending", "running"].includes(run.status) ? run.calls + (run.status === "pending" ? 1 : 0) : undefined} startedAt={run.status === "running" ? run.events.at(-1)?.at : undefined} events={run.events} />}
    <AgentReviewPanel loop={run.editorial} />
    {run.status === "paused" && <div className="lf-actions"><Button disabled={busy || run.calls >= run.maxCalls} onClick={() => void call({ action: "retry" })}>저장된 단계부터 재시도</Button><small>AI 요청 {run.calls}/{run.maxCalls}회 · 반복 실행은 자동으로 하지 않아요.</small></div>}
    <div className="lf-columns"><div className="lf-main">
      {run.stage === "understand" && run.status === "waiting_user" && <IntentBoard key={`${run.id}-intent`} run={run} disabled={locked} onConfirm={intent => void call({ action: "confirm_intent", intent })} />}
      {!done && (run.stage === "plan" && run.status === "waiting_user" || run.hasDraft) && <TypographyPanel project={run.project} recommendations={run.typographyRecommendations} disabled={locked} onApply={async typography=>{if(!await call({action:"typography",typography}))throw new Error("글꼴을 저장하지 못했어요. 최신 상태를 확인해 주세요.");}}/>}
      {run.stage === "plan" && run.status === "waiting_user" && <PlanBoard key={`${run.id}-${run.plan.map(s=>s.id).join(",")}`} run={run} disabled={locked} onConfirm={plan => void call({ action: "confirm_plan", plan })} onBack={() => void call({ action: "back_intent" })} onRevise={feedback => void call({ action: "revise_plan", feedback })} />}
      {!run.hasDraft && !["waiting_user"].includes(run.status) && !done && <div className="lf-wait"><span className="ws-eyebrow">{step === 0 ? "UNDERSTAND YOUR VISITOR" : "BUILD THE PAGE FLOW"}</span><h3>{step === 0 ? "좋은 페이지는 방문자 이해에서 시작해요." : "확정한 방향을 한 페이지로 연결해요."}</h3><p>이미 알려 준 내용은 다시 묻지 않고 제안에 반영해요.<br />다음 단계에서 직접 확인하고 수정할 수 있습니다.</p>{run.intentApproved && <blockquote>{run.intent.audience}<br /><strong>{run.intent.value}</strong><br />→ {run.intent.goal}</blockquote>}</div>}
      {run.hasDraft && <>
        <div className="lf-section-heading"><div><span className="ws-eyebrow">YOUR FIRST DRAFT</span><h3>페이지로 읽어 보세요.</h3></div><Segment aria-label={`${pageLabel} 초안 미리보기`} plate value={mobile ? "mobile" : "desktop"} onChange={v => setMobile(v === "mobile")} items={[{ id: "desktop", label: "데스크톱" }, { id: "mobile", label: "모바일" }]} /></div>
        <div className={`lf-preview${mobile ? " lf-preview--mobile" : ""}`}><LandingPreview project={run.project} mobile={mobile} /></div>
        <div className="li-draft-action"><div><strong>이 페이지의 이미지 {run.project.slots.filter(s => imagePlan(s).enabled).length}장</strong><p>{run.referenceImages?.length ? `사진이 적용된 영역 ${run.project.slots.filter(s => imagePlan(s).enabled && s.media?.kind === "image").length}장 · 빈 영역 ${run.project.slots.filter(s => imagePlan(s).enabled && s.media?.kind !== "image").length}장. 필요한 이미지만 추가 제작할 수 있어요.` : "빈 영역에서 장면·크기·프롬프트를 확인하고 한 번에 만들어 보세요."}</p></div><Button variant="primary" disabled={locked} onClick={() => setImagesOpen(true)}>전체 이미지 제작 · 검수</Button></div>
        <div className="lf-revision-grid"><div className="lf-section-list" aria-label="수정할 페이지 섹션">{run.project.slots.map((s, i) => <button key={s.id} type="button" aria-pressed={s.id === selected} onClick={() => { setSelected(s.id); setFeedback(""); }}><span>{String(i + 1).padStart(2, "0")} · {sectionLabels[s.kind] || s.kind}</span><strong>{s.title}</strong>{imagePlan(s).enabled && <img className="li-mini" src={s.media?.url || imagePlaceholder(imagePlan(s))} alt={s.prompt || imagePlan(s).description} />}</button>)}</div><div className="lf-copy-panel">{slot && <><small>{sectionLabels[slot.kind]} · 선택한 섹션</small><h4>{slot.title}</h4><p>{slot.body}</p>{!done && <><Field label="이 섹션에 바꾸고 싶은 점" htmlFor="landing-feedback"><Textarea id="landing-feedback" rows={3} maxLength={1500} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="예: 추상적인 표현 대신 방문자가 직접 해볼 경험을 설명해 주세요." /></Field><Button disabled={locked || run.status !== "ready" || feedback.trim().length < 2 || run.calls + 2 > run.maxCalls} onClick={() => void call({ action: "revise", sectionId: selected, feedback })}>선택한 섹션만 AI로 수정</Button><small>다른 섹션과 확정 버튼 문구·주소는 유지합니다.</small></>}</>}</div></div>
        <section className="lf-review" aria-label="페이지 원고 검수"><span className="ws-eyebrow">COPY REVIEW</span><h3>원고에서 확인할 내용</h3><p>{run.review?.version === run.contentVersion ? run.review.summary : "현재 원고의 검수를 준비하고 있어요. 이전 버전의 검수는 적용하지 않습니다."}</p>{checks.map((issue, i) => <button type="button" key={i} disabled={!issue.sectionId} onClick={() => issue.sectionId && setSelected(issue.sectionId)}><b>{issue.severity === "error" ? "수정 필요" : "확인"}</b><span>{issue.message}</span></button>)}<small>화면 배치·이미지 일치·실제 링크 작동은 편집기에서 직접 확인해 주세요.</small></section>
        {!done && ["ready", "paused"].includes(run.status) && <div className="lf-handoff"><div><h3>이제 화면을 완성할 차례예요.</h3><p>이미지 추가 · 세부 문구와 링크 편집 · 모바일 확인 · HTML ZIP</p></div><label><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} /> 초안과 남은 확인 사항을 읽었어요. 편집기에서 이어서 완성할게요.</label><Button variant="primary" disabled={busy || !ack} onClick={() => void handoff()}>이 초안으로 화면 편집하기 →</Button></div>}
      </>}
      {done && <div className="lf-handoff"><h3>{run.status === "completed" ? "화면 편집으로 이어갈 수 있어요." : "AI 제작을 종료했어요."}</h3>{run.hasDraft && <Button variant="primary" onClick={() => router.push(`/projects/${run.projectId}`)}>프로젝트 편집기 열기 →</Button>}<Button onClick={() => { setRun(null); setIdea(""); setProduct(emptyProduct()); setReferenceImages([]); setFeedback(""); startKey.current = ""; window.history.replaceState(null, "", `/projects/new?format=${format}`); }}>새 {pageLabel} 시작</Button></div>}
    </div><aside className="lf-journal"><h3>함께 만드는 과정</h3><span className="lf-journal-note">실제 작업과 선택이 여기에 남아요.</span><div aria-live="polite">{run.events.slice(-5).map(e => <article key={e.id}><small>{new Date(e.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</small><strong>{e.title}</strong><p>{e.message}</p></article>)}</div><details><summary>처음 전달한 메모</summary><p>{run.idea}</p></details>{run.intentApproved && <details><summary>확정한 제작 방향</summary><p>방문자: {run.intent.audience}<br />가치: {run.intent.value}<br />행동: {run.intent.goal}<br />버튼: {run.intent.ctaLabel}<br />주소: {run.intent.ctaHref || "편집기에서 추가"}<br />필수 자료: {run.intent.facts || "추가 자료 없음"}</p></details>}<small className="lf-model-note">{run.model} · {run.calls}/{run.maxCalls}회<br />사용자 확인을 기다리는 동안 AI를 호출하지 않아요.</small></aside></div>
    <LandingImageBoard projectId={run.projectId} open={imagesOpen} onClose={() => setImagesOpen(false)} onApplied={async () => { accept(await api<LandingWorkflow>(`landing-workflow/${run.id}`)); setAck(false); }} />
  </section>;
}

function IntentBoard({ run, disabled, onConfirm }: { run: LandingWorkflow; disabled: boolean; onConfirm: (intent: LandingIntent) => void }) {
  const isProduct = run.project.format === "product-detail";
  const [intent, setIntent] = useState(run.intent);
  const change = (key: keyof LandingIntent, value: string) => setIntent(i => ({ ...i, [key]: value }));
  return <form className="lf-intent" onSubmit={e => { e.preventDefault(); onConfirm(intent); }}><span className="ws-eyebrow">01 / THE VISITOR COMES FIRST</span><h3>{isProduct ? "누가, 어떤 이유로 이 상품을 고를까요?" : "누가, 왜 이 페이지에 올까요?"}</h3><p>{run.referenceImages?.length ? (isProduct ? "상품 사진과 설명을 함께 읽고 정리했어요. 사진에 보이는 특징과 상품 정보가 맞는지 확인해 주세요." : "참고 이미지와 메모를 함께 읽고 정리했어요. 관찰한 특징과 제안한 페이지 방향을 확인해 주세요.") : "메모를 바탕으로 정리했어요. 제안을 고친 뒤 아래 버튼으로 확정하면 저장돼요."}</p><ProductImageStrip images={run.referenceImages || []} label={isProduct ? "상품 사진" : "참고 이미지"} /><fieldset disabled={disabled}>{isProduct && <details className="pd-info-panel" open><summary>상품 정보 확인 · 입력한 원문 유지</summary><ProductInfoFields value={intent.product || emptyProduct()} onChange={product => setIntent(i => ({ ...i, product }))} /></details>}<div className="lf-intent-grid">{([{ key: "audience", title: "누구에게", hint: "이 페이지를 읽을 사람" }, { key: "problem", title: "어떤 고민을", hint: "지금 해결하고 싶은 상황" }, { key: "value", title: "어떤 가치로", hint: "방문자에게 전할 핵심 제안" }] as const).map((f, i) => <div className="lf-intent-card" key={f.key}><div><span>0{i + 1} · {f.title}</span><small>{run.explicit.includes(f.key) ? "입력한 내용" : "AI 제안"}</small></div><label htmlFor={`landing-${f.key}`}>{isProduct ? ({ audience: "이 상품을 사용할 고객", problem: "구매를 망설이는 이유", value: "우리 상품을 선택할 이유" }[f.key]) : f.hint}</label><Textarea id={`landing-${f.key}`} required maxLength={180} rows={3} value={intent[f.key]} onChange={e => change(f.key, e.target.value)} /></div>)}</div>
      <div className="lf-goal"><h4>그리고, 어떤 행동을 하길 바라나요?</h4><div className="lf-goals">{LANDING_GOALS.map(g => <button key={g} type="button" aria-pressed={intent.goal === g} onClick={() => { change("goal", g); change("ctaLabel", ({ "상담 문의": "상담 문의하기", "구매·상품 보기": "상품 알아보기", "참여·신청": "참여 신청하기", "브랜드·서비스 소개": "더 알아보기" } as Record<string, string>)[g]); }}>{g}</button>)}</div><Input aria-label="원하는 행동 직접 입력" required maxLength={100} value={intent.goal} onChange={e => change("goal", e.target.value)} /></div>
      <div className="lf-fields"><Field label="버튼에 적을 말" htmlFor="landing-cta"><Input id="landing-cta" required maxLength={50} value={intent.ctaLabel} onChange={e => change("ctaLabel", e.target.value)} /></Field><Field label="버튼 연결 주소 · 선택" htmlFor="landing-href" hint="구매·신청·상담 링크. 아직 없으면 비워 두세요. 실제 판매처 연결은 편집기에서도 추가할 수 있어요."><Input id="landing-href" maxLength={2048} value={intent.ctaHref} onChange={e => change("ctaHref", e.target.value)} placeholder="https://… 또는 mailto:…" /></Field></div>
      <Field label="확인된 사실과 꼭 지킬 문구 · 선택" htmlFor="landing-facts" hint="실제 제공 기능, 가격·일정, 출처 요약 등을 적어 주세요. URL 내용을 자동으로 읽지는 않아요."><Textarea id="landing-facts" rows={3} maxLength={3000} value={intent.facts} onChange={e => change("facts", e.target.value)} placeholder="원문에 없는 기능·후기·숫자를 만들지 않아요. 필요한 근거가 있다면 여기에 추가해 주세요." /></Field>
      <details className="lf-options"><summary>브랜드·유입 경로·분위기 조정</summary><div className="lf-fields"><Field label="브랜드 이름" htmlFor="landing-brand"><Input id="landing-brand" maxLength={60} value={intent.brand} onChange={e => change("brand", e.target.value)} /></Field><Field label="어디에서 방문하나요?" htmlFor="landing-traffic"><Input id="landing-traffic" maxLength={100} value={intent.traffic} onChange={e => change("traffic", e.target.value)} placeholder="예: 인스타그램 프로필, 검색, 광고" /></Field><Field label="문장 톤" htmlFor="landing-tone"><select id="landing-tone" value={intent.tone} onChange={e => change("tone", e.target.value)}><option value="calm">차분하게</option><option value="friendly">친근하게</option><option value="expert">전문적으로</option><option value="witty">재치 있게</option></select></Field><Field label="페이지 스타일" htmlFor="landing-style"><select id="landing-style" value={intent.preset} onChange={e => change("preset", e.target.value)}>{PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field></div></details>
      <Button type="submit" variant="primary" size="lg">이 방향으로 페이지 기획하기 →</Button></fieldset></form>;
}
function PlanBoard({ run, disabled, onConfirm, onBack, onRevise }: { run: LandingWorkflow; disabled: boolean; onConfirm: (plan: LandingSection[]) => void; onBack: () => void; onRevise: (feedback: string) => void }) {
  const sectionLabels = run.project.format === "product-detail" ? PRODUCT_LABELS : labels;
  const [plan, setPlan] = useState(run.plan), [feedback, setFeedback] = useState("");
  const move = (index: number, offset: number) => setPlan(old => { const next = [...old]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  const update = (id: string, key: keyof LandingSection, value: string) => setPlan(p => p.map(s => s.id === id ? { ...s, [key]: value } : s));
  return <form className="lf-plan" onSubmit={e => { e.preventDefault(); onConfirm(plan); }}><span className="ws-eyebrow">02 / A FLOW THAT MAKES SENSE</span><h3>{run.project.format === "product-detail" ? "구매 전에 궁금한 점에, 순서대로 답해요." : "방문자의 질문에, 순서대로 답해요."}</h3><p>첫인상에서 {run.intent.goal}까지. 순서와 핵심 메시지를 고친 뒤 승인하면 저장돼요.</p><p className="lf-note">계획된 이미지 {plan.filter(s => imagePlan(s).enabled).length}장{run.referenceImages?.length ? ` · 업로드 원본 ${plan.filter(s => imagePlan(s).enabled && s.sourceImageId).length}장 · 새 이미지 ${plan.filter(s => imagePlan(s).enabled && !s.sourceImageId).length}장` : ""} · 섹션별 이미지 포함 여부와 비율을 조정할 수 있어요.</p><fieldset disabled={disabled}><ol className="lf-flow">{plan.map((s, i) => <li key={s.id}><div className="lf-flow-marker">{String(i + 1).padStart(2, "0")}</div><article><div className="lf-flow-heading"><strong>{sectionLabels[s.kind]}</strong><div>{i > 0 && i < plan.length - 1 && <><button type="button" aria-label={`${i + 1}번 섹션 위로`} disabled={i === 1} onClick={() => move(i, -1)}>↑</button><button type="button" aria-label={`${i + 1}번 섹션 아래로`} disabled={i === plan.length - 2} onClick={() => move(i, 1)}>↓</button><button type="button" aria-label={`${i + 1}번 섹션 삭제`} disabled={plan.length <= 3} onClick={() => setPlan(p => p.filter(n => n.id !== s.id))}>삭제</button></>}{(i === 0 || i === plan.length - 1) && <small>{i === 0 ? "시작" : "도착"}</small>}</div></div><label htmlFor={`question-${s.id}`}>방문자의 질문</label><Input id={`question-${s.id}`} required maxLength={150} value={s.question} onChange={e => update(s.id, "question", e.target.value)} /><label htmlFor={`title-${s.id}`}>섹션 제목</label><Input id={`title-${s.id}`} required maxLength={90} value={s.title} onChange={e => update(s.id, "title", e.target.value)} /><label htmlFor={`message-${s.id}`}>페이지가 전할 답변</label><Textarea id={`message-${s.id}`} required maxLength={500} rows={2} value={s.message} onChange={e => update(s.id, "message", e.target.value)} /><ImagePlanFields usingOriginal={!!s.sourceImageId} value={imagePlan(s)} onChange={imagePlan => setPlan(p => p.map(n => n.id === s.id ? { ...n, imagePlan, sourceImageId: imagePlan.enabled ? n.sourceImageId : "" } : n))} />{imagePlan(s).enabled && !!run.referenceImages?.length && <ProductSourcePicker section={s} images={run.referenceImages} onChange={id => update(s.id, "sourceImageId", id)} />}</article></li>)}</ol><div className="lf-actions"><Button variant="primary" type="submit" size="lg">이 흐름으로 {plan.length}개 섹션 만들기 →</Button><Button onClick={onBack}>방향 다시 정하기</Button></div><details className="lf-options"><summary>다른 흐름으로 제안받기</summary><p>현재 편집한 기획 대신 아래 의견으로 새로운 흐름을 제안받아요.</p><Textarea aria-label="랜딩 기획 수정 의견" maxLength={1500} rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="예: 제작 과정의 이야기보다 참가자가 얻을 경험을 먼저 보여 주세요." /><Button disabled={feedback.trim().length < 2 || run.calls >= run.maxCalls - 2} onClick={() => onRevise(feedback)}>이 의견으로 기획 다시 제안</Button></details></fieldset></form>;
}

function ProductSourcePicker({ section, images, onChange }: { section: LandingSection; images: ProductImage[]; onChange: (id: string) => void }) {
  const source = images.find(image => image.id === section.sourceImageId);
  return <div className="pd-source-image"><label htmlFor={`source-${section.id}`}>이 섹션에 사용할 사진</label><select id={`source-${section.id}`} value={section.sourceImageId || ""} onChange={e => onChange(e.target.value)}><option value="">새 이미지 제작 · 초안에서 추가</option>{images.map((image, i) => <option key={image.id} value={image.id}>{i === 0 ? "대표 사진" : `사진 ${i + 1}`} · {image.name}</option>)}</select>{source ? <figure><img src={source.url} alt={`이 섹션에 배치할 원본: ${source.name}`} /><figcaption>{source.name}<small>{source.width} × {source.height}px · 승인하면 원본을 바로 배치해요.</small></figcaption></figure> : <small>초안에 이미지 자리를 표시해요. 이미지 생성은 나중에 선택합니다.</small>}</div>;
}
