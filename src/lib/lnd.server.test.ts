import assert from "node:assert/strict";
import { test } from "node:test";

import { b64ToHex } from "./lnd.server";

test("converts LND base64 payment hashes to hex", () => {
  assert.equal(b64ToHex("AQIDBA=="), "01020304");
});
