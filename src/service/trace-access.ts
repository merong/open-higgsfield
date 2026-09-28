import { requireTraceMode } from "./trace-policy";
import { getProject } from "./projects";
import { flushProjectTrace } from "./workflow-trace";
import { projectTraceAnnotate, projectTraceRead } from "./trace-store";

// Every trace access first checks the live project's ownership/deletion state.
// Being an admin alone does not grant access to another user's raw conversation.
export async function readProjectTrace(userId: string, projectId: string, before?: number) {
  requireTraceMode();
  const project = await getProject(userId, projectId);
  const relay = await flushProjectTrace(projectId, userId);
  return { project: { id: project.id, title: project.title, format: project.format }, ...projectTraceRead(projectId, userId, before), ...relay };
}
export async function annotateProjectTrace(userId: string, projectId: string, input: unknown) {
  requireTraceMode();
  await getProject(userId, projectId);
  await flushProjectTrace(projectId, userId);
  return projectTraceAnnotate(projectId, userId, input);
}
