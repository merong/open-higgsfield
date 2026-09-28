"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, Field, Input, Segment } from "@openhiggsfield/design";
import { CARD_TEMPLATES, cardTemplatePreview, createCardTemplateProject, type CardTemplate } from "@/projects/card-templates";
import { api } from "@/projects/api";
import type { Project } from "@/projects/types";
import { ProjectSlide } from "./project-slide";

export function CardTemplateGallery() {
  const [selected, setSelected] = useState<CardTemplate | null>(null);
  const [collection, setCollection] = useState("all");
  const [slide, setSlide] = useState(0), [name, setName] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const submitting = useRef(false), router = useRouter();
  const preview = selected ? cardTemplatePreview(selected) : null;
  const newsCount = CARD_TEMPLATES.filter(t => t.news).length;
  const visible = CARD_TEMPLATES.filter(t => collection === "all" || (collection === "ai" ? !!t.news : !t.news));
  function choose(template: CardTemplate) {
    setSelected(template); setSlide(0); setName(template.name); setError("");
  }
  async function start() {
    if (!selected || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      const draft = createCardTemplateProject(selected.id, name);
      const saved = await api<Project>("projects", { method: "POST", body: JSON.stringify(draft) });
      router.push(`/projects/${saved.id}`);
    } catch (e) {
      setError((e as Error).message); submitting.current = false; setBusy(false);
    }
  }
  return <section className="ws-templates" aria-labelledby="card-template-heading">
    <div className="ws-template-heading"><div><h2 id="card-template-heading">이야기의 시작을 골라 보세요.</h2><p>이미지와 문구가 준비된 {CARD_TEMPLATES.length}가지 구성. 모든 장을 자유롭게 편집할 수 있어요.</p></div><span className="ws-template-note">4:5 · 무료로 시작</span></div>
    <div className="ws-template-filters"><Segment aria-label="템플릿 분류" value={collection} onChange={setCollection} items={[{id:"all",label:`전체 ${CARD_TEMPLATES.length}`},{id:"brand",label:`브랜드·라이프 ${CARD_TEMPLATES.length - newsCount}`},{id:"ai",label:`AI 트렌드 ${newsCount}`}]} plate /></div>
    <div className="ws-template-grid">{visible.map(template => {
      const project = cardTemplatePreview(template);
      return <button key={template.id} type="button" className="ws-template-card" onClick={() => choose(template)} aria-label={`${template.name} 템플릿 미리보기`}>
        <span className="ws-template-cover" aria-hidden="true"><ProjectSlide project={project} slot={project.slots[0]} /></span>
        <span className="ws-template-meta"><span>{template.category}</span><span>{template.slides.length}장</span></span>
        <strong>{template.name}</strong><span className="ws-template-description">{template.description}</span><span className="ws-template-link">구성 살펴보기 ↗</span>
      </button>;
    })}</div>
    <Dialog open={!!selected} title={selected?.name ?? "카드뉴스 템플릿"} closeLabel="미리보기 닫기" width={880} className="ws-template-dialog" onClose={() => { if (!busy) setSelected(null); }}>
      {preview && selected && <div className="ws-template-detail">
        <div><div className="ws-template-stage"><ProjectSlide project={preview} slot={preview.slots[slide]} index={slide}/></div>
          <div className="ws-template-pages" aria-label="템플릿 슬라이드">{preview.slots.map((slot, index) => <button type="button" key={slot.id} aria-label={`${index + 1}장: ${slot.title.replaceAll("\n", " ")}`} aria-pressed={slide === index} onClick={() => setSlide(index)}><span aria-hidden="true"><ProjectSlide project={preview} slot={slot} index={index}/></span><small>{index + 1}</small></button>)}</div>
        </div>
        <div className="ws-template-info"><span className="ws-eyebrow">{selected.category} · {selected.slides.length}장 · 4:5</span><h3>{selected.name}</h3><p>{selected.description}</p>
          <ol className="ws-template-outline">{preview.slots.map((slot, index) => <li key={slot.id}><button type="button" aria-current={slide === index ? "step" : undefined} onClick={() => setSlide(index)}><span>{String(index + 1).padStart(2, "0")}</span>{slot.title.replaceAll("\n", " ")}</button></li>)}</ol>
          {selected.news && <details className="ws-template-sources"><summary>{selected.news.verifiedAt} 기준 · 공식 출처 {selected.news.sources.length}개</summary><ul>{selected.news.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ul><p>작성 당시의 뉴스 예시이며 자동 갱신되지 않습니다. 게시 전 원문을 확인하세요. 출처 링크는 프로젝트 캡션에도 저장됩니다.</p></details>}
          <Field label="프로젝트 이름" htmlFor="template-project-name"><Input id="template-project-name" value={name} maxLength={120} disabled={busy} onChange={e => setName(e.target.value)}/></Field>
          <p className="ws-muted">예시 이미지와 문구를 내 프로젝트로 복사합니다. {selected.news ? "뉴스 내용과 기준일은 게시 전에 확인해 주세요." : "브랜드명·행사 정보는 게시 전에 수정해 주세요."} 템플릿 복사에는 크레딧을 사용하지 않습니다.</p>
          {error && <Alert>{error}</Alert>}
          <Button type="button" variant="primary" size="lg" loading={busy} disabled={busy || !name.trim()} onClick={() => void start()}>이 템플릿으로 시작</Button>
        </div>
      </div>}
    </Dialog>
  </section>;
}
