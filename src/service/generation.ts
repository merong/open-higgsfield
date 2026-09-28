import { queueTrace } from "./workflow-trace";
import { videoCreditBlocked, VIDEO_CREDIT_MESSAGE } from "../projects/credit-policy";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  getModel,
  parseSettings,
  type GenerationPlane,
} from "@/generation/catalog";
import { toPlatform } from "@/generation/to-platform";
import {
  createPlatformClient,
  PlatformError,
  type GenerationStatus,
  type StatusResult,
} from "@/generation/platform";
import { database } from "./db";
import { ServiceError, object, text } from "./errors";
import { ledger, quote } from "./credits";
import { getProject } from "./projects";
import { mediaUrl } from "@/projects/validation";
import type { Job } from "@/projects/types";
import { HIGGSFIELD_ORIGIN, PROVIDER_SCOPE, openCredential, operatorConfigured, providerSettings, resolveProvider } from "./provider-settings";

type Client = ReturnType<typeof createPlatformClient>;
export async function platformReady(userId?: string) {
  return userId ? (await providerSettings(userId)).source !== "none" : operatorConfigured();
}
export function operatorClient(): Client {
  if (!operatorConfigured())
    throw new ServiceError(
      503,
      "관리자가 생성 API를 연결해야 합니다. 에셋 업로드와 편집·내보내기는 이용할 수 있습니다.",
    );
  return createPlatformClient({
    apiKey: process.env.HF_OPERATOR_API_KEY!,
    baseUrl: process.env.HF_API_BASE_URL || HIGGSFIELD_ORIGIN,
  });
}
export function validatePlane(value: unknown): GenerationPlane {
  const p = object(value),
    model = getModel(text(p.model, "모델", 100, 1));
  const prompt = text(object(p.prompt).text, "프롬프트", 5000, 1),
    settings = parseSettings(model, object(p.settings));
  const source = object(p.media),
    media: GenerationPlane["media"] = {};
  for (const [role, items] of Object.entries(source)) {
    const typedRole = role as keyof typeof media;
    if (
      !model.roles[typedRole] ||
      !Array.isArray(items) ||
      items.length > model.roles[typedRole]!
    )
      throw new ServiceError(400, "모델의 입력 에셋을 확인해 주세요.");
    media[typedRole] = items.map((item) => {
      const m = object(item);
      const url = mediaUrl(m.url);
      if (!url.startsWith("https:"))
        throw new ServiceError(
          400,
          "AI 입력에는 공개 HTTPS 에셋이 필요합니다. Blob 저장소를 연결해 주세요.",
        );
      return { id: text(m.id, "에셋 ID", 100, 1), role: typedRole, url };
    });
  }
  return { model: model.id, prompt: { text: prompt }, settings, media };
}
export async function submitJob(
  userId: string,
  input: unknown,
  key: string,
  context?: { projectId: string; slotId: string; reviewRequired?: boolean },
  client?: Client,
) {
  const plane = validatePlane(input);
  text(key, "요청 키", 100, 8);
  if (context) {
    const project = await getProject(userId, context.projectId);
    if (!project.slots.some((s) => s.id === context.slotId))
      throw new ServiceError(404, "슬롯을 찾을 수 없습니다.");
  }
  const credentials = client ? null : await resolveProvider(userId);
  const mapped = toPlatform(plane),
    provider = client ?? createPlatformClient(credentials!),
    cost = quote(plane),
    db = await database();
  const { job, fresh } = await db.transaction(async (tx) => {
    /* Lock the balance before checking idempotency: concurrent duplicate calls serialize. */
    const [user] = await tx.query<{ credits: number }>(
      "SELECT credits FROM users WHERE id=$1 FOR UPDATE",
      [userId],
    );
    if (!user) throw new ServiceError(401, "로그인해 주세요.");
    const [existing] = await tx.query<Job & { plane: GenerationPlane }>(
      "SELECT * FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2",
      [userId, key],
    );
    if (existing) {
      if (
        !isDeepStrictEqual(existing.plane, plane) ||
        (existing.project_id || undefined) !== context?.projectId ||
        (existing.slot_id || undefined) !== context?.slotId ||
        Boolean(existing.review_required) !== Boolean(context?.reviewRequired)
      )
        throw new ServiceError(
          409,
          "이미 사용한 요청 키입니다. 새 요청으로 시도해 주세요.",
        );
      return { job: existing, fresh: false };
    }
    if (videoCreditBlocked(getModel(plane.model).surface, user.credits))
      throw new ServiceError(402, VIDEO_CREDIT_MESSAGE);
    if (user.credits < cost)
      throw new ServiceError(
        402,
        `크레딧이 부족합니다. ${cost} 크레딧이 필요합니다.`,
      );
    const id = randomUUID();
    await tx.query("UPDATE users SET credits=credits-$1 WHERE id=$2", [
      cost,
      userId,
    ]);
    const [job] = await tx.query<Job>(
      "INSERT INTO generation_jobs (id,user_id,idempotency_key,state,cost,plane,project_id,slot_id,created_at,provider_credential,provider_origin,review_required) VALUES ($1,$2,$3,'submitting',$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
      [
        id,
        userId,
        key,
        cost,
        JSON.stringify(plane),
        context?.projectId ?? null,
        context?.slotId ?? null,
        Date.now(),
        credentials?.sealed ?? null,
        credentials?.baseUrl ?? null,
        context?.reviewRequired ?? false,
      ],
    );
    await ledger(
      tx,
      userId,
      -cost,
      "hold",
      `${getModel(plane.model).label} 생성 예약`,
      id,
    );
    if (context) await queueTrace(tx, { projectId: context.projectId, runId: id, turnId: id, phase: "image_generation" }, "generation.request", "이미지·영상 생성 요청", { plane, request: mapped.body, path: mapped.path, costCredits: cost, slotId: context.slotId });
    return { job, fresh: true };
  });
  if (!fresh) return publicJob(job);
  try {
    const queued = await provider.submit(mapped.path, mapped.body);
    const saved = await db.transaction(async tx => {
      const [saved] = await tx.query<Job>("UPDATE generation_jobs SET request_id=$1,state='pending' WHERE id=$2 RETURNING *", [queued.requestId, job.id]);
      if (context) await queueTrace(tx, { projectId: context.projectId, runId: job.id, turnId: job.id, phase: "image_generation" }, "generation.result", "공급자 접수 확인", { status: "pending", requestId: queued.requestId, slotId: context.slotId });
      return saved;
    });
    return publicJob(saved);
  } catch (error) {
    /* A lost response may already have started a paid request. Never retry it automatically. */
    const definite =
      error instanceof PlatformError &&
      error.status >= 400 &&
      error.status < 500;
    if (context) await queueTrace(db, { projectId: context.projectId, runId: job.id, turnId: job.id, phase: "image_generation" }, "diagnostic", definite ? "생성 요청 거절" : "생성 접수 여부 미확인", { outcome: definite ? "rejected" : "unknown", slotId: context.slotId });
    if (definite)
      await settleJob(userId, job.id, {
        requestId: "",
        status: "failed",
        error: "생성 요청이 거절되었습니다.",
      });
    else
      await db.query(
        "UPDATE generation_jobs SET state='unknown', result=$1 WHERE id=$2",
        [
          JSON.stringify({
            status: "unknown",
            error:
              "접수 결과를 확인할 수 없습니다. 중복 생성 없이 관리자 확인이 필요합니다.",
          }),
          job.id,
        ],
      );
    if (definite)
      throw new ServiceError(
        502,
        "생성 요청이 거절되어 예약 크레딧을 환불했습니다.",
      );
    return publicJob((
      await db.query<Job>("SELECT * FROM generation_jobs WHERE id=$1", [job.id])
    )[0]);
  }
}
export async function settleJob(
  userId: string,
  jobId: string,
  status: GenerationStatus,
) {
  const failed =
    ["failed", "nsfw", "canceled"].includes(status.status) ||
    (status.status === "completed" && !status.images?.length && !status.video);
  if (!failed && status.status !== "completed") return;
  await (
    await database()
  ).transaction(async (tx) => {
    const [job] = await tx.query<Job>(
      "SELECT * FROM generation_jobs WHERE id=$1 AND user_id=$2 FOR UPDATE",
      [jobId, userId],
    );
    if (!job || ["completed", "failed"].includes(job.state)) return;
    if (job.project_id) await queueTrace(tx, { projectId: job.project_id, runId: job.id, turnId: job.id, phase: "image_generation" }, "generation.result", failed ? "생성 실패·환불" : "생성 결과 수신", { status, costCredits: job.cost, slotId: job.slot_id, outcome: failed ? "failed" : "completed" }, `generation-terminal:${job.id}`);
    if (failed) {
      await tx.query("UPDATE users SET credits=credits+$1 WHERE id=$2", [
        job.cost,
        userId,
      ]);
      await ledger(
        tx,
        userId,
        job.cost,
        "refund",
        "생성 실패 · 예약 크레딧 환불",
        job.id,
      );
    } else
      await ledger(tx, userId, 0, "confirm", "생성 완료 · 예약 확정", job.id);
    await tx.query(
      "UPDATE generation_jobs SET state=$1,result=$2 WHERE id=$3",
      [
        failed ? "failed" : "completed",
        JSON.stringify({
          ...status,
          error: failed
            ? "생성하지 못했습니다. 크레딧을 환불했습니다."
            : undefined,
        }),
        jobId,
      ],
    );
  });
}
export async function statusesFor(
  userId: string,
  ids: string[],
  client?: Client,
): Promise<StatusResult[]> {
  if (ids.length < 1 || ids.length > 80)
    throw new ServiceError(400, "조회할 요청 수를 확인해 주세요.");
  return Promise.all(
    ids.map(async (requestId) => {
      const [job] = await (
        await database()
      ).query<Job & {provider_credential?: string; provider_origin?: string}>(
        "SELECT * FROM generation_jobs WHERE user_id=$1 AND request_id=$2",
        [userId, requestId],
      );
      if (!job) return { requestId, error: "접근할 수 없는 생성 요청입니다." };
      if (job.result && ["completed", "failed"].includes(job.state))
        return { requestId, status: { ...job.result, requestId } };
      try {
        const provider = client ?? (job.provider_credential
          ? createPlatformClient({apiKey: await openCredential(PROVIDER_SCOPE, job.provider_credential), baseUrl: job.provider_origin || HIGGSFIELD_ORIGIN})
          : operatorClient());
        const status = await provider.status(requestId);
        await settleJob(userId, job.id, status);
        return { requestId, status };
      } catch {
        return {
          requestId,
          error: "생성 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.",
        };
      }
    }),
  );
}
function publicJob(job: Job): Job {
  const { provider_credential: _secret, provider_origin: _origin, ...safe } = job as Job & {provider_credential?: string; provider_origin?: string};
  return safe;
}
export async function listJobs(userId: string, projectId?: string) {
  return (await database()).query<Job>(
    `SELECT id,request_id,state,cost,result,slot_id,project_id,created_at,review_required FROM generation_jobs WHERE user_id=$1 ${projectId ? "AND project_id=$2" : ""} ORDER BY created_at DESC LIMIT 100`,
    projectId ? [userId, projectId] : [userId],
  );
}
