import { initializeProjectTrace } from "./workflow-trace";
import { randomUUID } from "node:crypto";
import { AGENT_STAGES, agentTerminal, type CardAgentRun } from "@/projects/card-agent";
import { createQuickCardDraft } from "@/projects/quick-card";
import { database, type Database } from "./db";
import { ledger } from "./credits";
import { object, ServiceError, text } from "./errors";
import { resolveOpenAi } from "./openai-settings";
import { agentOutline, cardQualityWarnings, openAiAgentTurn, parseAgentPlan, parseAgentReview, parseRefinement, type AgentProvider } from "./card-agent-provider";

type Row = { data: CardAgentRun; lease_token: string | null; lease_until: number | null };
const LEASE_MS = 75_000; // Longer than the provider timeout and the route's 60s budget.
const IDLE_MS = 7 * 24 * 60 * 60 * 1000;
function event(run: CardAgentRun, title: string, message: string) {
  run.events.push({ id: randomUUID(), stage: run.stage, title, message, at: Date.now() });
}
async function row(tx: Database, userId: string, id: string) {
  const [r] = await tx.query<Row>("SELECT data,lease_token,lease_until FROM card_agent_runs WHERE id=$1 AND user_id=$2 FOR UPDATE", [id, userId]);
  if (!r) throw new ServiceError(404, "카드뉴스 작업을 찾을 수 없습니다.");
  return r;
}
async function persist(tx: Database, run: CardAgentRun, token: string | null = null) {
  run.revision++; run.updatedAt = Date.now();
  await tx.query("UPDATE card_agent_runs SET data=$1,lease_token=$2,lease_until=$3,updated_at=$4 WHERE id=$5", [JSON.stringify(run), token, token ? Date.now() + LEASE_MS : null, run.updatedAt, run.id]);
}
async function refund(tx: Database, userId: string, run: CardAgentRun, reason: string) {
  const changed = await tx.query("UPDATE generation_jobs SET state='failed',result=$1 WHERE id=$2 AND state='submitting' RETURNING id", [JSON.stringify({ status: "failed", error: reason }), run.id]);
  if (changed.length) {
    await tx.query("UPDATE users SET credits=credits+1 WHERE id=$1", [userId]);
    await ledger(tx, userId, 1, "refund", reason, run.id);
  }
}
async function expire(tx: Database, userId: string, r: Row) {
  if (!agentTerminal(r.data) && ((r.data.status === "running" && Number(r.lease_until) < Date.now()) || r.data.updatedAt < Date.now() - IDLE_MS)) {
    r.data.status = "failed";
    r.data.error = "작업 대기 시간이 만료되어 1 크레딧을 환불했습니다. 새 작업으로 다시 시작해 주세요.";
    event(r.data, "작업 만료", r.data.error);
    await refund(tx, userId, r.data, "카드뉴스 에이전트 만료 · 환불");
    await persist(tx, r.data); r.lease_token = null;
  }
  return r;
}
export async function getCardAgent(userId: string, id: string) {
  return (await database()).transaction(async tx => (await expire(tx, userId, await row(tx, userId, id))).data);
}
export async function activeCardAgent(userId: string) {
  const [r] = await (await database()).query<{ id: string }>("SELECT id FROM card_agent_runs WHERE user_id=$1 AND data->>'status' NOT IN ('completed','cancelled','failed') ORDER BY updated_at DESC LIMIT 1", [userId]);
  return r ? getCardAgent(userId, r.id) : null;
}
export async function startCardAgent(userId: string, input: unknown) {
  const data = object(input), draft = createQuickCardDraft(data), key = text(data.key, "요청 키", 100, 8);
  // Retries recover the accepted run even if settings were changed afterwards.
  const db = await database();
  const [old] = await db.query<{ id: string }>("SELECT r.id FROM card_agent_runs r JOIN generation_jobs j ON r.id=j.id WHERE j.user_id=$1 AND j.idempotency_key=$2", [userId, key]);
  if (old) return getCardAgent(userId, old.id);
  await activeCardAgent(userId); // Recover/refund an expired lease before starting.
  const config = await resolveOpenAi();
  return db.transaction(async tx => {
    const [user] = await tx.query<{ credits: number }>("SELECT credits FROM users WHERE id=$1 FOR UPDATE", [userId]);
    if (!user) throw new ServiceError(401, "로그인해 주세요.");
    const [duplicate] = await tx.query<{ id: string }>("SELECT id FROM generation_jobs WHERE user_id=$1 AND idempotency_key=$2", [userId, key]);
    if (duplicate) {
      const [existing] = await tx.query<Row>("SELECT data FROM card_agent_runs WHERE id=$1", [duplicate.id]);
      if (!existing) throw new ServiceError(409, "다른 작업에 사용한 요청 키입니다.");
      return existing.data;
    }
    const active = await tx.query("SELECT id FROM card_agent_runs WHERE user_id=$1 AND data->>'status' NOT IN ('completed','cancelled','failed') LIMIT 1", [userId]);
    if (active.length) throw new ServiceError(409, "진행 중인 카드뉴스가 있습니다. 이전 작업을 이어가거나 취소해 주세요.");
    if (user.credits < 1) throw new ServiceError(402, "카드뉴스 제작에 1 크레딧이 필요합니다.");
    const now = Date.now(), id = randomUUID();
    const run: CardAgentRun = { id, revision: 1, stage: "brainstorm", status: "pending", model: config.model, effort: config.effort,
      draft, feedback: "", revisionFeedback: "", improvements: [], warnings: [], refinementCount: 0, turns: 0, events: [], createdAt: now, updatedAt: now };
    event(run, "아이디어 접수", "메모를 바탕으로 독자와 목적을 정리합니다. 전체 제작과 추가 수정 1회에 1 크레딧을 예약했습니다.");
    await tx.query("UPDATE users SET credits=credits-1 WHERE id=$1", [userId]);
    await tx.query("INSERT INTO generation_jobs (id,user_id,idempotency_key,state,cost,plane,created_at) VALUES ($1,$2,$3,'submitting',1,$4,$5)", [id, userId, key, JSON.stringify({ type: "outline", agent: true, draft }), now]);
    await tx.query("INSERT INTO card_agent_runs (id,user_id,data,updated_at) VALUES ($1,$2,$3,$4)", [id, userId, JSON.stringify(run), now]);
    await ledger(tx, userId, -1, "hold", "카드뉴스 에이전트 예약", id);
    return run;
  });
}

