import test from "node:test";
import assert from "node:assert/strict";
import { aggregateTurns, formatTokenCount, normalizeUsage } from "../lib/usage.mjs";

test("normalizes all usage counters and rejects negative values", () => {
  assert.deepEqual(normalizeUsage({ input_tokens: 10, cache_read_input_tokens: -3, output_tokens: 4 }), {
    input: 10, cacheRead: 0, cacheCreation: 0, output: 4, reasoning: 0,
  });
});

test("aggregates totals, cache rate, models, and rows", () => {
  const result = aggregateTurns([
    { id: "a", model: "model-a", usage: { input: 100, cacheRead: 300, cacheCreation: 100, output: 50, reasoning: 20 } },
    { id: "b", model: "model-a", usage: { input: 100, cacheRead: 0, cacheCreation: 0, output: 50, reasoning: 10 } },
    { id: "c", model: "model-b", usage: { input: 50, output: 25 } },
  ]);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.total, { input: 250, cacheRead: 300, cacheCreation: 100, output: 125, reasoning: 30 });
  assert.equal(result.cacheHitRate, 300 / 650);
  assert.equal(result.models.length, 2);
  assert.equal(result.rows.length, 3);
});

test("empty sessions do not pretend to have zero usage", () => {
  assert.deepEqual(aggregateTurns([]), { status: "empty", total: { input: 0, cacheRead: 0, cacheCreation: 0, output: 0, reasoning: 0 }, totalTokens: 0, cacheHitRate: 0, models: [], rows: [] });
});

test("formats token counts", () => {
  assert.equal(formatTokenCount(1200), "1.2K");
  assert.equal(formatTokenCount(-1), "0");
});
