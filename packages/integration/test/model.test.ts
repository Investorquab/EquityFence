import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAndSimulate, evaluateSafety, simulateIfAllowed } from "../src/model.js";

const ASSET = "0x1111111111111111111111111111111111111111";
const WALLET = "0x2222222222222222222222222222222222222222";
const previous = { assetId: ASSET, provider: "ondo", multiplier: "1", tokenToShareRatio: "1", marketStatus: "regular", openState: true, reasonCode: "TRADING", observedAt: 1 };
const current = (multiplier = "1") => ({ binanceChainId: "56", tokenContractAddress: ASSET, platformId: "ondo", assetType: 1, tokenName: "Test Stock", tokenSymbol: "TST", decimals: "18", underlyingTicker: "TST", underlyingName: "Test Stock", tokenToShareRatio: multiplier, statusInfo: { openState: true, marketStatus: "regular", reasonCode: "TRADING", reasonMsg: null, nextOpenTime: null, nextCloseTime: null }, tokenPrice: "100", referencePrice: "100", volume24H: "0", marketCap: "0", peRatioTTM: null });
const exposure = { getTokenBalance: async () => ({ assetId: ASSET, wallet: WALLET, rawBalance: "100", decimals: 18 }) };
const tx = { binanceChainId: "56", evmTx: { from: WALLET, to: WALLET, value: "0", data: "0x" } };
function source(asset) { return { getAsset: async () => asset }; }
function simulator(status = "SUCCESS") { let calls = 0; return { get calls(){return calls}, simulateTransaction: async () => { calls++; return { status, failReason: status === "SUCCESS" ? null : "simulation failed", balanceChanges: [], allowanceChanges: [] }; } }; }

test("unchanged state allows and simulates", async () => {
  const sim = simulator();
  const result = await evaluateAndSimulate(source(current()), exposure, sim, previous, { assetId: ASSET, wallet: WALLET, intent: { action: "TRANSFER", assetId: ASSET, wallet: WALLET } }, tx);
  assert.equal(result.assessment.decision, "ALLOW");
  assert.equal(result.simulation?.status, "SUCCESS");
  assert.equal(sim.calls, 1);
});

test("affected state blocks before simulation", async () => {
  const sim = simulator();
  const result = await evaluateAndSimulate(source(current("1.1")), exposure, sim, previous, { assetId: ASSET, wallet: WALLET, intent: { action: "TRANSFER", assetId: ASSET, wallet: WALLET } }, tx);
  assert.equal(result.assessment.decision, "BLOCK");
  assert.equal(result.simulation, null);
  assert.equal(sim.calls, 0);
});

test("exposure failure fails closed", async () => {
  const failingExposure = { getTokenBalance: async () => { throw new Error("RPC unavailable"); } };
  const result = await evaluateSafety(source(current()), failingExposure, previous, { assetId: ASSET, wallet: WALLET, intent: { action: "TRANSFER", assetId: ASSET, wallet: WALLET } });
  assert.equal(result.assessment.decision, "BLOCK");
  assert.equal(result.exposure, null);
});

test("failed simulation becomes block", async () => {
  const sim = simulator("FAILED");
  const result = await simulateIfAllowed(sim, { decision: "ALLOW", reasons: [] }, tx);
  assert.equal(result.assessment.decision, "BLOCK");
  assert.equal(result.simulation?.failReason, "simulation failed");
});

test("blocked assessment skips simulator", async () => {
  const sim = simulator();
  const result = await simulateIfAllowed(sim, { decision: "BLOCK", reasons: ["state changed"] }, tx);
  assert.equal(result.simulation, null);
  assert.equal(sim.calls, 0);
});
