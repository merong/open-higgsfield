import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { FONT_CATALOG, TYPOGRAPHY_PRESETS, typographyPreset, typographyFaces, typographyCoverage, pageTypographyCss, fontFaceCss, fontWeights } from "../src/projects/typography";
import { parseTypography, parseTypographyRecommendations, proposeTypography } from "../src/projects/typography-validation";
import { createDraft } from "../src/projects/outline";
import { parseProject } from "../src/projects/validation";
import { landingHtml } from "../src/render/landing";
import type { CardWorkflow } from "../src/projects/card-workflow";
import type { LandingWorkflow } from "../src/projects/landing-workflow";
process.env.LOCAL_DATABASE_DIR="memory://";
process.env.OPENAI_API_KEY="sk-typography-test-not-real";
process.env.OPENAI_OUTLINE_MODEL="gpt-5.6-terra";
process.env.OPENAI_REASONING_EFFORT="low";
const {authenticate}=await import("../src/service/auth");
const {database}=await import("../src/service/db");
const {createProject,getProject}=await import("../src/service/projects");
const {startWorkflow,stepWorkflow,actWorkflow,getWorkflow}=await import("../src/service/card-workflow");
const {startLanding,stepLanding,actLanding,getLanding}=await import("../src/service/landing-workflow");
const {workflowRequest}=await import("../src/service/workflow-model");
const {landingModelRequest}=await import("../src/service/landing-model");
const {typographyRecommendationModel,typographyRecommendationRequest,recommendProjectTypography}=await import("../src/service/typography");
const user=(await authenticate({email:"typography@test.example",name:"Type QA",password:"testpass1234"},true)).user;
const other=(await authenticate({email:"type-other@test.example",name:"Other",password:"testpass1234"},true)).user;
const db=await database();
const recommendations=[{presetId:"clear",reason:"관리 방법을 빠르고 정확하게 읽는 정보형 구성입니다.",caution:"제목이 길면 줄바꿈을 먼저 확인해 주세요."},{presetId:"natural",reason:"식물의 이야기를 차분하게 전달합니다.",caution:"작은 명조의 획을 확인해 주세요."},{presetId:"technical",reason:"비교와 숫자의 위계를 분명하게 만듭니다.",caution:"가격과 숫자는 실제 정보만 사용해 주세요."}];
const draft=(format:"card-news"|"landing"|"product-detail"="card-news")=>createDraft(format,{topic:"오늘의 초록을 발견하세요",audience:"초보자",tone:"calm",count:3,mustInclude:"식물 3가지 · Green 2026"});
const act=(r:CardWorkflow,data:Record<string,unknown>)=>actWorkflow(user.id,r.id,{revision:r.revision,responseId:randomUUID(),...data});
const pageAct=(r:LandingWorkflow,data:Record<string,unknown>)=>actLanding(user.id,r.id,{revision:r.revision,responseId:randomUUID(),...data});

