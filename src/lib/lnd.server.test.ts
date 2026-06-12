import assert from "node:assert/strict";
import { test } from "node:test";

import { b64ToHex, getLndClient, isLndConfigured, normalizeLndError } from "./lnd.server";

test("converts LND base64 payment hashes to hex", () => {
  assert.equal(b64ToHex("AQIDBA=="), "01020304");
});

test("allows the application to run without LND configuration", () => {
  const restHost = process.env.LND_REST_HOST;
  const macaroon = process.env.LND_MACAROON;

  try {
    delete process.env.LND_REST_HOST;
    delete process.env.LND_MACAROON;

    assert.equal(isLndConfigured(), false);
    assert.throws(() => getLndClient(), /LND_NOT_CONFIGURED/);
  } finally {
    if (restHost === undefined) delete process.env.LND_REST_HOST;
    else process.env.LND_REST_HOST = restHost;

    if (macaroon === undefined) delete process.env.LND_MACAROON;
    else process.env.LND_MACAROON = macaroon;
  }
});

test("normalizes downstream connection errors without hiding missing configuration", () => {
  assert.equal(normalizeLndError(new Error("connection refused")).message, "LND_UNAVAILABLE");
  assert.equal(normalizeLndError(new Error("LND_NOT_CONFIGURED")).message, "LND_NOT_CONFIGURED");
});
