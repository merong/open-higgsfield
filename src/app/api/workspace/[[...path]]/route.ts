import { recommendProjectTypography } from "@/service/typography";
import { getImageBoard, generateBoardImages, stepBoardImages, applyBoardImages, resetBoardImages } from "@/service/landing-images";
import { NextRequest, NextResponse } from "next/server";
import { startReel, getReel, activeReel, stepReel, actReel, reelVersions } from "@/service/reel-workflow";
import { reelQuote, attachReelAsset, generateReelVisual, pollReelVisual, generateReelVoice } from "@/service/reel-media";
import { renderReel, reviewReel, completeReel } from "@/service/reel-render";
import { realignReelVoice } from "@/service/reel-alignment";
import {
  authenticate,
  revokeSession,
  SESSION_AGE,
  SESSION_COOKIE,
  throttle,
} from "@/service/auth";
import { currentUser, requireUser, requireAdmin } from "@/service/session";
import { ServiceError, object, text } from "@/service/errors";
import {
  archiveProject,
  createProject,
  getProject,
  listProjects,
  updateProject,
} from "@/service/projects";
import { listLedger, quote } from "@/service/credits";
import {
  listJobs,
  platformReady,
  submitJob,
  validatePlane,
} from "@/service/generation";
import { createAiProject, outlineReady } from "@/service/outline";
import { openAiOutline } from "@/service/openai-outline";
import { checkOpenAi, listOpenAiModels, openAiReady, openAiSettings, removeOpenAiSettings, saveOpenAiSettings } from "@/service/openai-settings";
import { createQuickCardDraft } from "@/projects/quick-card";
import { activeWorkflow, actWorkflow, getWorkflow, startWorkflow, stepWorkflow, workflowVersions } from "@/service/card-workflow";
import { pollWorkflowImage, startWorkflowImage, workflowImageQuote, startWorkflowImageBatch, pollWorkflowImageBatch } from "@/service/workflow-images";
import { reviewWorkflowOutput } from "@/service/workflow-quality";
import { finalizeWorkflow } from "@/service/workflow-export";
import { activeCardAgent, actCardAgent, getCardAgent, startCardAgent, stepCardAgent } from "@/service/card-agent";
import { assetFile, assetList, saveAsset } from "@/service/assets";
import { readProductUpload, uploadProductImage } from "@/service/product-images";
import { recommendReel } from "@/service/reel-recommendation";
import { recommendProduct } from "@/service/product-recommendation";
import { recommendLanding } from "@/service/landing-recommendation";
import { activeLanding, getLanding, startLanding, stepLanding, actLanding } from "@/service/landing-workflow";
import { checkProvider, providerSettings, removeProviderSettings, saveProviderSettings } from "@/service/provider-settings";
import { verifiedPeer } from "@/service/admin-access";
import { adminOverview, adminGrant } from "@/service/admin";
import { adminDashboard, adminList } from "@/service/admin-reports";
import { flushUserTraces } from "@/service/workflow-trace";

import { libraryList, adminLibraryFile } from "@/service/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ path?: string[] }> };
const json = (value: unknown) =>
  NextResponse.json(value, { headers: { "Cache-Control": "no-store" } });
