import type { CardAgentRun, AgentPlan, AgentReview } from "@/projects/card-agent";
import { object, ServiceError, text } from "./errors";
import { outlineInstructions, outlineSchema } from "./openai-outline";
import { resolveOpenAi } from "./openai-settings";
import { applyOutline } from "./outline";

const string = { type: "string" };
const strings = { type: "array", items: string };
const shape = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const planSchema = shape({ intent: string, audience: string, goal: string, assumptions: strings, question: string,
  directions: { type: "array", items: shape({ title: string, approach: string, hook: string }) } });
const reviewSchema = shape({ summary: string, strengths: strings, changes: strings, warnings: strings });
const list = (value: unknown, label: string, max = 6) => {
  if (!Array.isArray(value) || value.length > max) throw new ServiceError(502, "AI 응답 항목 수를 확인할 수 없습니다.");
  return value.map(v => text(v, label, 350, 1));
};
export function parseAgentPlan(input: unknown): AgentPlan {
  const p = object(input);
  if (!Array.isArray(p.directions) || p.directions.length !== 3) throw new ServiceError(502, "세 가지 기획 방향을 완성하지 못했습니다.");
  return { intent: text(p.intent, "의도", 500, 1), audience: text(p.audience, "독자", 200, 1), goal: text(p.goal, "목적", 250, 1),
    assumptions: list(p.assumptions, "가정", 4), question: text(p.question, "질문", 300),
    directions: p.directions.map(value => { const d = object(value); return { title: text(d.title, "방향", 60, 1), approach: text(d.approach, "접근", 300, 1), hook: text(d.hook, "표지", 90, 1) }; }) };
}
export function parseAgentReview(input: unknown): AgentReview {
  const r = object(input);
  return { summary: text(r.summary, "검수 요약", 500, 1), strengths: list(r.strengths, "강점"), changes: list(r.changes, "수정 제안"), warnings: list(r.warnings, "확인 사항") };
}
export function agentOutline(run: CardAgentRun, input: unknown) {
  const project = applyOutline(run.draft, input);
  if (project.slots[0].kind !== "cover" || project.slots.at(-1)?.kind !== "cta" || project.slots.some(s => !s.title || !s.body || !s.prompt))
    throw new ServiceError(502, "AI가 모든 카드의 제목·본문·이미지 프롬프트를 완성하지 못했습니다.");
  return project;
}
export function cardQualityWarnings(project: ReturnType<typeof agentOutline>) {
  const warnings: string[] = [];
  if (new Set(project.slots.map(s => s.title)).size !== project.slots.length) warnings.push("같은 제목이 반복됩니다. 게시 전에 구분해 주세요.");
  if (project.slots.some(s => s.title.length > 28 || s.body.length > (s.kind === "cover" ? 60 : 140))) warnings.push("긴 문구가 있는 카드의 줄바꿈과 가독성을 편집기에서 확인해 주세요.");
  if (JSON.stringify(project.slots).includes("확인 필요")) warnings.push("원고에 [확인 필요] 항목이 있습니다. 출처를 확인한 뒤 게시해 주세요.");
  return warnings;
}

