"use client";
import { AgentThinking } from "./agent-thinking";
import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import type { ProductImage } from "@/projects/product-detail";
import { reelRecommendedPrompt, type ReelRecommendation } from "@/projects/reel-recommendation";
export function ReelImageRecommendation({ images, idea, duration, narration, available, disabled, onBusyChange, onApply }: { images: ProductImage[]; idea: string; duration: number; narration: boolean; available: boolean; disabled: boolean; onBusyChange: (v: boolean) => void; onApply: (value: string) => void }) {
  const [busy, setBusy] = useState(false), [result, setResult] = useState<ReelRecommendation | null>(null), [error, setError] = useState(""), [applied, setApplied] = useState(false);
  const request = useRef<AbortController | null>(null), mounted = useRef(true), working = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); onBusyChange(false); }; }, [onBusyChange]);
  async function recommend() {
    if (disabled || working.current || !images.length || !available) return;
    working.current = true; setBusy(true); onBusyChange(true); setError(""); setApplied(false); request.current = new AbortController();
    try { const next = await api<ReelRecommendation>("reel-recommendation", { method: "POST", body: JSON.stringify({ referenceImageIds: images.map(image => image.id), idea, duration, narration }), signal: AbortSignal.any([request.current.signal, AbortSignal.timeout(70000)]) }); if (mounted.current) setResult(next); }
    catch (e) { if (mounted.current) setError((e as Error).name === "TimeoutError" ? "분석 시간이 초과됐어요. 입력은 유지했습니다. 잠시 후 다시 시도해 주세요." : (e as Error).message); }
    finally { working.current = false; if (mounted.current) { setBusy(false); onBusyChange(false); } }
  }
  return <section className="rf-image-recommend" aria-label="이미지 기반 릴스 프롬프트 추천" aria-busy={busy}>
    <span className="ws-eyebrow">PHOTOS INTO A STORY</span><h3>사진에서 영상의 방향을 찾아요.</h3><p>{images.length ? `${images.length}장의 사진과 입력한 조건을 읽고 프롬프트와 컷 흐름을 추천해요.` : "왼쪽에 사진을 올려 보세요. 한 장만 있어도 시작할 수 있어요."}</p>
    <Button type="button" loading={busy} disabled={disabled || !available || !images.length} onClick={() => void recommend()}>이미지 기반 프롬프트 추천</Button><small>추천은 추가 앱 크레딧 없이 이용합니다.</small>
    {busy && <AgentThinking stage="recommend" />}{error && <Alert>{error}</Alert>}
    {result && <div className="rf-recommend-result"><strong>이런 이야기로 만들어 볼까요?</strong><p>{result.idea}</p><ol>{result.shots.map((shot, i) => { const image = images.find(image => image.id === shot.sourceImageId)!; return <li key={i}><img src={image.url} alt={`${i + 1}번 컷 원본: ${image.name}`} /><div><strong>{String(i + 1).padStart(2, "0")} · {shot.title}</strong><p>{shot.motion}</p></div></li>; })}</ol>
      <small>{idea.trim() ? "적용하면 현재 프롬프트를 아래 추천으로 바꿉니다." : "추천을 적용한 뒤 프롬프트를 자유롭게 다듬을 수 있어요."}</small><Button type="button" variant="primary" disabled={disabled || busy || applied} onClick={() => { onApply(reelRecommendedPrompt(result, images)); setApplied(true); }}>추천 프롬프트 적용</Button>{applied && <p role="status">프롬프트에 적용했어요. 아래에서 컷 만들기를 시작하세요.</p>}
      <details><summary>사진에서 확인한 내용과 추가 확인 사항</summary><ul>{result.observations.map((v, i) => <li key={i}>{v}</li>)}</ul><ul>{result.uncertainties.map((v, i) => <li key={i}>{v}</li>)}</ul></details>
    </div>}
  </section>;
}
