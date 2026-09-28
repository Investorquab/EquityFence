import { createLlmClient, type LlmClient } from "@handelo/llm";
import { HandeloMarketClient, marketClientFromEnv, type RwaAsset } from "@handelo/market";
import { evaluatePolicy, type PolicyResult } from "@handelo/policy";

export interface UserIntent {
  action: "research" | "buy" | "sell" | "invest";
  ticker: string | null;
  amountUsd: number | null;
  horizon: string | null;
  riskTolerance: "low" | "medium" | "high" | "unknown";
}

export interface MarketBrief {
  ticker: string;
  tokenSymbol: string;
  provider: string;
  tokenPrice: string;
  referencePrice: string;
  premiumPct: number | null;
  marketStatus: string;
  marketOpen: boolean;
  reason: string | null;
  nextOpenTime: number | null;
  nextCloseTime: number | null;
  contract: string;
}

export interface AgentResult {
  intent: UserIntent;
  market: MarketBrief | null;
  candidates: MarketBrief[];
  policy: PolicyResult | null;
  answer: string;
  provider: string;
  model: string;
}

const INTENT_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["research", "buy", "sell", "invest"] },
    ticker: { type: ["string", "null"] },
    amountUsd: { type: ["number", "null"] },
    horizon: { type: ["string", "null"] },
    riskTolerance: { type: "string", enum: ["low", "medium", "high", "unknown"] }
  },
  required: ["action", "ticker", "amountUsd", "horizon", "riskTolerance"],
  additionalProperties: false
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: { answer: { type: "string" } },
  required: ["answer"],
  additionalProperties: false
};

export function validateUserIntent(value: unknown): UserIntent {
  if (!value || typeof value !== "object") throw new Error("LLM returned an invalid intent.");
  const intent = value as Record<string, unknown>;
  const actions = ["research", "buy", "sell", "invest"];
  const risks = ["low", "medium", "high", "unknown"];
  if (!actions.includes(String(intent.action)) || !risks.includes(String(intent.riskTolerance))) {
    throw new Error("LLM returned an invalid investment intent.");
  }
  if (intent.ticker !== null && typeof intent.ticker !== "string") {
    throw new Error("LLM returned an invalid ticker.");
  }
  if (intent.amountUsd !== null && (typeof intent.amountUsd !== "number" || !Number.isFinite(intent.amountUsd))) {
    throw new Error("LLM returned an invalid amount.");
  }
  if (intent.horizon !== null && typeof intent.horizon !== "string") {
    throw new Error("LLM returned an invalid horizon.");
  }
  return {
    action: intent.action as UserIntent["action"],
    ticker: intent.ticker as string | null,
    amountUsd: intent.amountUsd as number | null,
    horizon: intent.horizon as string | null,
    riskTolerance: intent.riskTolerance as UserIntent["riskTolerance"]
  };
}

function pct(token: string, reference: string): number | null {
  const t = Number(token);
  const r = Number(reference);
  if (!Number.isFinite(t) || !Number.isFinite(r) || r === 0) return null;
  return ((t - r) / r) * 100;
}

function marketBrief(asset: RwaAsset): MarketBrief {
  return {
    ticker: asset.underlyingTicker,
    tokenSymbol: asset.tokenSymbol,
    provider: asset.platformId,
    tokenPrice: asset.tokenPrice,
    referencePrice: asset.referencePrice,
    premiumPct: pct(asset.tokenPrice, asset.referencePrice),
    marketStatus: asset.statusInfo.marketStatus,
    marketOpen: asset.statusInfo.openState,
    reason: asset.statusInfo.reasonMsg,
    nextOpenTime: asset.statusInfo.nextOpenTime,
    nextCloseTime: asset.statusInfo.nextCloseTime,
    contract: asset.tokenContractAddress
  };
}

export class HandeloAgent {
  private readonly llm: LlmClient;
  private readonly market: HandeloMarketClient;

  constructor(opts: { llmApiKey?: string; llmClient?: LlmClient; marketClient?: HandeloMarketClient } = {}) {
    this.llm = opts.llmClient ?? createLlmClient(opts.llmApiKey);
    this.market = opts.marketClient ?? marketClientFromEnv();
  }

  async run(message: string): Promise<AgentResult> {
    const intent = await this.llm.generateJson<UserIntent>({
      schemaName: "handelo_intent",
      schema: INTENT_SCHEMA,
      system: "You are Handelo's intent parser. Extract the user's investment intent without inventing a ticker or amount. If they did not name a stock, ticker is null. Amount is USD when explicitly stated.",
      user: message
    });

    const parsedIntent = validateUserIntent(intent);

    let market: MarketBrief | null = null;
    let candidates: MarketBrief[] = [];

    let marketResolutionError: string | null = null;

    if (parsedIntent.ticker) {
      try {
        const matches = await this.market.findAll(intent.ticker);
        const exact = matches.filter((asset) => asset.tokenSymbol.toLowerCase() === parsedIntent.ticker!.trim().toLowerCase());
        if (exact.length === 1) {
          market = marketBrief(exact[0]);
        } else if (matches.length === 1) {
          market = marketBrief(matches[0]);
        } else {
          candidates = matches.map(marketBrief);
        }
      } catch {
        marketResolutionError = "The live market resolver could not find a supported BSC tokenized-stock market for that ticker.";
      }
    } else if (parsedIntent.action === "buy" || parsedIntent.action === "sell" || parsedIntent.action === "invest") {
      try {
        candidates = (await this.market.discover(4)).map(marketBrief);
      } catch {
        marketResolutionError = "The live market discovery service is unavailable right now.";
      }
    }

    const policy = market
      ? evaluatePolicy({
          action: parsedIntent.action,
          amountUsd: parsedIntent.amountUsd,
          marketOpen: market.marketOpen,
          premiumPct: market.premiumPct
        })
      : null;

    const context = market
      ? JSON.stringify({ market, policy }, null, 2)
      : candidates.length
        ? JSON.stringify({ candidateMarkets: candidates }, null, 2)
        : marketResolutionError
          ? marketResolutionError
          : "No specific stock market record was resolved.";

    const response = await this.llm.generateJson<{ answer: string }>({
      schemaName: "handelo_response",
      schema: RESPONSE_SCHEMA,
      system: "You are Handelo, a beginner-friendly tokenized-stock market agent on BNB Chain. Explain market structure in simple language. Never claim a trade happened unless execution evidence is supplied. If the market is closed, explain that the on-chain token may still trade while the latest reference price is stale. Mention the on-chain/reference gap when available. When candidateMarkets are supplied, explain that they are live market-data candidates rather than a personalized recommendation. Do not give personalized certainty; present observations and let the user decide.",
      user: `User request: ${message}
Parsed intent: ${JSON.stringify(parsedIntent)}
Live market context: ${context}
Respond naturally and concisely.`
    });

    return {
      intent: parsedIntent,
      market,
      candidates,
      policy,
      answer: response.answer,
      provider: this.llm.provider,
      model: this.llm.model
    };
  }
}
