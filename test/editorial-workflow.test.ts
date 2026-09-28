import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { LandingWorkflow } from "../src/projects/landing-workflow";
import { EDITORIAL_CRITERIA, newEditorialLoop } from "../src/projects/editorial-review";
import { recordEditorialReview } from "../src/service/editorial-review";
process.env.LOCAL_DATABASE_DIR = "memory://";
process.env.OPENAI_API_KEY = "sk-editorial-fixture";
process.env.OPENAI_OUTLINE_MODEL = "gpt-5.6-terra";
const { authenticate } = await import("../src/service/auth");
const { database } = await import("../src/service/db");
const { startLanding, stepLanding, actLanding, getLanding } = await import("../src/service/landing-workflow");
const { startReel, stepReel, actReel } = await import("../src/service/reel-workflow");
const { landingModelRequest } = await import("../src/service/landing-model");
const { reelModelRequest } = await import("../src/service/reel-model");
const user = (await authenticate({ email: "editorial@test.example", password: "test123456", name: "Editorial QA" }, true)).user;
const db = await database();
const criteria = (fail = false) => Object.keys(EDITORIAL_CRITERIA).map(key => ({ key, status: fail && key === "narrative" ? "fail" : "pass", evidence: `${key} 기준의 구체적 관찰` }));
const report = (id = "", fail = false) => ({ summary: fail ? "같은 메시지가 반복됩니다. 두 번째 항목에 구체적 쓰임을 넣어 주세요." : "각 항목의 역할과 원문을 대조했습니다.", criteria: criteria(fail), issues: fail ? [{ sectionId: id, sceneId: id, severity: "error", message: "두 번째 항목의 중복 문장을 구체적 쓰임으로 고치세요." }] : [] });
const act = (r: LandingWorkflow, data: Record<string,unknown>) => actLanding(user.id,r.id,{revision:r.revision,responseId:randomUUID(),...data});
async function landing(format = "landing") {
 let r = await startLanding(user.id,{key:randomUUID(),format,idea:"도자기 컵을 소개하는 3개 섹션. 입력하지 않은 효능이나 가격은 만들지 않기.",...(format === "product-detail" ? {product:{name:"초록 컵",category:"컵",price:"28,000원",options:"초록",specs:"300ml",usage:"일상의 차 한 잔",shipping:"확인 필요",returns:"확인 필요"}} : {})});
 r = await stepLanding(user.id,r.id,r.revision,async()=>({summary:"방향",brand:"",audience:"차를 마시는 사람",problem:"매일 쓸 컵",value:"차분한 모양",goal:"브랜드·서비스 소개",ctaLabel:"더 알아보기",traffic:"",explicit:[]}));
 r = await act(r,{action:"confirm_intent",intent:{...r.intent,ctaHref:"https://example.test/cup"}});
 r = await stepLanding(user.id,r.id,r.revision,async()=>({summary:"세 섹션",sections:["hero","story","cta"].map((kind,i)=>({kind,title:`컵 ${i}`,question:"왜 이 컵인가요?",message:"컵의 모양을 살펴보세요."}))}));
 r = await act(r,{action:"confirm_plan",plan:r.plan});
 return stepLanding(user.id,r.id,r.revision,async current=>({summary:"초안",title:"매일의 컵",sections:current.plan.map(s=>({id:s.id,title:s.title,body:"차분한 모양을 담았어요.",kicker:"CUP",prompt:"A green cup. No text, no logos."}))}));
}
await test("landing and product detail repair only flagged sections, preserve images/policy/CTA and re-review before ready", async()=>{
 for(const format of ["landing","product-detail"]){
  let r=await landing(format), original=structuredClone(r.project), id=r.project.slots[1].id;
  r=await stepLanding(user.id,r.id,r.revision,async()=>report(id,true));
  assert.equal(r.stage,"refine");assert.equal(r.status,"pending");assert.equal(r.editorial?.repairs,1);
  const request=landingModelRequest(r);assert.match(String(request.input),/두 번째 항목/);
  r=await stepLanding(user.id,r.id,r.revision,async current=>({summary:"두 번째 문구를 구체화",sections:[{...current.project.slots[1],body:"차를 마시는 자리에 놓아 보세요.",prompt:""}]}));
  assert.equal(r.stage,"review");assert.equal(r.project.slots[1].prompt,original.slots[1].prompt);
  assert.deepEqual(r.project.slots.filter(s=>s.id!==id),original.slots.filter(s=>s.id!==id));assert.deepEqual(r.project.product,original.product);
  r=await stepLanding(user.id,r.id,r.revision,async()=>report());
  assert.equal(r.status,"ready");assert.equal(r.editorial?.reviews.length,2);assert.equal(r.editorial?.reviews[0].issues.length,1);assert.equal(r.editorial?.reviews[1].issues.length,0);
  await act(r,{action:"cancel"});
 }
});
await test("landing repeat failures stop after two corrections, keep report, and respect scoped revisions",async()=>{
 let r=await landing(), id=r.project.slots[1].id;
 for(let round=0;round<3;round++){
  r=await stepLanding(user.id,r.id,r.revision,async()=>report(id,true));
  if(round<2)r=await stepLanding(user.id,r.id,r.revision,async current=>({summary:"부분 보정",sections:[current.project.slots[1]]}));
 }
 assert.equal(r.status,"ready");assert.equal(r.editorial?.repairs,2);assert.equal(r.editorial?.reviews.length,3);assert.equal(r.review?.issues.length,1);
 r=await act(r,{action:"revise",sectionId:id,feedback:"이 섹션만 명확하게"});
 r=await stepLanding(user.id,r.id,r.revision,async current=>({summary:"의견 반영",sections:[current.project.slots[1]]}));
 r=await stepLanding(user.id,r.id,r.revision,async current=>report(current.project.slots[0].id,true));
 assert.equal(r.status,"ready");assert.equal(r.editorial?.repairs,0);assert.equal(r.review?.issues.length,1);
 await act(r,{action:"cancel"});
});
await test("review budget reserves room for re-review and cancellation fences a late refinement",async()=>{
 let r=await landing(), id=r.project.slots[1].id;r.maxCalls=r.calls+2;
 await db.query("UPDATE landing_workflows SET data=$1 WHERE id=$2",[JSON.stringify(r),r.id]);
 r=await stepLanding(user.id,r.id,r.revision,async()=>report(id,true));assert.equal(r.status,"ready");assert.equal(r.editorial?.repairs,0);await act(r,{action:"cancel"});
 r=await landing();id=r.project.slots[1].id;r=await stepLanding(user.id,r.id,r.revision,async()=>report(id,true));
 let finish!:(v:unknown)=>void,started!:()=>void;const startedPromise=new Promise<void>(resolve=>started=resolve),result=new Promise(resolve=>finish=resolve);
 const pending=stepLanding(user.id,r.id,r.revision,async()=>{started();return result;});await startedPromise;
 const cancelled=await act(await getLanding(user.id,r.id),{action:"cancel"});finish({summary:"late",sections:[r.project.slots[1]]});
 assert.equal((await pending).status,"cancelled");assert.equal((await getLanding(user.id,r.id)).revision,cancelled.revision);
});
async function reel(){
 let r=await startReel(user.id,{key:randomUUID(),idea:"세 컷의 차분한 컵 릴스. 구매 유도 없음",duration:15});
 r=await stepReel(user.id,r.id,r.revision,async()=>({value:{summary:"방향",purpose:"branding",purposeExplicit:true,audience:"차를 마시는 사람",constraints:[],needResearch:false}}));
 return stepReel(user.id,r.id,r.revision,async()=>({value:{summary:"콘티",title:"차 한 잔",caption:"",scenes:[1,2,3].map(i=>({id:`scene-${i}`,role:String(i),title:`컵 ${i}`,screenText:"차분한 순간",narration:"",prompt:"A green cup. No text.",seconds:5}))}}));
}
await test("reels add independent script review before approval and refine without changing source, prompt or timing",async()=>{
 let r=await reel();assert.equal(r.stage,"review");assert.equal(r.question,undefined);
 const previous=structuredClone(r.scenes);
 r=await stepReel(user.id,r.id,r.revision,async()=>({value:report("scene-2",true)}));assert.equal(r.stage,"refine");
 assert.match(JSON.stringify(reelModelRequest(r).input),/두 번째 항목/);
 r=await stepReel(user.id,r.id,r.revision,async()=>({value:{summary:"두 번째 컷 보정",scenes:[{...previous[1],screenText:"따뜻한 차 한 잔을 담아요",seconds:0,prompt:""}]}}));
 assert.equal(r.stage,"review");assert.equal(r.scenes[1].frames,150);assert.equal(r.scenes[1].prompt,previous[1].prompt);assert.deepEqual(r.scenes[0],previous[0]);
 r=await stepReel(user.id,r.id,r.revision,async()=>({value:report()}));assert.equal(r.question?.kind,"plan");assert.equal(r.editorial?.reviews.length,2);
 r=await actReel(user.id,r.id,{revision:r.revision,responseId:randomUUID(),action:"answer",requestId:r.question!.id});
 assert(r.scenes.every(s=>s.copyLocked));
 r=await actReel(user.id,r.id,{revision:r.revision,responseId:randomUUID(),action:"revise",sceneIds:["scene-2"],feedback:"문구는 보호하고 그대로 검수"});
 r=await stepReel(user.id,r.id,r.revision,async current=>({value:{summary:"보호된 원문 유지",scenes:[{...current.scenes[1],seconds:5,title:"discard locked change"}]}}));
 r=await stepReel(user.id,r.id,r.revision,async()=>({value:report("scene-2",true)}));assert.equal(r.status,"ready");assert.equal(r.editorial?.repairs,0);assert.equal(r.scenes[1].title,previous[1].title);
 await actReel(user.id,r.id,{revision:r.revision,responseId:randomUUID(),action:"cancel"});
});
await test("structured criteria reject duplicated keys and retain all five review criteria",()=>{
 const loop=newEditorialLoop();assert.throws(()=>recordEditorialReview(loop,{summary:"bad",criteria:Array(5).fill(criteria()[0])},[]),/중복/);
 recordEditorialReview(loop,report(),[]);assert.equal(loop.reviews[0].criteria.length,5);
});