await test("font registry has 10 Korean and 10 Latin official distributions with exact hashes and licenses",async()=>{
 assert.equal(FONT_CATALOG.length,20);assert.equal(FONT_CATALOG.filter(f=>f.language==="ko").length,10);
 for(const font of FONT_CATALOG){
  assert.match(font.source,/^https:\/\/(github\.com|raw\.githubusercontent\.com)\//);
  const license=await readFile(`public${font.licensePath}`);assert.equal(createHash("sha256").update(license).digest("hex"),font.licenseSha256);assert.match(license.toString(),/SIL OPEN FONT LICENSE/);
  for(const face of font.faces){const bytes=await readFile(`public${face.path}`);assert.equal(bytes.length,face.bytes);assert.equal(createHash("sha256").update(bytes).digest("hex"),face.sha256);assert(face.coverage.length);assert(face.weights.length);}
 }
 for(const preset of TYPOGRAPHY_PRESETS)assert.doesNotThrow(()=>parseTypography(typographyPreset(preset.id)));
});
await test("roles and real weights are validated; unknown font URLs and synthesized bold are rejected",()=>{
 const t=typographyPreset("statement");assert.deepEqual(fontWeights("black-han-sans"),[400]);assert.equal(t.title.weight,400);
 for(const bad of [{...t,title:{font:"https://evil/font",weight:400}},{...t,title:{font:"black-han-sans",weight:700}},{...t,body:t.title},{...t,accent:t.body},{...t,version:2},{...t,title:{font:"pretendard",weight:Infinity}}])assert.throws(()=>parseTypography(bad));
 assert.equal(typographyCoverage(t,"title","뛟").missing.length,0);assert(typographyCoverage(t,"title","뛟").substituted.includes("뛟"));
 assert(typographyCoverage(t,"body","\u{10FFFF}").missing.length);
 assert.match(pageTypographyCss(t),/font-synthesis:none/);assert.match(fontFaceCss(t),/font-weight:400/);
 const mixed=fontFaceCss(typographyPreset("clear"));assert.match(mixed,/font-family:'OHF Inter 600';[^}]+font-weight:600/);assert.match(mixed,/font-family:'OHF Pretendard 800';[^}]+font-weight:800/);assert(!mixed.includes("font-weight:100 900"));
});
await test("all three formats retain typography through validation and only catalog CSS reaches HTML",()=>{
 for(const format of ["card-news","landing","product-detail"] as const){const p=draft(format);p.typography=typographyPreset("natural",true);assert.deepEqual(parseProject(p).typography,p.typography);if(format!=="card-news"){
  const paths=Object.fromEntries(typographyFaces(p.typography).map(({face},i)=>[face.path,`assets/font-${i}.woff2`]));const html=landingHtml(p,{},"",false,paths);
  assert.match(html,/OHF Gowun Batang/);assert.match(html,/OHF SUIT/);assert.match(html,/assets\/font-/);assert(!html.includes("url('')"));assert(!html.includes("fonts.googleapis"));assert.match(html,/오늘의 초록/);
 }}
 const old=draft("landing");assert(!parseProject(old).typography);assert.match(landingHtml(old),/PretendardVariable/);
});
await test("AI suggestions are distinct and allowlisted; confirmed user selection is never replaced",()=>{
 assert.equal(parseTypographyRecommendations(recommendations).length,3);
 for(const bad of [recommendations.slice(0,2),[recommendations[0],recommendations[0],recommendations[2]],recommendations.map(r=>({...r,presetId:"external"}))])assert.throws(()=>parseTypographyRecommendations(bad));
 const p=draft();proposeTypography(p,recommendations);assert.equal(p.typography?.preset,"clear");
 p.typography=typographyPreset("natural",true);proposeTypography(p,recommendations);assert.equal(p.typography.preset,"natural");
});
await test("manual AI recommendation is owned, version-bound, uncharged and handles provider failures",async()=>{
 const p=await createProject(user.id,draft());const before=(await db.query<{credits:number}>("SELECT credits FROM users WHERE id=$1",[user.id]))[0].credits;
 const response=await recommendProjectTypography(user.id,{projectId:p.id,version:p.version},async copy=>{assert.equal(copy.title,p.title);return recommendations;});assert.equal(response.projectVersion,p.version);
 assert.equal((await getProject(user.id,p.id)).typography,undefined);assert.equal((await db.query<{credits:number}>("SELECT credits FROM users WHERE id=$1",[user.id]))[0].credits,before);
 await assert.rejects(recommendProjectTypography(other.id,{projectId:p.id,version:p.version}),/찾을 수 없습니다/);
 await assert.rejects(recommendProjectTypography(user.id,{projectId:p.id,version:99}),/바뀌었어요/);
 const request=typographyRecommendationRequest(p,"gpt-5.6-terra","low");assert.deepEqual(request.reasoning,{effort:"low"});assert.equal(request.text.format.strict,true);assert.match(request.input,/식물/);
 assert.deepEqual(await typographyRecommendationModel(p,async()=>Response.json({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify({recommendations})}]}]})),recommendations);
 for(const fetcher of [async()=>new Response(null,{status:401}),async()=>Response.json({status:"incomplete",output:[]}),async()=>Response.json({status:"completed",output:[{type:"message",content:[{type:"output_text",text:"{}"}]}]}),async()=>{throw new Error("network");}])await assert.rejects(typographyRecommendationModel(p,fetcher));
});
await test("card workflow proposes typography with planning and changing fonts preserves copy while invalidating output",async()=>{
 let r=await startWorkflow(user.id,{idea:"식물 관리 정보를 이해하기 쉽게 소개하는 카드뉴스",count:3,key:randomUUID(),mode:"guided"});
 r=await stepWorkflow(user.id,r.id,r.revision,async()=>({value:{summary:"정보형 의도 확인",purpose:"educate",purposeExplicit:true,audience:"초보자",audienceExplicit:true,channel:"인스타그램",channelExplicit:true,count:3,countExplicit:true,needResearch:false,constraints:[],question:"",options:[]}}));
 assert.match(workflowRequest(r).instructions,/타이포그래피/);assert("typographyRecommendations" in workflowRequest(r).text.format.schema.properties);
 r=await stepWorkflow(user.id,r.id,r.revision,async()=>({value:{summary:"3장 기획",typographyRecommendations:recommendations,cards:r.project.slots.map((_,i)=>({role:i===0?"표지":"정보",title:`식물 이야기 ${i+1}`,message:"한글 본문과 Green 2026을 보존합니다.",imagePrompt:"A green plant, no text, no logos"}))}}));
 assert.equal(r.project.typography?.preset,"clear");const copy=structuredClone(r.project.slots),version=r.project.version;
 r=await act(r,{action:"typography",typography:typographyPreset("natural")});assert.deepEqual(r.project.slots,copy);assert(r.project.version>version);assert.equal(r.project.typography?.confirmed,true);
 await assert.rejects(actWorkflow(other.id,r.id,{action:"typography",typography:typographyPreset(),revision:r.revision,responseId:randomUUID()}));
 await assert.rejects(actWorkflow(user.id,r.id,{action:"typography",typography:typographyPreset(),revision:1,responseId:randomUUID()}),/변경/);
 // Existing reviewed output must be invalidated even if the only change is typography.
 const seeded={...r,status:"ready",quality:{state:"ready",projectVersion:r.project.version,assetId:randomUUID(),zipHash:"test"},artifacts:{projectVersion:r.project.version,zipUrl:"test",files:[],width:1080,height:1350}};
 await db.query("UPDATE card_workflows SET data=$1 WHERE id=$2",[JSON.stringify(seeded),r.id]);
 r=await act(await getWorkflow(user.id,r.id),{action:"typography",typography:typographyPreset("technical")});assert.equal(r.quality,undefined);assert.equal(r.artifacts,undefined);assert.deepEqual(r.project.slots,copy);
 assert.equal((await getWorkflow(user.id,r.id)).project.typography?.preset,"technical");await act(r,{action:"cancel"});
});
await test("landing and product plans propose fonts; approval, copy generation and handoff preserve the selected family",async()=>{
 for(const format of ["landing","product-detail"] as const){
  let r=await startLanding(user.id,{idea:"사진과 설명으로 소개하는 초록 머그",format,key:randomUUID(),...(format==="product-detail"?{product:{name:"초록 머그"}}:{})});
  r=await stepLanding(user.id,r.id,r.revision,async()=>({summary:"의도 정리",brand:"Green",audience:"초보자",problem:"공간을 꾸미고 싶음",value:"차분한 초록",goal:"브랜드 소개",ctaLabel:"살펴보기",traffic:"인스타그램",explicit:[]}));
  r=await pageAct(r,{action:"confirm_intent",intent:r.intent});
  const request=landingModelRequest(r);assert.match(request.instructions,/타이포그래피/);assert("typographyRecommendations" in request.text.format.schema.properties);
  r=await stepLanding(user.id,r.id,r.revision,async()=>({summary:"페이지 흐름",typographyRecommendations:recommendations,sections:["hero","story","cta"].map(kind=>({kind,title:"초록의 시간",question:"무엇을 소개하나요?",message:"차분하게 살펴봐요."}))}));
  r=await pageAct(r,{action:"typography",typography:typographyPreset("premium")});r=await pageAct(r,{action:"confirm_plan",plan:r.plan});
  r=await stepLanding(user.id,r.id,r.revision,async()=>({summary:"원고 작성",title:"초록의 시간",sections:r.plan.map(s=>({id:s.id,title:s.title,body:"확정한 상품명과 문구를 유지해요.",kicker:"GREEN",prompt:"A green ceramic mug, no text, no logos"}))}));
  assert.equal(r.project.typography?.preset,"premium");
  r=await stepLanding(user.id,r.id,r.revision,async()=>({summary:"원고 검수",issues:[]}));const before=structuredClone(r.project.slots);
  r=await pageAct(r,{action:"typography",typography:typographyPreset("natural")});assert.deepEqual(JSON.parse(JSON.stringify(r.project.slots)),JSON.parse(JSON.stringify(before)));assert.equal(r.review?.version,r.contentVersion);
  r=await pageAct(r,{action:"handoff",acknowledged:true});assert.equal(r.status,"completed");assert.equal((await getLanding(user.id,r.id)).project.typography?.preset,"natural");assert.equal((await getProject(user.id,r.projectId)).typography?.confirmed,true);
 }
});
