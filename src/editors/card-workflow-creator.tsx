"use client";
import { AgentThinking, AgentReviewPanel } from "./agent-thinking";
import { TypographyPanel } from "./typography-panel";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Segment, Textarea } from "@openhiggsfield/design";
import { api, ApiError } from "@/projects/api";
import { COVER_STYLES, ORIGIN_LABELS, WORKFLOW_LABELS, workflowTerminal, type CardWorkflow } from "@/projects/card-workflow";
import { DIMENSIONS } from "@/projects/formats";
import { useSession } from "@/shell/workspace-shell";
import { ProjectSlide } from "./project-slide";
import { inspectCardOutput } from "@/render/card-output-check";
import { CardQualityPanel } from "./card-quality-panel";
import { exportCards } from "@/render/export";
import "./card-workflow.css";

type Session = { quickCardReady: boolean; generationReady: boolean; user: { credits: number; admin: boolean } | null };
type Version = { version: number; reason: string; created_at: number };
const purposeLabel = (s: string) => ({ educate: "정보 전달", conversion: "상품 관심", branding: "브랜드 소개" }[s] || s || "함께 정할게요");
const visualActive = (r: CardWorkflow) => r.imageBatch?.state === "running" || r.visual && !["completed", "failed", "discarded", "unknown"].includes(r.visual.state);
const examples = [
  { label: "주제 한 줄", value: "초보자가 키우기 좋은 식물로 인스타 카드뉴스 만들어줘." },
  { label: "제품 메모", value: "무향 핸드크림 소개. 끈적임 없이 가벼운 사용감, 휴대하기 좋은 30ml. 직장인이 제품에 관심을 갖도록 써 주세요." },
  { label: "일부 원고", value: "표지: 작은 습관이 바꾸는 하루\n2장: 아침에 할 일 한 가지만 정해요.\n일상에서 실천할 만한 방법을 이어서 작성해 주세요. 마지막에는 저장을 권해주세요." },
];
export function CardWorkflowCreator({ onBusyChange, onWorkspaceChange, active = true }: { onBusyChange: (busy: boolean) => void; onWorkspaceChange: (open: boolean) => void; active?: boolean }) {
  const [run, setRun] = useState<CardWorkflow | null>(null), runRef = useRef(run); runRef.current = run;
  const [session, setSession] = useState<Session | null>(null), [restoring, setRestoring] = useState(true);
  const [idea, setIdea] = useState(""), [count, setCount] = useState(""), [tone, setTone] = useState("friendly"), [mode, setMode] = useState("guided"), [reference, setReference] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [loopError, setLoopError] = useState(false), [tick, setTick] = useState(0);
  const [answer, setAnswer] = useState(""), [feedback, setFeedback] = useState(""), [selected, setSelected] = useState(0), [specOpen, setSpecOpen] = useState(false);
  const [title, setTitle] = useState(""), [body, setBody] = useState(""), [cta, setCta] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [filePhase, setFilePhase] = useState<"render" | "review" | null>(null);
  const [allowCopy, setAllowCopy] = useState(false), [acknowledged, setAcknowledged] = useState(false), [imageException, setImageException] = useState(""), [batchCost, setBatchCost] = useState<number | null>(null);
  const [imageCost, setImageCost] = useState<number | null>(null), [versions, setVersions] = useState<Version[]>([]), [fileProgress, setFileProgress] = useState<number | null>(null);
  const startKey = useRef<{ signature: string; key: string } | null>(null), actionLock = useRef(false), runnerLock = useRef(false), renderRoot = useRef<HTMLDivElement>(null);
  const exportCache = useRef<{ version: number; assetId: string } | null>(null), router = useRouter(), shell = useSession(), shellRef = useRef(shell); shellRef.current = shell;
  const slot = run?.project.slots[Math.min(selected, run.project.slots.length - 1)];
  function accept(next: CardWorkflow) { setRun(old => !old || old.id !== next.id || old.revision > next.revision ? old : next); }
  async function refreshSession() { setSession(await api<Session>("session")); void shellRef.current.refresh().catch(() => {}); }
  async function reload() {
    setError(""); setLoopError(false);
    if (runRef.current) accept(await api<CardWorkflow>(`card-workflow/${runRef.current.id}`));
    else { const saved = await api<{ run: CardWorkflow | null }>("card-workflow"); setRun(saved.run); }
    await refreshSession();
  }
  useEffect(() => {
    let mounted = true;
    const id = new URLSearchParams(window.location.search).get("workflow");
    void Promise.all([api<Session>("session"), id ? api<CardWorkflow>(`card-workflow/${encodeURIComponent(id)}`).then(run => ({ run })) : api<{ run: CardWorkflow | null }>("card-workflow")]).then(([s, saved]) => { if (mounted) { setSession(s); setRun(saved.run); } }).catch(e => { if (mounted && !(e instanceof ApiError && e.status === 401)) setError("저장된 제작을 불러오지 못했습니다. 연결을 다시 확인해 주세요."); }).finally(() => { if (mounted) setRestoring(false); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { onWorkspaceChange(!!run); }, [run?.id, onWorkspaceChange]);
  useEffect(() => { onBusyChange(active && (busy || !!run && !workflowTerminal(run))); }, [active, busy, run, onBusyChange]);
  useEffect(() => {
    if (!run) return;
    router.replace(`/projects/new?format=card-news&workflow=${run.id}`, { scroll: false });
    void refreshSession().catch(() => {});
  }, [run?.id, run?.status]); // Session changes do not trigger generation.
  useEffect(() => { setAcknowledged(false); setAllowCopy(false); }, [run?.project.version]);
  useEffect(() => { setAnswer(""); }, [run?.question?.id]);
  useEffect(() => { if (slot) { setTitle(slot.title); setBody(slot.body); setCta(slot.cta); setImagePrompt(slot.prompt); } }, [slot?.id, run?.project.version]);
  useEffect(() => {
    setImageCost(null);
    if (!run || !slot || workflowTerminal(run)) return;
    let mounted = true;
    void api<{ credits: number; batchCredits: number }>(`card-workflow/${run.id}/image-quote?cardId=${encodeURIComponent(slot.id)}`).then(q => { if (mounted) { setImageCost(q.credits); setBatchCost(q.batchCredits); } }).catch(() => {});
    return () => { mounted = false; };
  }, [run?.id, slot?.id, run?.project.version]);
  useEffect(() => {
    if (!active || !run || busy || loopError || runnerLock.current) return;
    const pendingImage = visualActive(run);
    if (!pendingImage && !["pending", "running"].includes(run.status)) return;
    const timer = setTimeout(async () => {
      if (actionLock.current || runnerLock.current) { setTick(t => t + 1); return; }
      runnerLock.current = true;
      const progressPoll = setInterval(() => {
        const live = runRef.current;
        if (live && !pendingImage && ["pending","running"].includes(live.status)) void api<CardWorkflow>(`card-workflow/${live.id}`).then(accept).catch(() => {});
      }, 2200);
      try {
        const current = runRef.current!;
        const next = pendingImage ? await api<CardWorkflow>(`card-workflow/${current.id}`, { method: "POST", body: JSON.stringify({ action: current.imageBatch?.state === "running" ? "image_batch_status" : "image_status" }) })
          : current.status === "pending" ? await api<CardWorkflow>(`card-workflow/${current.id}`, { method: "POST", body: JSON.stringify({ action: "step", revision: current.revision }) })
          : await api<CardWorkflow>(`card-workflow/${current.id}`);
        accept(next);
      } catch (e) { setError((e as Error).message); setLoopError(true); }
      finally { clearInterval(progressPoll); runnerLock.current = false; setTick(t => t + 1); }
    }, run.status === "pending" && !pendingImage ? 120 : 2500);
    return () => clearTimeout(timer);
  }, [run?.revision, active, busy, loopError, tick]);
  async function action(payload: Record<string, unknown>) {
    const current = runRef.current; if (!current || actionLock.current) return;
    actionLock.current = true; setBusy(true); setError("");
    try {
      const next = await api<CardWorkflow>(`card-workflow/${current.id}`, { method: "POST", body: JSON.stringify({ revision: current.revision, responseId: crypto.randomUUID(), ...payload }) });
      accept(next); setLoopError(false); if(payload.action!=="typography")setFeedback(""); return next;
    } catch (e) {
      setError((e as Error).message);
      try { accept(await api<CardWorkflow>(`card-workflow/${current.id}`)); } catch { setLoopError(true); }
    } finally { actionLock.current = false; setBusy(false); }
  }
  async function start(event?: FormEvent, sourceRunId?: string) {
    event?.preventDefault(); if (actionLock.current) return;
    const payload = sourceRunId ? { sourceRunId } : { idea: idea.trim(), ...(count ? { count: Number(count) } : {}), tone, mode, referenceAssetId: reference?.id };
    const signature = JSON.stringify(payload);
    if (startKey.current?.signature !== signature) startKey.current = { signature, key: crypto.randomUUID() };
    actionLock.current = true; setBusy(true); setError("");
    try { const next = await api<CardWorkflow>("card-workflow", { method: "POST", body: JSON.stringify({ ...payload, key: startKey.current.key }) }); setRun(next); startKey.current = null; setLoopError(false); exportCache.current = null; }
    catch (e) { setError((e as Error).message); if (e instanceof ApiError && e.status === 409) { try { await reload(); } catch {} } }
    finally { actionLock.current = false; setBusy(false); }
  }
  async function upload(file?: File, cardId?: string) {
    if (!file || actionLock.current) return;
    actionLock.current = true; setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("file", file);
      const asset = await api<{ id: string; name: string }>("assets", { method: "POST", body: form });
      if (!cardId) setReference(asset);
      else { actionLock.current = false; await action({ action: "asset", assetId: asset.id, cardId }); }
    } catch (e) { setError((e as Error).message); }
    finally { actionLock.current = false; setBusy(false); }
  }
  async function prepareFiles() {
    const current = runRef.current; if (!current || actionLock.current || !renderRoot.current) return;
    actionLock.current = true; setBusy(true); setError(""); setFileProgress(0); setFilePhase("render");
    try {
      let cached = exportCache.current;
      if (!cached || cached.version !== current.project.version) {
        const result = await exportCards(Array.from(renderRoot.current.children) as HTMLElement[], current.project, setFileProgress, new AbortController().signal, false, true);
        const form = new FormData(); form.set("file", new File([result.blob], result.name, { type: "application/zip" }));
        const saved = await api<{ url: string }>("exports", { method: "POST", body: form });
        cached = { version: current.project.version, assetId: saved.url.split("/").at(-1)! }; exportCache.current = cached;
      }
      setFilePhase("review");
      accept(await api<CardWorkflow>(`card-workflow/${current.id}`, { method: "POST", body: JSON.stringify({ action: "quality", revision: current.revision, assetId: cached.assetId, output: inspectCardOutput(Array.from(renderRoot.current.children) as HTMLElement[], current.project) }) }));
    } catch (e) { setError((e as Error).message); }
    finally { actionLock.current = false; setBusy(false); setFileProgress(null); setFilePhase(null); }
  }
  function reset() { setRun(null); setSelected(0); setError(""); setVersions([]); setSpecOpen(false); router.replace("/projects/new?format=card-news", { scroll: false }); }
  const answerQuestion = (mode: string, value = "") => action({ action: "answer", requestId: run?.question?.id, answer: { mode, value } });
  if (!run) return <section className="ws-quick" aria-labelledby="workflow-intro">
    <div className="ws-quick-intro"><span className="ws-eyebrow">A STORY, TOGETHER</span><h2 id="workflow-intro">한 줄에서 시작해<br/>내 의도에 맞게.</h2><p>AI와 방향을 정하고, 카드를 보며 다듬으세요.<br/>중요한 선택은 함께, 반복 작업은 AI가 맡아요.</p>
      <ol className="ws-quick-flow"><li><span>01</span><div><strong>이야기의 방향을 정해요</strong><p>꼭 필요한 질문만, 쉽게 고를 수 있게.</p></div></li><li><span>02</span><div><strong>기획과 표지를 먼저 봐요</strong><p>장별 흐름과 분위기를 보고 선택해요.</p></div></li><li><span>03</span><div><strong>원하는 카드만 다듬어요</strong><p>검수한 카드를 PNG·ZIP으로 받아요.</p></div></li></ol>
    </div>
    <form className="ws-quick-form" onSubmit={start}><fieldset disabled={busy || restoring}>
      <Field label="어떤 이야기를 만들까요?" htmlFor="workflow-idea" hint="주제어, 메모, 쓰다 만 원고 모두 좋아요."><Textarea id="workflow-idea" value={idea} onChange={e => setIdea(e.target.value)} rows={6} minLength={2} maxLength={3000} required placeholder="예: 초보자가 키우기 좋은 식물로 인스타 카드뉴스 만들어줘." /></Field>
      <div className="ws-quick-examples"><span>예시 넣기</span>{examples.map(e => <button type="button" key={e.label} onClick={() => setIdea(e.value)}>{e.label} ↗</button>)}</div>
      <details className="ws-quick-options"><summary>세부 설정 <span>{count || "기본 5"}장 · 4:5</span></summary><div className="ws-form">
        <Field label="카드 장수"><Segment size="sm" aria-label="카드 장수" value={count} onChange={setCount} items={[{ id: "", label: "기본 5장" }, ...[3,5,7,10].map(n => ({ id: String(n), label: `${n}장` }))]} plate /></Field>
        <Field label="말투"><Segment size="sm" aria-label="말투" value={tone} onChange={setTone} items={[{ id: "friendly", label: "친근하게" }, { id: "expert", label: "전문적으로" }, { id: "calm", label: "차분하게" }]} plate /></Field>
        <Field label="제작 방식"><Segment size="sm" aria-label="제작 방식" value={mode} onChange={setMode} items={[{ id: "guided", label: "함께 선택" }, { id: "delegate", label: "AI 추천으로 진행" }]} plate /></Field>
      </div></details>
      <label className="cw-upload">참고 이미지 첨부 <span>선택 · 카드 배경으로 사용</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void upload(e.target.files?.[0])} /></label>
      {reference && <p className="cw-muted">{reference.name} <button type="button" className="cw-text-btn" onClick={() => setReference(null)}>첨부 해제</button></p>}
    </fieldset>
      {error && <Alert>{error}</Alert>}
      {session && !session.user && <p className="cw-muted"><a href="/login">로그인</a>하면 제작과 저장을 사용할 수 있어요.</p>}
      {session?.user && !session.quickCardReady && <p className="cw-muted">관리자의 AI 연결이 필요합니다. {session.user.admin && <a href="/admin/settings">환경설정 열기 →</a>}</p>}
      {(error || !session) && <Button type="button" onClick={() => void reload().catch(e => setError(e.message))}>연결 다시 확인</Button>}
      {(restoring || busy) && <AgentThinking stage={restoring ? "restore" : "start"} />}
      <div className="ws-quick-submit"><Button type="submit" variant="primary" size="lg" loading={busy} disabled={busy || restoring || !session?.quickCardReady || !session.user || session.user.credits < 1 || idea.trim().length < 2}>{restoring ? "이전 작업 확인 중" : "AI와 기획 시작 · 1 크레딧"}</Button><p>기획·작성·검수와 한도 내 수정이 포함돼요. 취소·실패 시 제작 크레딧을 환불하며, 이미지 생성은 별도입니다.</p></div>
    </form>
  </section>;
  const terminal = workflowTerminal(run), ready = run.status === "ready" && run.imageBatch?.state !== "running", editable = ready || run.status === "paused_budget", question = run.question;
  const missingImages = run.project.slots.filter(s => s.media?.kind !== "image").length;
  const reviewed = run.quality?.state === "ready" && run.quality.projectVersion === run.project.version;
  const reviewFailed = run.quality?.cards?.some(c => c.findings.some(f => f.status === "fail"));
  const latest = run.events.at(-1), status = run.quality?.state === "running" ? "실제 출력물 검수 중" : run.imageBatch?.state === "running" ? `카드 이미지 생성 · ${run.imageBatch.index + 1}/${run.imageBatch.cardIds.length}` : run.status === "waiting_user" ? "내 선택을 기다려요" : ready ? "검토할 카드가 준비됐어요" : run.status === "completed" ? "파일 준비 완료" : run.status === "waiting_tool" ? "이미지 생성 중" : run.status === "paused_budget" ? "작업 일시 중단" : terminal ? "작업 종료" : `${WORKFLOW_LABELS[run.stage]} 중`;
  const imageTools = (cardId: string) => <div className="cw-image-tools"><label className="cw-upload">이미지 업로드<input disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void upload(e.target.files?.[0], cardId)} /></label><Button type="button" disabled={busy || imageCost === null || !session?.generationReady || !!visualActive(run) || run.visual?.state === "unknown"} onClick={() => void action({ action: "image", cardId, credits: imageCost })}>이미지 생성{imageCost !== null ? ` · ${imageCost} 크레딧` : ""}</Button><small>생성 이미지는 주제를 표현한 예시입니다. 실제 제품 사진은 업로드해 주세요.</small></div>;
  return <section className="cw" aria-label="AI와 함께 제작 작업실">
    <header className="cw-head"><div><span className="ws-eyebrow">YOUR CREATIVE DESK</span><h2>{run.project.title.length > 45 ? "이야기를 함께 만들고 있어요" : run.project.title}</h2></div><div className="cw-head-actions"><a href={`/projects/${run.projectId}`} className="cw-text-btn">편집기 열기 ↗</a>{!terminal && <Button variant="ghost" disabled={busy} onClick={() => void action({ action: "cancel" })}>작업 종료</Button>}{terminal && <Button onClick={reset}>새 이야기</Button>}</div></header>
    <div className="cw-spec"><span>{purposeLabel(run.spec.purpose.value)} <small>{ORIGIN_LABELS[run.spec.purpose.origin]}</small></span><span>{run.spec.audience.value || "독자 확인 중"} <small>{ORIGIN_LABELS[run.spec.audience.origin]}</small></span><span>{run.spec.count.value}장 · 4:5 <small>{ORIGIN_LABELS[run.spec.count.origin]}</small></span>{!terminal && <button className="cw-text-btn" onClick={() => setSpecOpen(!specOpen)} aria-expanded={specOpen}>조건 변경 {specOpen ? "−" : "+"}</button>}</div>
    {specOpen && !terminal && <form className="cw-spec-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void action({ action: "spec", spec: { purpose: f.get("purpose"), audience: f.get("audience"), count: Number(f.get("count")), constraints: String(f.get("constraints")).split("\n").filter(Boolean) } }); setSpecOpen(false); }}><Field label="목적"><select name="purpose" defaultValue={run.spec.purpose.value || "educate"}><option value="educate">정보 전달</option><option value="conversion">상품 관심</option><option value="branding">브랜드 소개</option>{run.spec.purpose.value && !["educate","conversion","branding"].includes(run.spec.purpose.value) && <option>{run.spec.purpose.value}</option>}</select></Field><Field label="독자"><Input name="audience" defaultValue={run.spec.audience.value} maxLength={100} required /></Field><Field label="장수"><Input name="count" type="number" min={3} max={10} defaultValue={run.project.slots.length} required /></Field><Field label="꼭 지킬 조건 (한 줄에 하나)"><Textarea name="constraints" rows={3} defaultValue={run.spec.constraints.join("\n")} maxLength={1200} /></Field><p className="cw-muted">이전 결과를 보관하고 바뀐 조건으로 기획을 다시 준비해요.</p><Button type="submit" disabled={busy} variant="primary">조건 반영 후 다시 기획</Button></form>}
    {error && <Alert>{error}</Alert>}{loopError && <Button onClick={() => void reload().catch(e => setError(e.message))}>저장된 작업에서 이어가기</Button>}
    {!terminal && !loopError && (busy || ["pending", "running", "waiting_tool"].includes(run.status) || visualActive(run) || run.quality?.state === "running") && <AgentThinking
      key={`${run.stage}:${run.budget.calls}:${filePhase || ""}:${run.visual?.key || ""}`}
      stage={filePhase === "review" || run.quality?.state === "running" ? "quality" : filePhase === "render" ? "render" : visualActive(run) || run.status === "waiting_tool" ? "image" : ["pending", "running"].includes(run.status) ? run.stage : "save"}
      queued={run.status === "pending"} turn={["pending", "running"].includes(run.status) ? run.budget.calls + (run.status === "pending" ? 1 : 0) : undefined}
      startedAt={run.status === "running" ? [...run.events].reverse().find(e => e.type === "progress.updated")?.at : run.visual && visualActive(run) ? run.visual.startedAt : undefined}
      events={run.events} />}
    <AgentReviewPanel loop={run.editorial} />
    <div className="cw-desk">
      <aside className="cw-conversation"><div className="cw-status" role="status" aria-live="polite"><span className={!terminal && !ready && run.status !== "waiting_user" ? "cw-dot cw-dot--active" : "cw-dot"}/>{status}</div>
        <div className="cw-note"><span className="cw-label">AI 제작 동료</span><h3>{question && run.status === "waiting_user" ? question.text : latest?.title}</h3><p>{question && run.status === "waiting_user" ? "선택한 내용을 바탕으로 다음 단계를 준비할게요." : latest?.message}</p></div>
        {run.status === "waiting_user" && question?.kind === "purpose" && <div className="cw-choices">{question.options.map(o => <button key={o.value} disabled={busy} onClick={() => void answerQuestion("select", o.value)}><strong>{o.label}<span>↗</span></strong><span>{o.description}</span></button>)}</div>}
        {run.status === "waiting_user" && question && ["purpose","plan"].includes(question.kind) && <><Field label={question.kind === "purpose" ? "직접 설명해도 좋아요" : "기획 수정 의견"} htmlFor="cw-answer"><Textarea id="cw-answer" rows={3} value={answer} onChange={e => setAnswer(e.target.value)} maxLength={1200} placeholder={question.kind === "purpose" ? "독자가 어떤 반응을 보이면 좋을까요?" : "예: 3장은 비교표로, 마지막은 저장 안내로 바꿔 주세요."}/></Field><Button disabled={busy || answer.trim().length < 2} onClick={() => void answerQuestion("free", answer)}>의견 반영</Button>{question.kind === "plan" && <Button variant="primary" disabled={busy} onClick={() => void answerQuestion("approve")}>이 기획으로 만들기 →</Button>}<Button variant="ghost" disabled={busy} onClick={() => void answerQuestion("delegate")}>이후 선택은 AI에게 맡기기</Button></>}
        {run.status === "waiting_user" && question?.kind === "style" && <p className="cw-muted">옆의 표지를 골라 주세요. 각 카드에 이미지를 넣는 것을 권장해요. 지금 표지에 적용하거나 원고 완성 후 빈 카드 전체를 한 번에 채울 수 있어요.</p>}
        {run.status === "waiting_user" && question?.kind === "research" && <><Button disabled={busy} onClick={() => void answerQuestion("retry")}>근거 다시 조사</Button><Button disabled={busy} onClick={() => void answerQuestion("skip")}>확인 안 된 사실은 빼고 진행</Button></>}
        {run.error && <Alert>{run.error}</Alert>}
        {run.status === "paused_budget" && run.patchMode === "layout" && <Button disabled={busy} onClick={()=>void action({action:"continue_visual"})}>원고 유지하고 이미지·출력 확인</Button>}
        {run.status === "paused_budget" && <Button disabled={busy} onClick={() => void action({ action: "resume" })}>현재 결과에서 작업 재개</Button>}
        {run.visual?.error && <><Alert>{run.visual.error}</Alert>{run.visual.state === "unknown" && <Button disabled={busy} onClick={() => void action({ action: "image_status" })}>이미지 상태 다시 확인</Button>}</>}
        {run.review && <div className="cw-review"><span className="cw-label">내용 검수</span><p>{run.review.summary}</p>{run.review.issues.map((i,n) => <p key={n} className="cw-issue">{run.project.slots.findIndex(s => s.id === i.cardId)+1}장 · {i.message}</p>)}{run.review.warnings.length > 0 && <details><summary>게시 전 확인할 내용</summary>{run.review.warnings.map(w => <p key={w}>{w}</p>)}</details>}</div>}
        {run.spec.constraints.length > 0 && <details><summary>지키기로 한 조건</summary><ul>{run.spec.constraints.map((c,i) => <li key={i}>{c}</li>)}</ul></details>}
        {run.sources.length > 0 && <details className="cw-sources"><summary>확인한 출처 · {run.sources.length}</summary>{run.sources.map(s => <article key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a><p>{s.claim}</p></article>)}</details>}
        <details className="cw-history"><summary>제작 기록 · {run.events.length}</summary><ol>{run.events.map(e => <li key={e.id}><strong>{e.title}</strong><p>{e.message}</p><small>{new Date(e.at).toLocaleTimeString("ko-KR", {hour:"2-digit",minute:"2-digit"})}</small></li>)}</ol></details>
        {!terminal && <p className="cw-muted">입력과 결과는 자동 저장돼요. 이 화면으로 돌아와 이어갈 수 있어요.</p>}
      </aside>
    <div className="cw-workspace">
      {!terminal && (run.plan.length>0) && <TypographyPanel project={run.project} recommendations={run.typographyRecommendations} disabled={busy || !!visualActive(run) || !["waiting_user","ready","paused_budget"].includes(run.status)} onApply={async typography=>{if(!await action({action:"typography",typography}))throw new Error("글꼴을 저장하지 못했어요. 최신 상태를 확인해 주세요.");}}/>}

        {run.status === "waiting_user" && question?.kind === "plan" ? <section className="cw-plan"><div className="cw-workspace-title"><span className="cw-label">STORY OUTLINE</span><h3>먼저, 이야기의 흐름부터.</h3></div><ol>{run.plan.map((p,i) => <li key={i}><span>{String(i+1).padStart(2,"0")}</span><div><small>{p.role}</small><h4>{p.title}</h4><p>{p.message}</p></div></li>)}</ol></section>
        : run.status === "waiting_user" && question?.kind === "style" ? <section><div className="cw-workspace-title"><span className="cw-label">COVER DIRECTION</span><h3>어떤 분위기가 어울리나요?</h3><p>같은 내용, 서로 다른 인상. 실제 출력 디자인이에요.</p></div><div className="cw-covers">{COVER_STYLES.map(s => <button key={s.id} disabled={busy} onClick={() => void answerQuestion("select",s.id)}><div className="cw-cover-preview"><ProjectSlide project={{...run.project,preset:s.id}} slot={{...run.project.slots[0],body:run.project.slots[0].body.slice(0,60)}} /></div><strong>{s.label}<span>↗</span></strong><p>{s.description}</p></button>)}</div>{imageTools(run.project.slots[0].id)}</section>
        : !run.plan.length ? <div className="cw-start-preview"><span className="cw-label">THE START OF YOUR STORY</span><blockquote>“{run.idea}”</blockquote><p>방향을 정하면 이곳에서 기획과 카드를 볼 수 있어요.</p><div className="cw-page-marks" aria-label={`${run.project.slots.length}장 준비 중`}>{run.project.slots.map((s,i) => <span key={s.id}>{String(i+1).padStart(2,"0")}</span>)}</div></div>
        : <><div className="cw-workspace-title"><span className="cw-label">{run.status === "completed" ? "READY TO SHARE" : "YOUR CARDS"}</span><h3>{run.status === "completed" ? "이제, 이야기를 전해 보세요." : "보고, 고르고, 다듬어 보세요."}</h3></div>
          <div className="cw-image-coverage"><div><span className="cw-label">IMAGE COVERAGE</span><strong>카드 이미지 {run.project.slots.length - missingImages} / {run.project.slots.length}</strong><p>{run.imageBatch?.state === "running" ? `${run.imageBatch.index + 1}번째 이미지 생성 중 · 화면을 다시 열어도 이어가요.` : missingImages ? "모든 카드가 이야기를 보여주도록, 빈 카드에 이미지를 채워 보세요." : "모든 카드에 이미지가 있어요. 문구와 잘 어울리는지 출력물로 확인하세요."}</p></div>{ready && missingImages > 0 && <Button variant="primary" disabled={busy || batchCost === null || !session?.generationReady || !!visualActive(run)} onClick={() => void action({ action: "image_batch", credits: batchCost })}>빈 카드 {missingImages}장 채우기{batchCost !== null ? ` · ${batchCost} 크레딧` : ""}</Button>}</div>
          <div className="cw-card-strip cw-card-strip--visual" aria-label="카드 선택">{run.project.slots.map((s,i) => <button key={s.id} aria-pressed={slot?.id===s.id} aria-label={`${i+1}장 선택: ${s.title}`} onClick={() => {setSelected(i);setFeedback("");}}><div className="cw-thumb"><ProjectSlide project={run.project} slot={s} index={i}/></div><span>{String(i+1).padStart(2,"0")} · {s.media?.kind === "image" ? "이미지 포함" : "이미지 필요"}</span><strong>{s.title}</strong></button>)}</div>
          {slot && <div className="cw-card-edit"><div className="cw-preview-column"><div className="cw-card-preview"><ProjectSlide project={run.project} slot={slot} index={selected}/></div><div className="cw-preview-caption"><span>{selected+1} / {run.project.slots.length} · v{run.project.version}</span>{ready && <div><button disabled={busy || selected===0} aria-label="카드를 앞으로 이동" onClick={() => {const ids=run.project.slots.map(s=>s.id);[ids[selected-1],ids[selected]]=[ids[selected],ids[selected-1]];void action({action:"reorder",cardIds:ids});setSelected(selected-1);}}>←</button><button disabled={busy || selected===run.project.slots.length-1} aria-label="카드를 뒤로 이동" onClick={() => {const ids=run.project.slots.map(s=>s.id);[ids[selected],ids[selected+1]]=[ids[selected+1],ids[selected]];void action({action:"reorder",cardIds:ids});setSelected(selected+1);}}>→</button></div>}</div></div>
            <div className="cw-card-controls">{editable ? <><span className="cw-label">{selected+1}장만 수정</span><Field label="AI에게 수정 요청" htmlFor="cw-feedback"><Textarea id="cw-feedback" value={feedback} onChange={e=>setFeedback(e.target.value)} rows={3} maxLength={1200} placeholder="예: 문구는 그대로 두고 사진을 중앙에, 본문 공간을 넓혀 주세요."/></Field><label className="cw-check"><input type="checkbox" checked={allowCopy} onChange={e=>setAllowCopy(e.target.checked)}/>선택 카드의 문구 변경도 허용</label><p className="cw-muted">{allowCopy ? "요청한 카드의 문구와 배치를 함께 수정합니다." : "문구 보호 중 · 글씨를 줄이지 않고 사진·본문 배치부터 조정합니다."}</p><Button disabled={busy || feedback.trim().length<2} onClick={()=>void action({action:"revise",cardIds:[slot.id],feedback,allowCopy})}>이 카드에 의견 반영</Button><details className="cw-direct-edit"><summary>문구 직접 수정</summary><div className="ws-form"><Field label="제목" htmlFor="cw-title"><Input id="cw-title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={90}/></Field><Field label="본문" htmlFor="cw-body"><Textarea id="cw-body" value={body} onChange={e=>setBody(e.target.value)} rows={5} maxLength={360}/></Field><Field label="행동 안내" htmlFor="cw-cta"><Input id="cw-cta" value={cta} onChange={e=>setCta(e.target.value)} maxLength={50}/></Field><Button disabled={busy || !title.trim() || !body.trim()} onClick={()=>void action({action:"edit",cardId:slot.id,title,body,cta})}>문구 저장</Button></div></details>{ready && <div className="cw-layout-tools"><Field label="문구를 보존하는 배치"><Segment size="sm" aria-label="읽기 배치" value={slot.readingLayout || "balanced"} onChange={readingLayout => void action({ action: "layout", cardId: slot.id, readingLayout, crop: slot.crop })} items={[{id:"balanced",label:"균형"},{id:"text-first",label:"설명 중심"},{id:"image-first",label:"이미지 중심"}]} plate/></Field><label>사진 위치 · {slot.crop}%<input type="range" aria-label="사진 위치" min="0" max="100" step="10" defaultValue={slot.crop} key={`${slot.id}-${run.project.version}`} disabled={busy} onChange={e => { const value = Number(e.target.value); e.currentTarget.setAttribute("aria-valuetext", `${value}%`); }} onPointerUp={e=>void action({action:"layout",cardId:slot.id,readingLayout:slot.readingLayout||"balanced",crop:Number(e.currentTarget.value)})} onKeyUp={e=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(e.key))void action({action:"layout",cardId:slot.id,readingLayout:slot.readingLayout||"balanced",crop:Number(e.currentTarget.value)});}}/></label></div>}{ready && imageTools(slot.id)}</> : <><span className="cw-label">{selected+1}장 · 카드 내용</span><h4>{slot.title}</h4><p className="cw-card-copy">{slot.body}</p>{!terminal && <p className="cw-muted">검수가 끝나면 원하는 카드만 수정할 수 있어요.</p>}</>}
              <details><summary>이미지 구상</summary>{ready ? <div className="ws-form"><Field label="이미지 수정 구상" htmlFor="cw-image-prompt"><Textarea id="cw-image-prompt" value={imagePrompt} onChange={e=>setImagePrompt(e.target.value)} rows={5} maxLength={3000}/></Field><Button disabled={busy || imagePrompt.trim().length<5 || imagePrompt===slot.prompt} onClick={()=>void action({action:"image_prompt",cardId:slot.id,prompt:imagePrompt})}>이미지 구상 저장</Button><p>이미지 생성 버튼으로 새 이미지를 만들어요. 문구와 현재 이미지는 저장만으로 바뀌지 않습니다.</p></div> : <p lang="en">{slot.prompt}</p>}</details></div>
          </div>}
          <details className="cw-caption"><summary>게시용 캡션</summary><p>{run.project.caption}</p></details>
          {ready && (run.budget.calls >= run.budget.maxCalls || run.budget.activeMs >= run.budget.maxActiveMs) && run.budget.maxCalls < 20 && <Button disabled={busy} onClick={()=>void action({action:"extend_quality"})}>출력 검수와 수정 한도 늘리기</Button>}
          <CardQualityPanel run={run} selected={selected} busy={busy} onSelect={setSelected} onArrange={feedback=>void action({action:"revise",cardIds:[slot!.id],feedback,allowCopy:false})}/>
          {(ready || run.status === "completed") && <div className="cw-export"><div><strong>{run.status === "completed" ? `${run.artifacts?.files.length}장의 파일을 보관했어요` : "마지막 확인, 그리고 완성."}</strong><p>{run.status === "completed" ? `${run.artifacts?.width} × ${run.artifacts?.height} PNG · 원고와 편집 데이터 포함 ZIP` : filePhase === "review" ? "완성된 PNG를 읽고 이미지·문구·모바일 출력을 대조하고 있어요. 원고는 변경하지 않습니다." : fileProgress !== null ? `${Math.round(fileProgress * run.project.slots.length)} / ${run.project.slots.length}장 렌더링 · 글자 잘림과 이미지 확인 중` : reviewed ? "검수한 파일과 현재 버전이 같을 때만 완료합니다." : "실제 PNG를 만들어 이미지·문구·타이포그래피·모바일 출력을 함께 검수합니다."}</p></div>{ready && <Button variant="primary" loading={busy && fileProgress!==null} disabled={busy || !!visualActive(run)} onClick={()=>void prepareFiles()}>{reviewed ? "출력물 다시 확인" : "실제 출력물 검수"}</Button>}{run.artifacts && <a className="ohf-btn ohf-btn--primary" href={run.artifacts.zipUrl} download>전체 ZIP 다운로드 ↓</a>}</div>}
          {ready && reviewed && <div className="cw-final-review">{reviewFailed ? <p className="cw-issue">수정 필요 항목이 있어요. 해당 카드를 조정한 뒤 다시 검수해 주세요.</p> : <><label className="cw-check"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/>검수 결과와 확인 필요 항목을 확인했어요.</label>{missingImages > 0 && <Field label={`이미지 없는 ${missingImages}장 · 예외 사유`}><Input value={imageException} onChange={e=>setImageException(e.target.value)} maxLength={300} placeholder="예: 마지막 장은 의도적으로 텍스트만 사용"/></Field>}<Button variant="primary" disabled={busy || !acknowledged || missingImages > 0 && imageException.trim().length < 5} onClick={()=>void action({action:"finalize",assetId:run.quality!.assetId,acknowledged,imageException})}>검수한 PNG·ZIP 완성</Button></>}</div>}
          {run.artifacts && <div className="cw-downloads">{run.artifacts.files.map((f,i)=><a key={f.url} href={f.url} download>{i+1}장 PNG ↓</a>)}<Button disabled={busy} onClick={()=>void start(undefined,run.id)}>AI와 후속 수정 · 1 크레딧</Button></div>}
          {editable && <details className="cw-versions" onToggle={e=>{if(e.currentTarget.open)void api<Version[]>(`card-workflow/${run.id}/versions`).then(setVersions).catch(e=>setError(e.message));}}><summary>이전 버전 보기</summary>{versions.map(v=><div key={v.version}><span>v{v.version} · {v.reason}</span><Button disabled={busy || v.version===run.project.version} onClick={()=>void action({action:"restore",version:v.version})}>복원</Button></div>)}</details>}
        </>}
      </div>
    </div>
    <div className="ws-export-root" ref={renderRoot} aria-hidden="true">{run.project.slots.map((s,i)=><div key={s.id} style={{width:DIMENSIONS[run.project.ratio][0],height:DIMENSIONS[run.project.ratio][1]}}><ProjectSlide project={run.project} slot={s} index={i}/></div>)}</div>
  </section>;
}
