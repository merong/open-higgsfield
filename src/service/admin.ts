import { randomUUID } from "node:crypto";
import { database } from "./db";
import { ServiceError, text } from "./errors";
import { allowedAdminIps } from "./admin-access";

export async function adminOnly(actorId: string) {
  const [row] = await (await database()).query<{is_admin:boolean}>("SELECT is_admin FROM users WHERE id=$1",[actorId]);
  if (!row?.is_admin) throw new ServiceError(403,"관리자만 이용할 수 있습니다.");
}
export async function adminOverview(actorId: string, search = "", userId = "", page = 1, kind = "") {
  await adminOnly(actorId);
  text(userId,"사용자",100);
  if (kind && !["grant","demo","signup","adjustment","hold","confirm","refund"].includes(kind)) throw new ServiceError(400,"내역 유형을 확인해 주세요.");
  const db = await database();
  const term = `%${text(search,"검색",100)}%`;
  const users = await db.query("SELECT id,username,email,name,credits,is_admin,created_at FROM users WHERE id=$2 OR name ILIKE $1 OR email ILIKE $1 OR username ILIKE $1 ORDER BY (id=$2) DESC,is_admin DESC,username NULLS LAST,email LIMIT 100",[term,userId]);
  const offset = (Math.max(1,Math.min(100000,Math.floor(page)||1))-1)*50;
  const entries = await db.query(`SELECT l.id,l.user_id,l.amount,l.kind,l.description,l.created_at,l.job_id,u.username,u.email,u.name,a.username AS actor_username,a.email AS actor_email FROM credit_ledger l JOIN users u ON u.id=l.user_id LEFT JOIN users a ON a.id=l.actor_id WHERE ($1='' OR l.user_id=$1) AND ($3='' OR l.kind=$3) ORDER BY l.created_at DESC,l.id DESC LIMIT 51 OFFSET $2`,[userId,offset,kind]);
  const [summary] = await db.query("SELECT COUNT(*)::INTEGER AS users,COALESCE(SUM(credits),0)::BIGINT AS balance FROM users");
  const [totals] = await db.query("SELECT COALESCE(SUM(amount) FILTER (WHERE kind IN ('grant','demo','signup')),0)::BIGINT AS granted,COALESCE(-SUM(amount) FILTER (WHERE kind='hold'),0)::BIGINT AS reserved,COALESCE(SUM(amount) FILTER (WHERE kind='refund'),0)::BIGINT AS refunded FROM credit_ledger");
  return {users,entries:entries.slice(0,50),hasNext:entries.length>50,summary:{...summary,...totals},allowedIps:allowedAdminIps()};
}
export async function adminGrant(actorId: string, targetId: string, amount: number, reason: string, requestKey: string) {
  await adminOnly(actorId);
  text(targetId,"사용자",100,1); text(requestKey,"요청 키",100,8); reason=text(reason,"지급 사유",200,1);
  if (!Number.isSafeInteger(amount) || amount<1 || amount>1000000) throw new ServiceError(400,"지급량은 1~1,000,000 사이의 정수여야 합니다.");
  return (await database()).transaction(async tx=>{
    /* Serialize grants per actor, including retries aimed at a different recipient. */
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE",[actorId]);
    const [previous] = await tx.query<{user_id:string;amount:number;description:string}>("SELECT user_id,amount,description FROM credit_ledger WHERE actor_id=$1 AND request_key=$2",[actorId,requestKey]);
    if (previous) {
      if (previous.user_id !== targetId || previous.amount !== amount || previous.description !== reason) throw new ServiceError(409,"이미 사용한 지급 요청 키입니다.");
      return { duplicate:true };
    }
    const [target] = await tx.query<{credits:number}>("UPDATE users SET credits=credits+$1 WHERE id=$2 AND credits<=$3 RETURNING credits",[amount,targetId,2147483647-amount]);
    if (!target) throw new ServiceError(400,"지급 대상 또는 잔액 한도를 확인해 주세요.");
    await tx.query("INSERT INTO credit_ledger (id,user_id,amount,kind,description,created_at,actor_id,request_key) VALUES ($1,$2,$3,'grant',$4,$5,$6,$7)",[randomUUID(),targetId,amount,reason,Date.now(),actorId,requestKey]);
    return {balance:target.credits,duplicate:false};
  });
}
