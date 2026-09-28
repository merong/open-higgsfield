import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { zipSync, strToU8 } from "fflate";
import { randomUUID } from "node:crypto";
process.env.LOCAL_DATABASE_DIR = "memory://";
process.env.OPENAI_API_KEY = "sk-workflow-test-not-real";
process.env.OPENAI_OUTLINE_MODEL = "gpt-5.6-terra";
process.env.OPENAI_REASONING_EFFORT = "low";
const { database } = await import("../src/service/db");
const { authenticate } = await import("../src/service/auth");
const { startWorkflow, stepWorkflow, actWorkflow, getWorkflow, activeWorkflow, workflowVersions } = await import("../src/service/card-workflow");
const { workflowRequest, workflowModel, sourceResults } = await import("../src/service/workflow-model");
const { workflowImagePlane, startWorkflowImage, pollWorkflowImage, workflowImageQuote, startWorkflowImageBatch, pollWorkflowImageBatch } = await import("../src/service/workflow-images");
const { reviewWorkflowOutput, qualityRequest } = await import("../src/service/workflow-quality");
const output = (r:CardWorkflow):OutputCheck[] => r.project.slots.map(s => ({cardId:s.id,mobileBodyPx:14.4,issues:[]}));
const qualityProvider = async (r:CardWorkflow) => ({summary:"실제 PNG 검수 fixture",cards:r.project.slots.map(s=>({cardId:s.id,findings:["matching","typography","content","output"].map(criterion=>({criterion,status:"pass",evidence:"테스트용 관찰 결과",suggestion:""}))}))});
const { finalizeWorkflow, validateWorkflowZip } = await import("../src/service/workflow-export");
const { saveAsset } = await import("../src/service/assets");
const { getProject } = await import("../src/service/projects");
import type { OutputCheck, CardWorkflow } from "../src/projects/card-workflow";
import type { WorkflowModel } from "../src/service/workflow-model";
import type { createPlatformClient } from "../src/generation/platform";
const db = await database();
const user = (await authenticate({ email: "hitl@test.example", name: "HITL", password: "testpass1234" }, true)).user;
const other = (await authenticate({ email: "hitl-other@test.example", name: "Other", password: "testpass1234" }, true)).user;
const idea = "초보자가 키우기 좋은 식물로 인스타 카드뉴스 만들어줘.";
const start = (overrides = {}) => startWorkflow(user.id, { idea, key: randomUUID(), ...overrides });
const balance = async () => (await db.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1", [user.id]))[0].credits;
const act = (r: CardWorkflow, data: Record<string, unknown>) => actWorkflow(user.id,r.id,{ revision:r.revision,responseId:randomUUID(),...data });
const answer = (r: CardWorkflow, mode: string, value = "") => act(r,{action:"answer",requestId:r.question?.id,answer:{mode,value}});
const cancel = (r: CardWorkflow) => act(r,{action:"cancel"});
const understanding = { summary:"식물 입문자에게 선택 기준을 소개합니다.",purpose:"educate",purposeExplicit:false,audience:"식물 입문자",audienceExplicit:false,channel:"인스타그램",channelExplicit:true,count:5,countExplicit:false,needResearch:true,constraints:[],question:"어떤 반응을 원하세요?",options:[{value:"educate",label:"정보 전달",description:"저장하고 실천해요"},{value:"conversion",label:"상품 관심",description:"더 알아봐요"},{value:"branding",label:"브랜드 소개",description:"분위기를 기억해요"}] };
const source = { url:"https://extension.umn.edu/houseplants",title:"University Extension",claim:"기르는 환경에 맞는 식물을 고릅니다." };
function outline(r:CardWorkflow) { return {title:"첫 식물 고르기",caption:`환경부터 확인해 보세요.\n${source.url}`,slots:r.project.slots.map((_,i)=>({kind:i===0?"cover":i===r.project.slots.length-1?"cta":"body",title:["첫 식물, 무엇부터 볼까요?","집의 빛을 먼저 살펴봐요","내 환경에 맞는 식물","물주기 전 확인해요","체크리스트를 저장하세요"][i]||"한 가지 실천",body:i===4?"빛과 공간, 관리할 시간을 확인하고 저장해 두세요.":"집의 환경을 살펴보고 식물마다 필요한 관리 조건을 확인해요.",kicker:"GREEN NOTES",prompt:"Editorial houseplants in soft daylight. No text, no logos.",cta:i===r.project.slots.length-1?"저장하고 다시 보기":""}))}; }
const provider:WorkflowModel = async r => ({value:r.stage==="understand"?understanding:r.stage==="research"?{summary:"환경에 맞는 선택 기준을 확인했습니다.",sources:[source],warnings:[]}:r.stage==="plan"?{summary:"선택 기준과 실천 안내로 5장을 구성합니다.",cards:r.project.slots.map((_,i)=>({role:i===0?"관심 유도":i===4?"저장 안내":"실용 정보",title:outline(r).slots[i].title,message:"환경을 확인하고 내게 맞는 선택을 해요."}))}:r.stage==="write"?outline(r):r.stage==="patch"?{summary:"선택 카드 설명을 줄였습니다.",cards:r.project.slots.filter(s=>r.targetIds.includes(s.id)).map(s=>({...s,body:"빛과 흙을 먼저 확인해요."}))}:{summary:"목적과 흐름, 필수 문구를 확인했습니다.",issues:[],warnings:[]},observedUrls:[source.url]});
const step = (r:CardWorkflow,model:WorkflowModel=provider) => stepWorkflow(user.id,r.id,r.revision,model);
async function ready(r:CardWorkflow) {
  r=await step(r); assert.equal(r.question?.kind,"purpose"); r=await answer(r,"select","educate");
  r=await step(r); r=await step(r); assert.equal(r.question?.kind,"plan"); r=await answer(r,"approve");
  assert.equal(r.question?.kind,"style"); r=await answer(r,"select","soft");r=await step(r);r=await step(r);assert.equal(r.status,"ready");return r;
}
// Construct a real losslessly encoded RGB PNG; validation must decode its pixel stream.
function png(width=1080,height=1350) {
  const chunk=(name:string,body:Buffer)=>{const type=Buffer.from(name), payload=Buffer.concat([type,body]);let crc=0xffffffff;for(const b of payload){crc^=b;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const out=Buffer.alloc(body.length+12);out.writeUInt32BE(body.length);payload.copy(out,4);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;};
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(Buffer.alloc((width*3+1)*height))),chunk("IEND",Buffer.alloc(0))]);
}
const image=png();
function archive(r:CardWorkflow,overrides:Record<string,Uint8Array>={}) {return zipSync({...Object.fromEntries(r.project.slots.map((_,i)=>[`${String(i+1).padStart(2,"0")}.png`,image])),"project.json":strToU8(JSON.stringify(r.project)),"caption.txt":strToU8(r.project.caption),...overrides});}
async function saveZip(r:CardWorkflow,bytes=archive(r)) {return saveAsset(user.id,new File([bytes.buffer as ArrayBuffer],"cards.zip",{type:"application/zip"}),true);}

