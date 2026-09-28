import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/service/session";
import { requireTraceMode } from "@/service/trace-policy";
import { annotateProjectTrace, readProjectTrace } from "@/service/trace-access";
import { ServiceError } from "@/service/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ projectId: string }> };
async function route(request: NextRequest, context: Context) {
  try {
    requireTraceMode();
    const user = await requireUser(), { projectId } = await context.params;
    let value: unknown;
    if (request.method === "GET") {
      const raw = request.nextUrl.searchParams.get("before");
      const before = raw === null ? undefined : Number(raw);
      if (before !== undefined && (!Number.isSafeInteger(before) || before < 1)) throw new ServiceError(400, "페이지 위치를 확인해 주세요.");
      value = await readProjectTrace(user.id, projectId, before);
    } else {
      const origin = request.headers.get("origin");
      let originHost = "";
      try { originHost = new URL(origin || "").host; } catch { /* invalid Origin is denied below */ }
      if (!originHost || originHost !== request.headers.get("host")) throw new ServiceError(403, "같은 사이트에서 요청해 주세요.");
      const raw = await request.text();
      if (raw.length > 24000) throw new ServiceError(413, "평가 내용이 너무 큽니다.");
      let body: unknown;
      try { body = JSON.parse(raw); } catch { throw new ServiceError(400, "올바른 JSON을 보내 주세요."); }
      value = await annotateProjectTrace(user.id, projectId, body);
    }
    return NextResponse.json(value, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ServiceError ? error.message : "실행 기록을 읽거나 저장하지 못했습니다." }, { status: error instanceof ServiceError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
export { route as GET, route as POST };
