import { randomUUID } from "node:crypto";
import { DEFAULT_CREDITS } from "../projects/credit-policy";
import { database } from "./db";
import { hashPassword } from "./auth";

export async function seedDemo() {
  const passwords = { user: await hashPassword("user1234"), admin: await hashPassword("admin21345") };
  return (await database()).transaction(async tx=>{
    const inserted = await tx.query("INSERT INTO seed_events (id,created_at) VALUES ('demo-accounts-v1',$1) ON CONFLICT DO NOTHING RETURNING id",[Date.now()]);
    if (!inserted.length) return {created:0,alreadySeeded:true};
    for (const username of [...Array.from({length:9},(_,i)=>`user${i+1}`),"admin"]) {
      const [exists] = await tx.query("SELECT id FROM users WHERE username=$1 OR email=$2",[username,`${username}@demo.local`]);
      if (exists) throw new Error(`데모 계정 ${username}이 이미 있습니다. 기존 계정을 덮어쓰지 않습니다.`);
      const id=randomUUID(), isAdmin=username === "admin", credits=DEFAULT_CREDITS;
      await tx.query("INSERT INTO users (id,username,email,name,password_hash,is_admin,credits,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",[id,username,`${username}@demo.local`,isAdmin ? "관리자" : `데모 사용자 ${username.slice(4)}`,isAdmin ? passwords.admin : passwords.user,isAdmin,credits,Date.now()]);
      if (credits) await tx.query("INSERT INTO credit_ledger (id,user_id,amount,kind,description,created_at) VALUES ($1,$2,$3,'demo','데모 계정 초기 지급',$4)",[randomUUID(),id,credits,Date.now()]);
    }
    return {created:10,alreadySeeded:false};
  });
}
