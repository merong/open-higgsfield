import { createHmac, timingSafeEqual } from "node:crypto";
import { networkInterfaces } from "node:os";
import { isIP } from "node:net";
import { ServiceError } from "./errors";

export const normalizeIp = (ip: string) => ip.replace(/^::ffff:/,"").trim().split("%")[0];
export function allowedAdminIps() {
  const configured = process.env.ADMIN_ALLOWED_IPS?.split(",").map(s=>normalizeIp(s.trim())).filter(Boolean);
  return [...new Set(configured?.length ? configured.filter(ip=>isIP(ip)) : ["127.0.0.1","::1",...Object.values(networkInterfaces()).flatMap(list=>(list || []).map(item=>normalizeIp(item.address))).filter(ip=>!ip.startsWith("fe80:"))])];
}
export function verifiedPeer(headers: Pick<Headers,"get">): string | null {
  const secret = process.env.OHF_PEER_SECRET, peer = headers.get("x-ohf-peer"), timestamp = headers.get("x-ohf-peer-time"), signature = headers.get("x-ohf-peer-signature");
  if (!secret || !peer || !timestamp || !signature || !/^[a-f0-9]{64}$/.test(signature) || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now()-Number(timestamp))>60_000) return null;
  const expected = createHmac("sha256",secret).update(`${peer}:${timestamp}`).digest();
  return timingSafeEqual(expected,Buffer.from(signature,"hex")) && isIP(normalizeIp(peer)) ? normalizeIp(peer) : null;
}
export function assertAdminIp(peer?: string | null) {
  if (!peer || !allowedAdminIps().includes(normalizeIp(peer)))
    throw new ServiceError(403,"관리자는 허용된 로컬 PC에서만 접속할 수 있습니다.");
}
