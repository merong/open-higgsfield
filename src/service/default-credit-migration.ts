import { database } from "./db";
import { ledger } from "./credits";
import { DEFAULT_CREDITS } from "../projects/credit-policy";

/** Explicit, one-time maintenance operation. Never run on login or server startup. */
export async function applyDefaultCreditBalances() {
  return (await database()).transaction(async (tx) => {
    const event = await tx.query(
      "INSERT INTO seed_events (id,created_at) VALUES ('credit-balances-50-2026-09-20',$1) ON CONFLICT DO NOTHING RETURNING id",
      [Date.now()],
    );
    if (!event.length) return { adjusted: 0, alreadyApplied: true };
    const users = await tx.query<{ id: string; credits: number }>(
      "SELECT id,credits FROM users ORDER BY id FOR UPDATE",
    );
    let adjusted = 0;
    for (const user of users) {
      const difference = DEFAULT_CREDITS - user.credits;
      if (!difference) continue;
      await tx.query("UPDATE users SET credits=$1 WHERE id=$2", [DEFAULT_CREDITS, user.id]);
      await ledger(tx, user.id, difference, "adjustment", `기본 지급 정책 변경: 잔액 ${user.credits} → ${DEFAULT_CREDITS}`);
      adjusted++;
    }
    return { adjusted, alreadyApplied: false };
  });
}
