import { createHmac, randomUUID } from "node:crypto";

export interface EvmTransaction{from:string;to:string;value:string;data?:string;}
export interface SimulationResult{status:string;failReason:string|null;balanceChanges:Array<{contractAddress:string;tokenType:string;change:string;owner:string}>;allowanceChanges:Array<{tokenAddress:string;owner:string;spender:string;preAmount:string;postAmount:string}>;}
export interface ExecutionAdapter{
  simulate(tx:EvmTransaction):Promise<SimulationResult>;
  execute(tx:EvmTransaction):Promise<{txHash:string}>;
}

export class BinanceSimulationAdapter implements ExecutionAdapter{
  constructor(private readonly apiKey:string,private readonly secretKey:string){}
  private async simulateRequest(tx:EvmTransaction){
    const body=JSON.stringify({binanceChainId:"56",evmTx:tx});
    const path="/api/v1/dex/pre-transaction/simulate",timestamp=new Date().toISOString(),nonce=randomUUID();
    const signature=createHmac("sha256",this.secretKey).update(timestamp+"POST"+"/build"+path+body).digest("base64");
    const response=await fetch("https://web3.binance.com/build"+path,{method:"POST",headers:{"content-type":"application/json","X-OC-APIKEY":this.apiKey,"X-OC-TIMESTAMP":timestamp,"X-OC-SIGN":signature,"X-OC-RECV-WINDOW":"5000","X-OC-NONCE":nonce},body});
    const payload=await response.json() as {code:number;msg:string;data:SimulationResult;success:boolean};
    if(!response.ok||!payload.success||payload.code!==0) throw new Error(`Simulation failed ${response.status}/${payload.code}: ${payload.msg}`);
    return payload.data;
  }
  simulate(tx:EvmTransaction){return this.simulateRequest(tx);}
  async execute(_tx:EvmTransaction):Promise<{txHash:string}>{
    throw new Error("No broadcast adapter is configured. Handelo will only execute after the Agentic Wallet boundary is connected.");
  }
}

export function simulationAdapterFromEnv(){
  const key=process.env.BINANCE_WEB3_API_KEY?.trim()??"",secret=process.env.BINANCE_WEB3_SECRET_KEY?.trim()??"";
  if(!key||!secret) throw new Error("BINANCE Web3 credentials are required for transaction simulation.");
  return new BinanceSimulationAdapter(key,secret);
}
