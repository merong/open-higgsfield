import { database } from "../src/service/db";
import { settleJob } from "../src/service/generation";
import { grantCredits } from "../src/service/credits";
const args = process.argv.slice(2),
  read = (key: string) => args[args.indexOf(key) + 1];
if (args.includes("--refund-job")) {
  const id = read("--refund-job");
  const [job] = await (
    await database()
  ).query<{ user_id: string; request_id: string }>(
    "SELECT user_id,request_id FROM generation_jobs WHERE id=$1",
    [id],
  );
  if (!job) throw new Error("요청을 찾을 수 없습니다.");
  await settleJob(job.user_id, id, {
    status: "failed",
    requestId: job.request_id || "",
  });
  console.log("예약 크레딧을 환불했습니다.");
  process.exit(0);
}
if (args.includes("--job") && args.includes("--request-id")) {
  const rows = await (
    await database()
  ).query(
    "UPDATE generation_jobs SET request_id=$1,state='pending' WHERE id=$2 AND state IN ('unknown','submitting') RETURNING id",
    [read("--request-id"), read("--job")],
  );
  if (!rows.length) throw new Error("접수 확인 대상 요청을 찾을 수 없습니다.");
  console.log("요청을 연결했습니다. 편집기에서 다시 확인하세요.");
  process.exit(0);
}
const email = read("--email");
if (!args.includes("--email") || !email)
  throw new Error(
    "--email user@example.com [--credits 50] [--admin] 형식으로 실행하세요.",
  );
if (args.includes("--admin")) {
  const rows = await (
    await database()
  ).query("UPDATE users SET is_admin=TRUE WHERE email=$1 RETURNING id", [
    email.toLowerCase(),
  ]);
  if (!rows.length) throw new Error("가입한 계정이 없습니다.");
  console.log("관리자 권한을 부여했습니다.");
}
if (args.includes("--credits")) {
  const balance = await grantCredits(
    email,
    Number(read("--credits")),
    "운영자 CLI 수동 충전",
  );
  console.log(`충전 완료. 잔액: ${balance}`);
}
process.exit(0);
