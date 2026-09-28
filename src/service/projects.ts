import { isPageFormat } from "@/projects/product-detail";
import { randomUUID } from "node:crypto";
import type { Project } from "@/projects/types";
import { parseProject } from "@/projects/validation";
import { database } from "./db";
import { ServiceError } from "./errors";
import { initializeProjectTrace } from "./workflow-trace";
interface Row {
  document: Project;
  version: number;
  updated_at: string;
}
const unpack = (row: Row): Project => ({
  ...row.document,
  version: row.version,
  updatedAt: Number(row.updated_at),
});
export async function listProjects(userId: string) {
  return (
    await (
      await database()
    ).query<Row>(
      "SELECT document,version,updated_at FROM projects WHERE owner_id=$1 AND deleted_at IS NULL ORDER BY updated_at DESC",
      [userId],
    )
  ).map(unpack);
}
export async function getProject(userId: string, id: string) {
  const [row] = await (
    await database()
  ).query<Row>(
    "SELECT document,version,updated_at FROM projects WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL",
    [id, userId],
  );
  if (!row) throw new ServiceError(404, "프로젝트를 찾을 수 없습니다.");
  return unpack(row);
}
export async function createProject(userId: string, input: unknown) {
  const p = parseProject(input);
  p.id = randomUUID();
  p.createdAt = Date.now();
  p.updatedAt = p.createdAt;
  p.version = 1;
  await (await database()).transaction(async tx => {
    await tx.query("INSERT INTO projects (id,owner_id,document,updated_at) VALUES ($1,$2,$3,$4)", [p.id, userId, JSON.stringify(p), p.updatedAt]);
    await initializeProjectTrace(tx, p, userId, "project");
  });
  return p;
}
export async function updateProject(
  userId: string,
  id: string,
  input: unknown,
) {
  const p = parseProject(input);
  if (p.id !== id)
    throw new ServiceError(400, "프로젝트 ID가 일치하지 않습니다.");
  const rows = await (
    await database()
  ).query<Row>(
    "UPDATE projects SET document=$1, version=version+1, updated_at=$2 WHERE id=$3 AND owner_id=$4 AND version=$5 AND deleted_at IS NULL RETURNING document,version,updated_at",
    [JSON.stringify(p), Date.now(), id, userId, p.version],
  );
  if (!rows.length) {
    await getProject(userId, id);
    throw new ServiceError(
      409,
      "다른 창에서 프로젝트가 변경되었습니다. 현재 작업을 JSON으로 보관한 뒤 새로 불러오세요.",
    );
  }
  return unpack(rows[0]);
}
export async function archiveProject(userId: string, id: string) {
  const project = await getProject(userId, id);
  if (isPageFormat(project.format)) {
    const [active] = await (await database()).query<{ id: string }>("SELECT id FROM landing_workflows WHERE project_id=$1 AND user_id=$2 AND data->>'status' NOT IN ('completed','cancelled')", [id, userId]);
    if (active) {
      const { getLanding, actLanding } = await import("./landing-workflow");
      const run = await getLanding(userId, active.id);
      await actLanding(userId, run.id, { action: "cancel", responseId: randomUUID(), revision: run.revision });
    }
  }
  await (
    await database()
  ).query("UPDATE projects SET deleted_at=$1 WHERE id=$2 AND owner_id=$3", [
    Date.now(),
    id,
    userId,
  ]);
}
