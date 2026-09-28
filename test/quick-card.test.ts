import test from "node:test";
import type { Project } from "../src/projects/types";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
process.env.LOCAL_DATABASE_DIR="memory://";
process.env.PROVIDER_ENCRYPTION_KEY=randomBytes(32).toString("base64");
delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_OUTLINE_MODEL;
delete process.env.OPENAI_REASONING_EFFORT;
delete process.env.ANTHROPIC_API_KEY;
const {createQuickCardDraft}=await import("../src/projects/quick-card");
const {openAiOutline}=await import("../src/service/openai-outline");
const {createAiProject}=await import("../src/service/outline");
const {checkOpenAi,openAiReady,openAiSettings,saveOpenAiSettings,removeOpenAiSettings,resolveOpenAi,listOpenAiModels}=await import("../src/service/openai-settings");
const {authenticate}=await import("../src/service/auth");
const {database}=await import("../src/service/db");
const {getProject}=await import("../src/service/projects");
const {listLedger}=await import("../src/service/credits");
const db=await database();
const admin=(await authenticate({email:"quick-admin@example.test",name:"Admin",password:"test-pass-1234"},true)).user;
const user=(await authenticate({email:"quick-user@example.test",name:"Creator",password:"test-pass-1234"},true)).user;
await db.query("UPDATE users SET is_admin=TRUE WHERE id=$1",[admin.id]);
const secret="sk-fixture-openai-not-a-real-api-key";
const modelIds=["gpt-5-mini","gpt-4.1-mini","gpt-5.2","gpt-5-pro","gpt-6-astra","gpt-5.6-sol","gpt-image-1","whisper-1","future-unknown"];
const modelList:typeof fetch=async(url,init)=>{
  assert.equal(url,"https://api.openai.com/v1/models");assert.equal(init?.redirect,"error");assert.equal(init?.cache,"no-store");
  assert.equal(new Headers(init?.headers).get("authorization"),`Bearer ${secret}`);
  return Response.json({data:modelIds.map(id=>({id,object:"model"}))});
};
const idea="표지: 물 주기가 어려운 당신에게\n2장: 흙이 마른 뒤 물을 주세요.\n초보 식물 집사를 위한 나머지 내용을 작성해 주세요.";
const draft=createQuickCardDraft({idea});
function answer() {
  return {title:"초보 집사의 물 주기",caption:"흙을 살피며 물 주는 습관을 만들어 보세요. #식물",slots:draft.slots.map((_slot,i)=>({kind:i===0?"cover":i===4?"cta":"body",title:i===0?"물 주기가 어려운 당신에게":`물 주기 팁 ${i}`,body:i===1?"흙이 마른 뒤 물을 주세요.":"흙과 잎의 상태를 함께 살펴보세요.",kicker:"GREEN NOTES",prompt:"A potted fern beside a watering can, soft natural light. No text, no logos.",cta:i===4?"저장하고 살펴보기":""}))};
}
function completed(value:unknown=answer()) {return Response.json({status:"completed",output:[{type:"reasoning",content:[]},{type:"message",content:[{type:"output_text",text:JSON.stringify(value)}]}]});}
async function balance() {return (await db.query<{credits:number}>("SELECT credits FROM users WHERE id=$1",[user.id]))[0].credits;}

