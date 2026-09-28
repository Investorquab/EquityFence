import { createServer } from "node:http";
import { HandeloAgent } from "@handelo/agent";
import { portfolioSnapshot } from "./portfolio.js";
import { BinanceAgenticWalletAdapter } from "@handelo/execution";
import { marketClientFromEnv } from "@handelo/market";\nimport { portfolioSnapshot } from "./portfolio.js";

const port=Number(process.env.PORT??"8787");
const agent=new HandeloAgent();
const market=marketClientFromEnv();
const wallet=new BinanceAgenticWalletAdapter();

function json(res:import("node:http").ServerResponse,status:number,payload:unknown){
  const body=JSON.stringify(payload);
  res.writeHead(status,{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"content-type"});
  res.end(body);
}

const server=createServer(async(req,res)=>{
  if(req.method==="OPTIONS"){res.writeHead(204,{"access-control-allow-origin":"*","access-control-allow-headers":"content-type","access-control-allow-methods":"POST,GET,OPTIONS"});return res.end();}
  if(req.method==="GET"&&req.url==="/health") return json(res,200,{ok:true,service:"handelo-agent"});
  if(req.method==="GET"&&req.url?.startsWith("/api/portfolio")){
    const wallet=new URL(req.url,"http://localhost").searchParams.get("wallet")??process.env.HANDELO_WALLET;
    if(!wallet) return json(res,400,{error:"wallet query parameter or HANDELO_WALLET is required"});
    try{return json(res,200,await portfolioSnapshot(wallet));}catch(error){return json(res,500,{error:error instanceof Error?error.message:String(error)});}
  }\n  if(req.method==="GET"&&req.url?.startsWith("/api/portfolio")){\n    const wallet=new URL(req.url,"http://localhost").searchParams.get("wallet")??process.env.HANDELO_WALLET;\n    if(!wallet) return json(res,400,{error:"wallet query parameter or HANDELO_WALLET is required"});\n    try{return json(res,200,await portfolioSnapshot(wallet));}catch(error){return json(res,500,{error:error instanceof Error?error.message:String(error)});}\n  }
  if(req.method==="POST"&&req.url==="/api/quote"){
    try{
      let raw="";for await(const chunk of req) raw+=chunk;
      const body=JSON.parse(raw) as {ticker?:unknown;amountUsd?:unknown;fromToken?:unknown;slippage?:unknown};
      const ticker=String(body.ticker??"").trim().toUpperCase();
      const amount=Number(body.amountUsd);
      const fromToken=String(body.fromToken??"").trim();
      if(!ticker||!Number.isFinite(amount)||amount<=0||!fromToken) return json(res,400,{error:"ticker, positive amountUsd, and fromToken are required"});
      const asset=await market.find(ticker);
      const quote=await wallet.quote({fromTokenQty:String(amount),fromToken,toToken:asset.tokenContractAddress,binanceChainId:"56",slippage:typeof body.slippage==="string"?body.slippage:undefined});
      return json(res,200,{asset:{ticker:asset.underlyingTicker,tokenSymbol:asset.tokenSymbol,contract:asset.tokenContractAddress,provider:asset.platformId,tokenPrice:asset.tokenPrice,referencePrice:asset.referencePrice,market:asset.statusInfo},quote});
    }catch(error){return json(res,500,{error:error instanceof Error?error.message:String(error)});}
  }
  if(req.method==="POST"&&req.url==="/api/execute"){
    if(process.env.HANDELO_EXECUTION_ENABLED!=="true") return json(res,403,{error:"Execution is disabled. Set HANDELO_EXECUTION_ENABLED=true only in a controlled demo environment."});
    try{
      let raw="";for await(const chunk of req) raw+=chunk;
      const body=JSON.parse(raw) as {ticker?:unknown;amountUsd?:unknown;fromToken?:unknown;slippage?:unknown;confirmed?:unknown};
      const ticker=String(body.ticker??"").trim().toUpperCase(),fromToken=String(body.fromToken??"").trim();
      const amount=Number(body.amountUsd);
      if(!ticker||!Number.isFinite(amount)||amount<=0||!fromToken) return json(res,400,{error:"ticker, positive amountUsd, and fromToken are required"});
      const asset=await market.find(ticker);
      const result=await wallet.execute({fromTokenQty:String(amount),fromToken,toToken:asset.tokenContractAddress,binanceChainId:"56",slippage:typeof body.slippage==="string"?body.slippage:undefined},body.confirmed===true);
      return json(res,200,{asset:{ticker:asset.underlyingTicker,tokenSymbol:asset.tokenSymbol,contract:asset.tokenContractAddress,provider:asset.platformId},result});
    }catch(error){return json(res,500,{error:error instanceof Error?error.message:String(error)});}
  }
  if(req.method!=="POST"||req.url!=="/api/chat") return json(res,404,{error:"Not found"});
  try{
    let raw=""; for await(const chunk of req) raw+=chunk;
    const body=JSON.parse(raw) as {message?:unknown};
    if(typeof body.message!=="string"||!body.message.trim()) return json(res,400,{error:"message is required"});
    const result=await agent.run(body.message.trim());
    return json(res,200,result);
  }catch(error){
    return json(res,500,{error:error instanceof Error?error.message:String(error)});
  }
});

server.listen(port,()=>console.log(`Handelo API listening on http://localhost:${port}`));
