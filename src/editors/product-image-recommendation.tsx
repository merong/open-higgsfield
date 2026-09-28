"use client";
import { AgentThinking } from "./agent-thinking";
import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import type { ProductImage, ProductInfo } from "@/projects/product-detail";
import { PRODUCT_RECOMMENDATION_FIELDS, type ProductRecommendation, type ProductRecommendationField } from "@/projects/product-recommendation";
import "./product-gallery.css";

export function ProductImageRecommendation({ images, product, description, available, disabled, onBusyChange, onApply }: {
  images: ProductImage[]; product: ProductInfo; description: string; available: boolean; disabled: boolean;
  onBusyChange: (busy: boolean) => void; onApply: (result: ProductRecommendation, fields: ProductRecommendationField[]) => void;
}) {
  const [busy, setBusy] = useState(false), [result, setResult] = useState<ProductRecommendation | null>(null), [selected, setSelected] = useState<ProductRecommendationField[]>([]), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const request = useRef<AbortController | null>(null), running = useRef(false), mounted = useRef(true), latest = useRef({ product, description }); latest.current = { product, description };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); onBusyChange(false); }; }, [onBusyChange]);
  async function recommend() {
    if (busy || running.current || disabled || !images.length || !available) return;
    running.current = true; setBusy(true); onBusyChange(true); setError(""); setNotice(""); request.current = new AbortController();
    try {
      const next = await api<ProductRecommendation>("product-recommendation", { method: "POST", body: JSON.stringify({ referenceImageIds: images.map(image => image.id), name: product.name, category: product.category, description }), signal: AbortSignal.any([request.current.signal, AbortSignal.timeout(70000)]) });
      if (!mounted.current) return;
      setResult(next);
      // The user may have typed while the request was running. Protect the latest inputs.
      setSelected(PRODUCT_RECOMMENDATION_FIELDS.filter(f => !(f.key === "description" ? latest.current.description : latest.current.product[f.key]).trim()).map(f => f.key));
    } catch (e) { if (mounted.current) setError((e as Error).name === "TimeoutError" ? "분석 시간이 초과됐어요. 입력은 유지했습니다. 잠시 후 다시 시도해 주세요." : (e as Error).message); }
    finally { running.current = false; if (mounted.current) { setBusy(false); onBusyChange(false); } }
  }
  return <section className="pd-recommend" aria-label="이미지 기반 상품 내용 추천" aria-busy={busy}>
    <div className="pd-recommend-heading"><div><span className="ws-eyebrow">START WITH YOUR PHOTOS</span><h3>사진에서 상품 소개를 시작하세요.</h3></div><Button type="button" disabled={disabled || !available || !images.length} loading={busy} onClick={() => void recommend()}>이미지 기반으로 추천</Button></div>
    <p>{!images.length ? "왼쪽에 사진을 올리면 상품명·카테고리·설명을 제안해 드려요." : `${images.length}장의 사진과 입력한 메모를 함께 읽어요. 추천을 확인한 뒤 원하는 항목만 적용하세요.`}</p>
    <small>추천은 추가 크레딧 없이 이용해요. 가격·규격·정책은 직접 입력합니다.</small>
    {busy && <AgentThinking stage="recommend" />}
    {error && <Alert>{error}</Alert>}
    {notice && <p className="pd-recommend-notice" role="status">{notice}</p>}
    {result && <div className="pd-recommend-result"><strong>추천 내용 · 적용할 항목을 선택하세요</strong><small>기존 입력이 있는 항목은 기본 선택하지 않아요.</small>
      {PRODUCT_RECOMMENDATION_FIELDS.map(f => <label className="pd-recommend-choice" key={f.key}><input type="checkbox" aria-label={`추천 ${f.label} 적용`} disabled={busy || disabled} checked={selected.includes(f.key)} onChange={e => setSelected(old => e.target.checked ? [...old, f.key] : old.filter(k => k !== f.key))} /><span><b>{f.label}</b>{(f.key === "description" ? description : product[f.key]).trim() && <em>선택 시 현재 입력을 바꿔요</em>}<p>{result[f.key]}</p></span></label>)}
      <Button type="button" variant="primary" disabled={busy || disabled || !selected.length} onClick={() => { onApply(result, selected); setSelected([]); setNotice("선택한 추천을 상품 입력에 적용했어요. 내용을 확인하고 AI 제작을 시작하세요."); }}>선택한 {selected.length}개 항목 적용</Button>
      <details className="pd-recommend-evidence"><summary>사진에서 확인한 내용과 추가 확인 사항</summary>{!!result.observations.length && <><h4>사진에서 확인했어요</h4><ul>{result.observations.map((v, i) => <li key={i}>{v}</li>)}</ul></>}{!!result.uncertainties.length && <><h4>직접 확인해 주세요</h4><ul>{result.uncertainties.map((v, i) => <li key={i}>{v}</li>)}</ul></>}</details>
    </div>}
    {!available && <small>관리자가 OpenAI를 연결하면 이미지 추천을 사용할 수 있어요.</small>}
  </section>;
}
