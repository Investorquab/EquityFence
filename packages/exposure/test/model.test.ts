import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveExposure,
  StaticExposureSource,
  type TokenBalance,
} from "../src/model.js";

const balance: TokenBalance = {
  assetId: "0xABC",
  wallet: "0xWALLET",
  rawBalance: "2500000",
  decimals: 6,
};

test("positive matching balance is exposed", () => {
  const result = resolveExposure(balance, "0xabc", "0xwallet");

  assert.equal(result.isExposed, true);
  assert.equal(result.rawBalance, "2500000");
});

test("zero balance is not exposed", () => {
  const result = resolveExposure(
    { ...balance, rawBalance: "0" },
    "0xabc",
    "0xwallet",
  );

  assert.equal(result.isExposed, false);
});

test("different asset is not exposed", () => {
  const result = resolveExposure(balance, "0xother", "0xwallet");

  assert.equal(result.isExposed, false);
});

test("different wallet is not exposed", () => {
  const result = resolveExposure(balance, "0xabc", "0xother");

  assert.equal(result.isExposed, false);
});

test("static source returns zero for an unknown position", async () => {
  const source = new StaticExposureSource([balance]);

  const result = await source.getTokenBalance("0xmissing", "0xwallet");

  assert.equal(result.rawBalance, "0");
});
