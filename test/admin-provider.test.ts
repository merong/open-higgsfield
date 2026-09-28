import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
process.env.LOCAL_DATABASE_DIR="memory://";
process.env.PROVIDER_ENCRYPTION_KEY=randomBytes(32).toString("base64");
process.env.ADMIN_ALLOWED_IPS="127.0.0.1,::1,192.0.2.10";
process.env.OHF_PEER_SECRET="test-attestation-only";
delete process.env.HF_OPERATOR_API_KEY;
const {database}=await import("../src/service/db");
const {seedDemo}=await import("../src/service/demo");
const {authenticate}=await import("../src/service/auth");
const {verifiedPeer,assertAdminIp}=await import("../src/service/admin-access");
const {adminGrant,adminOverview}=await import("../src/service/admin");
const {saveProviderSettings,providerSettings,removeProviderSettings,checkProvider,openCredential,PROVIDER_SCOPE}=await import("../src/service/provider-settings");
const {submitJob,statusesFor,platformReady}=await import("../src/service/generation");
const {createDraft}=await import("../src/projects/outline");
const {planeFor}=await import("../src/projects/plane");
let adminId="", userId="";
await test("demo seed is atomic and repeatable; username login and admin IP gates",async()=>{
  assert.equal((await seedDemo()).created,10);
  assert.equal((await seedDemo()).created,0);
  for(let n=1;n<=9;n++) {
    const account=await authenticate({email:`user${n}`,password:"user1234"},false,"203.0.113.5");
    assert.equal(account.user.credits,50);assert.equal(account.user.admin,false);
    if(n===1) userId=account.user.id;
  }
  await assert.rejects(()=>authenticate({email:"admin",password:"admin21345"},false,"203.0.113.5"),/로컬 PC/);
  await assert.rejects(()=>authenticate({email:"admin",password:"admin21345"},false),/로컬 PC/);
  adminId=(await authenticate({email:"admin",password:"admin21345"},false,"127.0.0.1")).user.id;
  const [counts]=await(await database()).query<{count:number}>("SELECT COUNT(*)::INTEGER AS count FROM credit_ledger WHERE kind='demo'");assert.equal(counts.count,10);
});
await test("IP attestation rejects forged forwarding headers, invalid signatures and stale peers",()=>{
  const headers=new Headers({"x-forwarded-for":"127.0.0.1","x-real-ip":"127.0.0.1"});assert.equal(verifiedPeer(headers),null);
  const time=String(Date.now()),peer="::ffff:127.0.0.1";
  headers.set("x-ohf-peer",peer);headers.set("x-ohf-peer-time",time);headers.set("x-ohf-peer-signature","0".repeat(64));assert.equal(verifiedPeer(headers),null);
  headers.set("x-ohf-peer-signature",createHmac("sha256",process.env.OHF_PEER_SECRET!).update(`${peer}:${time}`).digest("hex"));assert.equal(verifiedPeer(headers),"127.0.0.1");
  headers.set("x-ohf-peer-time",String(Date.now()-120000));assert.equal(verifiedPeer(headers),null);
  assert.throws(()=>assertAdminIp("203.0.113.5"),/로컬 PC/);
});
await test("admin grants are audited, atomic and idempotent; ordinary users cannot administer",async()=>{
  await assert.rejects(()=>adminOverview(userId),/관리자/);
  await assert.rejects(()=>adminGrant(userId,userId,100,"forbidden","grant-0001"),/관리자/);
  await Promise.all([adminGrant(adminId,userId,25,"test support","grant-0001"),adminGrant(adminId,userId,25,"test support","grant-0001")]);
  await assert.rejects(()=>adminGrant(adminId,userId,26,"test support","grant-0001"),/요청 키/);
  await assert.rejects(()=>adminGrant(adminId,userId,-1,"negative","grant-0002"),/지급량/);
  const overview=await adminOverview(adminId,"user1",userId);
  assert.equal(overview.users[0].credits,75);
  assert.equal(overview.entries.filter(e=>e.kind==="grant").length,1);
  assert.equal(overview.entries.find(e=>e.kind==="grant")?.actor_username,"admin");
});
await test("only admins store encrypted shared keys and metadata never exposes secrets",async()=>{
  await assert.rejects(()=>saveProviderSettings(userId,{apiKey:"test:secret"}),/관리자/);
  await assert.rejects(()=>saveProviderSettings(adminId,{apiKey:"invalid"}),/형식/);
  await assert.rejects(()=>saveProviderSettings(adminId,{apiKey:"test:bad\nsecret"}),/형식/);
  await saveProviderSettings(adminId,{apiKey:"fixture-id:fixture-secret"});
  assert.equal(await platformReady(userId),true);
  const metadata=await providerSettings(userId);assert.equal(metadata.source,"managed");assert.ok(!JSON.stringify(metadata).includes("fixture"));
  const [row]=await(await database()).query<{sealed:string}>("SELECT sealed FROM provider_settings");
  assert.ok(!row.sealed.includes("fixture"));assert.equal(await openCredential(PROVIDER_SCOPE,row.sealed),"fixture-id:fixture-secret");
  await assert.rejects(()=>openCredential(userId,row.sealed),/읽을 수/);
  await assert.rejects(()=>removeProviderSettings(userId),/관리자/);
});
await test("stored shared key drives all three format submissions, survives rotation for polling and stays off responses",async()=>{
  const original=globalThis.fetch;let count=0;let expectedKey="Key fixture-id:fixture-secret";
  globalThis.fetch=async(input,init)=>{
    assert.equal(new Headers(init?.headers).get("authorization"),expectedKey);
    assert.ok(String(input).startsWith("https://api.higgsfield.ai/"));assert.equal(init?.redirect,"error");
    if(init?.method==="POST") return Response.json({request_id:`registered-${++count}`,status:"queued"});
    const requestId=String(input).split("/").at(-2);
    return Response.json({request_id:requestId,status:"completed",images:[{url:"https://example.com/result.png"}]});
  };
  try {
    const jobs=[];
    for(const format of ["card-news","reels","landing"] as const){
      const p=createDraft(format,{topic:"Integration",audience:"",tone:"calm",count:3,mustInclude:""});
      const job=await submitJob(userId,planeFor(p,p.slots[0]),`registered-${format}`);
      assert.ok(!("provider_credential" in job));jobs.push(job);
    }
    await saveProviderSettings(adminId,{apiKey:"new-id:new-secret"});
    const statuses=await statusesFor(userId,jobs.map(j=>j.request_id!));assert.equal(statuses.length,3);assert.ok(statuses.every(s=>"status" in s));
    expectedKey="Key new-id:new-secret";
    const unauth=await checkProvider(adminId,async()=>new Response("",{status:401}));assert.equal(unauth.state,"error");
    const missing=await checkProvider(adminId,async()=>new Response("",{status:404}));assert.equal(missing.state,"reachable");
    await removeProviderSettings(adminId);assert.equal(await platformReady(userId),false);
    assert.ok((await statusesFor(userId,[jobs[0].request_id!]))[0]);
  } finally {globalThis.fetch=original;}
});
