import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { ingressPeer } from "../scripts/ingress-peer.mjs";
import { assertAdminIp } from "../src/service/admin-access";

const host = "openhigsfield.oootool.com";
const request = (peer: string, headers: Record<string, string | string[]> = {}) =>
  ({ socket: { remoteAddress: peer }, headers }) as IncomingMessage;

test("direct local access remains local; forwarding headers alone grant no trust", () => {
  assert.equal(ingressPeer(request("127.0.0.1", { host: "localhost:3000" }), host), "127.0.0.1");
  assert.equal(ingressPeer(request("203.0.113.7", { host: "localhost:3000", "cf-connecting-ip": "127.0.0.1" }), host), "203.0.113.7");
});
test("tunnel visitors are attested as the visitor, never the loopback proxy", () => {
  const peer = ingressPeer(request("::ffff:127.0.0.1", { host, "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "127.0.0.1" }), host);
  assert.equal(peer, "203.0.113.7");
  assert.throws(() => assertAdminIp(peer), /로컬 PC/);
  assert.equal(ingressPeer(request("::1", { host, "cf-connecting-ip": "2001:db8::7" }), host), "2001:db8::7");
});
test("public hostname with missing, malformed or non-loopback ingress fails closed", () => {
  for (const visitor of [undefined, "not-an-ip", "127.0.0.1, 203.0.113.7", ["203.0.113.7"]]) {
    const headers: Record<string, string | string[]> = { host };
    if (visitor) headers["cf-connecting-ip"] = visitor;
    assert.equal(ingressPeer(request("127.0.0.1", headers), host), "unknown");
  }
  assert.equal(ingressPeer(request("192.168.0.10", { host, "cf-connecting-ip": "127.0.0.1" }), host), "unknown");
});
