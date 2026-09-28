import { HandeloAgent, type AgentResult } from "@handelo/agent";

export interface HandeloClientOptions { apiKey?:string; baseUrl?:string; }
export interface ChatRequest { message:string; }
export interface HandeloClient {
  chat(request:ChatRequest):Promise<AgentResult>;
}

export function createHandeloClient(options:HandeloClientOptions={}):HandeloClient{
  if(options.baseUrl){
    const base=options.baseUrl.replace(/\/$/,"");
    return {
      async chat(request){
        const response=await fetch(base+"/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(request)});
        const payload=await response.json() as AgentResult & {error?:string};
        if(!response.ok) throw new Error(payload.error??`Handelo API request failed with ${response.status}`);
        return payload;
      }
    };
  }
  const agent=new HandeloAgent({llmApiKey:options.apiKey});
  return {chat:({message})=>agent.run(message)};
}
