import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateAdViewerReward,
  calculateCreatorRevenue,
  hasRemainingAdBudget,
  satsToUsd,
} from "./domain";

test("calculates the creator's 90 percent revenue share using integer sats", () => {
  assert.equal(calculateCreatorRevenue(100), 90);
  assert.equal(calculateCreatorRevenue(1), 0);
});

test("calculates the viewer's 60 percent ad reward", () => {
  assert.equal(calculateAdViewerReward(50), 30);
  assert.equal(calculateAdViewerReward(1), 0);
});

test("accepts only ad views that fit fully within the remaining budget", () => {
  assert.equal(hasRemainingAdBudget(90, 10, 100), true);
  assert.equal(hasRemainingAdBudget(91, 10, 100), false);
});

test("formats the demo sat to USD conversion", () => {
  assert.equal(satsToUsd(1_200), "0.78");
});