await test("one idea or partial script produces a complete valid scaffold with safe defaults",()=>{
  assert.equal(draft.slots.length,5);assert.equal(draft.ratio,"4:5");assert.equal(draft.brief.mustInclude,idea);
  assert.ok(draft.slots.every(s=>s.composition==="full"&&!s.media));
  assert.equal(createQuickCardDraft({idea:"커피",count:3,tone:"expert",preset:"basic"}).slots.length,3);
  for(const bad of [{idea:" "},{idea:"a".repeat(3001)},{idea:"커피",count:0},{idea:"커피",count:5.5},{idea:"커피",count:"5"},{idea:"커피",preset:"unknown"}])assert.throws(()=>createQuickCardDraft(bad));
});
await test("OpenAI settings require admins, encrypt keys, allow model-only updates and never return credentials",async()=>{
  assert.equal(await openAiReady(),false);
  await assert.rejects(()=>saveOpenAiSettings(user.id,{apiKey:secret,model:"gpt-5-mini"}),/관리자/);
  await assert.rejects(()=>openAiSettings(user.id),/관리자/);
  await assert.rejects(()=>saveOpenAiSettings(admin.id,{apiKey:"invalid",model:"gpt-5-mini"}),/API 키/);
  await saveOpenAiSettings(admin.id,{apiKey:secret,model:"gpt-5-mini"},modelList);
  assert.equal(await openAiReady(),true);
  const [row]=await db.query<{sealed:string}>("SELECT sealed FROM text_provider_settings");assert.ok(!row.sealed.includes(secret));
  assert.ok(!JSON.stringify(await openAiSettings(admin.id)).includes(secret));
  await saveOpenAiSettings(admin.id,{apiKey:"",model:"gpt-4.1-mini"},modelList);assert.equal((await resolveOpenAi()).apiKey,secret);
  assert.equal((await resolveOpenAi()).model,"gpt-4.1-mini");
  await saveOpenAiSettings(admin.id,{apiKey:"",model:"gpt-5-mini"},modelList);
});
await test("Responses API receives the full memo with strict schema; one response fills all cards and retries do not debit twice",async()=>{
  let calls=0;
  const fetchMock:typeof fetch=async(url,init)=>{
    calls++;assert.equal(url,"https://api.openai.com/v1/responses");assert.equal(init?.redirect,"error");
    assert.equal(new Headers(init?.headers).get("authorization"),`Bearer ${secret}`);
    const request=JSON.parse(String(init?.body));assert.equal(request.store,false);assert.equal(request.text.format.strict,true);
    assert.equal(JSON.parse(request.input).brief.mustInclude,idea);assert.equal(JSON.parse(request.input).sections,5);
    assert.equal(request.model,"gpt-5-mini");assert.deepEqual(request.reasoning,{effort:"low"});return completed();
  };
  const before=await balance();
  const provider=(d:Project)=>openAiOutline(d,fetchMock);
  const result=await createAiProject(user.id,draft,"quick-creation-001",provider);
  assert.equal((await createAiProject(user.id,draft,"quick-creation-001",provider)).id,result.id);assert.equal(calls,1);
  const project=await getProject(user.id,result.id);
  assert.equal(project.title,answer().title);assert.equal(project.brief.topic,answer().title);assert.equal(project.brief.mustInclude,idea);
  assert.equal(project.slots[1].body,"흙이 마른 뒤 물을 주세요.");assert.ok(project.slots.every(s=>s.title&&s.body&&s.prompt));
  assert.equal(project.caption,answer().caption);assert.equal(await balance(),before-1);
  await assert.rejects(()=>getProject(admin.id,result.id),/찾을 수/);
});
await test("concurrent duplicate clicks reserve and call the provider only once",async()=>{
  let release!:()=>void,calls=0;const gate=new Promise<void>(resolve=>{release=resolve;});
  let entered!:()=>void;const started=new Promise<void>(resolve=>{entered=resolve;});
  const provider=async()=>{calls++;entered();await gate;return answer();};
  const before=await balance(),first=createAiProject(user.id,draft,"quick-concurrent-002",provider);
  await started;
  await assert.rejects(()=>createAiProject(user.id,draft,"quick-concurrent-002",provider),/이미 접수/);
  release();await first;assert.equal(calls,1);assert.equal(await balance(),before-1);
});
await test("refusals, incomplete responses, invalid cards and API errors refund once and never persist partial projects",async()=>{
  const mocks=[
    ()=>new Response("credential must not be exposed",{status:401}),
    ()=>new Response("quota exceeded",{status:429}),
    ()=>Response.json({status:"incomplete",output:[]}),
    ()=>Response.json({status:"completed",output:[{type:"message",content:[{type:"refusal"}]}]}),
    ()=>completed({...answer(),slots:[]}),
    ()=>completed({...answer(),slots:answer().slots.map((s,i)=>i? s:{...s,prompt:""})}),
    ()=>completed({...answer(),slots:answer().slots.map((s,i)=>i? s:{...s,body:"x".repeat(361)})}),
  ];
  const before=await balance(),[projects]=await db.query<{count:number}>("SELECT COUNT(*)::INTEGER count FROM projects WHERE owner_id=$1",[user.id]);
  for(const [i,mock] of mocks.entries()) {
    const key=`quick-invalid-${i}`,provider=(d:Project)=>openAiOutline(d,async()=>mock());
    await assert.rejects(()=>createAiProject(user.id,draft,key,provider),/환불/);
    await assert.rejects(()=>createAiProject(user.id,draft,key,provider),/환불/);
  }
  assert.equal(await balance(),before);
  const [after]=await db.query<{count:number}>("SELECT COUNT(*)::INTEGER count FROM projects WHERE owner_id=$1",[user.id]);assert.equal(after.count,projects.count);
});
await test("model discovery uses the registered key, exposes capabilities and rejects unauthorized readers",async()=>{
  let calls=0;
  await assert.rejects(()=>listOpenAiModels(user.id,async()=>{calls++;return Response.json({data:[]});}),/관리자/);
  assert.equal(calls,0);
  const catalog=await listOpenAiModels(admin.id,modelList);
  assert.deepEqual(catalog.models.find(m=>m.id==="gpt-5-mini")?.efforts,["minimal","low","medium","high"]);
  assert.deepEqual(catalog.models.find(m=>m.id==="gpt-5-pro")?.efforts,["high"]);
  assert.deepEqual(catalog.models.find(m=>m.id==="gpt-4.1-mini")?.efforts,[]);
  assert.equal(catalog.models.find(m=>m.id==="gpt-image-1")?.supported,false);
  assert.equal(catalog.models.find(m=>m.id==="future-unknown")?.supported,false);
  assert.ok(!JSON.stringify(catalog).includes(secret));
  const {openAiModelProfile}=await import("../src/service/openai-models");
  assert.deepEqual(openAiModelProfile("gpt-5.2-2025-12-11")?.efforts,["none","low","medium","high","xhigh"]);
  assert.equal(openAiModelProfile("gpt-4o-2024-05-13"),null);
  assert.equal(openAiModelProfile("gpt-5.2-pro"),null);
  assert.equal(openAiModelProfile("gpt-5-mini-audio"),null);
});
await test("failed discovery or invalid model/effort cannot replace a saved key or configuration",async()=>{
  const before=await resolveOpenAi();
  for(const input of [
    {model:"gpt-5.1"}, // compatible but absent from this key's list
    {model:"gpt-image-1"},
    {model:"future-unknown"},
    {model:"gpt-5-mini",effort:"xhigh"},
    {model:"gpt-5-pro",effort:"low"},
    {model:"gpt-4.1-mini",effort:"low"},
    {model:"gpt-6-astra",effort:"none"},
  ]) await assert.rejects(()=>saveOpenAiSettings(admin.id,input,modelList),/호환|지원/);
  const failureMocks:Array<typeof fetch>=[
    async()=>new Response(secret,{status:401}),
    async()=>new Response(secret,{status:403}),
    async()=>new Response(secret,{status:429}),
    async()=>{throw new Error(secret);},
    async()=>new Response("not json"),
    async()=>Response.json({data:[{id:null}]}),
    async()=>Response.json({data:[]}),
    async()=>Response.json({data:[{id:"whisper-1"}]}),
  ];
  for(const fetchMock of failureMocks){
    await assert.rejects(()=>saveOpenAiSettings(admin.id,{apiKey:"sk-replacement-fixture-not-real"},fetchMock),e=>e instanceof Error&&!e.message.includes(secret));
    assert.deepEqual(await resolveOpenAi(),before);
  }
});
await test("saved effort reaches Responses, non-reasoning models omit it, and key-only setup chooses an available model",async()=>{
  for(const [model,effort] of [["gpt-5-mini","high"],["gpt-5.2","none"],["gpt-6-astra","max"],["gpt-5.6-sol","xhigh"],["gpt-5-pro","high"],["gpt-4.1-mini",null]] as const){
    const saved=await saveOpenAiSettings(admin.id,{model,effort},modelList);
    assert.equal(saved.model,model);assert.equal(saved.effort,effort);
    assert.equal((await openAiSettings(admin.id)).effort,effort);
    await openAiOutline(draft,async(_url,init)=>{
      const payload=JSON.parse(String(init?.body));assert.equal(payload.model,model);
      if(effort)assert.deepEqual(payload.reasoning,{effort});else assert.equal("reasoning" in payload,false);
      return completed();
    });
  }
  const fallback=await saveOpenAiSettings(admin.id,{apiKey:secret},async()=>Response.json({data:[{id:"gpt-5-pro"}]}));
  assert.equal(fallback.model,"gpt-5-pro");assert.equal(fallback.effort,"high");
  await saveOpenAiSettings(admin.id,{model:"gpt-5-mini",effort:"high"},modelList);
  await saveOpenAiSettings(admin.id,{apiKey:secret},modelList);
  assert.equal((await resolveOpenAi()).effort,"high"); // key rotation preserves valid selections
  await saveOpenAiSettings(admin.id,{model:"gpt-5-mini",effort:"low"},modelList);
});
await test("connection checks are read-only and unconfigured generation does not charge credits",async()=>{
  await assert.rejects(()=>checkOpenAi(user.id),/관리자/);
  const check=await checkOpenAi(admin.id,async(url,init)=>{assert.equal(url,"https://api.openai.com/v1/models/gpt-5-mini");assert.notEqual(init?.method,"POST");return Response.json({id:"gpt-5-mini"});});assert.equal(check.state,"verified");
  await assert.rejects(()=>removeOpenAiSettings(user.id),/관리자/);
  await removeOpenAiSettings(admin.id);assert.equal(await openAiReady(),false);
  const before=await listLedger(user.id);
  await assert.rejects(()=>createAiProject(user.id,draft,"quick-unconfigured-003",openAiOutline),/연결/);
  assert.deepEqual(await listLedger(user.id),before);
});
