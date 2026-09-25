import assert from "node:assert/strict";
import test from "node:test";
import {
  detectStateTransition,
  toEconomicState,
  type StateSnapshot,
} from "../src/model.js";

const base: StateSnapshot = {
  assetId: "0xasset",
  provider: "bstock",
  multiplier: "1",
  tokenToShareRatio: "1",
  marketStatus: "regular",
  openState: true,
  reasonCode: "TRADING",
  observedAt: 1_000,
};

test("unchanged snapshots produce no transition", () => {
  const result = detectStateTransition(base, { ...base, observedAt: 2_000 });

  assert.equal(result.changed, false);
  assert.deepEqual(result.reasons, []);
});

test("multiplier changes are detected", () => {
  const result = detectStateTransition(base, {
    ...base,
    multiplier: "2",
    observedAt: 2_000,
  });

  assert.equal(result.changed, true);
  assert.match(result.reasons[0], /Multiplier changed/);
});

test("market state changes are detected", () => {
  const result = detectStateTransition(base, {
    ...base,
    marketStatus: "pause",
    openState: false,
    reasonCode: "ASSET_PAUSED",
    observedAt: 2_000,
  });

  assert.equal(result.changed, true);
  assert.equal(result.reasons.length, 3);
});

test("economic state includes all safety-relevant fields", () => {
  const state = toEconomicState(base);

  assert.equal(state.assetId, base.assetId);
  assert.equal(state.provider, base.provider);
  assert.equal(state.multiplier, base.multiplier);
  assert.match(state.stateVersion, /bstock:0xasset:1:1:regular:open:TRADING/);
});
