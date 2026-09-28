import { createHash } from "node:crypto";
import { ServiceError } from "./errors";

// Collection is deliberately local-development only. Tests opt in explicitly.
export function traceEnabled() {
  // Shared PostgreSQL queues need a separate host ownership/relay design.
  // Never consume them into whichever developer's local disk receives a request.
  if (process.env.DATABASE_URL) return false;
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" && process.env.WORKFLOW_TRACE_TEST === "1";
}
export function requireTraceMode() {
  if (!traceEnabled()) throw new ServiceError(404, "요청을 찾을 수 없습니다.");
}
export const traceHash = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
const secretKey = /^(authorization|auth|cookie|set-cookie|password|password_hash|(?:x[-_])?api[-_]?key|(?:access|refresh|id)[-_]?token|token|jwt|(?:client|api)[-_]?secret|secret|private[-_]?key|provider_credential|sealed|encrypted_content|signature)$/i;
function scrubText(value: string): string {
  return value.replace(/\u0000/g, "\\u0000").replace(/\bBearer\s+[^\s"']+/gi, "Bearer [redacted]")
    .replace(/\bKey\s+[a-zA-Z0-9_-]+:[^\s"'<>]+/g, "Key [redacted]")
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, "[redacted-jwt]")
    .replace(/\bsk-[a-zA-Z0-9_-]{8,}/g, "[redacted-key]")
    .replace(/https?:\/\/[^\s"<>]+/g, raw => {
      try { const url = new URL(raw); if (/\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)) return `[asset-reference:${traceHash(raw)}]`; url.username = ""; url.password = ""; if (url.search) url.search = "?redacted"; url.hash = ""; return url.toString(); } catch { return "[redacted-url]"; }
    });
}
// No credentials, binary images or private reasoning. This is a sanitized trace,
// not a byte-for-byte replay archive. Hash the actual transformed image bytes.
export function sanitizeTrace(value: unknown, depth = 0): unknown {
  if (depth > 35) return { omitted: "depth_limit" };
  if (typeof value === "string") {
    if (/^data:[^,]*;base64,/.test(value)) {
      const comma = value.indexOf(","), bytes = Buffer.from(value.slice(comma + 1), "base64");
      return { omitted: "binary", mediaType: value.slice(5, value.indexOf(";")), bytes: bytes.length, sha256: traceHash(bytes) };
    }
    // Some inputs contain nested JSON (Responses input and output_text).
    if (/^\s*[\[{]/.test(value)) {
      try {
        const clean = JSON.stringify(sanitizeTrace(JSON.parse(value), depth + 1));
        return clean.length <= 120000 ? clean : { omitted: "json_text_limit", characters: clean.length, prefix: clean.slice(0, 120000), sha256: traceHash(clean) };
      } catch { /* ordinary text */ }
    }
    const clean = scrubText(value);
    return clean.length <= 120000 ? clean : { omitted: "text_limit", characters: clean.length, prefix: clean.slice(0, 120000), sha256: traceHash(clean) };
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.slice(0, 1000).map(v => sanitizeTrace(v, depth + 1)).concat(value.length > 1000 ? [{ omitted: "array_limit", count: value.length - 1000 }] : []);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, secretKey.test(k) ? "[redacted]" : sanitizeTrace(v, depth + 1)]));
  return null;
}
