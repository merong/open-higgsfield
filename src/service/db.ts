import path from "node:path";
import { mkdir } from "node:fs/promises";

export interface Database {
  readonly inTransaction?: boolean;
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  transaction<T>(work: (tx: Database) => Promise<T>): Promise<T>;
}

const schema = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, is_admin BOOLEAN NOT NULL DEFAULT FALSE, credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0), created_at BIGINT NOT NULL)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_username ON users (username) WHERE username IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS provider_settings (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, sealed TEXT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS provider_settings_singleton ON provider_settings ((true))`,
  `CREATE TABLE IF NOT EXISTS text_provider_settings (provider TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), sealed TEXT NOT NULL, model TEXT NOT NULL, updated_at BIGINT NOT NULL)`,
  `ALTER TABLE text_provider_settings ADD COLUMN IF NOT EXISTS reasoning_effort TEXT`,
  `CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), document JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at BIGINT NOT NULL, deleted_at BIGINT)`,
  `CREATE INDEX IF NOT EXISTS projects_owner ON projects(owner_id, updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, mime TEXT NOT NULL, data BYTEA, url TEXT, created_at BIGINT NOT NULL)`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id)`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS byte_size BIGINT NOT NULL DEFAULT 0`,
  `UPDATE assets SET byte_size=octet_length(data) WHERE byte_size=0 AND data IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS generation_jobs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), idempotency_key TEXT NOT NULL, request_id TEXT UNIQUE, state TEXT NOT NULL, cost INTEGER NOT NULL, plane JSONB NOT NULL, result JSONB, project_id TEXT, slot_id TEXT, created_at BIGINT NOT NULL, UNIQUE(user_id, idempotency_key))`,
  `ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS review_required BOOLEAN NOT NULL DEFAULT FALSE`,
  `CREATE TABLE IF NOT EXISTS project_image_boards (project_id TEXT PRIMARY KEY REFERENCES projects(id), user_id TEXT NOT NULL REFERENCES users(id), data JSONB NOT NULL, lease_token TEXT, lease_until BIGINT)`,
  `CREATE TABLE IF NOT EXISTS credit_ledger (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL, kind TEXT NOT NULL, description TEXT NOT NULL, job_id TEXT, created_at BIGINT NOT NULL)`,
  `ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS provider_credential TEXT`,
  `ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS provider_origin TEXT`,
  `CREATE TABLE IF NOT EXISTS card_agent_runs (id TEXT PRIMARY KEY REFERENCES generation_jobs(id), user_id TEXT NOT NULL REFERENCES users(id), data JSONB NOT NULL, lease_token TEXT, lease_until BIGINT, updated_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS card_agent_owner ON card_agent_runs(user_id,updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS card_workflows (id TEXT PRIMARY KEY REFERENCES generation_jobs(id), project_id TEXT NOT NULL REFERENCES projects(id), user_id TEXT NOT NULL REFERENCES users(id), data JSONB NOT NULL, lease_token TEXT, lease_until BIGINT, updated_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS card_workflows_owner ON card_workflows(user_id,updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS reel_workflows (id TEXT PRIMARY KEY REFERENCES generation_jobs(id), project_id TEXT NOT NULL REFERENCES projects(id), user_id TEXT NOT NULL REFERENCES users(id), data JSONB NOT NULL, lease_token TEXT, lease_until BIGINT, updated_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS reel_workflows_owner ON reel_workflows(user_id,updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS reel_workflow_versions (run_id TEXT NOT NULL REFERENCES reel_workflows(id), version INTEGER NOT NULL, data JSONB NOT NULL, reason TEXT NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY(run_id,version))`,
  `CREATE TABLE IF NOT EXISTS landing_workflows (id TEXT PRIMARY KEY REFERENCES generation_jobs(id), project_id TEXT NOT NULL REFERENCES projects(id), user_id TEXT NOT NULL REFERENCES users(id), data JSONB NOT NULL, lease_token TEXT, lease_until BIGINT, updated_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS landing_workflows_owner ON landing_workflows(user_id,updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS landing_workflow_versions (run_id TEXT NOT NULL REFERENCES landing_workflows(id), version INTEGER NOT NULL, data JSONB NOT NULL, reason TEXT NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY(run_id,version))`,
  `CREATE TABLE IF NOT EXISTS card_workflow_versions (run_id TEXT NOT NULL REFERENCES card_workflows(id), version INTEGER NOT NULL, document JSONB NOT NULL, reason TEXT NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY(run_id,version))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS credit_job_once ON credit_ledger(job_id, kind) WHERE job_id IS NOT NULL`,
  `ALTER TABLE credit_ledger ADD COLUMN IF NOT EXISTS actor_id TEXT`,
  `ALTER TABLE credit_ledger ADD COLUMN IF NOT EXISTS request_key TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS credit_grant_once ON credit_ledger(actor_id,request_key) WHERE request_key IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS seed_events (id TEXT PRIMARY KEY, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS project_trace_outbox (ordinal BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, project_id TEXT NOT NULL, envelope JSONB NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS trace_outbox_project ON project_trace_outbox(project_id,ordinal)`,
];

const state = globalThis as typeof globalThis & {
  ohfDatabase?: Promise<Database>;
};

export async function createDatabase(): Promise<Database> {
  let db: Database;
  if (process.env.DATABASE_URL) {
    const { default: postgres } = await import("postgres");
    const client = postgres(process.env.DATABASE_URL, {
      max: 5,
      prepare: false,
    });
    const wrap = (sql: typeof client, inTransaction = false): Database => ({
      inTransaction,
      async query<T>(text: string, params: unknown[] = []) {
        return (await sql.unsafe(text, params as never[])) as unknown as T[];
      },
      async transaction<T>(work: (tx: Database) => Promise<T>) {
        return (await sql.begin(async (tx) =>
          work(wrap(tx as unknown as typeof client, true)),
        )) as T;
      },
    });
    db = wrap(client);
  } else {
    if (
      process.env.NODE_ENV === "production" &&
      !process.env.ALLOW_LOCAL_DATABASE
    ) {
      throw new Error("운영 환경에는 DATABASE_URL이 필요합니다.");
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const dir =
      process.env.LOCAL_DATABASE_DIR ||
      path.join(process.cwd(), ".data", "postgres");
    if (dir !== "memory://") await mkdir(dir, { recursive: true });
    const client = new PGlite(dir);
    await client.waitReady;
    const wrap = (
      sql: Pick<typeof client, "query" | "transaction">,
      inTransaction = false,
    ): Database => ({
      inTransaction,
      async query<T>(text: string, params: unknown[] = []) {
        return (await sql.query<T>(text, params)).rows;
      },
      transaction: (work) =>
        sql.transaction((tx) => work(wrap(tx as unknown as typeof client, true))),
    });
    db = wrap(client);
  }
  for (const statement of schema) await db.query(statement);
  return db;
}

export function database() {
  state.ohfDatabase ??= createDatabase().catch((error) => {
    state.ohfDatabase = undefined;
    throw error;
  });
  return state.ohfDatabase;
}
