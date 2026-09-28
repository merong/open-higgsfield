import { randomUUID } from "node:crypto";
import type { Database } from "./db";
import { database } from "./db";
import { ServiceError } from "./errors";
import {
  getModel,
  parseSettings,
  type GenerationPlane,
} from "@/generation/catalog";
export function quote(plane: GenerationPlane) {
  const model = getModel(plane.model),
    settings = parseSettings(model, plane.settings);
  const images = Number(settings.batchSize ?? settings.numImages ?? 1);
  const rate = Number(
    process.env[
      model.surface === "image"
        ? "IMAGE_CREDIT_COST"
        : "VIDEO_CREDIT_COST_PER_SECOND"
    ] || (model.surface === "image" ? 4 : 8),
  );
  const cost = Math.ceil(
    rate *
      (model.surface === "image" ? images : Number(settings.duration ?? 5)),
  );
  if (!Number.isSafeInteger(cost) || cost < 1 || cost > 100000)
    throw new ServiceError(400, "크레딧 단가 설정을 확인해 주세요.");
  return cost;
}
export async function ledger(
  tx: Database,
  userId: string,
  amount: number,
  kind: string,
  description: string,
  jobId?: string,
) {
  await tx.query(
    "INSERT INTO credit_ledger (id,user_id,amount,kind,description,job_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [
      randomUUID(),
      userId,
      amount,
      kind,
      description,
      jobId ?? null,
      Date.now(),
    ],
  );
}
export async function grantCredits(
  email: string,
  amount: number,
  reason: string,
) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000)
    throw new ServiceError(400, "충전량을 확인해 주세요.");
  return (await database()).transaction(async (tx) => {
    const [user] = await tx.query<{ id: string; credits: number }>(
      "UPDATE users SET credits=credits+$1 WHERE email=$2 RETURNING id,credits",
      [amount, email.toLowerCase()],
    );
    if (!user) throw new ServiceError(404, "가입한 이메일을 입력해 주세요.");
    await ledger(tx, user.id, amount, "grant", reason);
    return user.credits;
  });
}
export async function listLedger(userId: string) {
  return (await database()).query(
    "SELECT id,amount,kind,description,created_at FROM credit_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
    [userId],
  );
}