export async function stepCardAgent(userId: string, id: string, revision: unknown, provider: AgentProvider = openAiAgentTurn) {
  if (!Number.isInteger(revision)) throw new ServiceError(400, "작업 버전을 확인해 주세요.");
  const db = await database(), token = randomUUID();
  const claimed = await db.transaction(async tx => {
    const r = await expire(tx, userId, await row(tx, userId, id)), run = r.data;
    // A replay must never advance the *next* stage or call the provider twice.
    if (run.revision !== revision || run.status !== "pending") return { run, claimed: false };
    run.status = "running";
    const stage = AGENT_STAGES.find(s => s.id === run.stage)!;
    event(run, `${stage.title} 진행 중`, stage.description);
    await persist(tx, run, token);
    return { run, claimed: true };
  });
  if (!claimed.claimed) return claimed.run;
  try {
    const answer = await provider(claimed.run);
    // Validate outside the transaction, then fence late/cancelled results by lease.
    const run = structuredClone(claimed.run);
    if (run.stage === "brainstorm") {
      run.plan = parseAgentPlan(answer); run.status = "awaiting_direction";
      event(run, "기획 방향 3가지 준비", run.plan.intent);
    } else if (run.stage === "write") {
      run.preview = agentOutline(run, answer);
      event(run, `${run.preview.slots.length}장 초안 완성`, "제목·본문·이미지 프롬프트·캡션을 준비했습니다. 이제 원래 의도와 카드 흐름을 검수합니다.");
      run.stage = "review"; run.status = "pending";
    } else if (run.stage === "review") {
      run.review = parseAgentReview(answer);
      event(run, "편집 검수 완료", run.review.summary);
      run.stage = "refine"; run.status = "pending";
    } else {
      Object.assign(run, parseRefinement(run, answer));
      run.warnings = [...new Set([...run.warnings, ...cardQualityWarnings(run.preview!)])];
      event(run, "원고 개선 완료", run.improvements.join(" · ") || "검수 결과를 반영하고 카드 구성을 유지했습니다.");
      run.status = "ready";
    }
    run.turns++;
    return db.transaction(async tx => {
      const current = await expire(tx, userId, await row(tx, userId, id));
      if (current.lease_token !== token || current.data.status !== "running") return current.data;
      await persist(tx, run); return run;
    });
  } catch (error) {
    return db.transaction(async tx => {
      const r = await row(tx, userId, id);
      if (r.lease_token !== token || r.data.status !== "running") return r.data;
      r.data.status = "failed";
      r.data.error = `${error instanceof ServiceError && error.status === 502 ? error.message : "카드뉴스 작업을 완성하지 못했습니다."} 예약한 1 크레딧은 환불했습니다.`;
      event(r.data, "작업 중단 · 환불", r.data.error);
      await refund(tx, userId, r.data, "카드뉴스 에이전트 실패 · 환불");
      await persist(tx, r.data); return r.data;
    });
  }
}
export async function actCardAgent(userId: string, id: string, input: unknown) {
  const data = object(input);
  if (!["direction", "revise", "save", "cancel"].includes(String(data.action))) throw new ServiceError(400, "작업 종류를 확인해 주세요.");
  return (await database()).transaction(async tx => {
    const r = await expire(tx, userId, await row(tx, userId, id)), run = r.data;
    if (agentTerminal(run)) return run;
    if (data.action === "cancel") {
      run.status = "cancelled"; event(run, "작업 취소", "예약한 1 크레딧을 환불했습니다.");
      await refund(tx, userId, run, "카드뉴스 에이전트 취소 · 환불");
    } else {
      if (data.revision !== run.revision) throw new ServiceError(409, "작업이 변경되었습니다. 최신 상태를 확인해 주세요.");
      if (data.action === "direction") {
        if (run.status !== "awaiting_direction" || !Number.isInteger(data.direction) || Number(data.direction) < 0 || Number(data.direction) > 2) throw new ServiceError(400, "기획 방향을 선택해 주세요.");
        run.direction = Number(data.direction); run.feedback = text(data.feedback ?? "", "추가 의견", 1200);
        event(run, "사용자 방향 확정", `${run.plan!.directions[run.direction].title}${run.feedback ? ` · 추가 의견: ${run.feedback}` : " · 제안된 방향 그대로 진행합니다."}`);
        run.stage = "write"; run.status = "pending";
      } else if (data.action === "revise") {
        if (run.status !== "ready" || run.refinementCount >= 1) throw new ServiceError(400, "추가 AI 수정은 1회까지 가능합니다. 편집기에서 계속 수정할 수 있어요.");
        run.revisionFeedback = text(data.feedback, "수정 요청", 1200, 2); run.refinementCount++;
        event(run, "추가 의견 접수", run.revisionFeedback);
        run.stage = "review"; run.status = "pending";
      } else {
        if (run.status !== "ready" || !run.preview) throw new ServiceError(400, "완성된 원고를 확인한 뒤 저장해 주세요.");
        const project = { ...run.preview, id: randomUUID(), createdAt: Date.now(), updatedAt: Date.now(), version: 1 };
        await tx.query("INSERT INTO projects (id,owner_id,document,updated_at) VALUES ($1,$2,$3,$4)", [project.id, userId, JSON.stringify(project), project.updatedAt]);
        await initializeProjectTrace(tx, project, userId, "card-agent-accept");
        await tx.query("UPDATE generation_jobs SET state='completed',result=$1,project_id=$2 WHERE id=$3", [JSON.stringify({ status: "completed", projectId: project.id }), project.id, id]);
        await ledger(tx, userId, 0, "confirm", "카드뉴스 에이전트 완료", id);
        run.status = "completed"; run.projectId = project.id;
        event(run, "프로젝트 저장 완료", "편집기에서 이미지 생성과 최종 디자인을 마무리할 수 있습니다.");
      }
    }
    await persist(tx, run); return run;
  });
}
