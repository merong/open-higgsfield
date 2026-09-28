"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Segment, Textarea } from "@openhiggsfield/design";
import { CardAgentPanel } from "./card-agent-panel";
import { agentTerminal, type CardAgentRun } from "@/projects/card-agent";
import { api, ApiError } from "@/projects/api";
import { PRESETS } from "@/projects/formats";
import { useSession } from "@/shell/workspace-shell";

type Session = {quickCardReady:boolean;user:{credits:number;admin:boolean}|null};
const EXAMPLES = [
  {label:"주제 한 줄",text:"반려식물을 처음 키우는 사람에게 물 주기 실수를 줄이는 방법을 알려 주세요."},
  {label:"제품 메모",text:"무향 핸드크림 소개. 끈적임 없이 가벼운 사용감, 휴대하기 좋은 30ml. 출퇴근하는 직장인에게 추천하고 마지막은 제품 보기로 마무리해 주세요."},
  {label:"일부 원고",text:"표지: AI를 처음 쓰는 당신에게\n2장: 처음에는 작은 업무 한 가지부터 시작하세요.\n이어서 좋은 질문을 쓰는 방법과 결과를 확인하는 팁을 소개해 주세요."},
];
export function QuickCardCreator({onBusyChange,active=true}:{onBusyChange:(busy:boolean)=>void;active?:boolean}) {
  const [idea,setIdea]=useState(""),[count,setCount]=useState("5"),[tone,setTone]=useState("friendly"),[audience,setAudience]=useState(""),[preset,setPreset]=useState("editorial");
  const [session,setSession]=useState<Session|null>(null),[connectionError,setConnectionError]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [run,setRun]=useState<CardAgentRun|null>(null),[restoring,setRestoring]=useState(true);
  const inFlight=useRef(false),request=useRef<{signature:string;key:string}|null>(null),router=useRouter();
  const shell=useSession(),shellRef=useRef(shell);shellRef.current=shell;
  async function refresh() {
    setConnectionError("");
    try {setSession(await api<Session>("session"));} catch {setConnectionError("연결 상태를 불러오지 못했습니다. 다시 확인해 주세요.");}
  }
  useEffect(()=>{let mounted=true;void refresh();void api<{run:CardAgentRun|null}>("card-agent").then(r=>{if(mounted)setRun(r.run);}).catch(e=>{if(mounted && !(e instanceof ApiError && e.status===401))setError("이전 작업을 확인하지 못했습니다. 새로고침하여 연결을 확인해 주세요.");}).finally(()=>{if(mounted)setRestoring(false);});return()=>{mounted=false;};},[]);
  useEffect(()=>{onBusyChange(active && (busy || !!run && !agentTerminal(run)));},[active,busy,run,onBusyChange]);
  useEffect(()=>{if(run && (run.revision===1 || agentTerminal(run)))void shellRef.current.refresh().catch(()=>{});},[run?.id,run?.status]);
  async function submit(event:FormEvent) {
    event.preventDefault();if(inFlight.current || !session?.quickCardReady)return;
    const payload={idea:idea.trim(),count:Number(count),tone,audience,preset},signature=JSON.stringify(payload);
    if(!request.current || request.current.signature!==signature)request.current={signature,key:crypto.randomUUID()};
    inFlight.current=true;setBusy(true);onBusyChange(true);setError("");
    try {
      const result=await api<CardAgentRun>("card-agent",{method:"POST",body:JSON.stringify({...payload,key:request.current.key})});
      setRun(result);inFlight.current=false;setBusy(false);request.current=null;void refresh();
    } catch(e) {
      setError(e instanceof ApiError ? e.message : "응답을 받지 못했습니다. 다시 누르면 같은 요청을 확인합니다. 새로고침해도 서버에 저장된 작업을 복구할 수 있어요.");
      // Preserve unknown/in-progress requests so retries cannot create or debit twice.
      if(e instanceof ApiError && e.status!==409)request.current=null;
      if(e instanceof ApiError && e.status===409){try{const active=await api<{run:CardAgentRun|null}>("card-agent");if(active.run)setRun(active.run);}catch{}}
      inFlight.current=false;setBusy(false);onBusyChange(false);void refresh();
    }
  }
  if(run)return active ? <CardAgentPanel key={run.id} run={run} onRun={next=>setRun(old=>old && old.id===next.id && old.revision>next.revision ? old : next)} onReset={()=>{setRun(null);setError("");void refresh();}} onOpen={id=>router.push(`/projects/${id}`)}/> : null;
  return <section className="ws-quick" aria-labelledby="quick-card-heading">
    <div className="ws-quick-intro"><span className="ws-eyebrow">IDEA TO STORY</span><h2 id="quick-card-heading">아이디어는 가볍게.<br/>완성은 함께.</h2><p>주제만 적거나, 쓰다 만 내용을 붙여 넣으세요.<br/>AI와 방향을 정하고, 작성·검수·개선까지 이어가세요.</p>
      <ol className="ws-quick-flow"><li><span>01</span><div><strong>아이디어 입력</strong><p>완성된 원고가 없어도 괜찮아요.</p></div></li><li><span>02</span><div><strong>방향을 고르면 AI가 제작</strong><p>기획 → 초안 → 검수 → 개선 과정을 확인해요.</p></div></li><li><span>03</span><div><strong>내 의견으로 한 번 더</strong><p>추가 의견을 반영한 뒤 편집기에서 완성하세요.</p></div></li></ol>
    </div>
    <form className="ws-quick-form" onSubmit={submit}>
      <fieldset disabled={busy || restoring}>
        <Field label="어떤 이야기를 만들까요?" htmlFor="quick-card-idea" hint="주제어, 제품 메모, 일부 카드 원고를 자유롭게 적어 주세요."><Textarea id="quick-card-idea" value={idea} onChange={e=>setIdea(e.target.value)} rows={7} minLength={2} maxLength={3000} required placeholder="예: 처음 반려식물을 키우는 사람을 위한 물 주기 팁. 쉽고 친근하게 설명하고, 마지막에는 저장을 권해주세요."/></Field>
        <div className="ws-quick-examples"><span>예시 넣기</span>{EXAMPLES.map(example=><button type="button" key={example.label} onClick={()=>setIdea(example.text)}>{example.label} ↗</button>)}</div>
        <details className="ws-quick-options"><summary>세부 설정 <span>{count}장 · {PRESETS.find(p=>p.id===preset)?.label} · 4:5</span></summary>
          <div className="ws-form"><Field label="카드 장수"><Segment size="sm" aria-label="자동 작성 카드 장수" value={count} onChange={setCount} items={[3,5,7,10].map(n=>({id:String(n),label:`${n}장`}))} plate/></Field>
            <Field label="말투"><Segment size="sm" aria-label="자동 작성 말투" value={tone} onChange={setTone} items={[{id:"friendly",label:"친근하게"},{id:"expert",label:"전문적으로"},{id:"calm",label:"차분하게"},{id:"witty",label:"재치 있게"}]} plate/></Field>
            <Field label="디자인"><Segment size="sm" aria-label="자동 작성 디자인" value={preset} onChange={setPreset} items={PRESETS.map(p=>({...p}))} plate/></Field>
            <Field label="누가 읽나요? (선택)" htmlFor="quick-card-audience"><Input id="quick-card-audience" placeholder="비워 두면 AI가 주제에서 판단해요" value={audience} onChange={e=>setAudience(e.target.value)} maxLength={100}/></Field>
          </div>
        </details>
      </fieldset>
      {connectionError && <Alert>{connectionError}</Alert>}
      {session && !session.user && <p className="ws-quick-notice">내 계정으로 로그인하면 AI 작성과 저장을 사용할 수 있어요. <a href="/login">로그인 →</a></p>}
      {session?.user && !session.quickCardReady && <p className="ws-quick-notice">관리자의 OpenAI 연결이 필요합니다. {session.user.admin ? <a href="/admin/settings#openai-settings">API 설정 열기 →</a> : "관리자에게 연결을 요청하거나 템플릿으로 시작해 보세요."}</p>}
      {session?.user && session.user.credits < 1 && <p className="ws-quick-notice">작성에 필요한 1 크레딧이 부족합니다. <a href="/account/credits">내 크레딧 확인 →</a></p>}
      {(!session?.quickCardReady || connectionError) && <Button type="button" disabled={busy} onClick={()=>void refresh()}>연결 상태 다시 확인</Button>}
      {error && <><Alert>{error}</Alert><Button type="button" onClick={()=>window.location.reload()}>저장된 작업 다시 불러오기</Button></>}
      <div className="ws-quick-submit"><Button type="submit" variant="primary" size="lg" loading={busy} disabled={busy || restoring || !session?.quickCardReady || !session.user || session.user.credits<1 || idea.trim().length<2}>{restoring ? "이전 작업 확인 중" : busy ? "아이디어를 전달하고 있어요" : "AI와 기획 시작 · 1 크레딧"}</Button><p role="status">{busy ? "아이디어를 저장하고 기획을 시작합니다." : "기획·작성·검수·개선과 추가 수정 1회가 포함됩니다. 취소·실패 시 환불합니다. 실제 이미지 생성은 별도 크레딧을 사용해요."}</p></div>
      <p className="ws-quick-footnote">AI가 쓴 내용은 게시 전에 확인해 주세요. 최신 뉴스는 참고할 원문도 함께 붙여 넣으면 좋아요.</p>
    </form>
  </section>;
}
