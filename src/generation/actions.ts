"use server";

import { requireUser, currentUser } from "@/service/session";
import { platformReady, submitJob, statusesFor } from "@/service/generation";
import type { GenerationPlane } from "./catalog/types";
import { ServiceError } from "@/service/errors";

/* Account credentials are resolved server-side; never return their values. */
export async function hasPlatformCredentials() {
  const user = await currentUser();
  return Boolean(user) && await platformReady(user?.id);
}
export async function savePlatformCredentials(_data: unknown) {
  throw new ServiceError(
    403,
    "개인 키 대신 관리자가 설정한 생성 API를 사용합니다.",
  );
}
export async function clearPlatformCredentials() {
  /* Legacy key modal is no longer exposed. */
}
export async function submitGeneration(plane: GenerationPlane, key?: string) {
  const user = await requireUser();
  const job = await submitJob(user.id, plane, key || crypto.randomUUID());
  if (!job.request_id)
    throw new ServiceError(
      409,
      "접수 상태를 확인 중입니다. 계정의 생성 내역을 확인해 주세요.",
    );
  return {
    status: job.state,
    requestId: job.request_id,
    statusUrl: "",
    cancelUrl: "",
  };
}
export async function getGenerationStatuses(data: unknown) {
  const user = await requireUser();
  const ids = (data as { requestIds?: unknown })?.requestIds;
  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === "string" && id.length < 200)
  )
    throw new ServiceError(400, "요청 ID를 확인해 주세요.");
  return statusesFor(user.id, ids);
}
