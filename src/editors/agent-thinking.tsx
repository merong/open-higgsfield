"use client";
import { useEffect, useState } from "react";
import { agentTask } from "@/projects/agent-progress";
import { EDITORIAL_CRITERIA, type EditorialLoop } from "@/projects/editorial-review";
import "./agent-thinking.css";

type Event = { id: string; title: string; message: string; at: number };
export function AgentThinking({ stage, queued = false, turn, startedAt, detail, events = [] }: {
  stage: string; queued?: boolean; turn?: number; startedAt?: number; detail?: string; events?: Event[];
}) {
  const task = agentTask(stage);
  const [mountedAt] = useState(() => Date.now()), [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const elapsed = Math.max(0, Math.floor((now - (startedAt || mountedAt)) / 1000));
  return <section className="agent-thinking" aria-label="AI 작업 진행">
    <div className="agent-thinking-heading">
      <span className="agent-thinking-mark" aria-hidden="true">✦</span>
      <div role="status" aria-live="polite" aria-atomic="true"><span className="agent-thinking-eyebrow">{queued ? "다음 작업 준비" : turn ? `${turn}번째 AI 작업` : "작업 진행 중"}</span><strong className="agent-thinking-title">{queued ? `다음 단계 · ${task.title.replace(/고 있어요$/, "기")}` : task.title}</strong></div>
      <span className="agent-thinking-time" aria-hidden="true">{elapsed < 60 ? `${elapsed}초` : `${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`}</span>
    </div>
    <p className="agent-thinking-detail">{detail || "이번 단계에서 확인하는 내용"}</p>
    <ul className="agent-thinking-focus">{task.focus.map(item => <li key={item}>{item}</li>)}</ul>
    <div className="agent-thinking-skeleton" aria-hidden="true"><i/><i/><i/></div>
    {elapsed >= 35 && <p className="agent-thinking-wait">응답을 기다리고 있어요. 완료된 단계는 저장되며 결과가 도착하면 이어서 보여드려요.</p>}
    {!!events.length && <details className="agent-thinking-history"><summary>최근 작업 메시지</summary><ol>{events.slice(-4).map(e => <li key={e.id}><strong>{e.title}</strong><p>{e.message}</p></li>)}</ol></details>}
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
