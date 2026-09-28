"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Alert, Button } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_LIMIT, type ProductImage } from "@/projects/product-detail";
import "./product-detail.css";
import "./product-gallery.css";

export function ProductImageStrip({ images, label = "상품 사진" }: { images: ProductImage[]; label?: string }) {
  if (!images.length) return null;
  return <div className="pd-photo-strip" aria-label={`분석에 사용한 ${label}`}>{images.map((image, i) => <figure key={image.id}><img src={image.url} alt={`${i === 0 ? "대표" : "보조"} ${label}: ${image.name}`} /><figcaption><strong>{i === 0 ? "대표 사진" : `보조 사진 ${i}`}</strong><span title={image.name}>{image.name}</span><small>{image.width} × {image.height}px</small></figcaption></figure>)}</div>;
}

export function ProductImageUpload({ images, onChange, disabled, onBusyChange, purpose = "product" }: { purpose?: "product" | "reel" | "landing"; images: ProductImage[]; onChange: (images: ProductImage[]) => void; disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const label = purpose === "reel" ? "릴스 원본 사진" : purpose === "landing" ? "참고 이미지" : "상품 사진";
  const input = useRef<HTMLInputElement>(null), working = useRef(false), controller = useRef<AbortController | null>(null), mounted = useRef(true);
  const [selectedId, setSelectedId] = useState(""), dragDepth = useRef(0);
  const id = useId(), [dragging, setDragging] = useState(false), [progress, setProgress] = useState(""), [error, setError] = useState("");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  const locked = disabled || !!progress;
  const selected = images.find(image => image.id === selectedId) || images[0];
  const selectedIndex = selected ? images.findIndex(image => image.id === selected.id) : -1;
  function remove(id: string) {
    const index = images.findIndex(image => image.id === id);
    if (selected?.id === id) setSelectedId((images[index + 1] || images[index - 1])?.id || "");
    onChange(images.filter(image => image.id !== id));
  }
  async function upload(files: File[]) {
    if (!files.length || disabled || working.current) return;
    setError("");
    if (images.length + files.length > PRODUCT_IMAGE_LIMIT) { setError("최대 6장입니다. 선택한 이미지를 줄여 주세요."); return; }
    working.current = true; onBusyChange(true); controller.current = new AbortController();
    const next = [...images], errors: string[] = [];
    try {
      for (const [i, file] of files.entries()) {
        setProgress(`${i + 1}/${files.length} · ${file.name} 업로드·확인 중`);
        try {
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("JPG·PNG·WebP 사진을 선택해 주세요.");
          if (!file.size || file.size > PRODUCT_IMAGE_BYTES) throw new Error("빈 파일을 제외하고 한 장에 10MB 이내로 선택해 주세요.");
          const form = new FormData(); form.set("file", file);
          const result = await api<ProductImage>(`${purpose}-images`, { method: "POST", body: form, signal: AbortSignal.any([controller.current.signal, AbortSignal.timeout(60000)]) });
          if (!mounted.current) return;
          next.push(result); onChange([...next]); setSelectedId(current => current || result.id);
        } catch (e) {
          if (!mounted.current) return;
          errors.push(`${file.name}: ${(e as Error).name === "TimeoutError" ? "파일 확인 시간이 초과됐어요. 내 라이브러리를 확인한 뒤 다시 선택해 주세요." : (e as Error).message}`);
        }
      }
      setError(errors.join("\n"));
    } finally {
      working.current = false;
      if (mounted.current) { setProgress(""); onBusyChange(false); }
    }
  }
  return <section className="pd-upload pd-gallery" aria-labelledby={`${id}-title`} aria-busy={!!progress}>
    <div className="pd-upload-heading"><div><h3 id={`${id}-title`}>{label}</h3><p>{purpose === "reel" ? "한 장의 사진도, 여러 장의 이야기로도 시작해요." : purpose === "landing" ? "브랜드·공간·제품 등 페이지에 담을 이미지를 올려 주세요." : "여러 장을 올려 상품의 디테일까지 보여 주세요."}</p></div><small>{images.length} / {PRODUCT_IMAGE_LIMIT}</small></div>
    <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={locked} onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ""; void upload(files); }} />
    <div className={`pd-gallery-stage${dragging ? " is-dragging" : ""}`} aria-label={`${label} 드래그 앤 드롭 영역`}
      onDragEnter={e => { e.preventDefault(); if (!locked) { dragDepth.current++; setDragging(true); } }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = locked ? "none" : "copy"; }}
      onDragLeave={e => { e.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
      onDrop={e => { e.preventDefault(); dragDepth.current = 0; setDragging(false); if (!locked) void upload(Array.from(e.dataTransfer.files)); }}>
      {selected ? <>
        <img className="pd-gallery-image" src={selected.url} alt={`선택한 ${label}: ${selected.name}`} draggable={false} />
        <span className="pd-gallery-counter">{String(selectedIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}{selectedIndex === 0 && " · 대표"}</span>
        <button className="pd-photo-remove" type="button" disabled={locked} aria-label={`${selected.name} 업로드 목록에서 제거`} title="업로드 목록에서 제거" onClick={() => remove(selected.id)}>×</button>
        <span className="pd-gallery-drop-hint">이 위에 사진을 놓아 추가하세요</span>
      </> : <div className="pd-gallery-empty"><span aria-hidden="true">↑</span><strong>{label}{purpose === "landing" ? "를" : "을"} 여기에 놓아 주세요</strong><p>여러 장을 한 번에 올릴 수 있어요.</p><Button type="button" disabled={locked} onClick={() => input.current?.click()}>사진 선택</Button><small>JPG · PNG · WebP / 한 장 10MB 이내</small></div>}
      {dragging && <div className="pd-gallery-drag-overlay" aria-hidden="true"><strong>놓으면 사진이 추가돼요</strong></div>}
    </div>
    {progress && <div className="pd-upload-progress" role="status"><span className="pd-upload-spinner" />{progress}</div>}
    {!!images.length && <>
      <div className="pd-gallery-thumbs" aria-label={`업로드한 ${label} 썸네일`}>{images.map((image, i) => <div className="pd-gallery-thumb" key={image.id}>
        <button className="pd-thumb-select" type="button" aria-label={`${i + 1}번 사진 보기: ${image.name}`} aria-pressed={image.id === selected?.id} onClick={() => setSelectedId(image.id)}><img src={image.url} alt="" draggable={false} /><span>{i === 0 ? "대표" : String(i + 1).padStart(2, "0")}</span></button>
        <button className="pd-thumb-remove" type="button" disabled={locked} aria-label={`${i + 1}번 사진 제거: ${image.name}`} onClick={() => remove(image.id)}>×</button>
      </div>)}<button className="pd-thumb-add" type="button" disabled={locked || images.length >= PRODUCT_IMAGE_LIMIT} aria-label={`${label} 추가`} onClick={() => input.current?.click()}><span aria-hidden="true">＋</span><small>사진 추가</small></button></div>
      {selected && <div className="pd-gallery-caption"><div><strong title={selected.name}>{selected.name}</strong><small>{selected.width} × {selected.height}px</small></div><Button type="button" size="sm" disabled={locked || selectedIndex === 0} onClick={() => onChange([selected, ...images.filter(image => image.id !== selected.id)])}>{selectedIndex === 0 ? "대표 사진" : "대표로 지정"}</Button></div>}
    </>}
    {error && <Alert><span className="pd-upload-error">{error}</span></Alert>}
    <small className="pd-gallery-note">X를 누르면 이번 제작에서 제외돼요. 라이브러리 원본은 유지됩니다.</small>
  </section>;
}