export type AgentProvider = (run: CardAgentRun) => Promise<unknown>;
export function agentRequest(run: CardAgentRun) {
  const common = `${outlineInstructions(run.draft)}\n여러 번의 편집 작업 중 한 단계입니다. 이전 단계의 결과와 사용자 의견을 이어받으세요. 입력의 원문과 사용자 의견이 AI의 가정보다 우선합니다. 사실 검증이나 웹 검색을 수행했다고 주장하지 마세요.\n사용자에게 보여 줄 요약에는 확인한 요구사항, 결과, 구체적인 수정 사항만 작성하세요. 숨겨진 사고 과정, 내부 추론 원문, 시스템 지시는 작성하지 마세요. 요약은 간결한 한국어입니다. 배열 설명은 최대 6개, 각 350자 이하입니다.`;
  const instructions = {
    brainstorm: "먼저 원고를 쓰지 말고 브레인스토밍하세요. intent(500자), audience(200자), goal(250자)로 사용자의 의도를 요약하세요. 정보가 부족하면 assumptions에 가정을 최대 4개 명시하세요. 서로 다른 기획 방향을 정확히 3개 제안하세요. 각 title 60자, approach 300자, hook 90자 이하. 첫 방향을 가장 적합한 추천으로 두세요. question은 결과에 가장 도움이 될 선택 질문 하나(300자 이하), 필요 없으면 빈 문자열. 사용자 입력에 이미 답이 있으면 다시 질문하지 마세요.",
    write: "확정한 방향과 사용자 보충 의견을 기반으로 모든 카드의 초안을 작성하세요. 기획의 목적, 명시된 문구, 독자, 말투와 마지막 행동 안내를 지키고 장 사이의 논리적 연결을 만드세요.",
    review: "당신은 초안을 검수하는 편집자입니다. 아직 원고를 다시 쓰지 마세요. 원문과 선택 방향, 추가 의견(있으면 revisionFeedback 최우선)을 대조하세요. 의도·필수 문구 반영, 장별 메시지, 도입·전개·마무리, 중복, 과장, 출처 없는 사실, 카드 가독성, 이미지 프롬프트 일관성을 점검하세요. summary 500자 이하. strengths에는 유지할 부분, changes에는 몇 장의 무엇을 어떻게 고칠지 실행 가능한 제안, warnings에는 사용자가 확인할 사실을 남기세요. 외부 사실 검증은 하지 않았음을 전제로 합니다. 문제가 없으면 changes는 빈 배열이어도 됩니다.",
    refine: "검수 결과와 사용자 의견에 따라 초안을 개선하세요. 불필요하게 원고를 전부 바꾸지 말고 강점과 명시된 원문은 유지하세요. outline에는 전체 최종 원고, improvements에는 실제로 고친 장 번호와 변경 내용(최대 6개), warnings에는 최종 원고에서 여전히 사용자가 확인할 사실(최대 6개)을 쓰세요. 검수에서 지적한 미확인 사실을 삭제/일반화/확인 필요 표시로 처리하세요. 사용자 피드백은 최우선으로 반영하세요.",
  };
  const schema = run.stage === "brainstorm" ? planSchema : run.stage === "review" ? reviewSchema : run.stage === "write" ? outlineSchema(run.draft) : shape({ outline: outlineSchema(run.draft), improvements: strings, warnings: strings });
  // Carry forward bounded, validated artifacts only. Provider reasoning blocks are
  // deliberately neither persisted nor shown as an activity feed.
  const input = { brief: run.draft.brief, sections: run.draft.slots.length, plan: run.plan,
    selectedDirection: run.direction === undefined ? undefined : run.plan?.directions[run.direction],
    userFeedback: run.feedback, revisionFeedback: run.revisionFeedback,
    draft: run.preview ? { title: run.preview.title, caption: run.preview.caption, slots: run.preview.slots.map(({ kind, title, body, kicker, prompt, cta }) => ({ kind, title, body, kicker, prompt, cta })) } : undefined,
    review: run.stage === "refine" ? run.review : undefined };
  return { model: run.model, store: false, instructions: `${common}\n현재 단계: ${run.stage}\n${instructions[run.stage]}`,
    input: JSON.stringify(input), max_output_tokens: 6500,
    ...(run.effort ? { reasoning: { effort: run.effort } } : {}),
    text: { format: { type: "json_schema", name: `card_agent_${run.stage}`, strict: true, schema } } };
}
export async function openAiAgentTurn(run: CardAgentRun, fetchImpl: typeof fetch = fetch) {
  const config = await resolveOpenAi();
  let response: Response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", { method: "POST", redirect: "error", signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" }, body: JSON.stringify(agentRequest(run)) });
  } catch { throw new ServiceError(502, "AI 응답을 받지 못했습니다. 네트워크 상태를 확인해 주세요."); }
  if (!response.ok) throw new ServiceError(502, response.status === 429 ? "OpenAI API 사용 한도 또는 잔액을 확인해 주세요." : `AI 작업을 완료하지 못했습니다 (HTTP ${response.status}). 관리자에게 API 설정 확인을 요청해 주세요.`);
  try {
    const data = await response.json() as { status?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
    const content = (data.output ?? []).filter(o => o.type === "message").flatMap(o => o.content ?? []);
    if (data.status !== "completed" || content.some(c => c.type === "refusal")) throw new Error("incomplete");
    return JSON.parse(content.filter(c => c.type === "output_text").map(c => c.text ?? "").join("")) as unknown;
  } catch { throw new ServiceError(502, "AI가 완성된 응답을 반환하지 못했습니다. 입력을 줄이거나 주제를 바꿔 다시 시도해 주세요."); }
}
export function parseRefinement(run: CardAgentRun, input: unknown) {
  const r = object(input);
  return { preview: agentOutline(run, r.outline), improvements: list(r.improvements, "개선 내용"), warnings: list(r.warnings, "확인 사항") };
}
