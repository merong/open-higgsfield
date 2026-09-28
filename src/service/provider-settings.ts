import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCredentialInput, toAuthorizationHeader } from "@/generation/credentials";
import { database } from "./db";
import { ServiceError } from "./errors";
import { adminOnly } from "./admin";
export const PROVIDER_SCOPE = "workspace:higgsfield";

export const HIGGSFIELD_ORIGIN = "https://api.higgsfield.ai";
async function encryptionKey() {
  const configured = process.env.PROVIDER_ENCRYPTION_KEY;
  if (configured) {
    const key = Buffer.from(configured, "base64");
    if (key.length !== 32) throw new ServiceError(503, "서버 암호화 키 설정을 확인해 주세요.");
    return key;
  }
  if (process.env.NODE_ENV === "production")
    throw new ServiceError(503, "관리자가 PROVIDER_ENCRYPTION_KEY를 설정해야 합니다.");
  const dir = process.env.LOCAL_SECRET_DIR || path.join(process.cwd(), ".data", "secrets");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, "provider.key");
  try { await writeFile(file, randomBytes(32), { flag: "wx", mode: 0o600 }); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; }
  const key = await readFile(file);
  if (key.length !== 32) throw new ServiceError(503, "저장된 암호화 키를 확인해 주세요.");
  return key;
}
export async function sealCredential(userId: string, value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", await encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}
export async function openCredential(userId: string, value: string) {
  try {
    const [version, iv, tag, encrypted] = value.split(".");
    if (version !== "v1") throw new Error("Invalid version");
    const decipher = createDecipheriv("aes-256-gcm", await encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  } catch { throw new ServiceError(503, "API 키를 읽을 수 없습니다. 서버 암호화 설정을 확인해 주세요."); }
}
export async function storedCredential() {
  const [row] = await (await database()).query<{ sealed: string; updated_at: number }>(
    "SELECT sealed,updated_at FROM provider_settings LIMIT 1");
  return row;
}
export function operatorConfigured() { return Boolean(process.env.HF_OPERATOR_API_KEY); }
export async function providerSettings(_userId: string) {
  const row = await storedCredential();
  return { configured: Boolean(row), source: row ? "managed" : operatorConfigured() ? "operator" : "none", updatedAt: row ? Number(row.updated_at) : null };
}
export async function saveProviderSettings(userId: string, input: unknown) {
  await adminOnly(userId);
  let apiKey: string;
  try { apiKey = parseCredentialInput(input).apiKey; }
  catch { throw new ServiceError(400, "API Key ID와 Secret을 id:secret 형식으로 입력해 주세요."); }
  if (apiKey.length > 2048 || /\s|[\x00-\x1f\x7f]/.test(apiKey) || apiKey.split(":").length !== 2)
    throw new ServiceError(400, "API 키 형식을 확인해 주세요. 공백은 사용할 수 없습니다.");
  const sealed = await sealCredential(PROVIDER_SCOPE, apiKey);
  await (await database()).query("INSERT INTO provider_settings (user_id,sealed,updated_at) VALUES ($1,$2,$3) ON CONFLICT ((true)) DO UPDATE SET user_id=$1,sealed=$2,updated_at=$3", [userId,sealed,Date.now()]);
  return providerSettings(userId);
}
export async function removeProviderSettings(userId: string) {
  await adminOnly(userId);
  await (await database()).query("DELETE FROM provider_settings");
  return providerSettings(userId);
}
export async function resolveProvider(_userId: string) {
  const row = await storedCredential();
  if (row) return { apiKey: await openCredential(PROVIDER_SCOPE,row.sealed), baseUrl: HIGGSFIELD_ORIGIN, sealed: row.sealed };
  if (!operatorConfigured()) throw new ServiceError(503,"환경설정에서 Higgsfield API 키를 등록해 주세요.");
  return { apiKey: process.env.HF_OPERATOR_API_KEY!, baseUrl: process.env.HF_API_BASE_URL || HIGGSFIELD_ORIGIN, sealed: null };
}
export async function checkProvider(userId: string, fetchImpl: typeof fetch = fetch) {
  await adminOnly(userId);
  const provider = await resolveProvider(userId);
  const [recent] = await (await database()).query<{request_id:string}>(
    "SELECT request_id FROM generation_jobs WHERE request_id IS NOT NULL AND provider_credential IS NOT DISTINCT FROM $1 ORDER BY created_at DESC LIMIT 1", [provider.sealed]);
  /* A missing request proves reachability only, never account/model access. */
  try {
    const res = await fetchImpl(`${provider.baseUrl}/requests/${encodeURIComponent(recent?.request_id || randomUUID())}/status`, {
      headers: { Authorization: toAuthorizationHeader(provider.apiKey) }, redirect:"error", cache:"no-store", signal:AbortSignal.timeout(15000),
    });
    if (res.ok && recent) {
      const payload = await res.json();
      if (typeof payload?.status === "string" && payload.request_id === recent.request_id)
        return {state:"verified",message:"저장한 키로 기존 생성 요청을 조회했습니다. 인증과 상태 조회가 확인되었습니다."};
    }
    if (res.status === 401 || res.status === 403) return {state:"error",message:"인증이 거절되었습니다. API Key ID와 Secret, 접근 권한을 확인해 주세요."};
    if (res.status === 404) return {state:"reachable",message:"API 서버 응답을 확인했습니다. 조회할 생성 내역이 없어 인증·모델 권한은 아직 확정할 수 없습니다. 생성 기능에서 결과를 확인해 주세요."};
    if (res.status === 402) return {state:"error",message:"Higgsfield API 잔액이 부족합니다. API 계정의 잔액을 확인해 주세요."};
    if (res.status === 429) return {state:"error",message:"API 요청 한도에 도달했습니다. 잠시 후 다시 점검해 주세요."};
    return {state:"error",message:`연결을 확인하지 못했습니다 (HTTP ${res.status}). 잠시 후 다시 점검해 주세요.`};
  } catch { return {state:"error",message:"API 응답을 받지 못했습니다. 네트워크 상태를 확인하고 다시 점검해 주세요."}; }
}
