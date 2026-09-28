"use client";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Field, Textarea } from "@openhiggsfield/design";
import { AGENT_STAGES, agentTerminal, type CardAgentRun } from "@/projects/card-agent";
import { api } from "@/projects/api";

export function CardAgentPanel({ run, onRun, onReset, onOpen }: {
  run: CardAgentRun; onRun: (run: CardAgentRun) => void; onReset: () => void; onOpen: (id: string) => void;
}) {
  const [direction, setDirection] = useState(run.direction ?? 0), [feedback, setFeedback] = useState(run.feedback), [revisionFeedback, setRevisionFeedback] = useState("");
  const [error, setError] = useState(""), [paused, setPaused] = useState(false), [actionBusy, setActionBusy] = useState(false);
  const [stepEpoch, setStepEpoch] = useState(0);
  const stepFlight = useRef(false), actionFlight = useRef(false);
  const onRunRef = useRef(onRun); onRunRef.current = onRun;
  const current = useRef(run); current.current = run;
  function receive(next: CardAgentRun) {
    if (next.id === current.current.id && next.revision >= current.current.revision) { current.current = next; onRunRef.current(next); }
  }
  // Each request executes exactly one persisted stage within the route budget.
  // Polling also recovers an accepted request whose original response was lost.
  useEffect(() => {
    if (paused || !["pending", "running"].includes(run.status)) return;
    let mounted = true;
    const timer = setInterval(() => {
      void api<CardAgentRun>(`card-agent/${run.id}`).then(next => { if (mounted) receive(next); }).catch(() => {
        if (mounted) { setPaused(true); setError("연결이 잠시 끊겼습니다. 저장된 진행 상태를 확인하고 이어갈 수 있어요."); }
      });
    }, 1800);
    return () => { mounted = false; clearInterval(timer); };
  }, [run.id, run.status, paused]);
  useEffect(() => {
    if (paused || run.status !== "pending" || stepFlight.current) return;
    stepFlight.current = true;
    void api<CardAgentRun>(`card-agent/${run.id}`, { method: "POST", body: JSON.stringify({ action: "step", revision: run.revision }) })
      .then(receive).catch(() => { setPaused(true); setError("응답을 확인하지 못했습니다. ‘상태 확인하고 이어가기’를 누르면 중복 결제 없이 복구합니다."); })
      .finally(() => { stepFlight.current = false; setStepEpoch(value => value + 1); });
  }, [run.id, run.revision, run.status, paused, stepEpoch]);
  async function resume() {
    setActionBusy(true);
    try { receive(await api<CardAgentRun>(`card-agent/${run.id}`)); setError(""); setPaused(false); }
    catch (e) { setError((e as Error).message); }
    finally { setActionBusy(false); }
  }
  async function action(kind: "direction" | "revise" | "save" | "cancel") {
    if (actionFlight.current) return;
    actionFlight.current = true; setActionBusy(true); setError("");
    try {
      const next = await api<CardAgentRun>(`card-agent/${run.id}`, { method: "POST", body: JSON.stringify({ action: kind, revision: run.revision, direction, feedback: kind === "revise" ? revisionFeedback.trim() : feedback.trim() }) });
      receive(next); setPaused(false);
      if (kind === "save" && next.projectId) onOpen(next.projectId);
    } catch (e) {
      setError((e as Error).message);
      try { receive(await api<CardAgentRun>(`card-agent/${run.id}`)); } catch { setPaused(true); }
    } finally { actionFlight.current = false; setActionBusy(false); }
  }
  const terminal = agentTerminal(run), working = ["pending", "running"].includes(run.status);
  const stageIndex = AGENT_STAGES.findIndex(s => s.id === run.stage);
  const visibleWarnings = ["ready", "completed"].includes(run.status) ? run.warnings : run.review?.warnings ?? [];
  const statusText = run.status === "awaiting_direction" ? "함께 방향을 정해 볼까요?" : run.status === "ready" ? "검수를 거친 원고가 준비됐어요." : run.status === "completed" ? "프로젝트에 저장했어요." : terminal ? "작업이 종료되었어요." : paused ? "저장된 작업을 이어갈 수 있어요." : `${AGENT_STAGES[stageIndex].title} 중이에요.`;
  return <section className="ws-agent" aria-labelledby="card-agent-title">
    <div className="ws-agent-header"><div><span className="ws-eyebrow">YOUR CARD NEWS PARTNER</span><h2 id="card-agent-title">{statusText}</h2><p>아이디어를 함께 정리하고, 한 번 더 검토해 완성도를 높입니다.</p></div><span className="ws-agent-turns">AI 작업 {run.turns}회 완료 · 전체 1 크레딧</span></div>
    <ol className="ws-agent-stages" aria-label="카드뉴스 제작 단계">{AGENT_STAGES.map((stage, index) => {
      const done = index < stageIndex || ["ready", "completed"].includes(run.status) || (index === 0 && run.status === "awaiting_direction");
      return <li key={stage.id} data-state={done ? "done" : index === stageIndex ? "current" : "next"} aria-current={!terminal && index === stageIndex ? "step" : undefined}><span>{done ? "✓" : `0${index + 1}`}</span><strong>{stage.title}</strong><small>{done ? "완료" : index === stageIndex ? working ? "진행 중" : "확인" : "대기"}</small></li>;
    })}</ol>
    {error && <Alert>{error}</Alert>}
    {paused && !terminal && <Button onClick={() => void resume()} loading={actionBusy}>상태 확인하고 이어가기</Button>}
    {run.error && <Alert>{run.error}</Alert>}
    <div className="ws-agent-grid">
      <div className="ws-agent-main">
        {working && <div className="ws-agent-working" role="status"><span className="ws-agent-pulse"/><div><strong>{paused ? "연결 확인이 필요해요" : AGENT_STAGES[stageIndex].title}</strong><p>{paused ? "이미 완료된 작업은 서버에 저장되어 있습니다." : AGENT_STAGES[stageIndex].description}</p><small>실제 작업이 끝나면 다음 단계로 이동합니다. 각 단계는 최대 약 1분이 걸릴 수 있어요.</small></div></div>}
        {run.plan && <section className="ws-agent-brief"><div className="ws-agent-section-label">01 / 함께 정한 방향</div><h3>이렇게 이해했어요.</h3><p>{run.plan.intent}</p><dl><div><dt>독자</dt><dd>{run.plan.audience}</dd></div><div><dt>목표</dt><dd>{run.plan.goal}</dd></div></dl>
          {!!run.plan.assumptions.length && <details><summary>우선 가정한 내용 · {run.plan.assumptions.length}개</summary><ul>{run.plan.assumptions.map((s, i) => <li key={i}>{s}</li>)}</ul><p>다른 의도라면 아래 의견에 적어 주세요.</p></details>}
          {run.status === "awaiting_direction" ? <><div className="ws-agent-directions" aria-label="기획 방향 선택">{run.plan.directions.map((d, index) => <button key={index} type="button" aria-pressed={direction === index} onClick={() => setDirection(index)} disabled={actionBusy}><span>{index === 0 ? "추천 방향" : `다른 방향 ${index}`}{direction === index && " · 선택됨"}</span><strong>{d.title}</strong><p>{d.approach}</p><small>표지 제안 · {d.hook}</small></button>)}</div>
            <Field label={run.plan.question || "꼭 담고 싶거나 바꾸고 싶은 내용이 있나요?"} htmlFor="agent-feedback" hint="선택 사항이에요. 답하지 않아도 선택한 방향으로 진행합니다."><Textarea id="agent-feedback" rows={3} maxLength={1200} value={feedback} onChange={e => setFeedback(e.target.value)} disabled={actionBusy} placeholder="예: 초보 직장인이 바로 따라 할 예시 위주로, 마지막은 저장 유도로 마무리해 주세요."/></Field>
            <Button variant="primary" size="lg" loading={actionBusy} onClick={() => void action("direction")}>이 방향으로 전체 카드 작성 →</Button>
          </> : run.direction !== undefined && <div className="ws-agent-chosen"><strong>{run.plan.directions[run.direction].title}</strong><p>{run.plan.directions[run.direction].approach}</p>{run.feedback && <p>내 의견 · {run.feedback}</p>}</div>}
        </section>}
        {run.preview && <section className="ws-agent-preview"><div className="ws-agent-section-label">02 / {run.status === "ready" || run.status === "completed" ? "최종 원고" : "작성된 초안"}</div><h3>{run.preview.title}</h3>
          <div className="ws-agent-cards">{run.preview.slots.map((s, i) => <article key={s.id}><span>{String(i + 1).padStart(2, "0")} / {s.kind === "cover" ? "표지" : s.kind === "cta" ? "마무리" : "본문"}</span><h4>{s.title}</h4><p>{s.body}</p><details><summary>이미지 구상</summary><p lang="en">{s.prompt}</p></details></article>)}</div>
          <details className="ws-agent-caption"><summary>게시용 캡션</summary><p>{run.preview.caption}</p></details>
        </section>}
        {run.status === "ready" && <section className="ws-agent-finish"><h3>의도에 맞게 완성됐나요?</h3><p>편집기에서 문구를 직접 고치고, 이미지를 생성해 디자인을 완성할 수 있어요.</p>
          {run.refinementCount < 1 && <details><summary>의견을 더해서 AI로 한 번 더 다듬기</summary><Field label="어떤 부분을 바꿀까요?" htmlFor="agent-revision" hint="추가 수정 1회가 포함되어 있습니다. 다시 검수하고 개선합니다."><Textarea id="agent-revision" rows={3} value={revisionFeedback} maxLength={1200} onChange={e => setRevisionFeedback(e.target.value)} disabled={actionBusy} placeholder="예: 3장을 더 쉬운 예시로 바꾸고 마지막은 질문으로 끝내 주세요."/></Field><Button disabled={actionBusy || revisionFeedback.trim().length < 2} onClick={() => void action("revise")}>의견 반영해 다시 다듬기</Button></details>}
          {run.refinementCount > 0 && <p className="ws-quick-footnote">추가 의견을 반영했습니다. 더 바꾸고 싶은 부분은 편집기에서 자유롭게 수정하세요.</p>}
          <Button variant="primary" size="lg" loading={actionBusy} onClick={() => void action("save")}>프로젝트에 저장하고 편집하기 ↗</Button>
        </section>}
        {run.status === "completed" && run.projectId && <Button variant="primary" onClick={() => onOpen(run.projectId!)}>저장한 프로젝트 열기 ↗</Button>}
        {terminal && <Button onClick={onReset}>새 아이디어로 시작</Button>}
      </div>
      <aside className="ws-agent-activity" aria-label="제작 활동"><div className="ws-agent-section-label">LIVE ACTIVITY</div><h3>함께 만드는 과정</h3><p className="ws-agent-activity-hint">진행 단계와 반영 사항을 요약해 보여 드립니다.</p>
        <p className="ws-agent-live" role="status" aria-live="polite">{run.events.at(-1)?.title}</p>
        <ol>{run.events.map(e => <li key={e.id}><strong>{e.title}</strong><p>{e.message}</p></li>)}</ol>
        {run.review && <details open><summary>편집자의 검수 메모</summary><p>{run.review.summary}</p>{!!run.review.strengths.length && <><strong>유지할 부분</strong><ul>{run.review.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>}{!!run.review.changes.length && <><strong>개선 제안</strong><ul>{run.review.changes.map((s, i) => <li key={i}>{s}</li>)}</ul></>}</details>}
        {!!visibleWarnings.length && <div className="ws-agent-warnings"><strong>게시 전 확인해 주세요</strong><ul>{visibleWarnings.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
        <p className="ws-agent-disclosure">{run.model} · {run.effort || "기본 설정"}<br/>실시간 웹 검색 없이 제공된 자료로 작성합니다.<br/>이미지 생성은 편집기에서 별도로 진행해요.</p>
        {!terminal && <><p className="ws-agent-disclosure">이 페이지를 떠나면 현재 단계까지 저장됩니다. 다시 방문하면 이어갈 수 있어요. 7일 이상 지난 미완료 작업은 다음 조회 시 만료·환불됩니다.</p><Button size="sm" disabled={actionBusy} onClick={() => void action("cancel")}>작업 취소 · 1 크레딧 환불</Button></>}
      </aside>
    </div>
  </section>;
}
