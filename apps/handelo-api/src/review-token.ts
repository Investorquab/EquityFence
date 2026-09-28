import { createHmac, timingSafeEqual } from "node:crypto";

export interface ReviewTokenInput {
  ticker: string;
  amountUsd: number;
  fromToken: string;
  contract: string;
  slippage?: string;
}

const REVIEW_TOKEN_TTL_MS = 5 * 60 * 1000;
const consumedReviewTokens = new Map<string, number>();

function secret() {
  return process.env.HANDELO_REVIEW_TOKEN_SECRET ?? "handelo-local-review-secret";
}

export function createReviewToken(input: ReviewTokenInput, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ ...input, exp: now + REVIEW_TOKEN_TTL_MS })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyReviewToken(token: string, input: ReviewTokenInput, now = Date.now()) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ReviewTokenInput & { exp?: number };
    return parsed.exp !== undefined && parsed.exp > now
      && parsed.ticker === input.ticker
      && parsed.amountUsd === input.amountUsd
      && parsed.fromToken.toLowerCase() === input.fromToken.toLowerCase()
      && parsed.contract.toLowerCase() === input.contract.toLowerCase()
      && parsed.slippage === input.slippage;
  } catch {
    return false;
  }
}

export function consumeReviewToken(token: string, now = Date.now()) {
  const consumedUntil = consumedReviewTokens.get(token);
  if (consumedUntil !== undefined && consumedUntil > now) return false;
  if (consumedUntil !== undefined) consumedReviewTokens.delete(token);
  consumedReviewTokens.set(token, now + REVIEW_TOKEN_TTL_MS);
  for (const [key, expiresAt] of consumedReviewTokens) {
    if (expiresAt <= now) consumedReviewTokens.delete(key);
  }
  return true;
}
