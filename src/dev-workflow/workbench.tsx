"use client";
import { useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LandingPreview } from "@/editors/landing-preview";
import { parseProject } from "@/projects/validation";
import { dimensions, RUBRIC, type TraceEvent, type TraceEvaluation, type TraceExperiment, type TraceSnapshot } from "./types";

const kindNames: Record<string, string> = { "project.created": "시작", "workflow.state": "상태·결정", "user.action": "사용자 입력", "model.request": "AI 요청", "model.response": "AI 응답", "model.parsed": "AI 구조화 결과", "model.error": "응답 오류", "generation.request": "생성 요청", "generation.result": "생성 결과", "tool.result": "도구", diagnostic: "진단" };
const phaseNames: Record<string, string> = { understand: "의도 파악", plan: "구성 기획", write: "초안 작성", review: "검수", refine: "자동 보정", patch: "선택 수정", image_generation: "이미지 생성", image_board: "이미지 후보", created: "프로젝트 생성" };
const effects = { improved: "향상 추정", degraded: "저하 추정", unchanged: "차이 없음", unknown: "판단 보류" };
const sources = { developer: "개발자 평가", customer_report: "전달받은 고객 의견" };
const time = (at: number) => new Date(at).toLocaleTimeString("ko-KR", { hour12: false });
const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
function readable(v: unknown): string { return typeof v === "string" ? v : v === undefined || v === null ? "" : JSON.stringify(v, null, 2); }
function summary(e: TraceEvent) {
  const result = obj(e.data.result), payload = obj(e.data.payload);
  if (e.data.summary || result.summary || e.data.idea || e.data.error) return readable(e.data.summary || result.summary || e.data.idea || e.data.error);
  if (e.kind === "model.request") return `모델 ${obj(e.data.request).model || "미기록"} · 실제 전달한 입력과 설정`;
  if (e.kind === "model.response") return `HTTP ${e.data.httpStatus} · ${payload.status || "상태 미기록"} · ${Number(e.data.durationMs || 0).toLocaleString()} ms`;
  if (e.kind === "user.action") return readable(obj(e.data.input).feedback || e.data.action);
  return readable(e.data.status || e.data.outcome || e.data.format || e.label);
}
function recordProject(e?: TraceEvent) {
  if (!e?.data.project) return null;
  try { const value = structuredClone(e.data.project) as { slots?: { media?: { url?: string } }[] }; value.slots?.forEach(s => { if (s.media?.url?.startsWith("[asset-reference:")) delete s.media; }); const p = parseProject(value); return ["landing", "product-detail"].includes(p.format) ? p : null; } catch { return null; }
}
function EventEvidence({ event, compact = false }: { event: TraceEvent; compact?: boolean }) {
  const project = recordProject(event), result = obj(event.data.result), request = obj(event.data.request);
  const [preview, setPreview] = useState(false);
  const [mobile, setMobile] = useState(true);
  return <div className="tw-evidence">
    <p className="tw-event-summary">{summary(event)}</p>
    {event.kind === "model.response" && <div className="tw-notice">추론 요약: {({ not_requested: "요청하지 않음", requested_not_returned: "요청했으나 미반환", returned: "공급자가 반환한 공개 요약" } as Record<string, string>)[String(event.data.reasoningAvailability)] || "미기록"}. 응답 수신은 결과 적용을 뜻하지 않습니다.</div>}
    {event.data.reasoningAvailability === "returned" && <pre>{readable(event.data.reasoningSummary)}</pre>}
    {!!result.sections && <details open={!compact}><summary>AI가 제안한 문구</summary><pre>{readable(result.sections)}</pre></details>}
    {!!request.input && <details><summary>실제 AI 입력·대화</summary><pre>{readable(request.input)}</pre></details>}
    {!!event.data.plan && <details><summary>섹션·이미지 계획</summary><pre>{readable(event.data.plan)}</pre></details>}
    {!!event.data.board && <details><summary>이미지 후보와 적용 내역</summary><pre>{readable(event.data.board)}</pre></details>}
    {project && <section className="tw-preview"><div className="tw-actions"><button onClick={() => setPreview(!preview)} aria-expanded={preview}>{preview ? "결과 미리보기 접기" : "저장된 결과 미리보기"}</button>{preview && <button onClick={() => setMobile(!mobile)}>{mobile ? "데스크톱으로 보기" : "모바일로 보기"}</button>}</div>{preview && <><p className="tw-muted">저장된 문서를 현재 렌더러로 재구성합니다. 당시 화면 캡처가 아닙니다. 비공개 에셋 참조는 생략되며 외부 이미지는 만료될 수 있습니다.</p><LandingPreview project={project} mobile={mobile} /></>}</section>}
    <details><summary>전체 기록 · 비밀값·이미지 바이트 제외</summary><pre>{JSON.stringify(event.data, null, 2)}</pre></details>
  </div>;
}
type ProjectOption = { id: string; title: string; format: string };
export function TraceWorkbench({ projects, initial }: { projects: ProjectOption[]; initial: TraceSnapshot | null }) {
  const requestKeys = useRef(new Map<string, string>());
  const router = useRouter(), [snapshot, setSnapshot] = useState(initial), [selected, setSelected] = useState(initial?.events.at(-1)?.id || "");
  const [tab, setTab] = useState<"timeline" | "compare" | "experiments">("timeline"), [filter, setFilter] = useState(""), [run, setRun] = useState(""), [kind, setKind] = useState("");
  const [baseline, setBaseline] = useState(""), [candidate, setCandidate] = useState(""), [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [error, setError] = useState("");
  const events = snapshot?.events || [], chosen = events.find(e => e.id === selected), base = events.find(e => e.id === baseline), next = events.find(e => e.id === candidate);
  const filtered = useMemo(() => events.filter(e => (!run || e.runId === run) && (!kind || e.kind === kind) && (!filter || `${e.label} ${summary(e)} ${phaseNames[e.phase] || e.phase} ${e.phase} ${e.turnId || ""}`.toLowerCase().includes(filter.toLowerCase()))).sort((a, b) => a.at - b.at || a.seq - b.seq), [events, run, kind, filter]);
  const runs = [...new Set(events.map(e => e.runId))];
  async function request(body?: Record<string, unknown>, older = false) {
    if (!snapshot) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const url = `/api/dev/workflows/${snapshot.projectId}`;
      if (body) {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, id: (() => { const key = JSON.stringify(body); if (!requestKeys.current.has(key)) requestKeys.current.set(key, crypto.randomUUID()); return requestKeys.current.get(key); })() }) });
        // The POST acknowledgment ends retry identity, even if refresh fails.
        // A → B → A must remain a new evaluation intent after that acknowledgment.
        if (res.ok) requestKeys.current.delete(JSON.stringify(body));
        const value = await res.json(); if (!res.ok) throw new Error(value.error || "저장하지 못했습니다.");
      }
      const res = await fetch(url + (older && snapshot.nextBefore ? `?before=${snapshot.nextBefore}` : ""), { cache: "no-store" });
      const value: TraceSnapshot & { error?: string } = await res.json(); if (!res.ok) throw new Error(value.error || "기록을 읽지 못했습니다.");
      setSnapshot(current => ({ ...value, events: [...new Map([...(current?.events || []), ...value.events].map(e => [e.id, e])).values()].sort((a, b) => a.seq - b.seq), nextBefore: older ? value.nextBefore : value.nextBefore && (current?.events.at(-1)?.seq || 0) < value.nextBefore ? value.nextBefore : current?.nextBefore ?? null }));
      if (!selected && value.events.length) setSelected(value.events.at(-1)!.id);
      setNotice(body ? "SQLite에 저장했습니다." : "최신 기록을 불러왔습니다.");
    } catch (e) { setError(e instanceof Error ? e.message : "요청에 실패했습니다."); } finally { setBusy(false); }
  }
  function focusEvent(id: string) { setSelected(id); setTab("timeline"); }
  function selectCompare(id: string, position: "baseline" | "candidate") { if (position === "baseline") setBaseline(id); else setCandidate(id); setNotice(position === "baseline" ? "기준 지점을 선택했습니다. 비교 탭에서 다른 결과를 선택하세요." : "후보 지점을 선택했습니다."); }
  const feedback = snapshot?.evaluations || [], customer = feedback.filter(e => e.source === "customer_report");
  return <main className="tw-workbench">
    <header className="tw-heading"><div><p className="tw-eyebrow">DEVELOPMENT / WORKFLOW LAB</p><h1>워크플로우 관찰실</h1><p>결과를 바꾼 지점을 찾고, 근거를 남기고, 다음 개선을 검증하세요.</p></div><span className="tw-dev">개발 모드 전용</span></header>
    <div className="tw-projectbar"><label>프로젝트<select aria-label="기록을 볼 프로젝트" value={snapshot?.projectId || ""} onChange={e => router.push(`/dev/workflows?project=${e.target.value}`)} disabled={!projects.length}>{!projects.length && <option value="">프로젝트 없음</option>}{projects.map(p => <option key={p.id} value={p.id}>{p.title} · {p.format}</option>)}</select></label><div className="tw-actions">{snapshot && <Link href={`/projects/${snapshot.projectId}`}>편집기 열기 ↗</Link>}<button onClick={() => void request()} disabled={busy || !snapshot}>{busy ? "불러오는 중…" : "기록 새로고침"}</button></div></div>
    {!snapshot ? <div className="tw-empty"><h2>아직 관찰할 프로젝트가 없습니다</h2><p>프로젝트를 만들면 전용 SQLite DB가 함께 초기화됩니다.</p><Link href="/projects/new">프로젝트 만들기 →</Link></div> : <>
      <section className="tw-health" aria-label="기록 범위"><div><strong>{snapshot.total.toLocaleString()}</strong><span>기록된 이벤트</span></div><div><strong>{feedback.length}</strong><span>현재 유효한 평가</span></div><div><strong>{customer.length || "—"}</strong><span>명시적 고객 의견</span></div><p><b>{snapshot.coverage === "legacy_partial" ? "기존 프로젝트 · 수집 이후 기록만" : "프로젝트 생성 시 초기화"}</b><br />{new Date(snapshot.coverageStart).toLocaleString("ko-KR")}부터 · 랜딩·상세 AI 턴 / 프로젝트 연결 이미지 생성 수집. 다른 AI 제작·생성 전 추천 및 수집이 꺼졌던 기간은 미포함.</p></section>
      {(snapshot.pending > 0 || snapshot.relayError) && <p className="tw-warning" role="alert">SQLite 반영 대기 {snapshot.pending}건. 현재 화면은 불완전할 수 있습니다. 새로고침하면 업무 DB의 보관 기록에서 다시 전달합니다.</p>}
      {snapshot.captureGaps > 0 && <p className="tw-warning" role="alert">기록 누락 가능 지점 {snapshot.captureGaps}건이 있습니다. 진단 이벤트를 확인하고 완전한 기록으로 간주하지 마세요.</p>}
      {events.some(e => e.data.fixture === true) && <p className="tw-warning">검증용 합성 기록입니다. 실제 고객 또는 실제 AI 실행 결과가 아닙니다.</p>}
      <div className="tw-tabs" role="tablist" aria-label="관찰 도구">{([["timeline", "실행 타임라인"], ["compare", "결과 비교·평가"], ["experiments", "개선 실험"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} aria-controls={`tw-panel-${id}`} id={`tw-tab-${id}`} tabIndex={tab === id ? 0 : -1} onKeyDown={e => { const ids = ["timeline", "compare", "experiments"] as const; const position = ids.indexOf(id); const destination = e.key === "ArrowRight" ? ids[(position + 1) % 3] : e.key === "ArrowLeft" ? ids[(position + 2) % 3] : e.key === "Home" ? ids[0] : e.key === "End" ? ids[2] : null; if (destination) { e.preventDefault(); setTab(destination); document.getElementById(`tw-tab-${destination}`)?.focus(); } }} onClick={() => setTab(id)}>{label}{id === "experiments" && <small>{snapshot.experiments.length}</small>}</button>)}</div>
      <div className="tw-messages"><p role="status">{notice}</p>{error && <p role="alert" className="tw-error">{error}</p>}</div>
      {tab === "timeline" && <section id="tw-panel-timeline" role="tabpanel" aria-labelledby="tw-tab-timeline">
        <div className="tw-filters"><label className="tw-search">기록 검색<input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="단계, 의견, 턴 ID 검색" /></label><label>실행<select value={run} onChange={e => setRun(e.target.value)}><option value="">모든 실행</option>{runs.map((id, i) => <option key={id} value={id}>실행 {i + 1} · {id.slice(0, 8)}</option>)}</select></label><label>기록 종류<select value={kind} onChange={e => setKind(e.target.value)}><option value="">모든 종류</option>{Object.entries(kindNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><span className="tw-muted">{filtered.length} / {snapshot.total}건</span></div>
        <div className="tw-split"><aside className="tw-timeline" aria-label="실행 이벤트 목록">{snapshot.nextBefore && <button className="tw-load" disabled={busy} onClick={() => void request(undefined, true)}>이전 기록 더 보기</button>}{!filtered.length && <div className="tw-empty"><h2>{events.length ? "검색 결과가 없습니다" : "아직 실행 기록이 없습니다"}</h2><p>{events.length ? "검색어나 필터를 바꿔 보세요." : "이전 기록은 소급 생성하지 않습니다. AI 제작을 진행한 뒤 새로고침하세요."}</p></div>}{filtered.map(e => { const marks = feedback.filter(f => f.eventId === e.id); return <button className="tw-node" data-selected={selected === e.id} key={e.id} onClick={() => setSelected(e.id)} aria-pressed={selected === e.id}><span className="tw-seq">{String(e.seq).padStart(2, "0")}</span><span className="tw-node-body"><span className="tw-node-meta">{time(e.at)} <span>{phaseNames[e.phase] || e.phase}</span></span><strong>{e.label}</strong><span className="tw-node-summary">{summary(e)}</span><span className="tw-node-tags"><small>{kindNames[e.kind]}</small>{e.data.traceDelivery === "sqlite_fallback" && <small>SQLite 직접 기록</small>}{marks.map(f => <small key={f.id} data-effect={f.effect}>{dimensions[f.dimension]} {f.score ?? "—"} · {effects[f.effect]}</small>)}</span></span></button>; })}</aside>
          <article className="tw-inspector" aria-label="선택한 이벤트">{chosen ? <><div className="tw-inspector-head"><p className="tw-eyebrow">EVENT {chosen.seq} / {kindNames[chosen.kind]}</p><h2>{chosen.label}</h2><p className="tw-muted">{new Date(chosen.at).toLocaleString("ko-KR")} · {phaseNames[chosen.phase] || chosen.phase}</p><code>실행 {chosen.runId}{chosen.turnId ? ` / 턴 ${chosen.turnId}` : ""}</code><div className="tw-actions"><button onClick={() => selectCompare(chosen.id, "baseline")}>비교 기준으로</button><button onClick={() => selectCompare(chosen.id, "candidate")}>비교 후보로</button></div></div><EventEvidence key={chosen.id} event={chosen} />{chosen.turnId && <details className="tw-linked"><summary>같은 AI 턴의 기록</summary><div className="tw-actions">{events.filter(e => e.turnId === chosen.turnId && e.id !== chosen.id).map(e => <button key={e.id} onClick={() => setSelected(e.id)}>#{e.seq} {kindNames[e.kind]}</button>)}</div></details>}<EvaluationForm key={`eval-${chosen.id}`} event={chosen} events={events} busy={busy} save={request} /><EvaluationList rows={feedback.filter(e => e.eventId === chosen.id)} focus={focusEvent} /></> : <div className="tw-empty"><h2>흐름에서 한 지점을 선택하세요</h2><p>입력·모델 응답·적용 결과와 평가를 함께 확인합니다.</p></div>}</article>
        </div>
      </section>}
      {tab === "compare" && <section id="tw-panel-compare" role="tabpanel" aria-labelledby="tw-tab-compare" className="tw-comparison"><div className="tw-section-intro"><h2>어떤 변화가 결과를 바꿨나요?</h2><p>같은 입력·모델·평가 기준을 우선 비교하세요. 향상·저하 표시는 평가자의 가설이며, 인과관계를 증명하지 않습니다.</p></div><div className="tw-compare-grid">{([{ title: "기준", value: baseline, set: setBaseline, event: base }, { title: "후보", value: candidate, set: setCandidate, event: next }]).map(item => <article key={item.title}><label>{item.title} 지점<EventSelect events={events} value={item.value} change={item.set} /></label>{item.event ? <><h3>{item.event.label}</h3><EventEvidence key={item.event.id} event={item.event} compact /><EvaluationList rows={feedback.filter(e => e.eventId === item.event!.id)} focus={focusEvent} /><button onClick={() => focusEvent(item.event!.id)}>이 지점 평가하기 →</button></> : <p className="tw-muted tw-placeholder">타임라인에서 지점을 지정하거나 위 목록에서 선택하세요.</p>}</article>)}</div>{base && next && <ComparisonScores base={base.id} next={next.id} evaluations={feedback} />}{base && next && base.id !== next.id && <ExperimentForm baseline={base} candidate={next} busy={busy} save={request} />}</section>}
      {tab === "experiments" && <section id="tw-panel-experiments" role="tabpanel" aria-labelledby="tw-tab-experiments"><div className="tw-section-intro"><h2>관찰 → 가설 → 비교 → 검토</h2><p>결과 비교 탭에서 기준·후보를 선택해 실험을 등록합니다. 검토 결론을 남겨도 모델이나 제작 정책이 자동 변경되지는 않습니다.</p></div>{!snapshot.experiments.length && <div className="tw-empty"><h3>첫 개선 가설을 남겨 보세요</h3><p>예: 같은 상품 사진에서 이미지 계획을 바꾸면 적합성이 좋아질까?</p><button onClick={() => setTab("compare")}>결과 비교 시작</button></div>}{snapshot.experiments.map(experiment => <ExperimentCard key={experiment.id} experiment={experiment} busy={busy} focus={focusEvent} save={request} />)}</section>}
      <footer className="tw-footnote">평가 기준 {RUBRIC} · 1 매우 부족 / 2 부족 / 3 수용 가능 / 4 좋음 / 5 매우 좋음. 사용자 부담은 점수가 높을수록 부담이 적습니다. 고객 의견이 없으면 만족도를 추정하지 않습니다. 타임라인은 관측 시각으로 정렬하며, 순번은 수집 순서입니다. 병렬 실행의 인과 순서를 뜻하지 않습니다.</footer>
    </>}
  </main>;
}
function EventSelect({ events, value, change, optional = false }: { events: TraceEvent[]; value: string; change: (v: string) => void; optional?: boolean }) {
  return <select value={value} onChange={e => change(e.target.value)} required={!optional}><option value="">{optional ? "연결하지 않음" : "지점 선택"}</option>{events.map(e => <option key={e.id} value={e.id}>#{e.seq} {e.label} · {time(e.at)}</option>)}</select>;
}
function EvaluationForm({ event, events, busy, save }: { event: TraceEvent; events: TraceEvent[]; busy: boolean; save: (d: Record<string, unknown>) => Promise<void> }) {
  const [source, setSource] = useState("developer"), [related, setRelated] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); void save({ ...data, kind: "evaluation", eventId: event.id, relatedEventId: related || null, score: data.score ? Number(data.score) : null }); }
  return <form className="tw-form" onSubmit={submit}><h3>이 지점의 영향 기록</h3><p className="tw-muted">관찰한 결과와 판단 근거를 함께 남기세요. 같은 작성자·출처·항목을 다시 저장하면 이전 평가는 이력으로 보존됩니다.</p><div className="tw-form-grid"><label>평가 출처<select name="source" value={source} onChange={e => setSource(e.target.value)}>{Object.entries(sources).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><label>평가 항목<select name="dimension" key={source}>{Object.entries(dimensions).filter(([id]) => id !== "satisfaction" || source === "customer_report").map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>점수<select name="score" defaultValue=""><option value="">미평가</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label><label>영향에 대한 가설<select name="effect" defaultValue="unknown">{Object.entries(effects).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label></div><label>연결할 근거·전후 지점<EventSelect events={events.filter(e => e.id !== event.id)} value={related} change={setRelated} optional /></label>{source === "customer_report" && <label>고객 의견 원문·출처<textarea name="quote" required maxLength={4000} placeholder="고객이 실제로 한 말과 확인한 경로를 적어 주세요." /></label>}<label>판단 근거·불확실한 점<textarea name="note" required minLength={2} maxLength={4000} placeholder="어떤 결정이 어떤 결과와 연결되었나요? 아직 확인하지 못한 부분도 남겨 주세요." /></label><button type="submit" className="tw-primary" disabled={busy}>평가 저장</button></form>;
}
function EvaluationList({ rows, focus }: { rows: TraceEvaluation[]; focus: (id: string) => void }) {
  return <div className="tw-evaluations">{rows.map(e => <article key={e.id} data-effect={e.effect}><div><strong>{dimensions[e.dimension]} {e.score === null ? "미평가" : `${e.score}/5`}</strong><span>{effects[e.effect]}</span></div><small>{sources[e.source]} · {time(e.at)}</small>{e.quote && <blockquote>{e.quote}</blockquote>}<p>{e.note}</p>{e.relatedEventId && <button onClick={() => focus(e.relatedEventId!)}>연결된 근거 보기 →</button>}</article>)}</div>;
}
function ComparisonScores({ base, next, evaluations }: { base: string; next: string; evaluations: TraceEvaluation[] }) {
  const rows = Object.entries(dimensions).flatMap(([dimension, label]) => Object.entries(sources).flatMap(([source, sourceLabel]) => {
    const select = (id: string) => evaluations.filter(e => e.eventId === id && e.dimension === dimension && e.source === source && e.rubric === RUBRIC && e.score !== null);
    const b = select(base), c = select(next); if (!b.length && !c.length) return [];
    const avg = (values: TraceEvaluation[]) => values.length ? values.reduce((sum, e) => sum + e.score!, 0) / values.length : null;
    const ba = avg(b), ca = avg(c);
    return [{ key: `${dimension}:${source}`, label, sourceLabel, b, c, ba, ca }];
  }));
  return <section className="tw-scoretable"><h3>같은 기준·출처의 평가 비교</h3>{rows.length ? <table><thead><tr><th>항목·출처</th><th>기준</th><th>후보</th><th>차이</th></tr></thead><tbody>{rows.map(r => <tr key={r.key}><th>{r.label}<small>{r.sourceLabel}</small></th><td>{r.ba?.toFixed(1) ?? "—"} <small>n={r.b.length}</small></td><td>{r.ca?.toFixed(1) ?? "—"} <small>n={r.c.length}</small></td><td>{r.ba !== null && r.ca !== null ? `${r.ca - r.ba > 0 ? "+" : ""}${(r.ca - r.ba).toFixed(1)}` : "평가 부족"}</td></tr>)}</tbody></table> : <p className="tw-muted">아직 숫자 평가가 없습니다. 양쪽 지점에 같은 항목의 평가를 남기세요.</p>}<p className="tw-muted">n은 현재 유효한 평가 수입니다. 고객 수·통계적 유의성을 뜻하지 않습니다.</p></section>;
}
function ExperimentForm({ baseline, candidate, busy, save }: { baseline: TraceEvent; candidate: TraceEvent; busy: boolean; save: (d: Record<string, unknown>) => Promise<void> }) {
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); void save({ ...Object.fromEntries(new FormData(e.currentTarget)), kind: "experiment", baselineId: baseline.id, candidateId: candidate.id }); }
  return <form className="tw-form" onSubmit={submit}><h3>이 비교를 개선 실험으로 기록</h3><p className="tw-muted">기준 #{baseline.seq} → 후보 #{candidate.seq}. 실제 모델을 재실행하지 않습니다.</p><label>개선 가설<textarea name="hypothesis" required minLength={2} maxLength={2000} placeholder="변경한 판단·지침과 기대하는 효과" /></label><div className="tw-form-grid"><label>주 평가 항목<select name="dimension">{Object.entries(dimensions).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>성공 기준<input name="target" required minLength={2} maxLength={1000} placeholder="예: 이미지 적합성 1점 향상, 상품 보존 유지" /></label></div><label>비교 조건·함께 바뀐 요인<textarea name="controls" required minLength={2} maxLength={2000} placeholder="입력·모델·프롬프트 버전·이미지·평가자 조건. 다르면 차이와 한계를 기록하세요." /></label><button type="submit" className="tw-primary" disabled={busy}>개선 실험 등록</button></form>;
}
function ExperimentCard({ experiment: e, busy, focus, save }: { experiment: TraceExperiment; busy: boolean; focus: (id: string) => void; save: (d: Record<string, unknown>) => Promise<void> }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void save({ ...Object.fromEntries(new FormData(event.currentTarget)), kind: "decision", experimentId: e.id }); }
  const verdicts = { adopt: "도입 제안", reject: "도입하지 않음", inconclusive: "판단 보류" };
  return <article className="tw-experiment"><div className="tw-experiment-head"><span className="tw-eyebrow">{dimensions[e.dimension]} / {new Date(e.at).toLocaleDateString("ko-KR")}</span><strong>{e.decisions[0] ? verdicts[e.decisions[0].verdict] : "검토 대기"}</strong></div><h3>{e.hypothesis}</h3><dl><dt>성공 기준</dt><dd>{e.target}</dd><dt>비교 조건</dt><dd>{e.controls}</dd></dl><div className="tw-actions"><button onClick={() => focus(e.baselineId)}>기준 기록</button>{e.candidateId && <button onClick={() => focus(e.candidateId!)}>후보 기록</button>}</div>{e.decisions.map(d => <div className="tw-decision" key={d.id}><strong>{verdicts[d.verdict]}</strong><small>{new Date(d.at).toLocaleString("ko-KR")}</small><p>{d.note}</p><details><summary>검토 당시 평가 근거 {d.evidence.length}건</summary>{d.evidence.map(v => <p key={v.id}>{sources[v.source]} · {dimensions[v.dimension]} {v.score ?? "미평가"}/5 · {v.note}</p>)}{!d.evidence.length && <p className="tw-muted">이전 버전의 검토이거나 평가 근거가 기록되지 않았습니다.</p>}</details></div>)}<form className="tw-form" onSubmit={submit}><label>검토 결론<select name="verdict"><option value="inconclusive">판단 보류·추가 검증</option><option value="adopt">도입 제안</option><option value="reject">도입하지 않음</option></select></label><label>근거와 다음 조치<textarea name="note" required minLength={2} maxLength={4000} placeholder="결론의 근거, 남은 불확실성, 다음 실험을 적어 주세요." /></label><button type="submit" disabled={busy}>검토 기록 저장</button></form></article>;
}
