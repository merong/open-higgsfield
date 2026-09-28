import { database } from "./db";
import { adminOnly } from "./admin";
import { object, ServiceError, text } from "./errors";
import { openCredential, sealCredential } from "./provider-settings";
import { openAiModelOption, openAiModelProfile, type ReasoningEffort } from "./openai-models";

const SCOPE = "workspace:openai";
export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
async function stored() {
  const [row] = await (await database()).query<{sealed:string;model:string;reasoning_effort:string|null;updated_at:number}>("SELECT sealed,model,reasoning_effort,updated_at FROM text_provider_settings WHERE provider='openai'");
  return row;
}
function effortFor(model: string, input: unknown): ReasoningEffort | null {
  const profile = openAiModelProfile(model);
  if (!profile) throw new ServiceError(400,"카드뉴스 작성 호환이 확인된 모델을 목록에서 선택해 주세요.");
  if (input === undefined || input === null) return profile.defaultEffort;
  if (typeof input !== "string" || !profile.efforts.includes(input as ReasoningEffort)) throw new ServiceError(400,"선택한 모델이 지원하는 reasoning effort를 선택해 주세요.");
  return input as ReasoningEffort;
}
async function credential() {
  const row = await stored();
  if (row) return {apiKey:await openCredential(SCOPE,row.sealed),model:row.model,effort:row.reasoning_effort};
  if (process.env.OPENAI_API_KEY) return {apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_OUTLINE_MODEL || DEFAULT_OPENAI_MODEL,effort:process.env.OPENAI_REASONING_EFFORT || null};
  throw new ServiceError(503,"관리자가 환경설정에서 OpenAI API 키를 등록해야 합니다.");
}
export async function openAiReady() { return Boolean(await stored() || process.env.OPENAI_API_KEY); }
export async function openAiSettings(actorId: string) {
  await adminOnly(actorId);
  const row = await stored();
  const model = row?.model || process.env.OPENAI_OUTLINE_MODEL || DEFAULT_OPENAI_MODEL;
  const profile = openAiModelProfile(model);
  const savedEffort = row ? row.reasoning_effort : process.env.OPENAI_REASONING_EFFORT;
  return { configured:!!row, source:row ? "managed" : process.env.OPENAI_API_KEY ? "operator" : "none", model, effort:savedEffort ?? profile?.defaultEffort ?? null, updatedAt:row ? Number(row.updated_at) : null };
}
async function fetchModels(apiKey: string, fetchImpl: typeof fetch) {
  let response: Response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/models",{headers:{Authorization:`Bearer ${apiKey}`},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)});
  } catch { throw new ServiceError(502,"모델 목록을 불러오지 못했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요."); }
  if (!response.ok) throw new ServiceError(502,response.status === 401 || response.status === 403 ? "API 키 또는 모델 목록 조회 권한을 확인해 주세요." : response.status === 429 ? "OpenAI 요청 한도에 도달했습니다. 잠시 후 모델 목록을 다시 불러와 주세요." : `모델 목록을 불러오지 못했습니다 (HTTP ${response.status}).`);
  let data: unknown;
  try { data = await response.json(); } catch { throw new ServiceError(502,"OpenAI 모델 목록 응답을 확인할 수 없습니다."); }
  if (!data || typeof data !== "object" || !("data" in data) || !Array.isArray(data.data) || data.data.some(m=>!m || typeof m.id !== "string" || !m.id || m.id.length > 200)) throw new ServiceError(502,"OpenAI 모델 목록 응답을 확인할 수 없습니다.");
  return [...new Set<string>(data.data.map(m=>m.id))].map(openAiModelOption).sort((a,b)=>Number(b.supported)-Number(a.supported) || a.id.localeCompare(b.id));
}
export async function listOpenAiModels(actorId: string, fetchImpl: typeof fetch = fetch) {
  await adminOnly(actorId);
  const config = await credential();
  return {models:await fetchModels(config.apiKey,fetchImpl)};
}
export async function saveOpenAiSettings(actorId: string, input: unknown, fetchImpl: typeof fetch = fetch) {
  await adminOnly(actorId);
  const data = object(input), apiKey = text(data.apiKey ?? "", "OpenAI API 키", 2048);
  if (apiKey && (!/^sk-[a-zA-Z0-9_-]+$/.test(apiKey) || apiKey.length < 20)) throw new ServiceError(400,"OpenAI에서 발급한 sk- 형식의 API 키를 입력해 주세요.");
  const previous = await stored();
  const config = apiKey ? {apiKey} : await credential();
  // Verify against this key on every save. Failed lookups never replace the
  // existing credential/model, and browser-supplied capability flags are ignored.
  const models = await fetchModels(config.apiKey,fetchImpl);
  const available = models.filter(m=>m.supported);
  if (!available.length) throw new ServiceError(400,"이 키에서 카드뉴스 작성에 호환되는 모델을 찾지 못했습니다. 프로젝트의 모델 권한을 확인해 주세요.");
  const preferred = previous?.model || process.env.OPENAI_OUTLINE_MODEL || DEFAULT_OPENAI_MODEL;
  const model = data.model === undefined ? (available.find(m=>m.id===preferred) || available.find(m=>m.id===DEFAULT_OPENAI_MODEL) || available[0]).id : text(data.model,"모델",200,1);
  if (!available.some(m=>m.id===model)) throw new ServiceError(400,"이 키의 목록에서 카드뉴스 작성에 호환되는 모델을 선택해 주세요.");
  const previousEffort = previous ? previous.reasoning_effort : process.env.OPENAI_REASONING_EFFORT;
  const effortInput = data.effort === undefined && model === preferred && previousEffort && openAiModelProfile(model)?.efforts.includes(previousEffort as ReasoningEffort) ? previousEffort : data.effort;
  const effort = effortFor(model,effortInput);
  const sealed = apiKey || !previous ? await sealCredential(SCOPE,config.apiKey) : previous.sealed;
  await (await database()).query("INSERT INTO text_provider_settings (provider,user_id,sealed,model,reasoning_effort,updated_at) VALUES ('openai',$1,$2,$3,$4,$5) ON CONFLICT (provider) DO UPDATE SET user_id=$1,sealed=$2,model=$3,reasoning_effort=$4,updated_at=$5",[actorId,sealed,model,effort,Date.now()]);
  return {...await openAiSettings(actorId),models};
}
export async function removeOpenAiSettings(actorId: string) {
  await adminOnly(actorId);
  await (await database()).query("DELETE FROM text_provider_settings WHERE provider='openai'");
  return openAiSettings(actorId);
}
export async function resolveOpenAi() {
  const config = await credential();
  return {...config,effort:effortFor(config.model,config.effort)};
}
export async function checkOpenAi(actorId: string, fetchImpl: typeof fetch = fetch) {
  await adminOnly(actorId);
  const config = await resolveOpenAi();
  try {
    const response = await fetchImpl(`https://api.openai.com/v1/models/${encodeURIComponent(config.model)}`,{headers:{Authorization:`Bearer ${config.apiKey}`},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)});
    if (response.ok) return {state:"verified",message:"API 인증과 선택 모델의 조회를 확인했습니다. 실제 작성 가능 여부와 API 잔액은 카드뉴스 생성 시 확인됩니다."};
    return {state:"error",message:response.status === 401 || response.status === 403 ? "API 키 또는 프로젝트 권한을 확인해 주세요." : response.status === 404 ? "이 계정에서 선택한 모델을 찾을 수 없습니다. 모델 목록을 새로고침해 주세요." : `연결을 확인하지 못했습니다 (HTTP ${response.status}).`};
  } catch { return {state:"error",message:"OpenAI에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요."}; }
}
