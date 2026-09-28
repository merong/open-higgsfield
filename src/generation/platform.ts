import { toAuthorizationHeader } from "./credentials";

const MODEL_ID = /^[a-z0-9][a-z0-9._/-]*$/i;

export class PlatformError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(messageFromBody(status, body));
    this.name = "PlatformError";
    this.status = status;
    this.body = body;
  }
}

export type QueuedGeneration = {
  status: string;
  requestId: string;
  statusUrl: string;
  cancelUrl: string;
};

export type GenerationStatus = {
  status: string;
  requestId: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
  error?: unknown;
};

/** One request's answer inside a batched status poll. A request that errors
    carries its reason alone, so it cannot lose the answers standing beside it. */
export type StatusResult =
  | { requestId: string; status: GenerationStatus }
  | { requestId: string; error: string };

export type PlatformClientOptions = {
  apiKey: string;
  baseUrl: string;
  fetch?: typeof fetch;
};

// Upload destinations come from the authenticated provider, never from the browser.
export function providerStorageUrl(value: unknown): string {
  if (typeof value !== "string") throw new PlatformError(502, "Invalid upload response");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !["higgsfield.ai", "cloudfront.net", "amazonaws.com", "cloudflarestorage.com"].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new PlatformError(502, "Untrusted upload destination");
  return url.href;
}

export function isModelId(model: string): boolean {
  return MODEL_ID.test(model) && !model.includes("..");
}

export interface PlatformClient {
  upload?: (bytes: Uint8Array, contentType: string) => Promise<string>;
  submit: (model: string, input: Record<string, unknown>) => Promise<QueuedGeneration>;
  status: (requestId: string) => Promise<GenerationStatus>;
}

export function createPlatformClient(options: PlatformClientOptions): PlatformClient {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const fetchImpl = options.fetch ?? fetch;
  const auth = toAuthorizationHeader(options.apiKey);

  async function send(method: "GET" | "POST", path: string, body?: Record<string, unknown>) {
    const url = `${baseUrl}${path}`;
    console.info("[platform] request", { method, url });
    const response = await fetchImpl(url, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const payload = await readJson(response);
    console.info("[platform] response", { method, url, status: response.status });
    if (!response.ok) throw new PlatformError(response.status, payload);
    return payload;
  }

  return {
    async upload(bytes: Uint8Array, contentType: string): Promise<string> {
      const slot = asRecord(await send("POST", "/files/generate-upload-url", { content_type: contentType }));
      const uploadUrl = providerStorageUrl(slot.upload_url), publicUrl = providerStorageUrl(slot.public_url);
      const headers = new Headers({ "Content-Type": contentType });
      for (const [key, value] of Object.entries(asRecord(slot.upload_headers))) {
        if (!/^(content-type|x-amz-[a-z0-9-]+|x-goog-[a-z0-9-]+)$/i.test(key) || typeof value !== "string") throw new PlatformError(502, "Invalid upload headers");
        headers.set(key, value);
      }
      // Use a separate request; the Higgsfield API credential must not reach storage.
      const response = await fetchImpl(uploadUrl, { method: "PUT", redirect: "error", signal: AbortSignal.timeout(45000), headers, body: new Uint8Array(bytes) });
      if (!response.ok) throw new PlatformError(502, "Image upload failed");
      return publicUrl;
    },
    async submit(model: string, input: Record<string, unknown>): Promise<QueuedGeneration> {
      if (!isModelId(model)) throw new PlatformError(400, { detail: "Invalid model" });
      return mapQueued(await send("POST", `/${model}`, input));
    },
    async status(requestId: string): Promise<GenerationStatus> {
      if (!requestId) throw new PlatformError(400, { detail: "Missing request id" });
      return mapStatus(await send("GET", `/requests/${encodeURIComponent(requestId)}/status`));
    },
  };
}

function mapQueued(payload: unknown): QueuedGeneration {
  const data = asRecord(payload);
  const requestId = stringField(data, "request_id");
  if (!requestId) throw new PlatformError(502, { detail: "Platform response missing request_id" });
  return {
    status: stringField(data, "status") ?? "queued",
    requestId,
    statusUrl: stringField(data, "status_url") ?? "",
    cancelUrl: stringField(data, "cancel_url") ?? "",
  };
}

function mapStatus(payload: unknown): GenerationStatus {
  const data = asRecord(payload);
  const requestId = stringField(data, "request_id") ?? "";
  const images = Array.isArray(data.images)
    ? data.images.flatMap((item) => {
        const url = asRecord(item).url;
        return typeof url === "string" ? [{ url }] : [];
      })
    : undefined;
  const videoUrl = asRecord(data.video).url;

  return {
    status: stringField(data, "status") ?? "unknown",
    requestId,
    ...(images?.length ? { images } : {}),
    ...(typeof videoUrl === "string" ? { video: { url: videoUrl } } : {}),
    ...(data.error !== undefined ? { error: data.error } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageFromBody(status: number, body: unknown): string {
  const detail = asRecord(body).detail;
  if (typeof detail === "string" && detail) return detail;
  return `Platform request failed (${status})`;
}
