"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Field, Input, StatusBadge } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import type { OpenAiModelOption, ReasoningEffort } from "@/service/openai-models";

type Settings = {configured:boolean;source:string;model:string;effort:ReasoningEffort|null;updatedAt:number|null};
type Catalog = {models:OpenAiModelOption[]};
const effortLabels: Record<ReasoningEffort,string> = {none:"사용 안 함 · none",minimal:"최소 · minimal",low:"낮음 · low",medium:"보통 · medium",high:"높음 · high",xhigh:"매우 높음 · xhigh",max:"최대 · max"};
export function OpenAiSettings() {
  const [settings,setSettings]=useState<Settings|null>(null),[apiKey,setKey]=useState("");
  const [models,setModels]=useState<OpenAiModelOption[]>([]),[model,setModel]=useState(""),[effort,setEffort]=useState<ReasoningEffort|null>(null);
  const [busy,setBusy]=useState("load"),[error,setError]=useState(""),[notice,setNotice]=useState("");
  function acceptSettings(value: Settings) { setSettings(value);setModel(value.model);setEffort(value.effort); }
  useEffect(()=>{
    let active=true;
    async function load() {
      try {
        const value=await api<Settings>("settings/openai");
        if(!active)return;
        acceptSettings(value);
        if(value.source!=="none") {
          const catalog=await api<Catalog>("settings/openai/models");
          if(active)setModels(catalog.models);
        }
      } catch(e){if(active)setError((e as Error).message);}finally{if(active)setBusy("");}
    }
    void load();return()=>{active=false;};
  },[]);
  const selected=models.find(m=>m.id===model),available=models.filter(m=>m.supported),other=models.filter(m=>!m.supported);
  const configured=!!settings && settings.source!=="none";
  const dirty=!!settings && (settings.model!==model || settings.effort!==effort);
  async function run(action: "key"|"model"|"refresh"|"check"|"remove", event?: FormEvent) {
    event?.preventDefault();setBusy(action);setError("");setNotice("");
    try {
      if(action === "refresh") {
        setModels([]);
        const result=await api<Catalog>("settings/openai/models");setModels(result.models);
        setNotice(`모델 ${result.models.length}개를 조회했습니다. 카드뉴스 호환 모델을 선택해 주세요.`);
      } else if(action === "check") {
        const result = await api<{state:string;message:string}>("settings/openai/check",{method:"POST"});
        if(result.state === "error") setError(result.message); else setNotice(result.message);
      } else if(action === "remove") {
        const result=await api<Settings>("settings/openai",{method:"DELETE"});
        acceptSettings(result);setKey("");setModels([]);
        if(result.source!=="none")setModels((await api<Catalog>("settings/openai/models")).models);
        setNotice("등록한 OpenAI 키를 삭제했습니다.");
      } else {
        const result = await api<Settings & Catalog>("settings/openai",{method:"PUT",body:JSON.stringify(action==="key"?{apiKey}:{model,effort})});
        acceptSettings(result);setModels(result.models);setKey("");
        setNotice(action==="key" ? `키를 저장하고 모델 ${result.models.length}개를 불러왔습니다. 작성 모델과 추론 강도를 선택해 주세요.` : "작성 모델과 추론 강도를 저장했습니다. 다음 카드뉴스 작성부터 적용됩니다.");
      }
    } catch(e){setError((e as Error).message);}finally{setBusy("");}
  }
  return <section className="ws-card ws-form" id="openai-settings">
    <div className="ws-settings-heading"><h2>OpenAI · 카드뉴스 자동 작성</h2><StatusBadge tone={configured ? "success" : "neutral"}>{!settings ? "불러오는 중" : configured ? "키 등록됨" : "미등록"}</StatusBadge></div>
    <p className="ws-muted">주제나 메모로 전체 카드의 문구·이미지 프롬프트·캡션을 작성합니다. 모든 사용자에게 적용되며, 키는 서버에 암호화해 보관합니다.</p>
    <form className="ws-form" onSubmit={e=>void run("key",e)}>
      <Field label="OpenAI API 키" htmlFor="openai-key" hint={configured ? "키를 바꿀 때만 입력하세요. 저장된 키로 아래 모델 목록을 조회합니다." : "키를 확인하면 사용 가능한 모델 목록을 자동으로 불러옵니다."}><Input id="openai-key" type="password" autoComplete="off" spellCheck={false} placeholder={configured?"등록된 키 유지":"sk-…"} value={apiKey} onChange={e=>setKey(e.target.value)} maxLength={2048} disabled={!!busy} required/></Field>
      <div className="ws-settings-actions"><Button variant="primary" type="submit" loading={busy === "key"} disabled={!!busy || !settings || !apiKey.trim()}>키 저장 · 모델 불러오기</Button>{settings?.configured && <Button type="button" variant="danger" disabled={!!busy} onClick={()=>void run("remove")}>OpenAI 키 삭제</Button>}</div>
    </form>
    <form className="ws-form" onSubmit={e=>void run("model",e)}>
      <Field label="작성 모델" htmlFor="openai-model" hint={configured ? `조회된 모델 중 카드뉴스 호환 ${available.length}개를 선택할 수 있습니다. 목록 새로고침은 작성 비용을 사용하지 않습니다.` : "먼저 OpenAI API 키를 등록해 주세요."}>
        <select className="ws-select" id="openai-model" value={model} disabled={!!busy || !available.length || !!apiKey} required onChange={e=>{const option=models.find(m=>m.id===e.target.value);setModel(e.target.value);setEffort(option?.defaultEffort ?? null);setNotice("");}}>
          {!selected && <option value={model} disabled>{configured ? `${model} · 목록 확인 필요` : "키 등록 후 모델 선택"}</option>}
          <optgroup label="카드뉴스 작성 가능">{available.map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</optgroup>
          {!!other.length && <optgroup label="카드뉴스 호환 미확인 · 선택 불가">{other.map(m=><option key={m.id} value={m.id} disabled>{m.id}</option>)}</optgroup>}
        </select>
      </Field>
      {selected?.supported && (selected.efforts.length ? <Field label="추론 강도 (reasoning effort)" htmlFor="openai-effort" hint="낮을수록 빠르게 작성합니다. 강도를 높이면 응답 시간과 OpenAI 토큰 사용량이 늘 수 있습니다."><select className="ws-select" id="openai-effort" value={effort ?? ""} disabled={!!busy || !!apiKey} required onChange={e=>{setEffort(e.target.value as ReasoningEffort);setNotice("");}}>{!selected.efforts.includes(effort as ReasoningEffort) && <option value={effort ?? ""} disabled>지원하는 강도를 선택하세요</option>}{selected.efforts.map(value=><option key={value} value={value}>{effortLabels[value]}</option>)}</select></Field> : <p className="ws-muted">이 모델은 추론 강도 설정을 지원하지 않습니다.</p>)}
      <div className="ws-settings-actions"><Button variant="primary" type="submit" loading={busy === "model"} disabled={!!busy || !!apiKey || !selected?.supported || (!!selected.efforts.length && !selected.efforts.includes(effort as ReasoningEffort)) || !dirty}>모델 설정 저장</Button><Button type="button" loading={busy === "refresh" || busy === "load"} disabled={!!busy || !configured || !!apiKey} onClick={()=>void run("refresh")}>모델 목록 새로고침</Button><Button type="button" loading={busy === "check"} disabled={!!busy || !configured || dirty || !!apiKey} onClick={()=>void run("check")}>OpenAI 연결 점검</Button></div>
      {dirty && <p className="ws-muted">변경한 모델·추론 강도는 ‘모델 설정 저장’을 누르면 적용됩니다.</p>}
      {!!apiKey && configured && <p className="ws-muted">새 키를 저장하거나 입력을 지우면 모델 설정을 변경할 수 있습니다.</p>}
    </form>
    {error && <Alert>{error}</Alert>}{notice && <p role="status">{notice}</p>}
    <p className="ws-muted">전체 문구 작성은 앱 1 크레딧입니다. OpenAI API 비용은 별도이며 ChatGPT 구독과 분리됩니다. 이미지 생성은 Higgsfield를 사용합니다. 연결 점검은 모델 조회만 수행합니다.</p>
    <a className="ws-settings-docs" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI에서 API 키 발급 ↗</a>
    <Button href="/projects/new?format=card-news">AI 빠른 제작으로 이동 ↗</Button>
  </section>;
}
