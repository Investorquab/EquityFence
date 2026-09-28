import test from "node:test";
import assert from "node:assert/strict";
import { createReviewToken, verifyReviewToken, type ReviewTokenInput } from "./review-token.js";

const input: ReviewTokenInput = {
  ticker: "NVDA",
  amountUsd: 20,
  fromToken: "0x55d398326f99059fF775485246999027B3197955",
  contract: "0x0000000000000000000000000000000000000001",
  slippage: "0.50"
};

test("review token accepts the exact reviewed trade", () => {
  const now = 1_000_000;
  const token = createReviewToken(input, now);
  assert.equal(verifyReviewToken(token, input, now + 1_000), true);
});

test("review token rejects a changed amount or contract", () => {
  const now = 1_000_000;
  const token = createReviewToken(input, now);
  assert.equal(verifyReviewToken(token, { ...input, amountUsd: 25 }, now + 1_000), false);
  assert.equal(verifyReviewToken(token, { ...input, contract: "0x0000000000000000000000000000000000000002" }, now + 1_000), false);
});

test("review token rejects tampering and expiry", () => {
  const now = 1_000_000;
  const token = createReviewToken(input, now);
  const [payload] = token.split(".");
  const tampered = `${payload}.invalid-signature`;
  assert.equal(verifyReviewToken(tampered, input, now + 1_000), false);
  assert.equal(verifyReviewToken(token, input, now + 5 * 60 * 1000), false);
});

test("review token compares address casing without weakening the contract binding", () => {
  const now = 1_000_000;
  const token = createReviewToken(input, now);
  assert.equal(
    verifyReviewToken(token, { ...input, fromToken: input.fromToken.toLowerCase(), contract: input.contract.toUpperCase() }, now + 1_000),
    true
  );
});


test("review token rejects a changed slippage", () => {
  const now = 1_000_000;
  const token = createReviewToken(input, now);
  assert.equal(verifyReviewToken(token, { ...input, slippage: "1.00" }, now + 1_000), false);
});
