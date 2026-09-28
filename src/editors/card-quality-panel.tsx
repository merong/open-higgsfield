"use client";
import { Button } from "@openhiggsfield/design";
import { QUALITY_LABELS, type CardWorkflow, type QualityCriterion } from "@/projects/card-workflow";
const labels = { pass: "통과", attention: "확인 필요", fail: "수정 필요" };
export function CardQualityPanel({ run, selected, busy, onSelect, onArrange }: { run: CardWorkflow; selected: number; busy: boolean; onSelect: (index: number) => void; onArrange: (feedback: string) => void }) {
  const q = run.quality; if (!q) return null;
  if (q.state !== "ready") return <div className="cw-quality" role="status"><h4>{q.state === "running" ? "실제 PNG를 읽고 있어요" : "출력 검수를 다시 시도해 주세요"}</h4><p>{q.error || "이미지와 원고를 대조하고 모바일 가독성·누락·문구 보호를 확인합니다."}</p></div>;
  const card = q.cards?.find(c => c.cardId === run.project.slots[selected]?.id), output = q.output?.find(c => c.cardId === card?.cardId);
  return <section className="cw-quality" aria-label="다섯 가지 출력 검수 결과">
    <span className="cw-label">OUTPUT REVIEW · v{q.projectVersion}</span><h3>출력물로 확인한 다섯 가지.</h3><p>{q.summary}</p>
    <div className="cw-quality-summary">{(Object.keys(QUALITY_LABELS) as QualityCriterion[]).map(key => {
      const values = q.cards?.flatMap(c => c.findings.filter(f => f.criterion === key)) || [];
      const status = values.some(v => v.status === "fail") ? "fail" : values.some(v => v.status === "attention") ? "attention" : "pass";
      return <div key={key} data-status={status}><span>{QUALITY_LABELS[key]}</span><strong>{labels[status]}</strong></div>;
    })}</div>
    <div className="cw-quality-tabs" aria-label="검수 카드 선택">{run.project.slots.map((s, i) => <button key={s.id} aria-pressed={selected === i} onClick={() => onSelect(i)}>{i + 1}장{q.cards?.find(c => c.cardId === s.id)?.findings.some(f => f.status === "fail") ? " · 수정" : ""}</button>)}</div>
    {card && <div className="cw-findings">{card.findings.map(f => <article key={f.criterion} data-status={f.status}><div><strong>{QUALITY_LABELS[f.criterion]}</strong><span>{labels[f.status]}</span></div><p>{f.evidence}</p>{f.suggestion && <p className="cw-muted">{f.suggestion}</p>}</article>)}</div>}
    {output && <p className="cw-muted">브라우저 측정 · 360px 폭 기준 본문 {output.mobileBodyPx || "측정 대상 없음"}{output.mobileBodyPx ? "px" : ""} · 경계/글꼴/이미지 검사 {output.issues.length ? `${output.issues.length}건 확인 필요` : "문제 감지 없음"}</p>}
    {card && run.status === "ready" && card.findings.some(f => f.status !== "pass" && ["typography", "output", "matching"].includes(f.criterion)) && <Button disabled={busy} onClick={() => onArrange(card.findings.filter(f => f.status !== "pass" && ["typography", "output", "matching"].includes(f.criterion)).map(f => `${f.evidence} ${f.suggestion}`).join("\n").slice(0, 1200))}>이 카드 문구를 보존하고 재배치</Button>}
    <p className="cw-muted">AI의 시각 검수와 브라우저 측정 결과입니다. 고유명사·수치·제품 사양 등 사실은 출처 및 원본과 함께 최종 확인해 주세요.</p>
  </section>;
}
