"use client";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Dialog, Field, Textarea } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { IMAGE_SIZES, PRODUCT_REFERENCE_MODEL, productImagePrompt, imageBusy, imageModels, imagePlaceholder, type ImageBoard, type ImageItem, type ImagePlan } from "@/projects/landing-images";
import type { Project } from "@/projects/types";
import { useSession } from "@/shell/workspace-shell";
import "./landing-images.css";
const labels = { idle: "생성 전", queued: "생성 대기", submitting: "요청 접수 중", pending: "이미지 생성 중", completed: "확인 대기", failed: "생성 실패", unknown: "접수 확인 필요" };
export function ImagePlanFields({ value, onChange, disabled = false, usingOriginal = false }: { value: ImagePlan; onChange: (value: ImagePlan) => void; disabled?: boolean; usingOriginal?: boolean }) {
  const [w, h] = IMAGE_SIZES[value.ratio];
  return <fieldset className="li-plan" disabled={disabled}><label><input type="checkbox" checked={value.enabled} onChange={e => onChange({ ...value, enabled: e.target.checked })} /> 이 섹션에 이미지 포함</label>{value.enabled && <><label>이미지 비율 <select aria-label="이미지 비율" value={value.ratio} onChange={e => onChange({ ...value, ratio: e.target.value as ImagePlan["ratio"] })}><option value="3:4">세로 · 3:4</option><option value="16:9">가로 · 16:9</option><option value="1:1">정사각 · 1:1</option></select></label><small>목표 영역 {w} × {h}px · {usingOriginal ? "업로드 원본을 이 영역에 배치해요." : "실제 생성 해상도는 모델에 따라 달라요."}</small><label>보여 줄 장면<Textarea aria-label="보여 줄 장면" value={value.description} maxLength={500} rows={2} required onChange={e => onChange({ ...value, description: e.target.value })} /></label></>}</fieldset>;
}
export function LandingImageBoard({ projectId, open, onClose, onApplied, autoRun = false, onActivityChange, onOpen }: { onOpen?: () => void; autoRun?: boolean; onActivityChange?: (active: boolean) => void; projectId: string; open: boolean; onClose: () => void; onApplied: (project: Project) => void | Promise<void> }) {
  const session = useSession(), refresh = useRef(session.refresh); refresh.current = session.refresh;
  const [board, setBoard] = useState<ImageBoard | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [paused, setPaused] = useState(false);
  const [useReferences, setUseReferences] = useState(false);
  const [edits, setEdits] = useState<Record<string, { prompt: string; model: string }>>({});
  const live = useRef(board), request = useRef(false); live.current = board;
  const accept = (next: ImageBoard) => setBoard(old => !old || next.revision >= old.revision ? next : old);
  useEffect(() => {
    if (!open && !autoRun) return;
    let gone = false; setError(""); setEdits({}); setPaused(false);
    api<ImageBoard>(`landing-images/${projectId}`).then(b => { if (!gone) { accept(b); setUseReferences(b.items.some(i => !!i.referenceImageIds?.length)); } }).catch(e => !gone && setError(e.message));
    return () => { gone = true; };
  }, [open, autoRun, projectId]);
  async function post(action: string, data: Record<string, unknown> = {}) {
    if (request.current) return;
    request.current = true; setBusy(true); setError("");
    try {
      const result = await api<ImageBoard>(`landing-images/${projectId}`, { method: "POST", body: JSON.stringify({ action, revision: live.current?.revision, ...data }) });
      accept(result); void refresh.current().catch(() => {});
      if (result.items.some(i => i.error && ["pending", "submitting", "unknown"].includes(i.state))) setPaused(true);
      return result;
    } catch (e) { setError((e as Error).message); setPaused(true); const latest = await api<ImageBoard>(`landing-images/${projectId}`).catch(() => null); if (latest) accept(latest); }
    finally { request.current = false; setBusy(false); }
  }
  useEffect(() => {
    if ((!open && !autoRun) || !board || !imageBusy(board) || busy || paused) return;
    const timer = setTimeout(() => void post("step"), board.items.some(i => i.state === "pending") ? 3000 : 300);
    return () => clearTimeout(timer);
  }, [open, autoRun, board, busy, paused]);
  useEffect(() => { onActivityChange?.(!!board && imageBusy(board) && !paused); return () => onActivityChange?.(false); }, [board, paused, onActivityChange]);
  async function generate(items: ImageItem[]) {
    setPaused(false);
    const next = await post("generate", { key: crypto.randomUUID(), useReferences, credits: items.reduce((sum, i) => sum + i.cost, 0), items: items.map(i => ({ slotId: i.slotId, prompt: edits[i.slotId]?.prompt ?? (useReferences && !i.referenceImageIds?.length ? productImagePrompt(i.title, i.plan.description) : i.prompt), model: edits[i.slotId]?.model ?? (useReferences ? PRODUCT_REFERENCE_MODEL : i.model) })) });
    if (next) setEdits({});
  }
  async function apply() {
    if (request.current) return;
    request.current = true; setBusy(true); setError("");
    try {
      const result = await api<{ board: ImageBoard; project: Project }>(`landing-images/${projectId}`, { method: "POST", body: JSON.stringify({ action: "apply", revision: live.current?.revision }) });
      accept(result.board); await onApplied(result.project); onClose();
    } catch (e) { setError((e as Error).message); }
    finally { request.current = false; setBusy(false); }
  }
  const active = !!board && imageBusy(board), uncertain = board?.items.some(i => i.state === "unknown"), locked = busy || active || !!uncertain;
  const missing = board?.items.filter(i => (useReferences || !i.candidate) && ["idle", "failed"].includes(i.state)) || [], ready = board?.items.filter(i => i.state === "completed" && i.candidate && !i.applied) || [];
  const change = (i: ImageItem, patch: Partial<{ prompt: string; model: string }>) => setEdits(e => ({ ...e, [i.slotId]: { ...(e[i.slotId] || { prompt: useReferences && !i.referenceImageIds?.length ? productImagePrompt(i.title, i.plan.description) : i.prompt, model: useReferences ? PRODUCT_REFERENCE_MODEL : i.model }), ...patch } }));
  return <>{autoRun && <div className="li-draft-action" role="status"><div><strong>상품 사진 기반 이미지 제작</strong><p>{board ? `검수할 후보 ${ready.length}장 · 생성 중 ${board.items.filter(i => ["queued", "submitting", "pending"].includes(i.state)).length}장 · 확인 필요 ${board.items.filter(i => ["failed", "unknown"].includes(i.state)).length}장` : "이미지 제작 목록을 불러오는 중입니다."}{paused ? " 진행을 멈췄어요. 이미지 제작에서 상태를 확인해 주세요." : ""}</p>{error && <p>{error}</p>}<small>화면을 닫으면 남은 작업은 다시 접속했을 때 이어집니다. 후보는 확인 후 적용합니다.</small></div><Button onClick={onOpen}>이미지 후보·진행 확인</Button></div>}<Dialog open={open} title="페이지 이미지 제작" width={1000} className="li-dialog" closeLabel="이미지 제작 닫기" onClose={onClose}>
    <div className="li-intro"><div><span className="ws-eyebrow">IMAGE CONTACT SHEET</span><h3>페이지에 들어갈 장면을 확인하세요.</h3><p>한 번에 생성하고, 필요한 장면만 다듬으세요. 확인한 뒤 페이지에 적용합니다.</p></div><strong className="li-count" role="status">{board?.items.filter(i => i.candidate).length || 0}<small> / {board?.items.length || 0}장 준비</small></strong></div>
    {!!board?.referenceImages?.length && <div className="li-auto-option"><label><input type="checkbox" checked={useReferences} disabled={locked || board.items.some(i => !!i.referenceImageIds?.length)} onChange={e => { setUseReferences(e.target.checked); setEdits({}); }} /><span><strong>업로드한 상품 사진을 참고해 생성</strong><small>상품의 색상·형태·로고는 유지하고 배경·조명·구도를 섹션에 맞춰요. 사진이 있는 섹션도 새 후보를 만들 수 있습니다.</small></span></label></div>}
    {error && <Alert>{error}</Alert>}
    {!board && !error && <p role="status">이미지 계획을 불러오고 있어요…</p>}
    {!board && error && <Button onClick={() => api<ImageBoard>(`landing-images/${projectId}`).then(accept).catch(e => setError(e.message))}>목록 다시 확인</Button>}
    {board && !board.items.length && <p>이미지가 계획된 섹션이 없어요. 페이지 구조에서 ‘이 섹션에 이미지 포함’을 선택해 주세요.</p>}
    <div className="li-grid">{board?.items.map((i, n) => {
      const [w, h] = IMAGE_SIZES[i.plan.ratio], working = ["queued", "submitting", "pending"].includes(i.state), edit = edits[i.slotId] || { ...i, model: useReferences ? PRODUCT_REFERENCE_MODEL : i.model, prompt: useReferences && !i.referenceImageIds?.length ? productImagePrompt(i.title, i.plan.description) : i.prompt };
      return <article className="li-tile" key={i.slotId} aria-busy={working}>
        <div className={`li-visual${working ? " is-generating" : ""}`} style={{ aspectRatio: i.plan.ratio.replace(":", "/") }}>
          <img src={i.candidate?.url || imagePlaceholder(i.plan)} alt={i.candidate ? i.plan.description : i.prompt} width={w} height={h} />
          {!i.candidate && <div className="li-placeholder"><span aria-hidden="true">▧</span><strong>{i.plan.description}</strong><small>{w} × {h}px · {i.plan.ratio}</small></div>}
          <span className="li-status" role="status">{i.applied && i.candidate ? "페이지에 적용됨" : labels[i.state]}</span>
        </div>
        <div className="li-details"><span className="ws-eyebrow">{String(n + 1).padStart(2, "0")} / {i.plan.ratio} · 목표 {w} × {h}</span><h4>{i.title}</h4><Field label="이미지 모델" htmlFor={`image-model-${i.slotId}`}><select id={`image-model-${i.slotId}`} disabled={locked} value={edit.model} onChange={e => change(i, { model: e.target.value })}>{imageModels(i.plan.ratio, useReferences || !!i.referenceImageIds?.length).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></Field><Field label="생성 프롬프트" htmlFor={`image-prompt-${i.slotId}`}><Textarea id={`image-prompt-${i.slotId}`} disabled={locked} rows={3} maxLength={3000} value={edit.prompt} onChange={e => change(i, { prompt: e.target.value })} /></Field><small className="ws-muted">프롬프트·모델을 바꾼 뒤 다시 생성하면 새 후보를 확인할 수 있어요.</small>{i.error && <p className="li-error" role="status">{i.error}</p>}<Button size="sm" disabled={locked || !edit.prompt.trim() || (session.user?.credits ?? 0) < i.cost} onClick={() => void generate([i])}>{i.candidate || i.jobId ? "다시 생성" : "이 이미지 생성"} · {i.cost} 크레딧</Button></div>
      </article>;
    })}</div>
    <footer className="li-footer"><div><p>현재 {session.user?.credits ?? 0} 크레딧 · 생성 실패 시 예약 크레딧 환불</p><small>닫아도 접수된 생성은 유지돼요. 남은 순서는 다시 열면 이어집니다.<br />실제 제품·인물의 모습, 문구와의 일치를 확인해 주세요.</small></div><div className="li-footer-actions">{(paused || uncertain) && <Button disabled={busy} onClick={() => { setPaused(false); void post("step"); }}>상태 다시 확인</Button>}<Button disabled={locked || !missing.length || missing.some(i => !(edits[i.slotId]?.prompt ?? i.prompt).trim()) || (session.user?.credits ?? 0) < missing.reduce((s, i) => s + i.cost, 0)} onClick={() => void generate(missing)}>{useReferences ? "섹션 이미지 일괄 생성" : "전체 빈 이미지 생성"} · {missing.reduce((s, i) => s + i.cost, 0)} 크레딧</Button><Button variant="primary" disabled={busy || active || !ready.length} onClick={() => void apply()}>확인하고 {ready.length}장 적용</Button></div></footer>
    {board && <details className="li-reset"><summary>페이지 구조가 바뀌었나요?</summary><p>생성 후보는 내 라이브러리에 남습니다. 목록을 현재 섹션 구성으로 갱신하면 미적용 후보 선택을 해제해요.</p><Button disabled={locked} onClick={async () => { const next = await post("reset"); if (next) setEdits({}); }}>현재 페이지 구성으로 목록 갱신</Button></details>}
  </Dialog></>;
}
