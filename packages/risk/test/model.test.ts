import test from "node:test";
import assert from "node:assert/strict";
import { assessRisk } from "../src/model.ts";
import type { ExposurePosition } from "@equityfence/exposure";
import type { StateTransition } from "@equityfence/state";

const baseSnapshot = {
  assetId: "0xAsset",
  provider: "bStocks",
  multiplier: "1",
  tokenToShareRatio: "1",
  marketStatus: "OPEN",
  openState: true,
  reasonCode: "NORMAL",
  observedAt: 1,
};

function transition(changed: boolean, reasons: string[] = []): StateTransition {
  return {
    changed,
    reasons,
    previous: baseSnapshot,
    current: {
      ...baseSnapshot,
      multiplier: changed ? "0.5" : "1",
      reasonCode: changed ? "CORPORATE_ACTION" : "NORMAL",
    },
  };
}

function exposure(isExposed: boolean): ExposurePosition {
  return {
    assetId: "0xAsset",
    wallet: "0xWallet",
    rawBalance: isExposed ? "1000000000000000000" : "0",
    decimals: 18,
    isExposed,
  };
}

test("allows an unchanged state", () => {
  const result = assessRisk({
    transition: transition(false),
    exposure: exposure(true),
    intent: { action: "TRANSFER", assetId: "0xAsset", wallet: "0xWallet" },
  });

  assert.equal(result.decision, "ALLOW");
});

test("blocks exposed wallet after relevant state change", () => {
  const result = assessRisk({
    transition: transition(true, ["Multiplier changed from 1 to 0.5"]),
    exposure: exposure(true),
    intent: { action: "TRANSFER", assetId: "0xAsset", wallet: "0xWallet" },
  });

  assert.equal(result.decision, "BLOCK");
  assert.match(result.reasons.join(" "), /Multiplier changed/);
});

test("allows relevant state change when verified exposure is zero", () => {
  const result = assessRisk({
    transition: transition(true),
    exposure: exposure(false),
    intent: { action: "TRANSFER", assetId: "0xAsset", wallet: "0xWallet" },
  });

  assert.equal(result.decision, "ALLOW");
});

test("allows state change for a different asset", () => {
  const result = assessRisk({
    transition: transition(true),
    exposure: {
      ...exposure(true),
      assetId: "0xOther",
    },
    intent: { action: "TRANSFER", assetId: "0xOther", wallet: "0xWallet" },
  });

  assert.equal(result.decision, "ALLOW");
});

test("fails closed when exposure is unknown", () => {
  const result = assessRisk({
    transition: transition(false),
    exposure: null,
    intent: { action: "TRANSFER", assetId: "0xAsset", wallet: "0xWallet" },
  });

  assert.equal(result.decision, "BLOCK");
});
