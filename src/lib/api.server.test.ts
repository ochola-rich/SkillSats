import assert from "node:assert/strict";
import { test } from "node:test";

import { readJson, requireSameOrigin, withApiErrors } from "./api.server";

test("maps application error codes to JSON HTTP responses", async () => {
  const response = await withApiErrors(async () => {
    throw new Error("INVALID_CREDENTIALS");
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "INVALID_CREDENTIALS",
      message: "Invalid Credentials",
    },
  });
});

test("reports missing Lightning configuration as service unavailable", async () => {
  const response = await withApiErrors(async () => {
    throw new Error("LND_NOT_CONFIGURED");
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: {
      code: "LND_NOT_CONFIGURED",
      message: "Lnd Not Configured",
    },
  });
});

test("rejects malformed JSON with the standard error envelope", async () => {
  const request = new Request("http://localhost:5173/api/auth/register", {
    method: "POST",
    body: "{",
  });
  const response = await withApiErrors(async () => {
    await readJson(request);
    return Response.json({ success: true });
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "INVALID_JSON",
      message: "Request body must be valid JSON.",
    },
  });
});

test("allows non-browser clients and rejects cross-origin browser mutations", () => {
  assert.doesNotThrow(() =>
    requireSameOrigin(new Request("http://localhost:5173/api/auth/logout")),
  );
  assert.throws(() =>
    requireSameOrigin(
      new Request("http://localhost:5173/api/auth/logout", {
        headers: { origin: "https://example.com" },
      }),
    ),
  );
});