await test("plant HITL: purpose, actual source provenance, plan, cover, scoped revision, real ZIP and PNG completion",async()=>{
  const before=await balance();let r=await ready(await start());assert.equal(r.budget.calls,5);assert.equal(r.spec.purpose.origin,"user_confirmed");assert.equal(r.spec.audience.origin,"ai_assumed");assert.equal(r.spec.channel.origin,"user_explicit");assert.equal(r.project.preset,"soft");assert.equal(r.sources[0].url,source.url);assert.equal(r.artifacts,undefined);
  const original=structuredClone(r.project.slots),id=r.project.slots[2].id;
  r=await act(r,{action:"revise",cardIds:[id],feedback:"3장만 짧게 해주세요.",allowCopy:true});r=await step(r);r=await step(r);assert.equal(r.status,"ready");
  for(const [i,s] of r.project.slots.entries())if(i!==2)assert.deepEqual(s,original[i]);assert.equal(r.project.slots[2].body,"빛과 흙을 먼저 확인해요.");
  assert.equal((await getProject(user.id,r.projectId)).version,r.project.version);assert.ok((await workflowVersions(user.id,r.id)).length>=4);
  const asset=await saveZip(r);r=await reviewWorkflowOutput(user.id,r.id,{revision:r.revision,assetId:asset.id,output:output(r)},qualityProvider);const completed=await finalizeWorkflow(user.id,r.id,{revision:r.revision,assetId:asset.id,acknowledged:true,imageException:"명시적으로 텍스트만 사용하는 테스트"});assert.equal(completed.status,"completed");assert.equal(completed.artifacts?.files.length,5);assert.equal(completed.artifacts?.width,1080);
  const { libraryList } = await import("../src/service/library");
  const library = await libraryList(user.id,{feature:"card-news"});assert.equal(library.total,6);assert.ok(library.items.every(item=>item.projectId===r.projectId));
  assert.equal((await finalizeWorkflow(user.id,r.id,{revision:r.revision,assetId:asset.id})).revision,completed.revision);assert.equal(await balance(),before-1);
  assert.equal((await db.query("SELECT id FROM credit_ledger WHERE job_id=$1 AND kind='confirm'",[r.id])).length,1);assert.equal(await activeWorkflow(user.id),null);
  const followup=await start({sourceRunId:r.id});assert.equal(followup.status,"ready");assert.equal(followup.projectId,r.projectId);assert.equal(followup.artifacts,undefined);await cancel(followup);
});
await test("question waiting makes no model calls; duplicate answers and starts are idempotent, stale/foreign access rejected",async()=>{
  const before=await balance(),key=randomUUID();const [a,b]=await Promise.all([start({key}),start({key})]);assert.equal(a.id,b.id);assert.equal(await balance(),before-1);
  let r=await step(a);let calls=0;r=await step(r,async()=>{calls++;return {value:null};});assert.equal(calls,0);
  for(const operation of [()=>getWorkflow(other.id,r.id),()=>stepWorkflow(other.id,r.id,r.revision,provider),()=>actWorkflow(other.id,r.id,{action:"cancel",revision:r.revision,responseId:randomUUID()}),()=>workflowVersions(other.id,r.id)])await assert.rejects(operation,/찾을 수/);
  const input={action:"answer",revision:r.revision,responseId:randomUUID(),requestId:r.question!.id,answer:{mode:"select",value:"educate"}};const next=await actWorkflow(user.id,r.id,input);assert.equal((await actWorkflow(user.id,r.id,input)).revision,next.revision);
  await assert.rejects(()=>actWorkflow(user.id,r.id,{...input,responseId:randomUUID()}),/변경/);await cancel(next);
});
await test("generic explicit request skips purpose question; delegated defaults remain assumptions",async()=>{
  let r=await start({idea:"커피 브랜드의 분위기를 소개하는 3장 카드뉴스. 독자는 직장인.",count:3});
  r=await step(r,async()=>({value:{...understanding,purpose:"branding",purposeExplicit:true,needResearch:false,audience:"직장인",audienceExplicit:true,options:[],question:""}}));assert.equal(r.status,"pending");assert.equal(r.stage,"plan");assert.equal(r.project.slots.length,3);assert.equal(r.spec.purpose.origin,"user_explicit");await cancel(r);
  r=await start({mode:"delegate"});r=await step(r);assert.equal(r.stage,"research");assert.equal(r.spec.purpose.origin,"ai_assumed");r=await step(r);r=await step(r);assert.equal(r.stage,"write");assert.equal(r.question,undefined);await cancel(r);
});
await test("research cannot fabricate URLs; unavailable research pauses for explicit retry or general advice",async()=>{
  assert.deepEqual(sourceResults([source],[]),[]);let r=await start();r=await step(r);r=await answer(r,"select","educate");
  r=await step(r,async()=>({value:{summary:"No verified sources",sources:[source],warnings:[]},observedUrls:[]}));assert.equal(r.question?.kind,"research");assert.equal(r.sources.length,0);
  r=await answer(r,"retry");r=await step(r,async()=>{throw new Error("sk-do-not-leak");});assert.equal(r.status,"waiting_user");assert.ok(!JSON.stringify(r).includes("sk-do-not-leak"));r=await answer(r,"skip");assert.equal(r.stage,"plan");assert.match(r.spec.constraints.join(),/검증되지/);await cancel(r);
});
await test("changed spec fences late text result; cancel fences and refunds once",async()=>{
  for(const cancelFirst of [false,true]) {
    const before=await balance();let r=await start();let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),started=new Promise<void>(resolve=>entered=resolve);
    const pending=step(r,async()=>{entered();await gate;return {value:understanding};});await started;r=await getWorkflow(user.id,r.id);
    const next=cancelFirst?await cancel(r):await act(r,{action:"spec",spec:{purpose:"branding",audience:"커피 애호가",count:3,constraints:["가격 제외"]}});
    release();const late=await pending;assert.equal(late.revision,next.revision);assert.equal(late.spec.purpose.value,cancelFirst?"":"branding");if(!cancelFirst)await cancel(late);assert.equal(await balance(),before);
  }
});
await test("selected patch refuses foreign IDs; invalid output preserves cards and retries without another charge",async()=>{
  const before=await balance();let r=await ready(await start());const saved=structuredClone(r.project);
  r=await act(r,{action:"revise",cardIds:[r.project.slots[2].id],feedback:"짧게 써 주세요"});r=await step(r,async()=>({value:{summary:"Oops",cards:[{...outline(r).slots[0],id:r.project.slots[0].id}]}}));assert.equal(r.status,"paused_budget");assert.deepEqual(r.project,saved);assert.equal(await balance(),before-1);
  r=await act(r,{action:"resume"});r=await step(r);r=await step(r);assert.equal(r.status,"ready");assert.equal(await balance(),before-1);await cancel(r);assert.equal(await balance(),before);
});
await test("oversized image plan pauses without partial writes and a corrected response can resume",async()=>{
  const before=await balance();let r=await start({mode:"delegate"});
  r=await step(r,async()=>({value:{...understanding,purposeExplicit:true,needResearch:false}}));
  const original=structuredClone(r.project);
  r=await step(r,async run=>({value:{summary:"Plan",cards:run.project.slots.map(()=>({role:"정보",title:"관찰하기",message:"빛과 잎을 기록해요.",imagePrompt:"x".repeat(701)}))}}));
  assert.equal(r.status,"paused_budget");assert.equal(r.stage,"plan");assert.deepEqual(r.project,original);assert.equal(await balance(),before-1);
  r=await act(r,{action:"resume"});r=await step(r);assert.equal(r.stage,"write");await cancel(r);assert.equal(await balance(),before);
});
await test("budget pauses without extra provider calls; expired lease invalidates late response",async()=>{
  let r=await start();r.budget.maxCalls=0;await db.query("UPDATE card_workflows SET data=$1 WHERE id=$2",[JSON.stringify(r),r.id]);r=await step(r,async()=>{throw new Error("not called");});assert.equal(r.status,"paused_budget");assert.equal(r.budget.calls,0);r=await act(r,{action:"resume"});assert.equal(r.budget.maxCalls,20);await cancel(r);
  r=await start();let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),started=new Promise<void>(resolve=>entered=resolve);const pending=step(r,async()=>{entered();await gate;return {value:understanding};});await started;await db.query("UPDATE card_workflows SET lease_until=0 WHERE id=$1",[r.id]);r=await getWorkflow(user.id,r.id);assert.equal(r.status,"paused_budget");release();assert.equal((await pending).status,"paused_budget");await cancel(r);
});
await test("broken, missing, wrong-sized or stale files never mark complete; content validation also blocks",async()=>{
  let r=await ready(await start());
  for(const bytes of [archive(r,{"01.png":strToU8("broken")}),archive(r,{"01.png":png(3,3)}),archive(r,{"extra.png":image}),archive(r,{"project.json":strToU8(JSON.stringify({...r.project,version:0}))})]) {
    assert.throws(()=>validateWorkflowZip(bytes,r),/검증 실패/);const asset=await saveZip(r,bytes);await assert.rejects(()=>finalizeWorkflow(user.id,r.id,{revision:r.revision,assetId:asset.id}),/검증 실패/);assert.equal((await getWorkflow(user.id,r.id)).status,"ready");
  }
  r=await act(r,{action:"edit",cardId:r.project.slots[0].id,title:"가격 9,900원 지금 구매하세요",body:"정보 안내",cta:"구매하기"});const asset=await saveZip(r);await assert.rejects(()=>finalizeWorkflow(user.id,r.id,{revision:r.revision,assetId:asset.id}),/정보 전달/);await cancel(r);
});
await test("image generation quotes exact charge, reconciles once, preserves edited version against late image",async()=>{
  let submitted=0,complete=false;const client={submit:async()=>{submitted++;return {requestId:"image-fixture-"+submitted,status:"queued",statusUrl:"",cancelUrl:""};},status:async()=>({requestId:"image-fixture-"+submitted,status:complete?"completed":"in_progress",...(complete?{images:[{url:"https://example.test/plant.png"}]}:{})})} as ReturnType<typeof createPlatformClient>;
  let r=await ready(await start()),key=randomUUID();const {credits}=await workflowImageQuote(user.id,r.id,r.project.slots[0].id),before=await balance();
  const payload={revision:r.revision,responseId:key,cardId:r.project.slots[0].id,credits};r=await startWorkflowImage(user.id,r.id,payload,client);assert.equal(r.status,"waiting_tool");r=await startWorkflowImage(user.id,r.id,payload,client);assert.equal(submitted,1);assert.equal(await balance(),before-credits);
  r=await act(r,{action:"spec",spec:{purpose:"educate",audience:"입문자",count:5,constraints:["간결하게"]}});const current=JSON.parse(JSON.stringify(r.project));complete=true;r=await pollWorkflowImage(user.id,r.id,client);assert.equal(r.visual?.state,"discarded");assert.deepEqual(r.project,current);await cancel(r);
});
await test("model payload honors configured model, strict formats, search sources and omits private reasoning",async()=>{
  let r=await start();assert.equal(workflowRequest(r).model,"gpt-5.6-terra");assert.deepEqual(workflowRequest(r).reasoning,{effort:"low"});r.stage="research";const request=workflowRequest(r);assert.deepEqual(request.tools,[{type:"web_search"}]);assert.deepEqual(request.include,["web_search_call.action.sources"]);
  const result=await workflowModel(r,async()=>Response.json({status:"completed",output:[{type:"reasoning",content:[{type:"output_text",text:"private"}]},{type:"web_search_call",action:{sources:[{url:source.url}]}},{type:"message",content:[{type:"output_text",text:JSON.stringify({summary:"done"})}]}]}));assert.deepEqual(result.value,{summary:"done"});assert.deepEqual(result.observedUrls,[source.url]);await cancel(r);
});
await test("image success attaches only its card, image failure refunds, unknown submissions never duplicate",async()=>{
  let r=await ready(await start());const originals=JSON.parse(JSON.stringify(r.project.slots));let calls=0;
  const client={submit:async()=>({requestId:`workflow-image-${++calls}`,status:"queued",statusUrl:"",cancelUrl:""}),status:async()=>({requestId:`workflow-image-${calls}`,status:"completed",images:[{url:"https://example.test/success.png"}]})} satisfies ReturnType<typeof createPlatformClient>;
  const {credits}=await workflowImageQuote(user.id,r.id,r.project.slots[0].id);r=await startWorkflowImage(user.id,r.id,{revision:r.revision,responseId:randomUUID(),cardId:r.project.slots[0].id,credits},client);
  assert.equal(r.status,"ready");assert.equal(r.project.slots[0].media?.url,"https://example.test/success.png");for(let i=1;i<5;i++)assert.deepEqual(JSON.parse(JSON.stringify(r.project.slots[i])),originals[i]);
  const before=await balance();r=await startWorkflowImage(user.id,r.id,{revision:r.revision,responseId:randomUUID(),cardId:r.project.slots[1].id,credits},{...client,status:async()=>({requestId:`workflow-image-${calls}`,status:"failed"})});assert.equal(r.visual?.state,"failed");assert.equal(await balance(),before);
  const input={revision:r.revision,responseId:randomUUID(),cardId:r.project.slots[1].id,credits};let attempts=0;
  const unknown={...client,submit:async()=>{attempts++;throw new Error("network unavailable");}};
  r=await startWorkflowImage(user.id,r.id,input,unknown);assert.equal(r.visual?.state,"unknown");r=await startWorkflowImage(user.id,r.id,input,unknown);assert.equal(attempts,1);await cancel(r);
});
await test("uploaded references enforce ownership; direct edit/reorder/restore retain stable card identities",async()=>{
  const asset=await saveAsset(user.id,new File([image],"plant-reference.png",{type:"image/png"}));
  await assert.rejects(()=>startWorkflow(other.id,{idea,key:randomUUID(),referenceAssetId:asset.id}),/참고 이미지/);
  let r=await ready(await start({referenceAssetId:asset.id}));assert.ok(r.project.slots.every(s=>s.media?.url.endsWith(asset.id)));
  const version=r.project.version,old=JSON.parse(JSON.stringify(r.project));r=await act(r,{action:"edit",cardId:r.project.slots[2].id,title:"한 줄로 알아봐요",body:"환경에 맞춰 골라요."});assert.equal(r.project.slots[2].title,"한 줄로 알아봐요");
  const ids=r.project.slots.map(s=>s.id);[ids[1],ids[2]]=[ids[2],ids[1]];r=await act(r,{action:"reorder",cardIds:ids});assert.deepEqual(r.project.slots.map(s=>s.id),ids);
  r=await act(r,{action:"spec",spec:{purpose:"educate",audience:"입문자",count:3,constraints:[]}});
  r=await step(r);r=await answer(r,"approve");r=await answer(r,"select","soft");r=await step(r);r=await step(r);assert.equal(r.project.slots.length,3);
  r=await act(r,{action:"restore",version});assert.equal(r.spec.count.value,"5");assert.deepEqual(JSON.parse(JSON.stringify(r.project.slots)),old.slots);assert.ok(r.project.version>version);await cancel(r);
});
await test("malformed intent options fall back to three explicit purposes instead of wasting a paid run",async()=>{
  let r=await start();r=await step(r,async()=>({value:{...understanding,options:[]}}));assert.equal(r.status,"waiting_user");assert.deepEqual(r.question?.options.map(o=>o.value),["educate","conversion","branding"]);await cancel(r);
});
await test("layout-only AI patch discards rewritten copy; explicit text permission is scoped; no length-only rejection",async()=>{
  let r=await ready(await start());const original=structuredClone(r.project.slots),id=original[2].id;
  r=await act(r,{action:"revise",cardIds:[id],feedback:"문구를 유지하고 본문 공간을 넓혀 주세요."});
  r=await step(r,async run=>({value:{summary:"본문 공간 확보",cards:[{...run.project.slots[2],title:"모델이 잘못 바꾼 제목",body:"삭제된 원문",prompt:"changed",kind:"quote",composition:"split",dim:.08,crop:50,readingLayout:"text-first"}]}}));
  for(const key of ["title","body","kicker","cta","prompt","kind"] as const)assert.equal(r.project.slots[2][key],original[2][key]);
  assert.equal(r.project.slots[2].readingLayout,"text-first");for(const i of [0,1,3,4])assert.deepEqual(JSON.parse(JSON.stringify(r.project.slots[i])),JSON.parse(JSON.stringify(original[i])));
  r=await step(r);r=await act(r,{action:"edit",cardId:id,title:original[2].title,body:"사용자가 확정한 문구를 보존합니다. ".repeat(10),cta:""});
  const { contentIssues }=await import("../src/service/card-workflow");assert.equal(contentIssues(r).length,0);await cancel(r);
});
await test("image batch is durable and idempotent, fills only missing cards and charges once per card",async()=>{
  await db.query("UPDATE users SET credits=500 WHERE id=$1",[user.id]);
  let r=await ready(await start());const asset=await saveAsset(user.id,new File([image],"cover.png",{type:"image/png"}));
  r=await act(r,{action:"asset",cardId:r.project.slots[0].id,assetId:asset.id});const original=structuredClone(r.project.slots),before=await balance();let calls=0;
  const client={submit:async()=>({requestId:`batch-${++calls}`,status:"queued",statusUrl:"",cancelUrl:""}),status:async()=>({requestId:`batch-${calls}`,status:"completed",images:[{url:`https://example.test/batch-${calls}.png`}]})} satisfies ReturnType<typeof createPlatformClient>;
  const q=await workflowImageQuote(user.id,r.id,original[0].id);assert.equal(q.missingCount,4);
  const payload={revision:r.revision,responseId:randomUUID(),credits:q.batchCredits};
  r=await startWorkflowImageBatch(user.id,r.id,payload,client);r=await startWorkflowImageBatch(user.id,r.id,payload,client);
  await assert.rejects(()=>act(r,{action:"layout",cardId:original[0].id,readingLayout:"balanced",crop:50}),/일괄 생성/);
  for(let i=0;i<10&&r.imageBatch?.state==="running";i++)r=await pollWorkflowImageBatch(user.id,r.id,client);
  assert.equal(r.imageBatch?.state,"completed");assert.equal(calls,4);assert.equal(r.project.slots.filter(s=>s.media).length,5);assert.equal(await balance(),before-q.batchCredits);
  assert.deepEqual(JSON.parse(JSON.stringify(r.project.slots[0])),JSON.parse(JSON.stringify(original[0])));r.project.slots.forEach((s,i)=>assert.equal(s.body,original[i].body));
  await startWorkflowImageBatch(user.id,r.id,payload,client);assert.equal(calls,4);await cancel(await getWorkflow(user.id,r.id));
});
await test("batch unknown pauses without another submission; cancellation stops remaining queue",async()=>{
  let r=await ready(await start()),calls=0;
  const client={submit:async()=>{calls++;throw new Error("transport unknown");}} as unknown as ReturnType<typeof createPlatformClient>;
  const q=await workflowImageQuote(user.id,r.id,r.project.slots[0].id);
  r=await startWorkflowImageBatch(user.id,r.id,{revision:r.revision,responseId:randomUUID(),credits:q.batchCredits},client);
  r=await pollWorkflowImageBatch(user.id,r.id,client);assert.equal(r.imageBatch?.state,"stopped");assert.equal(calls,1);
  r=await cancel(r);r=await pollWorkflowImageBatch(user.id,r.id,client);assert.equal(r.status,"cancelled");assert.equal(calls,1);
});
await test("actual PNG review binds ownership, project version and ZIP; failures block completion; layout invalidates review",async()=>{
  let r=await ready(await start());const asset=await saveZip(r);
  await assert.rejects(()=>finalizeWorkflow(user.id,r.id,{revision:r.revision,assetId:asset.id}),/검수/);
  await assert.rejects(()=>reviewWorkflowOutput(other.id,r.id,{revision:r.revision,assetId:asset.id,output:output(r)},qualityProvider),/찾을 수/);
  const request=qualityRequest(r,[image],output(r));assert.equal(request.model,r.model);assert.ok(JSON.stringify(request.input).includes("data:image/png;base64,"));assert.equal(request.store,false);
  const checks=output(r);checks[2].issues=["텍스트가 출력 경계를 벗어납니다."];
  r=await reviewWorkflowOutput(user.id,r.id,{revision:r.revision,assetId:asset.id,output:checks},qualityProvider);
  assert.equal(r.quality?.cards?.[2].findings.find(f=>f.criterion==="output")?.status,"fail");
  await assert.rejects(()=>finalizeWorkflow(user.id,r.id,{revision:r.revision,assetId:asset.id,acknowledged:true}),/수정 필요/);
  let calls=0;await reviewWorkflowOutput(user.id,r.id,{assetId:asset.id},async()=>{calls++;return null;});assert.equal(calls,0);
  r=await act(r,{action:"layout",cardId:r.project.slots[2].id,readingLayout:"text-first",crop:50});assert.equal(r.quality,undefined);
  const fresh=await saveZip(r);r=await reviewWorkflowOutput(user.id,r.id,{revision:r.revision,assetId:fresh.id,output:output(r)},async()=>{throw new Error("provider secret");});
  assert.equal(r.quality?.state,"failed");assert.equal(r.status,"ready");assert.ok(!JSON.stringify(r).includes("provider secret"));
  r=await reviewWorkflowOutput(user.id,r.id,{revision:r.revision,assetId:fresh.id,output:output(r)},qualityProvider);assert.equal(r.quality?.state,"ready");
  await assert.rejects(()=>finalizeWorkflow(user.id,r.id,{revision:r.revision,assetId:fresh.id}),/確認|확인/);
  await assert.rejects(()=>finalizeWorkflow(user.id,r.id,{revision:r.revision,assetId:fresh.id,acknowledged:true}),/예외 사유/);
  await cancel(r);
});
await test("late output review cannot overwrite a changed plan or cancellation",async()=>{
  let r=await ready(await start());const asset=await saveZip(r);let release!:()=>void,entered!:()=>void;
  const gate=new Promise<void>(resolve=>release=resolve),started=new Promise<void>(resolve=>entered=resolve);
  const pending=reviewWorkflowOutput(user.id,r.id,{revision:r.revision,assetId:asset.id,output:output(r)},async run=>{entered();await gate;return qualityProvider(run);});
  await started;r=await getWorkflow(user.id,r.id);r=await cancel(r);release();assert.equal((await pending).status,"cancelled");
});
await test("one failed image refunds and does not stop other approved cards; reload resumes without duplicating",async()=>{
  let r=await ready(await start()),calls=0,finished=false;const before=await balance();
  const client={submit:async()=>({requestId:`partial-${++calls}`,status:"queued",statusUrl:"",cancelUrl:""}),status:async(requestId:string)=>({requestId,status:!finished?"in_progress":requestId==="partial-2"?"failed":"completed",...(finished?(requestId==="partial-2"?{error:"fixture failure"}:{images:[{url:`https://example.test/${requestId}.png`}]}):{})})} as ReturnType<typeof createPlatformClient>;
  const q=await workflowImageQuote(user.id,r.id,r.project.slots[0].id);r=await startWorkflowImageBatch(user.id,r.id,{revision:r.revision,responseId:randomUUID(),credits:q.batchCredits},client);
  r=await getWorkflow(user.id,r.id);assert.equal(r.imageBatch?.index,0);r=await pollWorkflowImageBatch(user.id,r.id,client);assert.equal(calls,1);
  finished=true;for(let i=0;i<12&&r.imageBatch?.state==="running";i++)r=await pollWorkflowImageBatch(user.id,r.id,client);
  assert.equal(calls,5);assert.equal(r.imageBatch?.state,"completed");assert.equal(r.project.slots.filter(s=>s.media).length,4);assert.equal(await balance(),before-q.credits*4);
  assert.equal(r.imageBatch?.results.filter(x=>x.state==="failed").length,1);await cancel(r);
});
await test("duplicate visual review is single-flight, foreign archive and altered reviewed bytes are rejected",async()=>{
  let r=await ready(await start());const asset=await saveZip(r);let release!:()=>void,entered!:()=>void,calls=0;
  const gate=new Promise<void>(resolve=>release=resolve),started=new Promise<void>(resolve=>entered=resolve);
  const pending=reviewWorkflowOutput(user.id,r.id,{revision:r.revision,assetId:asset.id,output:output(r)},async run=>{calls++;entered();await gate;return qualityProvider(run);});
  await started;await assert.rejects(()=>reviewWorkflowOutput(user.id,r.id,{revision:r.revision,assetId:asset.id,output:output(r)},qualityProvider),/최신/);release();r=await pending;assert.equal(calls,1);
  const original=archive(r);await db.query("UPDATE assets SET data=$1 WHERE id=$2",[Buffer.from([...original,0]),asset.id]);
  await assert.rejects(()=>finalizeWorkflow(user.id,r.id,{revision:r.revision,assetId:asset.id,acknowledged:true,imageException:"텍스트 카드 테스트"}),/검증 실패/);
  r=await act(r,{action:"image_prompt",cardId:r.project.slots[0].id,prompt:"New plant photograph, no text."});assert.equal(r.quality,undefined);
  const foreign=await saveAsset(other.id,new File([archive(r).buffer as ArrayBuffer],"other.zip",{type:"application/zip"}),true);
  await assert.rejects(()=>reviewWorkflowOutput(user.id,r.id,{revision:r.revision,assetId:foreign.id,output:output(r)},qualityProvider),/찾지/);await cancel(r);
});
await test("batch stops when provider pricing changes instead of exceeding approved cost",async()=>{
  let r=await ready(await start()),calls=0;
  const client={submit:async()=>({requestId:`price-${++calls}`,status:"queued",statusUrl:"",cancelUrl:""}),status:async()=>({requestId:"price-1",status:"completed",images:[{url:"https://example.test/price.png"}]})} satisfies ReturnType<typeof createPlatformClient>;
  const q=await workflowImageQuote(user.id,r.id,r.project.slots[0].id);r=await startWorkflowImageBatch(user.id,r.id,{revision:r.revision,responseId:randomUUID(),credits:q.batchCredits},client);
  const saved=process.env.IMAGE_CREDIT_COST;process.env.IMAGE_CREDIT_COST="8";
  try { r=await pollWorkflowImageBatch(user.id,r.id,client);assert.equal(r.imageBatch?.state,"stopped");assert.equal(calls,1);assert.match(r.events.at(-1)?.title||"",/비용/); }
  finally { if(saved===undefined)delete process.env.IMAGE_CREDIT_COST;else process.env.IMAGE_CREDIT_COST=saved;await cancel(r); }
});

await test("card image instructions preserve intended props and follow full versus split composition", async () => {
  const r = await start();
  const slot = r.project.slots[0];
  slot.prompt = "A plant observation notebook beside a potted plant, warm side light.";
  slot.composition = "full";
  const full = workflowImagePlane(r, slot.id).prompt.text;
  assert.match(full, /plant observation notebook/);
  assert.match(full, /full-bleed portrait/);
  assert.doesNotMatch(full, /no books|no printed pages|wide crop for a card header/i);
  slot.composition = "split";
  assert.match(workflowImagePlane(r, slot.id).prompt.text, /breathing room/);
  await cancel(r);
});
