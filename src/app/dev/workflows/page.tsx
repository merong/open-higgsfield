import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/service/session";
import { traceEnabled } from "@/service/trace-policy";
import { listProjects } from "@/service/projects";
import { readProjectTrace } from "@/service/trace-access";
import { TraceWorkbench } from "@/dev-workflow/workbench";
import "@/dev-workflow/workbench.css";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "워크플로우 관찰실", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  if (!traceEnabled()) return <main className="tw-workbench"><p className="tw-eyebrow">DEVELOPMENT / WORKFLOW LAB</p><h1>로컬 개발 DB가 필요합니다</h1><p>PostgreSQL 연결이 설정되어 있어 기록 수집을 껐습니다. 공유 DB의 대화 기록이 다른 서버의 로컬 파일로 나뉘지 않도록 하는 개발 환경 제한입니다.</p><p>관찰실은 DATABASE_URL을 사용하지 않는 별도의 로컬 PGlite 개발 환경에서 실행해 주세요.</p></main>;
  const user = await currentUser();
  if (!user) redirect("/login");
  const projects = await listProjects(user.id), selected = (await searchParams).project || projects[0]?.id;
  if (selected && !projects.some(p => p.id === selected)) notFound();
  const initial = selected ? await readProjectTrace(user.id, selected) : null;
  return <TraceWorkbench key={selected || "empty"} projects={projects.map(p => ({ id: p.id, title: p.title, format: p.format }))} initial={initial} />;
}
