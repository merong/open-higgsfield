"use client";
import { useEffect, useState } from "react";
import { agentTask } from "@/projects/agent-progress";
import { EDITORIAL_CRITERIA, type EditorialLoop } from "@/projects/editorial-review";
import "./agent-thinking.css";

type Event = { id: string; title: string; message: string; at: number };
const visualMode = (stage: string) => {
  if (["review", "quality", "research"].includes(stage)) return "scan";
  if (["image", "video", "recommend"].includes(stage)) return "image";
  if (["plan", "understand"].includes(stage)) return "connect";
  if (stage === "voice") return "voice";
  if (["patch", "refine"].includes(stage)) return "revise";
  return "compose";
};

export function AgentThinking({ stage, queued = false, turn, startedAt, detail, events = [], targets = [] }: {
  stage: string; queued?: boolean; turn?: number; startedAt?: number; detail?: string; events?: Event[]; targets?: string[];
}) {
  const task = agentTask(stage);
  // The server and first client render agree; restart timing when the task changes.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = startedAt || Date.now();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [stage, startedAt, queued]);
  const latest = events.at(-1);
  return <section className="agent-thinking" data-mode={visualMode(stage)} data-queued={queued} aria-label="AI 작업 진행">
    <div className="agent-thinking-heading">
      <span className="agent-thinking-mark" aria-hidden="true">✦</span>
      <div role="status" aria-live="polite" aria-atomic="true"><span className="agent-thinking-eyebrow">{queued ? "다음 작업 준비" : turn ? `${turn}번째 AI 작업` : "작업 진행 중"}</span><strong className="agent-thinking-title">{queued ? `다음 단계 · ${task.title.replace(/고 있어요$/, "기")}` : task.title}</strong></div>
      <span className="agent-thinking-time" aria-hidden="true">{elapsed < 60 ? `${elapsed}초` : `${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`}</span>
    </div>
    <div className="agent-thinking-workbench">
      <div className="agent-thinking-scene" aria-hidden="true">
        <div className="agent-thinking-orbit"/>
        <div className="agent-thinking-sheet agent-thinking-sheet--back"><i/><i/><i/></div>
        <div className="agent-thinking-sheet agent-thinking-sheet--front">
          <div className="agent-thinking-sheet-top"><span/><b>✦</b></div>
          <div className="agent-thinking-picture"><span/><i/></div>
          <div className="agent-thinking-lines"><i/><i/><i/><i/></div>
          <div className="agent-thinking-wave">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ animationDelay: `${i * -0.17}s` }}/>)}</div>
          <div className="agent-thinking-scan"/>
        </div>
        <span className="agent-thinking-node agent-thinking-node--one"/>
        <span className="agent-thinking-node agent-thinking-node--two"/>
      </div>
      <div className="agent-thinking-context">
        <p className="agent-thinking-detail">{detail || (queued ? "이 단계에서 살펴볼 내용" : "지금 작업하는 내용")}</p>
        <ul className="agent-thinking-focus">{task.focus.map(item => <li key={item}><span aria-hidden="true"/>{item}</li>)}</ul>
        {!!targets.length && <div className="agent-thinking-targets"><span>작업 대상</span><ul>{targets.slice(0, 3).map((title, i) => <li key={`${i}:${title}`}>{title}</li>)}</ul>{targets.length > 3 && <small>외 {targets.length - 3}개 섹션</small>}</div>}
      </div>
    </div>
    {latest && <div className="agent-thinking-latest"><span>최근 작업</span><p>{latest.message || latest.title}</p></div>}
    {elapsed >= 35 && <p className="agent-thinking-wait">응답을 기다리고 있어요. 완료된 단계는 저장되며 결과가 도착하면 이어서 보여드려요.</p>}
    {events.length > 1 && <details className="agent-thinking-history"><summary>이전 작업 메시지</summary><ol>{events.slice(-5, -1).map(e => <li key={e.id}><strong>{e.title}</strong><p>{e.message}</p></li>)}</ol></details>}
  </section>;
}

export function AgentReviewPanel({ loop }: { loop?: EditorialLoop }) {
  const latest = loop?.reviews.at(-1);
  if (!latest) return null;
  const needsAttention = latest.criteria.some(c => c.status !== "pass");
  return <details className="agent-review"><summary><span>최근 원고 검수 · {latest.round}회</span><small>{latest.issues.length ? `${latest.issues.length}개 확인 사항` : needsAttention ? "확인할 검수 기준 있음" : "검수 지적 없음"}{loop!.repairs > 0 ? ` · ${loop!.repairs}회 보정` : ""}</small></summary>
    <p>{latest.summary}</p>
    <div className="agent-review-criteria">{latest.criteria.map(c => <article key={c.key} data-status={c.status}><strong>{EDITORIAL_CRITERIA[c.key]}<span>{({ pass: "적합", attention: "확인", fail: "수정 필요" })[c.status]}</span></strong><p>{c.evidence}</p></article>)}</div>
    {!!latest.issues.length && <ul>{latest.issues.map((i, index) => <li key={`${i.targetId}-${index}`}>{i.severity === "error" ? "수정 필요" : "확인 사항"} · {i.message}</li>)}</ul>}
    {loop!.reviews.length > 1 && <details><summary>이전 검수와 비교</summary>{loop!.reviews.slice(0,-1).map(r => <article key={r.round}><strong>{r.round}회 검수 · 지적 {r.issues.length}개</strong><p>{r.summary}</p><ul>{r.issues.map((i,index) => <li key={index}>{i.message}</li>)}</ul></article>)}</details>}
    <p className="agent-review-note">최근 검수 시점의 내용과 구상에 대한 기록이에요. 이후 수정한 내용과 실제 이미지·글자 배치·영상은 출력 후 별도로 확인해 주세요.</p>
  </details>;
}
