"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Alert, Button } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import type { Project } from "@/projects/types";
import { FONT_CATALOG, TYPOGRAPHY_PRESETS, fontById, fontWeights, displayOnly, defaultTypography, typographyPreset, typographyStyle, typographyCoverage, projectTypographyTexts, roleLabels, type Typography, type TypographyRecommendation, type FontRole } from "@/projects/typography";
import { loadTypography } from "@/render/typography-fonts";
import { AgentThinking } from "./agent-thinking";
import "./typography.css";

export function TypographyFonts({value}:{value?:Typography}) {
  useEffect(()=>{if(value)void loadTypography(value).catch(()=>{});},[JSON.stringify(value)]);
  return null;
}
const recommendationContext=(p:Project)=>JSON.stringify({format:p.format,title:p.title,brief:p.brief,product:p.product,slots:p.slots.map(s=>({kind:s.kind,title:s.title,body:s.body,kicker:s.kicker}))});
function Specimen({value,title,body,small=false}:{value:Typography;title:string;body:string;small?:boolean}) {
  const [state,setState]=useState("loading");
  useEffect(()=>{let active=true;setState("loading");void loadTypography(value).then(()=>{if(active)setState("ready");}).catch(()=>{if(active)setState("error");});return()=>{active=false;};},[JSON.stringify(value)]);
  return <div className={`ty-specimen${small?" ty-specimen--small":""}`} style={typographyStyle(value) as CSSProperties} aria-busy={state==="loading"}>
    <span className="ty-specimen-heading">{title}</span><p>{body}</p><span className="ty-specimen-numerals">Aa · 0123 · ₩29,900</span>
    {state!=="ready"&&<small role="status">{state==="error"?"글꼴을 불러오지 못했어요. 다시 선택해 주세요.":"선택한 글꼴을 불러오는 중…"}</small>}
  </div>;
}
export function TypographyPanel({project,recommendations=[],disabled=false,onApply,beforeRecommend}:{project:Project;recommendations?:TypographyRecommendation[];disabled?:boolean;onApply:(value:Typography)=>void|Promise<void>;beforeRecommend?:()=>Promise<Project>}) {
  const id=useId(), [draft,setDraft]=useState<Typography>(project.typography||defaultTypography(project)), [busy,setBusy]=useState(false),[error,setError]=useState(""),[suggestions,setSuggestions]=useState(recommendations),[localContext,setLocalContext]=useState<string|null>(null);
  const [activity,setActivity]=useState("typography");
  const alive=useRef(true),request=useRef<AbortController|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current?.abort();};},[]);
  useEffect(()=>{setDraft(project.typography||defaultTypography(project));},[JSON.stringify(project.typography)]);
  useEffect(()=>{setSuggestions(recommendations);setLocalContext(null);},[JSON.stringify(recommendations)]);
  const title=(project.format==="product-detail"?project.product?.name:undefined)||project.slots[0]?.title||project.brief.topic, body=project.slots[0]?.body||project.brief.mustInclude||"전하고 싶은 내용을 편안하게 읽을 수 있도록 제목과 본문의 역할을 나눠요.";
  const stale=localContext!==null&&localContext!==recommendationContext(project);
  const applied=!!project.typography?.confirmed&&JSON.stringify(draft)===JSON.stringify(project.typography);
  const options=suggestions.length&&!stale?suggestions:TYPOGRAPHY_PRESETS.slice(0,3).map(p=>({presetId:p.id,reason:p.description,caution:""}));
  const samples=projectTypographyTexts(project).map(sample=>({role:sample.role,...typographyCoverage(draft,sample.role,sample.value)}));
  const missing=[...new Set(samples.flatMap(s=>s.missing))],substituted=[...new Set(samples.flatMap(s=>s.substituted))];
  function select(role:FontRole,font:string) {const weights=fontWeights(font),preferred=role==="title"?700:role==="body"?400:600;setDraft(t=>({...t,preset:"custom",confirmed:true,[role]:{font,weight:weights.includes(preferred)?preferred:weights[0]}}));}
  async function recommend() {if(busy||disabled)return;setActivity("typography");setBusy(true);setError("");request.current=new AbortController();try{const saved=beforeRecommend?await beforeRecommend():project;const result=await api<{projectVersion:number;recommendations:TypographyRecommendation[]}>("typography-recommendation",{method:"POST",body:JSON.stringify({projectId:saved.id,version:saved.version}),signal:AbortSignal.any([request.current.signal,AbortSignal.timeout(60000)])});if(alive.current){setSuggestions(result.recommendations);setLocalContext(recommendationContext(saved));}}catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setBusy(false);}}
  async function apply(){if(busy||disabled||missing.length)return;setActivity("save");setBusy(true);setError("");try{await loadTypography(draft);await onApply({...draft,confirmed:true});}catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setBusy(false);}}
  return <section className="ty-panel" aria-label="글꼴 선택과 미리보기">
    <div className="ty-heading"><div><span className="ws-eyebrow">TYPE & MESSAGE</span><h3>글꼴로 메시지의 표정을 정해요.</h3><p>제목은 선명하게, 본문은 읽기 편하게. 같은 문구로 비교해 보세요.</p></div><Button type="button" disabled={disabled||busy} loading={busy} onClick={()=>void recommend()}>AI 글꼴 추천</Button></div>
    {error&&<Alert>{error}</Alert>}{busy&&<AgentThinking stage={activity} detail="현재 선택과 원고는 유지됩니다."/>}
    <div className="ty-options" aria-label={suggestions.length&&!stale?"AI 추천 조합":"글꼴 기본 조합"}>{options.map((option,i)=>{const preset=TYPOGRAPHY_PRESETS.find(p=>p.id===option.presetId)!;return <button type="button" key={preset.id} disabled={disabled||busy} className="ty-option" aria-pressed={draft.preset===preset.id} onClick={()=>{setDraft(typographyPreset(preset.id,true));}}><span className="ty-option-name">{suggestions.length&&!stale?`AI 추천 ${i+1} · `:""}{preset.name}</span><Specimen value={typographyPreset(preset.id)} title={title} body={body} small/><span className="ty-reason">{option.reason}</span>{option.caution&&<span className="ty-caution">확인 · {option.caution}</span>}</button>;})}</div>
    {stale&&<p role="status">내용이 바뀌어 이전 추천을 접었어요. 현재 내용으로 다시 추천받을 수 있습니다.</p>}
    <label className="ty-preset-label" htmlFor={`${id}-preset`}>기본 조합 전체 보기</label><select className="ty-preset-select" id={`${id}-preset`} value={draft.preset} disabled={disabled||busy} onChange={e=>{setDraft(typographyPreset(e.target.value,true));}}>{draft.preset==="custom"&&<option value="custom">직접 고른 조합</option>}{TYPOGRAPHY_PRESETS.map(p=><option key={p.id} value={p.id}>{p.name} · {p.description}</option>)}</select><details className="ty-custom"><summary>역할별 글꼴과 굵기 직접 고르기 · 한글 10종 / 영문 10종</summary><div className="ty-fields">{(["title","body","accent"] as const).map(role=><div key={role}><label htmlFor={`${id}-${role}`}>{roleLabels[role]}</label><select id={`${id}-${role}`} value={draft[role].font} disabled={disabled||busy} onChange={e=>select(role,e.target.value)}>{FONT_CATALOG.filter(f=>f.language===(role==="accent"?"en":"ko")&&(role!=="body"||!displayOnly(f.id))).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><label className="ty-weight-label" htmlFor={`${id}-${role}-weight`}>굵기</label><select id={`${id}-${role}-weight`} value={draft[role].weight} disabled={disabled||busy||fontWeights(draft[role].font).length===1} onChange={e=>{setDraft(t=>({...t,preset:"custom",[role]:{...t[role],weight:Number(e.target.value)}}));}}>{fontWeights(draft[role].font).map(w=><option key={w} value={w}>{w}{fontWeights(draft[role].font).length===1?" · 단일 굵기":""}</option>)}</select></div>)}</div></details>
    <div className="ty-selected"><div className="ty-selected-label"><strong>선택한 조합 미리보기</strong><span>{fontById(draft.title.font).name} / {fontById(draft.body.font).name} / {fontById(draft.accent.font).name}</span></div><Specimen value={draft} title={title} body={body}/></div>
    {substituted.length>0&&<p className="ty-caution">제목 글꼴에 없는 한글 {substituted.slice(0,12).join(" ")}은 본문·기본 글꼴로 보완합니다.</p>}
    {missing.length>0&&<Alert>지원하지 않는 문자: {missing.slice(0,12).join(" ")}. 출력 전에 기호를 확인해 주세요.</Alert>}
    <div className="ty-footer"><Button type="button" variant="primary" disabled={disabled||busy||!!missing.length||applied} onClick={()=>void apply()}>{applied?"글꼴 적용됨":"이 글꼴 적용"}</Button><small>글꼴 추천에는 추가 앱 크레딧을 차감하지 않아요.<br/>선택한 글꼴은 적용 버튼을 누르면 저장돼요. 문구를 줄이지 않습니다.<br/>{project.format==="card-news"?"카드 출력 전 새 줄바꿈·영역 넘침·360px 가독성을 다시 확인해요.":"페이지의 모바일 미리보기에서 줄바꿈과 읽기 크기를 확인해 주세요."}</small></div>
    <details className="ty-licenses"><summary>폰트 출처와 라이선스</summary><p>공식 배포 파일의 버전과 해시를 고정해 사용합니다. HTML ZIP에는 사용하는 폰트와 원문 라이선스가 함께 포함됩니다.</p>{[...new Set([draft.title.font,draft.body.font,draft.accent.font])].map(id=>{const f=fontById(id);return <p key={id}>{f.name} · <a href={f.source} target="_blank" rel="noreferrer">공식 배포처 ↗</a> · <a href={f.licensePath} target="_blank" rel="noreferrer">OFL 원문 ↗</a></p>;})}</details>
  </section>;
}
