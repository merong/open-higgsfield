import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireUser } from "@/service/session";
import { NextResponse } from "next/server";

import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_OPTIONS,
  blobPathname,
} from "@/generation/device";

/* Blob callbacks are signature-verified by handleUpload; only authenticated users mint tokens. */

export async function POST(request: Request): Promise<NextResponse> {
  const incoming = (await request.json()) as HandleUploadBody;
  let device: {deviceId:string;minted:boolean}|null = null;
  if (incoming.type === "blob.generate-client-token") {
    if (!request.headers.get("origin") || new URL(request.headers.get("origin")!).host !== request.headers.get("host")) return new NextResponse(null,{status:403});
    try { const user = await requireUser(); device={deviceId:user.id,minted:false}; }
    catch { return new NextResponse(null,{status:401}); }
  }
  const body = device ? withDevicePath(incoming, device.deviceId) : incoming;
  console.info("[blob] upload", summarizeBlobEvent(body));

  try {
    const token = process.env.OPEN_HIGGSFIELD_READ_WRITE_TOKEN;
    if (!token) throw new Error("Missing OPEN_HIGGSFIELD_READ_WRITE_TOKEN");
    const json = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => {
        console.info("[blob] token", { pathname });
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "audio/wav",
            "audio/x-wav",
          ],
          addRandomSuffix: true,
        };
      },
    });
    return withDeviceCookie(
      json.type === "blob.generate-client-token" && body.type === "blob.generate-client-token"
        ? NextResponse.json({ ...json, pathname: body.payload.pathname })
        : NextResponse.json(json),
      device,
    );
  } catch (error) {
    console.error("[blob] upload failed", error instanceof Error ? error.message : error);
    if (device?.minted) return withDeviceCookie(new NextResponse(null, { status: 500 }), device);
    throw error;
  }
}

function withDeviceCookie(
  response: NextResponse,
  device: { deviceId: string; minted: boolean } | null,
) {
  if (device?.minted) response.cookies.set(DEVICE_COOKIE, device.deviceId, DEVICE_COOKIE_OPTIONS);
  return response;
}

function withDevicePath(body: HandleUploadBody, deviceId: string): HandleUploadBody {
  if (body.type !== "blob.generate-client-token") return body;
  return {
    ...body,
    payload: { ...body.payload, pathname: blobPathname(deviceId, body.payload.pathname) },
  };
}

function summarizeBlobEvent(body: HandleUploadBody) {
  if (body.type === "blob.generate-client-token") {
    return { type: body.type, pathname: body.payload.pathname };
  }
  return { type: body.type, url: body.payload.blob.url };
}
