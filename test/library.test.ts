import test from "node:test";
import assert from "node:assert/strict";
process.env.LOCAL_DATABASE_DIR="memory://";
const {database}=await import("../src/service/db");
const {libraryList,adminLibraryFile}=await import("../src/service/library");
const {saveAsset,assetFile}=await import("../src/service/assets");
const db=await database();
for(const [id,admin] of [["library-admin",true],["library-a",false],["library-b",false]] as const)
  await db.query("INSERT INTO users (id,email,username,name,password_hash,is_admin,created_at) VALUES ($1,$2,$1,$1,'fixture',$3,1)",[id,`${id}@example.test`,admin]);
await db.query("INSERT INTO projects(id,owner_id,document,updated_at,deleted_at) VALUES ('card-project','library-a',$1,1,2)",[JSON.stringify({title:"Olive campaign",format:"card-news"})]);
async function job(id:string,owner:string,result:unknown,project:string|null=null,state="completed") {
  await db.query("INSERT INTO generation_jobs(id,user_id,idempotency_key,state,cost,plane,result,project_id,created_at,provider_credential) VALUES ($1,$2,$1,$3,4,$4,$5,$6,100,'NEVER-EXPOSE')",[id,owner,state,JSON.stringify({model:"soul-model",prompt:{text:"Olive botanical photography"}}),JSON.stringify(result),project]);
}
await job("batch-a","library-a",{images:[{url:"https://example.com/one.png"},{url:"https://example.com/two.png"}]},"card-project");
await job("video-b","library-b",{video:{url:"https://example.com/video.mp4"}});
await job("pending-a","library-a",{images:[{url:"https://example.com/pending.png"}]},null,"pending");
await job("unsafe-a","library-a",{images:[{url:"javascript:alert(1)"}]});
const asset=await saveAsset("library-b",new File(["fixture bytes"],"uploaded.png",{type:"image/png"}));
await test("library scopes ordinary users to their own outputs even with forged owner filters",async()=>{
  const result=await libraryList("library-a",{userId:"library-b",user:"library-b"});
  assert.equal(result.total,2);assert.ok(result.items.every(i=>i.ownerId==="library-a"));
  assert.deepEqual(result.items.map(i=>i.feature),["card-news","card-news"]);
  assert.ok(result.items.every(i=>i.projectDeleted));
  assert.ok(!JSON.stringify(result).includes("NEVER-EXPOSE"));
  await assert.rejects(()=>libraryList("library-a",{},true),/관리자/);
});
await test("admin filters compose across users, features, type, prompt and all batch outputs",async()=>{
  assert.equal((await libraryList("library-admin",{},true)).total,4);
  const video=await libraryList("library-admin",{user:"library-b",feature:"studio-video",kind:"video",search:"botanical"},true);
  assert.equal(video.total,1);assert.equal(video.items[0].ownerId,"library-b");
  assert.equal((await libraryList("library-admin",{userId:"library-a",feature:"studio-video"},true)).total,0);
  const files=await libraryList("library-admin",{feature:"files",userId:"library-b"},true);
  assert.equal(files.total,1);assert.equal(files.items[0].url,`/api/workspace/admin/library-file/${asset.id}`);
});
await test("saved uploads are listed and file access stays owner-only except explicit admin endpoint",async()=>{
  const list=await libraryList("library-b",{feature:"files"});assert.equal(list.items[0].name,"uploaded.png");
  assert.equal(list.items[0].url,`/api/workspace/assets/${asset.id}`);
  await assert.rejects(()=>assetFile("library-a",asset.id),/찾을 수/);
  await assert.rejects(()=>adminLibraryFile("library-a",asset.id),/관리자/);
  assert.equal((await adminLibraryFile("library-admin",asset.id)).name,"uploaded.png");
  await assert.rejects(()=>adminLibraryFile("library-admin","missing"),/찾을 수/);
});
await test("library pagination has no 100-item truncation and stable batch ordering",async()=>{
  await job("large-batch","library-a",{images:Array.from({length:105},(_,i)=>({url:`https://example.com/batch-${i}.png`}))});
  const seen=new Set<string>();
  for(let page=1;page<=5;page++){
    const result=await libraryList("library-a",{page:String(page)});
    assert.equal(result.total,107);assert.equal(result.pages,5);
    for(const item of result.items){assert.ok(!seen.has(item.id));seen.add(item.id);}
  }
  assert.equal(seen.size,107);assert.equal((await libraryList("library-a",{page:"999"})).page,5);
});
await test("library rejects malformed filters and queries do not interpolate search input",async()=>{
  for(const filters of [{feature:"unknown"},{feature:"toString"},{kind:"script"},{page:"NaN"},{page:"-1"}])await assert.rejects(()=>libraryList("library-a",filters),/확인/);
  assert.equal((await libraryList("library-admin",{search:"' OR 1=1 --"},true)).total,0);
});
