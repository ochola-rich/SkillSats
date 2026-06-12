import assert from "node:assert/strict";
import { test } from "node:test";

import { createAdSchema, createVideoSchema, registerSchema, withdrawSchema } from "./schemas";

test("normalizes registration emails and rejects weak passwords", () => {
  const result = registerSchema.parse({
    email: " Learner@Example.COM ",
    username: "satoshi_student",
    password: "password123",
    role: "LEARNER",
  });
  assert.equal(result.email, "learner@example.com");

  assert.throws(() =>
    registerSchema.parse({
      email: "learner@example.com",
      username: "learner",
      password: "short",
      role: "LEARNER",
    }),
  );
});

test("requires paid videos to have a positive price", () => {
  assert.throws(() =>
    createVideoSchema.parse({
      title: "Lightning basics",
      description: "A sufficiently detailed course description.",
      url: "/videos/lightning.mp4",
      priceSats: 0,
      isFree: false,
      courseId: "lightning-basics",
    }),
  );
});

test("rejects ad rewards larger than their campaign budget", () => {
  assert.throws(() =>
    createAdSchema.parse({
      title: "Lightning wallet",
      videoUrl: "/ads/wallet.mp4",
      budgetSats: 10,
      rewardSats: 11,
    }),
  );
});

test("requires positive integer withdrawal amounts", () => {
  assert.throws(() =>
    withdrawSchema.parse({
      payment_request: "lnbc1thisisalongenoughinvoice",
      amount_sats: 0,
    }),
  );
});
