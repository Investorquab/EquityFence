import { createLlmClient, type LlmClient } from "@handelo/llm";
import { HandeloMarketClient, marketClientFromEnv, type RwaAsset } from "@handelo/market";

export interface UserIntent { action:"research"|"buy"|"sell"|"invest"; ticker:string|null; amountUsd:number|null; horizon:string|null; riskTolerance:"low"|"medium"|"high"|"unknown"; }
export interface MarketBrief { ticker:string; tokenSymbol:string; provider:string; tokenPrice:string; referencePrice:string; premiumPct:number|null; marketStatus:string; marketOpen:boolean; reason:string|null; nextOpenTime:number|null; nextCloseTime:number|null; contract:string; }
export interface AgentResult { intent:UserIntent; market:MarketBrief|null; answer:string; provider:string; model:string; }

const INTENT_SCHEMA={type:"object",properties:{
  action:{type:"string",enum:["research","buy","sell","invest"]},
  ticker:{type:["string","null"]},amountUsd:{type:["number","null"]},horizon:{type:["string","null"]},
  riskTolerance:{type:"string",enum:["low","medium","high","unknown"]}
},required:["action","ticker","amountUsd","horizon","riskTolerance"],additionalProperties:false};

const RESPONSE_SCHEMA={type:"object",properties:{answer:{type:"string"}},required:["answer"],additionalProperties:false};

function pct(token:string,reference:string):number|null{
  const t=Number(token),r=Number(reference); if(!Number.isFinite(t)||!Number.isFinite(r)||r===0) return null;
  return ((t-r)/r)*100;
}

function marketBrief(asset:RwaAsset):MarketBrief{
  const premium=pct(asset.tokenPrice,asset.referencePrice);
  const gap=premium===null?"":` The on-chain price is ${premium.toFixed(2)}% ${premium>=0?"above":"below"} the latest reference price.`;
  return {ticker:asset.underlyingTicker,tokenSymbol:asset.tokenSymbol,provider:asset.platformId,tokenPrice:asset.tokenPrice,referencePrice:asset.referencePrice,premiumPct:premium,marketStatus:asset.statusInfo.marketStatus,marketOpen:asset.statusInfo.openState,reason:asset.statusInfo.reasonMsg,nextOpenTime:asset.statusInfo.nextOpenTime,nextCloseTime:asset.statusInfo.nextCloseTime,contract:asset.tokenContractAddress};
}

export class HandeloAgent {
  private readonly llm; private readonly market:HandeloMarketClient;
  constructor(opts:{llmApiKey?:string;llmClient?:LlmClient;marketClient?:HandeloMarketClient}={}){this.llm=opts.llmClient??createLlmClient(opts.llmApiKey);this.market=opts.marketClient??marketClientFromEnv();}
  async run(message:string):Promise<AgentResult>{
    const intent=await this.llm.generateJson<UserIntent>({schemaName:"handelo_intent",schema:INTENT_SCHEMA,system:"You are Handelo's intent parser. Extract the user's investment intent without inventing a ticker or amount. If they did not name a stock, ticker is null. Amount is USD when explicitly stated.",user:message});
    let market:MarketBrief|null=null;
    if(intent.ticker){
      const asset=await this.market.find(intent.ticker);
      market=marketBrief(asset);
    }
    const context=market ? JSON.stringify(market,null,2) : "No specific stock market record was resolved.";
    const response=await this.llm.generateJson<{answer:string}>({schemaName:"handelo_response",schema:RESPONSE_SCHEMA,system:"You are Handelo, a beginner-friendly tokenized-stock market agent on BNB Chain. Explain market structure in simple language. Never claim a trade happened unless execution evidence is supplied. If the market is closed, explain that the on-chain token may still trade while the latest reference price is stale. Mention the on-chain/reference gap when available. Do not give personalized certainty; present observations and let the user decide.",user:`User request: ${message}\nParsed intent: ${JSON.stringify(intent)}\nLive market context: ${context}\nRespond naturally and concisely.`});
    return {intent,market,answer:response.answer,provider:this.llm.provider,model:this.llm.model};
  }
}
