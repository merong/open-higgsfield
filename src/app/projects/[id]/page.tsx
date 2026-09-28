import { isPageFormat } from "@/projects/product-detail";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/service/session";
import { getProject } from "@/service/projects";
import { ServiceError } from "@/service/errors";
import { database } from "@/service/db";
import { ProjectEditor } from "@/editors/project-editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(),
    { id } = await params;
  try {
    const project = await getProject(user.id, id);
    if (isPageFormat(project.format)) {
      const [workflow] = await (await database()).query<{ id: string }>("SELECT id FROM landing_workflows WHERE project_id=$1 AND user_id=$2 AND data->>'status' NOT IN ('completed','cancelled') ORDER BY updated_at DESC LIMIT 1", [id, user.id]);
      if (workflow) redirect(`/projects/new?format=${project.format}&landingWorkflow=${encodeURIComponent(workflow.id)}`);
    }
    if (project.format === "reels") {
      const [workflow] = await (await database()).query<{ id: string }>("SELECT id FROM reel_workflows WHERE project_id=$1 AND user_id=$2 ORDER BY updated_at DESC LIMIT 1", [id, user.id]);
      if (workflow) redirect(`/projects/new?format=reels&reelWorkflow=${encodeURIComponent(workflow.id)}`);
    }
    return <ProjectEditor initial={project} />;
  } catch (error) {
    if (error instanceof ServiceError && error.status === 404) notFound();
    throw error;
  }
}
