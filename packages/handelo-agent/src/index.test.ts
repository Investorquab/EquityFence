import test from "node:test";
import assert from "node:assert/strict";
import { HandeloAgent } from "./index.js";
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
  const market={find:async()=>asset} as unknown as HandeloMarketClient;
  const result=await new HandeloAgent({llmClient:llm,marketClient:market}).run("What is happening with NVIDIA?");
  assert.equal(calls,2);
  assert.equal(result.intent.ticker,"NVDA");
  assert.equal(result.market?.marketOpen,false);
  assert.equal(result.market?.premiumPct,-4);
  assert.match(result.answer,/reference price/);
});
