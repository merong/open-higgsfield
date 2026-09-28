-- Design draft only. Per-project trace database; not an application migration.
-- project_meta must match the authorized main-DB project before every open.
PRAGMA foreign_keys = ON;
BEGIN;
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  checksum TEXT NOT NULL
);
CREATE TABLE project_meta (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  project_id TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  coverage_start INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('new','legacy','prepared'))
);
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  workflow_kind TEXT NOT NULL,
  source_workflow_id TEXT,
  action_id TEXT,
  parent_run_id TEXT REFERENCES runs(id),
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  source_version TEXT,
  capture_status TEXT NOT NULL DEFAULT 'partial'
);
CREATE TABLE turns (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  logical_turn_key TEXT NOT NULL,
  attempt INTEGER NOT NULL CHECK (attempt >= 1),
  stage TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  effort TEXT,
  provider_request_id TEXT,
  provider_response_id TEXT,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  request_json TEXT CHECK (request_json IS NULL OR json_valid(request_json)),
  response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
  response_text TEXT,
  parsed_json TEXT CHECK (parsed_json IS NULL OR json_valid(parsed_json)),
  usage_json TEXT CHECK (usage_json IS NULL OR json_valid(usage_json)),
  reasoning_availability TEXT NOT NULL DEFAULT 'not_returned',
  error_json TEXT CHECK (error_json IS NULL OR json_valid(error_json)),
  capture_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(capture_json)),
  UNIQUE(run_id, logical_turn_key, attempt)
);
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  turn_id TEXT REFERENCES turns(id),
  action_id TEXT,
  ordinal INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('system','developer','user','assistant','tool','application')),
  content_kind TEXT NOT NULL,
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(run_id, ordinal)
);
CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  turn_id TEXT REFERENCES turns(id),
  parent_call_id TEXT REFERENCES tool_calls(id),
  logical_call_key TEXT NOT NULL,
  attempt INTEGER NOT NULL CHECK (attempt >= 1),
  origin TEXT NOT NULL CHECK (origin IN ('model_tool','provider_builtin','application')),
  name TEXT NOT NULL,
  provider_call_id TEXT,
  job_id TEXT,
  args_json TEXT CHECK (args_json IS NULL OR json_valid(args_json)),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  error_json TEXT CHECK (error_json IS NULL OR json_valid(error_json)),
  observed_scope TEXT NOT NULL,
  UNIQUE(run_id, logical_call_key, attempt)
);
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(id),
  turn_id TEXT REFERENCES turns(id),
  tool_call_id TEXT REFERENCES tool_calls(id),
  asset_id TEXT,
  kind TEXT NOT NULL,
  storage_ref TEXT NOT NULL,
  sha256 TEXT,
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size >= 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at INTEGER NOT NULL
);
CREATE TABLE events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  producer_seq INTEGER NOT NULL UNIQUE,
  run_id TEXT REFERENCES runs(id),
  turn_id TEXT REFERENCES turns(id),
  tool_call_id TEXT REFERENCES tool_calls(id),
  action_id TEXT,
  causation_event_id TEXT,
  event_type TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);
CREATE TABLE change_refs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  action_id TEXT NOT NULL,
  change_id TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL REFERENCES events(event_id),
  base_version INTEGER NOT NULL,
  after_version INTEGER NOT NULL,
  changed_fields_json TEXT NOT NULL CHECK (json_valid(changed_fields_json)),
  before_refs_json TEXT NOT NULL CHECK (json_valid(before_refs_json)),
  after_refs_json TEXT NOT NULL CHECK (json_valid(after_refs_json)),
  validation_json TEXT CHECK (validation_json IS NULL OR json_valid(validation_json)),
  created_at INTEGER NOT NULL
);
CREATE INDEX runs_source ON runs(workflow_kind, source_workflow_id);
CREATE INDEX turns_run_time ON turns(run_id, started_at);
CREATE INDEX messages_turn ON messages(turn_id, ordinal);
CREATE INDEX tools_turn ON tool_calls(turn_id, started_at);
CREATE INDEX events_run_seq ON events(run_id, seq);
CREATE INDEX events_action ON events(action_id, seq);
CREATE INDEX artifacts_asset ON artifacts(asset_id);
COMMIT;
-- Provisioner inserts metadata and migration checksum inside its setup protocol.
-- State transitions and the event/projection atomic write protocol live in code.