async function body(request: NextRequest) {
  if (Number(request.headers.get("content-length") || 0) > 512000)
    throw new ServiceError(413, "문서가 너무 큽니다.");
  const raw = await request.text();
  if (raw.length > 512000) throw new ServiceError(413, "문서가 너무 큽니다.");
  try {
    return object(JSON.parse(raw));
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(400, "올바른 JSON을 보내 주세요.");
  }
}
async function route(request: NextRequest, context: Context) {
  let traceUserId: string | undefined;
  try {
    const parts = (await context.params).path ?? [],
      [resource, id] = parts,
      method = request.method;
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      if (!origin || new URL(origin).host !== request.headers.get("host"))
        throw new ServiceError(403, "같은 사이트에서 요청해 주세요.");
    }
    if (resource === "session" && method === "GET") {
      const user = await currentUser();
      return json({
        user,
        generationReady: user ? await platformReady(user.id) : false,
        outlineReady: user ? await outlineReady() : false,
        quickCardReady: user ? await openAiReady() : false,
      });
    }
    if (resource === "auth" && method === "POST") {
      if (id === "logout") {
        await revokeSession(request.cookies.get(SESSION_COOKIE)?.value);
        const res = json({ ok: true });
        res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
        return res;
      }
      if (id !== "login" && id !== "register")
        throw new ServiceError(404, "요청을 찾을 수 없습니다.");
      const ip = verifiedPeer(request.headers);
      await throttle(`auth-ip:${ip}`, 40);
      const { user, token } = await authenticate(
        await body(request),
        id === "register",
        ip,
      );
      const res = json({ user });
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_AGE,
      });
      return res;
    }
    const user = await requireUser();
    traceUserId = user.id;
    const libraryFilters = Object.fromEntries(["feature","kind","search","user","userId","page"].map(key=>[key,request.nextUrl.searchParams.get(key) || ""]));
    if (resource === "library" && method === "GET") return json(await libraryList(user.id,libraryFilters));
    if (resource === "admin") {
      await requireAdmin();
      if (id === "dashboard" && method === "GET") return json(await adminDashboard(user.id));
      if ((id === "users" || id === "projects" || id === "activity") && method === "GET") {
        const filters=Object.fromEntries(["search","user","userId","filter","feature","page"].map(key=>[key,request.nextUrl.searchParams.get(key) || ""]));
        return json(await adminList(user.id,id,filters));
      }
      if (id === "library" && method === "GET") return json(await libraryList(user.id,libraryFilters,true));
      if (id === "library-file" && parts[2] && method === "GET") {
        const file=await adminLibraryFile(user.id,parts[2]);
        if (file.url) return NextResponse.redirect(file.url);
        return new NextResponse(new Uint8Array(file.data!),{headers:{"Content-Type":file.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
      }
      if (id === "overview" && method === "GET") return json(await adminOverview(user.id,request.nextUrl.searchParams.get("search") || "",request.nextUrl.searchParams.get("userId") || "",Number(request.nextUrl.searchParams.get("page") || 1),request.nextUrl.searchParams.get("kind") || ""));
      if (id === "grants" && method === "POST") {
        const data = await body(request);
        return json(await adminGrant(user.id,text(data.userId,"사용자",100,1),Number(data.amount),text(data.reason,"지급 사유",200,1),text(data.key,"요청 키",100,8)));
      }
    }
    if (resource === "settings" && id === "higgsfield") {
      await requireAdmin();
      if (parts[2] === "check" && method === "POST") {
        await throttle(`provider-check:${user.id}`, 10, 60_000);
        return json(await checkProvider(user.id));
      }
      if (!parts[2]) {
        if (method === "GET") return json(await providerSettings(user.id));
        if (method === "PUT") return json(await saveProviderSettings(user.id, await body(request)));
        if (method === "DELETE") return json(await removeProviderSettings(user.id));
      }
    }
    if (resource === "settings" && id === "openai") {
      await requireAdmin();
      if (parts[2] === "models" && method === "GET") {
        await throttle(`openai-models:${user.id}`,20,60_000);
        return json(await listOpenAiModels(user.id));
      }
      if (parts[2] === "check" && method === "POST") {
        await throttle(`openai-check:${user.id}`,10,60_000);
        return json(await checkOpenAi(user.id));
      }
      if (!parts[2]) {
        if (method === "GET") return json(await openAiSettings(user.id));
        if (method === "PUT") {
          await throttle(`openai-save:${user.id}`,20,60_000);
          return json(await saveOpenAiSettings(user.id,await body(request)));
        }
        if (method === "DELETE") return json(await removeOpenAiSettings(user.id));
      }
    }
    if (resource === "landing-images" && id && parts.length === 2) {
      if (method === "GET") return json(await getImageBoard(user.id, id));
      if (method === "POST") {
        const data = await body(request);
        await throttle(`landing-images:${user.id}`, 90, 60_000);
        if (data.action === "generate") return json(await generateBoardImages(user.id, id, data));
        if (data.action === "step") return json(await stepBoardImages(user.id, id));
        if (data.action === "apply") return json(await applyBoardImages(user.id, id, data));
        if (data.action === "reset") return json(await resetBoardImages(user.id, id, data));
      }
    }
    if (resource === "landing-workflow" && parts.length <= 2) {
      if (method === "GET") return json(id ? await getLanding(user.id, id) : { run: await activeLanding(user.id, request.nextUrl.searchParams.get("format") === "product-detail" ? "product-detail" : "landing") });
      if (method === "POST") {
        const data = await body(request);
        await throttle(`landing-workflow:${id ? "action" : "start"}:${user.id}`, id ? 60 : 10, 60_000);
        if (!id) return json(await startLanding(user.id, data));
        return json(data.action === "step" ? await stepLanding(user.id, id, data.revision) : await actLanding(user.id, id, data));
      }
    }
    if (resource === "reel-workflow" && parts.length <= 3) {
      if (method === "GET") {
        if (id && parts[2] === "quote") return json(await reelQuote(user.id, id, request.nextUrl.searchParams.get("sceneId") || ""));
        if (id && parts[2] === "versions") return json(await reelVersions(user.id, id));
        return json(id ? await getReel(user.id, id) : { run: await activeReel(user.id) });
      }
      if (method === "POST" && parts.length <= 2) {
        const data = await body(request);
        await throttle(`reel-workflow:${id ? "action" : "start"}:${user.id}`, id ? 90 : 10, 60_000);
        if (!id) return json(await startReel(user.id, data));
        if (data.action === "step") return json(await stepReel(user.id, id, data.revision));
        if (data.action === "attach") return json(await attachReelAsset(user.id, id, data));
        if (data.action === "visual") return json(await generateReelVisual(user.id, id, data));
        if (data.action === "visual_status") return json(await pollReelVisual(user.id, id));
        if (data.action === "voice") return json(await generateReelVoice(user.id, id, data));
        if (data.action === "align") return json(await realignReelVoice(user.id, id, data));
        if (data.action === "render") return json(await renderReel(user.id, id, data));
        if (data.action === "review") return json(await reviewReel(user.id, id, data));
        if (data.action === "complete") return json(await completeReel(user.id, id, data));
        return json(await actReel(user.id, id, data));
      }
    }
    if (resource === "card-workflow" && parts.length <= 3) {
      if (method === "GET") {
        if (id && parts[2] === "versions") return json(await workflowVersions(user.id,id));
        if (id && parts[2] === "image-quote") return json(await workflowImageQuote(user.id,id,new URL(request.url).searchParams.get("cardId") || ""));
        return json(id ? await getWorkflow(user.id,id) : {run:await activeWorkflow(user.id)});
      }
      if (method === "POST" && parts.length <= 2) {
        const data = await body(request);
        await throttle(`card-workflow:${id ? "action" : "start"}:${user.id}`,id ? 60 : 10,60_000);
        if (!id) return json(await startWorkflow(user.id,data));
        if (data.action === "step") return json(await stepWorkflow(user.id,id,data.revision));
        if (data.action === "image") return json(await startWorkflowImage(user.id,id,data));
        if (data.action === "image_status") return json(await pollWorkflowImage(user.id,id));
        if (data.action === "image_batch") return json(await startWorkflowImageBatch(user.id,id,data));
        if (data.action === "image_batch_status") return json(await pollWorkflowImageBatch(user.id,id));
        if (data.action === "quality") return json(await reviewWorkflowOutput(user.id,id,data));
        if (data.action === "finalize") return json(await finalizeWorkflow(user.id,id,data));
        return json(await actWorkflow(user.id,id,data));
      }
    }
    if (resource === "card-agent" && parts.length <= 2) {
      if (method === "GET") return json(id ? await getCardAgent(user.id,id) : {run:await activeCardAgent(user.id)});
      if (method === "POST") {
        const data = await body(request);
        await throttle(`card-agent:${id ? "action" : "start"}:${user.id}`,id ? 60 : 10,60_000);
        return json(!id ? await startCardAgent(user.id,data) : data.action === "step" ? await stepCardAgent(user.id,id,data.revision) : await actCardAgent(user.id,id,data));
      }
    }
    if (resource === "quick-card" && method === "POST") {
      const data = await body(request);
      await throttle(`quick-card:${user.id}`,10,60_000);
      return json(await createAiProject(user.id,createQuickCardDraft(data),text(data.key,"요청 키",100,8),openAiOutline));
    }
    if (resource === "outline" && method === "POST") {
      const data = await body(request);
      return json(
        await createAiProject(
          user.id,
          data.draft,
          text(data.key, "요청 키", 100, 8),
        ),
      );
    }
    if (resource === "projects") {
      if (method === "GET")
        return json(
          id ? await getProject(user.id, id) : await listProjects(user.id),
        );
      if (method === "POST" && !id)
        return json(await createProject(user.id, await body(request)));
      if (method === "PUT" && id)
        return json(await updateProject(user.id, id, await body(request)));
      if (method === "DELETE" && id) {
        await archiveProject(user.id, id);
        return json({ ok: true });
      }
    }
    if (resource === "credits" && method === "GET")
      return json({
        balance: user.credits,
        ledger: await listLedger(user.id),
        admin: user.admin,
      });
    if (resource === "jobs") {
      if (method === "GET")
        return json(
          await listJobs(
            user.id,
            request.nextUrl.searchParams.get("projectId") || undefined,
          ),
        );
      if (method === "POST") {
        const data = await body(request);
        return json(
          await submitJob(
            user.id,
            data.plane,
            text(data.key, "요청 키", 100, 8),
            data.projectId
              ? {
                  projectId: text(data.projectId, "프로젝트", 80, 1),
                  slotId: text(data.slotId, "슬롯", 80, 1),
                }
              : undefined,
          ),
        );
      }
    }
    if (resource === "quote" && method === "POST")
      return json({ credits: quote(validatePlane(await body(request))) });
    if (resource === "exports") {
      if (method === "POST") {
        if (
          Number(request.headers.get("content-length") || 0) >
          51 * 1024 * 1024
        )
          throw new ServiceError(413, "출력 파일은 50MB 이내로 저장해 주세요.");
        const file = (await request.formData()).get("file");
        if (!(file instanceof File))
          throw new ServiceError(400, "출력 파일이 없습니다.");
        const asset = await saveAsset(user.id, file, true);
        return json({ url: `/api/workspace/exports/${asset.id}` });
      }
      if (method === "GET" && id) {
        const file = await assetFile(user.id, id);
        if (!file.data)
          throw new ServiceError(404, "보관된 출력 파일을 찾을 수 없습니다.");
        return new NextResponse(new Uint8Array(file.data!), {
          headers: {
            "Content-Type": file.mime,
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }
    if (resource === "reel-recommendation" && method === "POST" && !id) return json(await recommendReel(user.id, await body(request)));
    if (resource === "typography-recommendation" && method === "POST" && !id) return json(await recommendProjectTypography(user.id, await body(request)));
    if (resource === "landing-recommendation" && method === "POST" && !id) return json(await recommendLanding(user.id, await body(request)));
    if (resource === "product-recommendation" && method === "POST" && !id) {
      return json(await recommendProduct(user.id, await body(request)));
    }
    if ((resource === "product-images" || resource === "reel-images" || resource === "landing-images") && method === "POST" && !id) {
      return json(await uploadProductImage(user.id, await readProductUpload(request)));
    }
    if (resource === "assets") {
      if (method === "GET" && !id) return json(await assetList(user.id));
      if (method === "GET" && id) {
        const file = await assetFile(user.id, id);
        if (file.url) return NextResponse.redirect(file.url);
        return new NextResponse(new Uint8Array(file.data!), {
          headers: {
            "Content-Type": file.mime,
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (method === "POST") {
        if (
          Number(request.headers.get("content-length") || 0) >
          51 * 1024 * 1024
        )
          throw new ServiceError(413, "50MB 이내 파일을 선택해 주세요.");
        const file = (await request.formData()).get("file");
        if (!(file instanceof File))
          throw new ServiceError(400, "파일을 선택해 주세요.");
        return json(await saveAsset(user.id, file));
      }
    }
    throw new ServiceError(404, "요청을 찾을 수 없습니다.");
  } catch (error) {
    if (error instanceof ServiceError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(
      "[workspace] request failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      {
        error:
          "요청을 완료하지 못했습니다. 연결과 입력을 확인한 뒤 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  } finally {
    if (traceUserId) await flushUserTraces(traceUserId).catch(() => console.warn("[workflow-trace] pending relay; retry on trace read"));
  }
}
export { route as GET, route as POST, route as PUT, route as DELETE };
