"use client";
import { AgentThinking } from "./agent-thinking";
import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import type { ProductImage } from "@/projects/product-detail";
import { landingRecommendedPrompt, type LandingRecommendation } from "@/projects/landing-recommendation";

export function LandingImageRecommendation({ images, idea, available, disabled, onBusyChange, onApply }: { images: ProductImage[]; idea: string; available: boolean; disabled: boolean; onBusyChange: (busy: boolean) => void; onApply: (value: string) => void }) {
  const [busy, setBusy] = useState(false), [result, setResult] = useState<LandingRecommendation | null>(null), [error, setError] = useState(""), [applied, setApplied] = useState(false), [basedOn, setBasedOn] = useState("");
  const request = useRef<AbortController | null>(null), mounted = useRef(true), working = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); onBusyChange(false); }; }, [onBusyChange]);
  const stale = !!result && !applied && idea !== basedOn;
  async function recommend() {
    if (disabled || working.current || !images.length || !available) return;
    working.current = true; setBusy(true); onBusyChange(true); setError(""); setApplied(false); setResult(null); setBasedOn(idea); request.current = new AbortController();
    try {
      const next = await api<LandingRecommendation>("landing-recommendation", { method: "POST", body: JSON.stringify({ referenceImageIds: images.map(image => image.id), idea }), signal: AbortSignal.any([request.current.signal, AbortSignal.timeout(70000)]) });
      if (mounted.current) setResult(next);
    } catch (e) { if (mounted.current) setError((e as Error).name === "TimeoutError" ? "분석 시간이 초과됐어요. 입력은 유지했습니다. 다시 시도해 주세요." : (e as Error).message); }
    finally { working.current = false; if (mounted.current) { setBusy(false); onBusyChange(false); } }
  }
  return <section className="lf-image-recommend" aria-label="이미지 기반 랜딩 프롬프트 추천" aria-busy={busy}>
    <div><span className="ws-eyebrow">IMAGES INTO A PAGE</span><h3>이미지를 읽고, 페이지를 제안해요.</h3></div>
    <p>{images.length ? `${images.length}장의 이미지와 메모를 함께 읽고 방문자·분위기·섹션별 활용을 추천해요.` : "이미지를 올리면 소개할 내용과 페이지의 방향을 함께 찾아드려요."}</p>
    <Button type="button" loading={busy} disabled={disabled || !available || !images.length} onClick={() => void recommend()}>이미지 기반 프롬프트 추천</Button>
    <small>추천은 추가 앱 크레딧 없이 이용합니다. 적용 전까지 입력은 바뀌지 않아요.</small>
    {busy && <AgentThinking stage="recommend" />}
    {error && <Alert>{error}</Alert>}
    {result && <div className="lf-recommend-result">
      <strong>이런 페이지로 시작해 볼까요?</strong><p>{result.idea}</p>
      <ol aria-label="참고 이미지 활용 제안">{result.sections.map(section => { const image = images.find(image => image.id === section.sourceImageId); return image && <li key={section.sourceImageId}><img src={image.url} alt={`활용할 원본: ${image.name}`} /><div><strong>{section.title}</strong><p>{section.purpose}</p></div></li>; })}</ol>
      {stale ? <p role="status">메모가 바뀌었어요. 최신 조건으로 다시 추천받아 주세요.</p> : <small>{idea.trim() && !applied ? "적용하면 현재 메모를 이 추천 프롬프트로 바꿉니다." : "프롬프트를 적용한 뒤 원하는 내용을 더해 보세요."}</small>}
      <Button type="button" variant="primary" disabled={disabled || busy || applied || stale} onClick={() => { onApply(landingRecommendedPrompt(result, images)); setApplied(true); }}>추천 프롬프트 적용 →</Button>
      {applied && <p role="status">페이지 소개에 적용했어요. 내용을 확인하고 페이지 기획을 시작하세요.</p>}
      <details><summary>이미지에서 확인한 내용과 추가 확인 사항</summary><h4>이미지에서 확인했어요</h4><ul>{result.observations.map((v, i) => <li key={i}>{v}</li>)}</ul><h4>직접 확인해 주세요</h4>{result.uncertainties.length ? <ul>{result.uncertainties.map((v, i) => <li key={i}>{v}</li>)}</ul> : <p>추가 확인 사항이 없습니다.</p>}</details>
    </div>}
  </section>;
}
