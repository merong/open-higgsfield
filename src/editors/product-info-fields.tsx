"use client";
import { useId } from "react";
import { Field, Input, Textarea } from "@openhiggsfield/design";
import { PRODUCT_FIELDS, type ProductInfo } from "@/projects/product-detail";
import "./product-detail.css";

export function ProductInfoFields({ value, onChange, disabled = false, compact = false, fields }: { value: ProductInfo; onChange: (value: ProductInfo) => void; disabled?: boolean; compact?: boolean; fields?: (keyof ProductInfo)[] }) {
  const prefix = useId();
  const render = (f: typeof PRODUCT_FIELDS[number]) => <Field key={f.key} label={f.label} htmlFor={`${prefix}-${f.key}`} required={f.key === "name" ? "필수" : undefined}>
    {f.max <= 120 ? <Input id={`${prefix}-${f.key}`} required={f.key === "name"} maxLength={f.max} placeholder={f.hint} value={value[f.key]} onChange={e => onChange({ ...value, [f.key]: e.target.value })} /> : <Textarea id={`${prefix}-${f.key}`} maxLength={f.max} rows={f.key === "specs" ? 4 : 3} placeholder={f.hint} value={value[f.key]} onChange={e => onChange({ ...value, [f.key]: e.target.value })} />}
  </Field>;
  if (fields) return <fieldset className="pd-fields" disabled={disabled}>{PRODUCT_FIELDS.filter(f => fields.includes(f.key)).map(render)}</fieldset>;
  return <fieldset className="pd-fields" disabled={disabled}><div className="pd-field-grid">{PRODUCT_FIELDS.slice(0, 3).map(render)}</div>{compact ? <details className="lf-options"><summary>옵션·규격·사용법·배송 정보</summary><div className="pd-field-grid">{PRODUCT_FIELDS.slice(3).map(render)}</div></details> : <div className="pd-field-grid">{PRODUCT_FIELDS.slice(3).map(render)}</div>}<small className="ws-muted">확인된 상품 정보만 입력해 주세요. 빈 가격·정책은 임의로 채우지 않습니다.</small></fieldset>;
}
