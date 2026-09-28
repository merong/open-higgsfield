import { isIP } from "node:net";

/**
 * Cloudflared connects over loopback. Trust its visitor header only on the
 * explicitly configured tunnel hostname, which cloudflared fixes at ingress.
 * Missing/invalid forwarding data must never grant loopback admin privileges.
 * @param {import('node:http').IncomingMessage} req
 * @param {string | undefined} tunnelHost
 */
export function ingressPeer(req, tunnelHost = process.env.OHF_CLOUDFLARE_HOST) {
  const peer = req.socket.remoteAddress || "unknown";
  if (!tunnelHost || req.headers.host?.toLowerCase() !== tunnelHost.toLowerCase()) return peer;
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer)) return "unknown";
  const visitor = req.headers["cf-connecting-ip"];
  return typeof visitor === "string" && isIP(visitor) ? visitor : "unknown";
}
