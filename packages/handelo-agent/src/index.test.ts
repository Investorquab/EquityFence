import test from "node:test";
import assert from "node:assert/strict";
import { HandeloAgent, normalizeUserMessage, validateAgentResponse, validateUserIntent } from "./index.js";
import type { LlmClient } from "@handelo/llm";
import type { HandeloMarketClient } from "@handelo/market";

const asset={
  binanceChainId:"56",tokenContractAddress:"0x0000000000000000000000000000000000000001",
  platformId:"ondo",tokenSymbol:"NVDAon",decimals:"18",underlyingTicker:"NVDA",underlyingName:"NVIDIA",
  tokenToShareRatio:"1",tokenPrice:"120",referencePrice:"125",volume24H:"1000",marketCap:"1000000",
  statusInfo:{openState:false,marketStatus:"closed",reasonCode:"MARKET_CLOSED",reasonMsg:"US market closed",nextOpenTime:null,nextCloseTime:null}
};

test("Handelo resolves live market context before generating its explanation",async()=>{
  let calls=0;
  const llm:LlmClient={
    provider:"groq",model:"openai/gpt-oss-120b",
    async generateJson<T>(request:{system:string;user:string;schemaName:string;schema:Record<string,unknown>}):Promise<T>{
      calls++;
      if(request.schemaName==="handelo_intent") return {action:"research",ticker:"NVDA",amountUsd:20,horizon:null,riskTolerance:"unknown"} as T;
      return {answer:"NVDA's latest tokenized price is below the latest reference price, and the traditional market is closed."} as T;
    }
  };
  const market={findAll:async()=>[asset]} as unknown as HandeloMarketClient;
  const result=await new HandeloAgent({llmClient:llm,marketClient:market}).run("What is happening with NVIDIA?");
  assert.equal(calls,2);
  assert.equal(result.intent.ticker,"NVDA");
  assert.equal(result.market?.marketOpen,false);
  assert.equal(result.market?.premiumPct,-4);
  assert.match(result.answer,/reference price/);
});


test("Handelo contains unresolved market errors without inventing market context",async()=>{
  const llm:LlmClient={
    provider:"groq",model:"test",
    async generateJson<T>(request:{system:string;user:string;schemaName:string;schema:Record<string,unknown>}):Promise<T>{
      if(request.schemaName==="handelo_intent") return {action:"research",ticker:"UNKNOWN",amountUsd:null,horizon:null,riskTolerance:"unknown"} as T;
      assert.match(request.user,/could not find a supported BSC tokenized-stock market/i);
      return {answer:"I couldn't resolve a supported tokenized-stock market for that ticker."} as T;
    }
  };
  const market={findAll:async()=>{throw new Error("upstream unavailable");}} as unknown as HandeloMarketClient;
  const result=await new HandeloAgent({llmClient:llm,marketClient:market}).run("What is UNKNOWN doing?");
  assert.equal(result.market,null);
  assert.equal(result.candidates.length,0);
  assert.equal(result.policy,null);
  assert.match(result.answer,/couldn't resolve/i);
});


test("structured intent validation rejects malformed LLM output", () => {
  assert.throws(
    () => validateUserIntent({ action: "buy", ticker: 123, amountUsd: 20, horizon: null, riskTolerance: "low" }),
    /invalid ticker/,
  );
  assert.throws(
    () => validateUserIntent({ action: "buy", ticker: "NVDA", amountUsd: Number.NaN, horizon: null, riskTolerance: "low" }),
    /invalid amount/,
  );
  assert.throws(
    () => validateUserIntent({ action: "unknown", ticker: null, amountUsd: null, horizon: null, riskTolerance: "low" }),
    /invalid investment intent/,
  );
});


test("user message normalization rejects empty and oversized input", () => {
  assert.throws(() => normalizeUserMessage("   "), /message is required/);
  assert.throws(() => normalizeUserMessage("x".repeat(8001)), /message is too long/);
  assert.equal(normalizeUserMessage("  Help me understand NVDA  "), "Help me understand NVDA");
});


test("agent response validation rejects malformed provider output", () => {
  assert.throws(() => validateAgentResponse({ answer: "   " }), /invalid answer/);
  assert.throws(() => validateAgentResponse({ answer: "x".repeat(12001) }), /answer that is too long/);
  assert.deepEqual(validateAgentResponse({ answer: "  Ready.  " }), { answer: "Ready." });
});
