import { createServer } from "node:http";
import { randomBytes, createHmac } from "node:crypto";
import next from "next";
import { ingressPeer } from "./ingress-peer.mjs";

const dev = !process.argv.includes("--production");
process.env.NODE_ENV = dev ? "development" : "production";
/* Only this ingress can attest the socket peer; client-supplied headers are replaced. */
process.env.OHF_PEER_SECRET = randomBytes(32).toString("hex");
const port = Number(process.env.PORT || 3000);
const app = next({ dev, port, hostname: "0.0.0.0" });
await app.prepare();
const handler = app.getRequestHandler();
function attest(req) {
  const peer = ingressPeer(req);
  const timestamp = Date.now().toString();
  req.headers["x-ohf-peer"] = peer;
  req.headers["x-ohf-peer-time"] = timestamp;
  req.headers["x-ohf-peer-signature"] = createHmac("sha256", process.env.OHF_PEER_SECRET).update(`${peer}:${timestamp}`).digest("hex");
}
const server = createServer((req,res)=>{ attest(req); void handler(req,res); });
server.on("upgrade",(req,socket,head)=>{ attest(req); void app.getUpgradeHandler()(req,socket,head); });
server.listen(port,"0.0.0.0",()=>console.info(`OpenHiggsfield listening on http://127.0.0.1:${port} (${dev ? "development" : "production"})`));
