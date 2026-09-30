import assert from "node:assert/strict";
import test from "node:test";
import {calculateDivergencePercent, createRiskResult, evaluatePortfolioStrategyRisk, type PortfolioSnapshot} from "./index.js";

test("calculates reference vs on-chain divergence",()=>{
  assert.equal(calculateDivergencePercent(110,100),10);
  assert.equal(calculateDivergencePercent(90,100),-10);
  assert.equal(calculateDivergencePercent(100,0),null);
});

test("risk governor blocks an oversized transaction",()=>{
  const result=createRiskResult(
    {maxTransactionUsd:10,minimumReservePercent:10},
    {proposedAmountUsd:15,projectedReservePercent:20,now:"2026-09-30T00:00:00.000Z"}
  );
  assert.equal(result.decision,"BLOCK");
  assert.equal(result.reasons.length,1);
});

test("risk governor passes when constraints are satisfied",()=>{
  const result=createRiskResult(
    {maxTransactionUsd:20,maxSingleAssetExposurePercent:35,minimumReservePercent:10},
    {proposedAmountUsd:10,projectedAssetExposurePercent:25,projectedReservePercent:20,now:"2026-09-30T00:00:00.000Z"}
  );
  assert.equal(result.decision,"PASS");
  assert.deepEqual(result.reasons,[]);
});


test("portfolio strategy risk blocks excessive projected exposure", () => {
  const portfolio: PortfolioSnapshot = {
    wallet: "0x1111111111111111111111111111111111111111",
    balanceUsd: null,
    totalValueUsd: 100,
    positions: [{ asset: "NVDAB", tokenSymbol: "NVDAB", allocationPercent: 80, valueUsd: 80 }]
  };
  const result = evaluatePortfolioStrategyRisk(portfolio, "NVDAB", 30);
  assert.equal(result.decision, "BLOCK");
  assert.match(result.reasons[0], /exposure/i);
});

test("portfolio strategy risk passes a small diversified addition", () => {
  const portfolio: PortfolioSnapshot = {
    wallet: "0x1111111111111111111111111111111111111111",
    balanceUsd: null,
    totalValueUsd: 100,
    positions: [{ asset: "NVDAB", tokenSymbol: "NVDAB", allocationPercent: 20, valueUsd: 20 }]
  };
  const result = evaluatePortfolioStrategyRisk(portfolio, "NVDAB", 10);
  assert.equal(result.decision, "PASS");
});
