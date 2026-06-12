import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  b64ToHex,
  createLndClient,
  getLndPaymentHash,
  getLndClient,
  isLndConfigured,
  normalizeLndError,
} from "./lnd.server";

test("converts LND base64 payment hashes to hex", () => {
  assert.equal(b64ToHex("AQIDBA=="), "01020304");
});

test("allows the application to run without LND configuration", () => {
  const restHost = process.env.LND_REST_HOST;
  const macaroon = process.env.LND_MACAROON;
  const macaroonPath = process.env.LND_MACAROON_PATH;

  try {
    delete process.env.LND_REST_HOST;
    delete process.env.LND_MACAROON;
    delete process.env.LND_MACAROON_PATH;

    assert.equal(isLndConfigured(), false);
    assert.throws(() => getLndClient(), /LND_NOT_CONFIGURED/);
  } finally {
    if (restHost === undefined) delete process.env.LND_REST_HOST;
    else process.env.LND_REST_HOST = restHost;

    if (macaroon === undefined) delete process.env.LND_MACAROON;
    else process.env.LND_MACAROON = macaroon;

    if (macaroonPath === undefined) delete process.env.LND_MACAROON_PATH;
    else process.env.LND_MACAROON_PATH = macaroonPath;
  }
});

test("loads a local macaroon file as the hex REST credential", () => {
  const directory = mkdtempSync(join(tmpdir(), "skillsats-lnd-"));
  const macaroonPath = join(directory, "admin.macaroon");

  try {
    writeFileSync(macaroonPath, Buffer.from([0x01, 0xab, 0xff]));
    const client = createLndClient({
      restHost: "https://127.0.0.1:8080",
      macaroonPath,
      allowInsecureTls: true,
    });

    assert.equal(client.defaults.headers["Grpc-Metadata-Macaroon"], "01abff");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects placeholder macaroon values before making a request", () => {
  assert.throws(
    () =>
      createLndClient({
        restHost: "https://127.0.0.1:8080",
        macaroon: "replace-with-a-real-macaroon",
      }),
    /LND_INVALID_CONFIG/,
  );
});

test("accepts successful Router payments and rejects failed statuses", () => {
  assert.equal(
    getLndPaymentHash({
      result: { status: "SUCCEEDED", payment_hash: "abc123" },
    }),
    "abc123",
  );
  assert.throws(
    () =>
      getLndPaymentHash({
        result: { status: "FAILED", payment_hash: "abc123" },
      }),
    /LND_PAYMENT_FAILED/,
  );
});

test("normalizes downstream connection errors without hiding missing configuration", () => {
  assert.equal(normalizeLndError(new Error("connection refused")).message, "LND_UNAVAILABLE");
  assert.equal(normalizeLndError(new Error("LND_NOT_CONFIGURED")).message, "LND_NOT_CONFIGURED");
  assert.equal(normalizeLndError(new Error("LND_INVALID_CONFIG")).message, "LND_INVALID_CONFIG");
});
