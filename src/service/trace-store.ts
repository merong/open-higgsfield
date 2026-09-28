import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { RUBRIC, dimensions, type TraceEvent, type TraceEvaluation, type TraceExperiment, type TraceSnapshot } from "../dev-workflow/types";
import { object, ServiceError, text } from "./errors";
import { requireTraceMode, sanitizeTrace } from "./trace-policy";

const schema = `
CREATE TABLE metadata (id INTEGER PRIMARY KEY CHECK(id=1), project_id TEXT NOT NULL, owner_id TEXT NOT NULL, coverage_start INTEGER NOT NULL, coverage TEXT NOT NULL CHECK(coverage IN ('new_project','legacy_partial'))) STRICT;
CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, run_id TEXT NOT NULL, turn_id TEXT, phase TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('project.created','workflow.state','user.action','model.request','model.response','model.error','model.parsed','tool.result','generation.request','generation.result','diagnostic')), label TEXT NOT NULL, at INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data))) STRICT;
CREATE INDEX events_run ON events(run_id,seq);
CREATE INDEX events_turn ON events(turn_id);
CREATE TABLE evaluations (id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id), related_event_id TEXT REFERENCES events(id), author TEXT NOT NULL, source TEXT NOT NULL CHECK(source IN ('developer','customer_report')), dimension TEXT NOT NULL CHECK(dimension IN ('intent','factuality','visual','image_fit','effort','satisfaction')), score INTEGER CHECK(score BETWEEN 1 AND 5), effect TEXT NOT NULL CHECK(effect IN ('improved','degraded','unchanged','unknown')), note TEXT NOT NULL, quote TEXT NOT NULL, rubric TEXT NOT NULL, at INTEGER NOT NULL, supersedes TEXT UNIQUE REFERENCES evaluations(id), CHECK(dimension!='satisfaction' OR source='customer_report'), CHECK(source!='customer_report' OR length(quote)>0), CHECK(related_event_id IS NULL OR related_event_id!=event_id)) STRICT;
CREATE INDEX evaluation_target ON evaluations(event_id,dimension,source,author);
CREATE TABLE experiments (id TEXT PRIMARY KEY, baseline_id TEXT NOT NULL REFERENCES events(id), candidate_id TEXT REFERENCES events(id), hypothesis TEXT NOT NULL, dimension TEXT NOT NULL CHECK(dimension IN ('intent','factuality','visual','image_fit','effort','satisfaction')), target TEXT NOT NULL, controls TEXT NOT NULL, author TEXT NOT NULL, at INTEGER NOT NULL, CHECK(candidate_id IS NULL OR candidate_id!=baseline_id)) STRICT;
CREATE TABLE experiment_decisions (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL REFERENCES experiments(id), verdict TEXT NOT NULL CHECK(verdict IN ('adopt','reject','inconclusive')), note TEXT NOT NULL, author TEXT NOT NULL, at INTEGER NOT NULL, evidence TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(evidence))) STRICT;
`;
export function traceFile(projectId: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId)) throw new ServiceError(400, "프로젝트 ID가 올바르지 않습니다.");
  return path.join(process.env.WORKFLOW_TRACE_DIR || path.join(process.cwd(), ".data", "workflow-traces"), projectId, "trace.sqlite");
}
export function withTraceStore<T>(projectId: string, ownerId: string, work: (db: DatabaseSync) => T, coverage: TraceSnapshot["coverage"] = "legacy_partial"): T {
  requireTraceMode();
  const file = traceFile(projectId);
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(file);
  try {
    chmodSync(file, 0o600);
    db.exec("PRAGMA busy_timeout=3000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
    db.exec("BEGIN IMMEDIATE");
    try {
      const version = Number(db.prepare("PRAGMA user_version").get()!.user_version);
      if (version > 2) throw new Error("Trace schema is newer than this application");
      if (!version) {
        db.exec(schema);
        db.prepare("INSERT INTO metadata VALUES (1,?,?,?,?)").run(projectId, ownerId, Date.now(), coverage);
      }
      if (version === 1) db.exec("ALTER TABLE experiment_decisions ADD COLUMN evidence TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(evidence))");
      if (version < 2) db.exec("PRAGMA user_version=2");
      const meta = db.prepare("SELECT * FROM metadata WHERE id=1").get()!;
      if (meta.project_id !== projectId || meta.owner_id !== ownerId) throw new ServiceError(404, "기록을 찾을 수 없습니다.");
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
    return work(db);
  } finally { db.close(); }
}
export function projectTraceCreated(projectId: string, ownerId: string) {
  withTraceStore(projectId, ownerId, () => {}, "new_project");
}
export type TraceEnvelope = Omit<TraceEvent, "seq">;
export function projectTraceAppend(projectId: string, ownerId: string, events: TraceEnvelope[]) {
  withTraceStore(projectId, ownerId, db => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const insert = db.prepare("INSERT INTO events(id,run_id,turn_id,phase,kind,label,at,data) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING");
      for (const e of events) insert.run(e.id, e.runId, e.turnId, e.phase, e.kind, e.label, e.at, JSON.stringify(e.data));
      if (events.length) db.prepare("UPDATE metadata SET coverage_start=min(coverage_start,?) WHERE id=1").run(Math.min(...events.map(e => e.at)));
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  });
}
// Internal failure path, never an API authorization path. A known project file
// can preserve provider observations even when the main DB's outbox is down.
export function projectTraceFallback(projectId: string, event: TraceEnvelope) {
  const file = traceFile(projectId);
  if (!existsSync(file)) return false;
  const db = new DatabaseSync(file, { readOnly: true });
  let owner: string;
  try { owner = String(db.prepare("SELECT owner_id FROM metadata WHERE id=1").get()!.owner_id); }
  finally { db.close(); }
  projectTraceAppend(projectId, owner, [event]);
  return true;
}
function readEvents(db: DatabaseSync, sql: string, params: (string | number)[] = []): TraceEvent[] {
  return db.prepare(sql).all(...params).map(r => ({ id: String(r.id), seq: Number(r.seq), runId: String(r.run_id), turnId: r.turn_id as string | null, phase: String(r.phase), kind: r.kind as TraceEvent["kind"], label: String(r.label), at: Number(r.at), data: JSON.parse(String(r.data)) }));
}
export function projectTraceRead(projectId: string, ownerId: string, before?: number): Omit<TraceSnapshot, "pending" | "relayError"> {
  return withTraceStore(projectId, ownerId, db => {
    const meta = db.prepare("SELECT * FROM metadata WHERE id=1").get()!;
    const events = readEvents(db, "SELECT * FROM events WHERE seq<? ORDER BY seq DESC LIMIT 100", [before || Number.MAX_SAFE_INTEGER]).reverse();
    const evaluations = db.prepare("SELECT e.* FROM evaluations e WHERE NOT EXISTS(SELECT 1 FROM evaluations n WHERE n.supersedes=e.id) ORDER BY e.at DESC").all().map(r => ({ id: String(r.id), eventId: String(r.event_id), relatedEventId: r.related_event_id as string | null, author: String(r.author), source: r.source, dimension: r.dimension, score: r.score, effect: r.effect, note: r.note, quote: r.quote, rubric: r.rubric, at: Number(r.at) })) as TraceEvaluation[];
    const experiments = db.prepare("SELECT * FROM experiments ORDER BY at DESC").all().map(r => ({ id: String(r.id), baselineId: String(r.baseline_id), candidateId: r.candidate_id as string | null, hypothesis: String(r.hypothesis), dimension: r.dimension, target: String(r.target), controls: String(r.controls), at: Number(r.at), decisions: db.prepare("SELECT * FROM experiment_decisions WHERE experiment_id=? ORDER BY at DESC,rowid DESC").all(r.id).map(d => ({ ...d, evidence: JSON.parse(String(d.evidence)) })) })) as TraceExperiment[];
    // Always include evidence referenced by annotations/experiments, even outside
    // the timeline page. The UI deduplicates these with fetched older pages.
    const refs = new Set([...evaluations.flatMap(e => [e.eventId, e.relatedEventId]), ...experiments.flatMap(e => [e.baselineId, e.candidateId])].filter((id): id is string => !!id));
    const extras = [...refs].filter(id => !events.some(e => e.id === id)).flatMap(id => readEvents(db, "SELECT * FROM events WHERE id=?", [id]));
    const first = events[0]?.seq;
    return { projectId, coverageStart: Number(meta.coverage_start), coverage: meta.coverage as TraceSnapshot["coverage"], events: [...extras, ...events].sort((a, b) => a.seq - b.seq), total: Number(db.prepare("SELECT count(*) AS n FROM events").get()!.n), captureGaps: Number(db.prepare("SELECT count(*) AS n FROM events WHERE kind='diagnostic' AND json_extract(data,'$.outcome')='capture_gap'").get()!.n), nextBefore: first && db.prepare("SELECT 1 FROM events WHERE seq<? LIMIT 1").get(first) ? first : null, evaluations, experiments };
  });
}
const idText = (v: unknown) => text(v, "기록 ID", 100, 1);
function dimension(v: unknown) {
  if (typeof v !== "string" || !Object.hasOwn(dimensions, v)) throw new ServiceError(400, "평가 항목을 선택해 주세요.");
  return v;
}
function requireEvent(db: DatabaseSync, id: string) {
  if (!db.prepare("SELECT id FROM events WHERE id=?").get(id)) throw new ServiceError(400, "이 프로젝트의 기록을 선택해 주세요.");
}
function checkRetry(db: DatabaseSync, table: "evaluations" | "experiments" | "experiment_decisions", id: string, expected: Record<string, string | number | null>) {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
  if (row && Object.entries(expected).some(([key, value]) => row[key] !== value)) throw new ServiceError(409, "다른 내용에 사용된 저장 ID입니다. 새 요청으로 저장해 주세요.");
}
export function projectTraceAnnotate(projectId: string, ownerId: string, input: unknown) {
  const d = object(input), kind = text(d.kind, "작업", 40, 1), id = idText(d.id || randomUUID());
  return withTraceStore(projectId, ownerId, db => {
    db.exec("BEGIN IMMEDIATE");
    try {
      if (kind === "evaluation") {
        const eventId = idText(d.eventId), relatedId = d.relatedEventId ? idText(d.relatedEventId) : null, dim = dimension(d.dimension);
        requireEvent(db, eventId); if (relatedId) requireEvent(db, relatedId);
        if (eventId === relatedId) throw new ServiceError(400, "서로 다른 두 지점을 연결해 주세요.");
        if (!["developer", "customer_report"].includes(String(d.source))) throw new ServiceError(400, "평가 출처를 선택해 주세요.");
        if (dim === "satisfaction" && d.source !== "customer_report") throw new ServiceError(400, "고객 만족은 명시적인 고객 의견이 있어야 평가할 수 있습니다.");
        if (!["improved", "degraded", "unchanged", "unknown"].includes(String(d.effect))) throw new ServiceError(400, "변화 방향을 선택해 주세요.");
        const score = d.score === null || d.score === undefined ? null : d.score;
        if (score !== null && (!Number.isInteger(score) || Number(score) < 1 || Number(score) > 5)) throw new ServiceError(400, "점수는 1~5 또는 미평가입니다.");
        const quote = text(d.quote || "", "고객 원문", 4000, d.source === "customer_report" ? 1 : 0);
        const note = text(d.note, "평가 근거", 4000, 2);
        checkRetry(db, "evaluations", id, { event_id: eventId, related_event_id: relatedId, author: ownerId, source: String(d.source), dimension: dim, score: score as number | null, effect: String(d.effect), note: String(sanitizeTrace(note)), quote: String(sanitizeTrace(quote)), rubric: RUBRIC });
        const previous = db.prepare("SELECT e.id FROM evaluations e WHERE event_id=? AND author=? AND source=? AND dimension=? AND NOT EXISTS(SELECT 1 FROM evaluations n WHERE n.supersedes=e.id)").get(eventId, ownerId, String(d.source), dim);
        db.prepare("INSERT INTO evaluations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").run(id, eventId, relatedId, ownerId, String(d.source), dim, score as number | null, String(d.effect), String(sanitizeTrace(note)), String(sanitizeTrace(quote)), RUBRIC, Date.now(), previous?.id || null);
      } else if (kind === "experiment") {
        const base = idText(d.baselineId), candidate = d.candidateId ? idText(d.candidateId) : null;
        requireEvent(db, base); if (candidate) requireEvent(db, candidate);
        if (base === candidate) throw new ServiceError(400, "비교할 다른 결과를 선택해 주세요.");
        const hypothesis = String(sanitizeTrace(text(d.hypothesis, "개선 가설", 2000, 2))), dim = dimension(d.dimension), target = String(sanitizeTrace(text(d.target, "성공 기준", 1000, 2))), controls = String(sanitizeTrace(text(d.controls, "비교 조건", 2000, 2)));
        checkRetry(db, "experiments", id, { baseline_id: base, candidate_id: candidate, hypothesis, dimension: dim, target, controls, author: ownerId });
        const duplicate = db.prepare("SELECT id FROM experiments WHERE baseline_id=? AND candidate_id IS ? AND hypothesis=? AND dimension=? AND target=? AND controls=? AND author=?").get(base, candidate, hypothesis, dim, target, controls, ownerId);
        if (duplicate) { db.exec("COMMIT"); return { id: String(duplicate.id) }; }
        db.prepare("INSERT INTO experiments VALUES (?,?,?,?,?,?,?,?,?)").run(id, base, candidate, hypothesis, dim, target, controls, ownerId, Date.now());
      } else if (kind === "decision") {
        const experimentId = idText(d.experimentId);
        const experiment = db.prepare("SELECT * FROM experiments WHERE id=?").get(experimentId);
        if (!experiment) throw new ServiceError(400, "실험을 찾을 수 없습니다.");
        if (!["adopt", "reject", "inconclusive"].includes(String(d.verdict))) throw new ServiceError(400, "검토 결론을 선택해 주세요.");
        const note = String(sanitizeTrace(text(d.note, "검토 근거·다음 조치", 4000, 2)));
        checkRetry(db, "experiment_decisions", id, { experiment_id: experimentId, verdict: String(d.verdict), note, author: ownerId });
        // A response-lost retry is the original decision, even if the latest
        // scores changed after it was committed. Do not revalidate new evidence.
        if (db.prepare("SELECT id FROM experiment_decisions WHERE id=?").get(id)) { db.exec("COMMIT"); return { id }; }
        if (d.verdict !== "inconclusive") {
          if (!experiment.candidate_id) throw new ServiceError(400, "후보 결과가 없는 실험은 판단 보류로 남겨 주세요.");
          const pair = db.prepare("SELECT 1 FROM evaluations b JOIN evaluations c ON b.dimension=c.dimension AND b.rubric=c.rubric AND b.source=c.source WHERE b.event_id=? AND c.event_id=? AND b.dimension=? AND b.rubric=? AND b.score IS NOT NULL AND c.score IS NOT NULL AND NOT EXISTS(SELECT 1 FROM evaluations n WHERE n.supersedes=b.id OR n.supersedes=c.id) LIMIT 1").get(experiment.baseline_id, experiment.candidate_id, experiment.dimension, RUBRIC);
          if (!pair) throw new ServiceError(400, "기준·후보 양쪽에 같은 항목·출처의 점수 평가를 먼저 남겨 주세요.");
        }
        const evidence = db.prepare("SELECT * FROM evaluations e WHERE event_id IN (?,?) AND dimension=? AND rubric=? AND NOT EXISTS(SELECT 1 FROM evaluations n WHERE n.supersedes=e.id) ORDER BY e.id").all(experiment.baseline_id, experiment.candidate_id, experiment.dimension, RUBRIC).map(e => ({ id: e.id, eventId: e.event_id, dimension: e.dimension, source: e.source, score: e.score, rubric: e.rubric, note: e.note }));
        const previousDecision = db.prepare("SELECT * FROM experiment_decisions WHERE experiment_id=? ORDER BY at DESC,rowid DESC LIMIT 1").get(experimentId);
        if (previousDecision && previousDecision.verdict === d.verdict && previousDecision.note === note && previousDecision.author === ownerId && previousDecision.evidence === JSON.stringify(evidence)) { db.exec("COMMIT"); return { id: String(previousDecision.id) }; }
        db.prepare("INSERT INTO experiment_decisions VALUES (?,?,?,?,?,?,?)").run(id, experimentId, String(d.verdict), note, ownerId, Date.now(), JSON.stringify(evidence));
      } else throw new ServiceError(400, "지원하지 않는 작업입니다.");
      db.exec("COMMIT"); return { id };
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  });
}
