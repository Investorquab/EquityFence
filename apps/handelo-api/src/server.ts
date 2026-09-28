import { createServer } from "node:http";
import { HandeloAgent } from "@handelo/agent";\nimport { portfolioSnapshot } from "./portfolio.js";

const port=Number(process.env.PORT??"8787");
const agent=new HandeloAgent();

function json(res:import("node:http").ServerResponse,status:number,payload:unknown){
  const body=JSON.stringify(payload);
  res.writeHead(status,{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"content-type"});
  res.end(body);
}

const server=createServer(async(req,res)=>{
  if(req.method==="OPTIONS"){res.writeHead(204,{"access-control-allow-origin":"*","access-control-allow-headers":"content-type","access-control-allow-methods":"POST,GET,OPTIONS"});return res.end();}
  if(req.method==="GET"&&req.url==="/health") return json(res,200,{ok:true,service:"handelo-agent"});\n  if(req.method==="GET"&&req.url?.startsWith("/api/portfolio")){\n    const wallet=new URL(req.url,"http://localhost").searchParams.get("wallet")??process.env.HANDELO_WALLET;\n    if(!wallet) return json(res,400,{error:"wallet query parameter or HANDELO_WALLET is required"});\n    try{return json(res,200,await portfolioSnapshot(wallet));}catch(error){return json(res,500,{error:error instanceof Error?error.message:String(error)});}\n  }
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
