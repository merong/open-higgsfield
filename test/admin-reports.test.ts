import test from "node:test";
import assert from "node:assert/strict";
process.env.LOCAL_DATABASE_DIR="memory://";
const {database}=await import("../src/service/db");
const {seedDemo}=await import("../src/service/demo");
const {adminList,adminDashboard}=await import("../src/service/admin-reports");
const {adminOverview}=await import("../src/service/admin");
const {createProject,archiveProject}=await import("../src/service/projects");
const {createDraft}=await import("../src/projects/outline");
const {MODELS}=await import("../src/generation/catalog");
await seedDemo();
const db=await database();
const [admin]=await db.query<{id:string}>("SELECT id FROM users WHERE username='admin'");
const [one]=await db.query<{id:string}>("SELECT id FROM users WHERE username='user1'");
const [two]=await db.query<{id:string}>("SELECT id FROM users WHERE username='user2'");
const project=await createProject(one.id,createDraft("card-news",{topic:"Spring launch",audience:"Customers",tone:"calm",count:3,mustInclude:""}));
const archived=await createProject(two.id,createDraft("landing",{topic:"Archived campaign",audience:"",tone:"calm",count:3,mustInclude:""}));
await archiveProject(two.id,archived.id);
const videoModel=MODELS.find(m=>m.surface==="video")!.id;
for(let n=0;n<27;n++)await db.query("INSERT INTO generation_jobs(id,user_id,idempotency_key,state,cost,plane,project_id,created_at,provider_credential,provider_origin) VALUES($1,$2,$1,$3,5,$4,$5,$6,'private-sealed-credential','private-provider-origin')",[`report-job-${n}`,n===26?two.id:one.id,n===0?"unknown":n===1?"pending":n===2?"failed":"completed",JSON.stringify({model:n===26?videoModel:"fixture-image",prompt:{text:`Unique prompt ${n}`},media:{secret:"private-reference"}}),n===26?null:project.id,Date.now()+n]);

await test("all admin reports recheck role and omit credential and password fields",async()=>{
  for(const section of ["users","projects","activity"] as const)await assert.rejects(()=>adminList(one.id,section),/관리자/);
  await assert.rejects(()=>adminDashboard(one.id),/관리자/);
  await assert.rejects(()=>adminList("missing","users"),/관리자/);
  const reports=JSON.stringify(await Promise.all([adminDashboard(admin.id),adminList(admin.id,"users"),adminList(admin.id,"activity")]));
  for(const forbidden of ["password_hash","provider_credential","private-sealed-credential","private-provider-origin","private-reference"])assert.ok(!reports.includes(forbidden));
});
await test("user reports support role/search filters and accurate per-user counts",async()=>{
  const users=await adminList(admin.id,"users",{search:"user1",filter:"member"});
  assert.equal(users.total,1);assert.equal(users.items[0].id,one.id);
  assert.equal(users.items[0].projects,1);assert.equal(users.items[0].jobs,26);
  assert.equal((await adminList(admin.id,"users",{filter:"admin"})).total,1);
  assert.equal((await adminList(admin.id,"users",{search:"' OR 1=1 --"})).total,0);
});
await test("project reports separate archived work and combine owner and format filters",async()=>{
  assert.equal((await adminList(admin.id,"projects")).total,2);
  const rows=await adminList(admin.id,"projects",{filter:"active",feature:"card-news",user:"user1",search:"Spring"});
  assert.equal(rows.total,1);assert.equal(rows.items[0].document.slots.length,project.slots.length);
  assert.equal((await adminList(admin.id,"projects",{userId:two.id,filter:"active"})).total,0);
  const archive=await adminList(admin.id,"projects",{filter:"archived"});assert.equal(archive.items[0].id,archived.id);
});
await test("generation reports paginate deterministically and filter user, status and feature",async()=>{
  const first=await adminList(admin.id,"activity",{userId:one.id}),last=await adminList(admin.id,"activity",{userId:one.id,page:"99"});
  assert.equal(first.total,26);assert.equal(first.items.length,25);assert.equal(last.page,2);assert.equal(last.items.length,1);
  assert.equal(new Set([...first.items,...last.items].map(j=>j.id)).size,26);
  assert.equal((await adminList(admin.id,"activity",{filter:"unknown"})).total,1);
  assert.equal((await adminList(admin.id,"activity",{filter:"processing"})).total,1);
  assert.equal((await adminList(admin.id,"activity",{user:"user2",feature:"studio-video"})).total,1);
  assert.equal((await adminList(admin.id,"activity",{feature:"card-news",search:"Unique prompt 26"})).total,0);
  for(const filters of [{page:"-1"},{page:"1.5"},{filter:"nonsense"},{feature:"nonsense"}])await assert.rejects(()=>adminList(admin.id,"activity",filters));
});
await test("dashboard aggregates persisted work and ledger filters retain selected users",async()=>{
  const data=await adminDashboard(admin.id);
  assert.equal(data.users,10);assert.equal(data.projects,1);assert.equal(data.jobs,27);
  assert.equal(data.completed,24);assert.equal(data.pending,1);assert.equal(data.failed,1);assert.equal(data.unknown,1);
  assert.equal(data.recent.length,6);assert.equal(Number(data.balance),500);
  const overview=await adminOverview(admin.id,"no matching user",one.id,1,"demo");
  assert.equal(overview.users.length,1);assert.equal(overview.users[0].id,one.id);
  assert.equal(overview.entries.length,1);assert.equal(overview.entries[0].kind,"demo");
  assert.equal((await adminOverview(admin.id,"",one.id,1,"grant")).entries.length,0);
  await assert.rejects(()=>adminOverview(admin.id,"","",1,"invalid"),/유형/);
});
