import { createHmac, randomUUID } from "node:crypto";

export interface TokenBalance { assetId:string; wallet:string; rawBalance:string; decimals:number; }
export interface WalletTransaction {
  binanceChainId:string; txHash:string; txTime:string; amount:string; symbol:string;
  txStatus:string; tokenContractAddress:string; from:string[]; to:string[];
}

export interface RwaAsset {
  binanceChainId:string; tokenContractAddress:string; platformId:string;
  tokenSymbol:string; decimals:string; underlyingTicker:string; underlyingName:string;
  tokenToShareRatio:string; tokenPrice:string; referencePrice:string;
  volume24H:string; marketCap:string;
  statusInfo:{openState:boolean;marketStatus:string;reasonCode:string;reasonMsg:string|null;nextOpenTime:number|null;nextCloseTime:number|null};
}

interface Envelope<T>{code:number;msg:string;data:T;timestamp:number;success:boolean}
const BASE="https://web3.binance.com/build";

export class HandeloMarketClient {
  constructor(private readonly apiKey:string,private readonly secretKey:string){
    if(!apiKey||!secretKey) throw new Error("BINANCE_WEB3_API_KEY and BINANCE_WEB3_SECRET_KEY are required.");
  }
  private async request<T>(method:"GET"|"POST",path:string,body?:unknown,params?:Record<string,string>):Promise<T>{
    const query=params ? new URLSearchParams(params).toString() : "";
    const fullPath=query ? `${path}?${query}` : path;
    const payload=body===undefined ? "" : JSON.stringify(body);
    const timestamp=new Date().toISOString(),nonce=randomUUID();
    const signature=createHmac("sha256",this.secretKey).update(timestamp+method+"/build"+fullPath+payload).digest("base64");
    const response=await fetch(BASE+fullPath,{method,headers:{"X-OC-APIKEY":this.apiKey,"X-OC-TIMESTAMP":timestamp,"X-OC-SIGN":signature,"X-OC-RECV-WINDOW":"5000","X-OC-NONCE":nonce,"content-type":"application/json"},...(body===undefined?{}:{body:payload})});
    const envelope=await response.json() as Envelope<T>;
    if(!response.ok||!envelope.success||envelope.code!==0) throw new Error(`Binance Web3 API error ${response.status}/${envelope.code}: ${envelope.msg}`);
    return envelope.data;
  }
  async search(ticker:string):Promise<Array<{ticker:string;companyName:string;assets:Array<{platformId:string;binanceChainId:string;tokenContractAddress:string;tokenSymbol:string;assetType:number}>}>>{
    return this.request("GET","/api/v1/dex/market/rwa/search",undefined,{keyword:ticker});
  }
  async tokens():Promise<RwaAsset[]>{
    return this.request("GET","/api/v1/dex/market/rwa/tokens",undefined,{binanceChainId:"56"}) as Promise<RwaAsset[]>;
  }
  async tokenBalance(wallet:string,assetId:string):Promise<TokenBalance>{
    if(!/^0x[0-9a-fA-F]{40}$/.test(wallet)||!/^0x[0-9a-fA-F]{40}$/.test(assetId)) throw new Error("Invalid EVM wallet or token contract address.");
    const data=await this.request<Array<{tokenAssets:Array<{binanceChainId:string;tokenContractAddress:string;address:string;rawBalance:string}>}>>("POST","/api/v1/dex/balance/token-balances-by-address",{address:wallet,tokenContractAddresses:[{binanceChainId:"56",tokenContractAddress:assetId}]});
    const asset=data.flatMap(group=>group.tokenAssets).find(x=>x.binanceChainId==="56"&&x.tokenContractAddress.toLowerCase()===assetId.toLowerCase()&&x.address.toLowerCase()===wallet.toLowerCase());
    return {assetId,wallet,rawBalance:asset?.rawBalance??"0",decimals:18};
  }

  async tokenBalances(wallet:string,assetIds:string[]):Promise<Map<string,string>>{
    if(!/^0x[0-9a-fA-F]{40}$/.test(wallet)||assetIds.length>20) throw new Error("Invalid wallet or token list.");
    const addresses=assetIds.map(assetId=>{
      if(!/^0x[0-9a-fA-F]{40}$/.test(assetId)) throw new Error("Invalid token contract address.");
      return {binanceChainId:"56",tokenContractAddress:assetId};
    });
    const data=await this.request<Array<{tokenAssets:Array<{binanceChainId:string;tokenContractAddress:string;address:string;rawBalance:string}>}>>("POST","/api/v1/dex/balance/token-balances-by-address",{address:wallet,tokenContractAddresses:addresses});
    return new Map(data.flatMap(group=>group.tokenAssets).map(asset=>[asset.tokenContractAddress.toLowerCase(),asset.rawBalance||"0"]));
  }
  async transactions(wallet:string,limit=20):Promise<WalletTransaction[]>{
    if(!/^0x[0-9a-fA-F]{40}$/.test(wallet)) throw new Error("Invalid EVM wallet address.");
    const data=await this.request<Array<{transactionList:Array<{
      binanceChainId:string;txHash:string;txTime:string;amount:string;symbol:string;
      txStatus:string;tokenContractAddress:string;from:Array<{address:string}>;to:Array<{address:string}>;
    }>}>>("GET","/api/v1/dex/post-transaction/transactions-by-address",undefined,{
      address:wallet,chains:"56",limit:String(Math.min(Math.max(limit,1),100))
    });
    return data.flatMap(group=>group.transactionList).map(tx=>({
      binanceChainId:tx.binanceChainId,txHash:tx.txHash,txTime:tx.txTime,amount:tx.amount,symbol:tx.symbol,
      txStatus:tx.txStatus,tokenContractAddress:tx.tokenContractAddress,
      from:tx.from.map(item=>item.address),to:tx.to.map(item=>item.address)
    }));
  }

  async discover(limit=8):Promise<RwaAsset[]>{
    const all=await this.tokens();
    return all.filter(x=>x.binanceChainId==="56"&&x.underlyingTicker).sort((a,b)=>Number(b.volume24H)-Number(a.volume24H)).slice(0,limit);
  }
  async findAll(ticker:string):Promise<RwaAsset[]>{
    const query=ticker.trim();
    const results=await this.search(query);
    const assets=results.flatMap(x=>x.assets).filter(x=>x.binanceChainId==="56");
    if(!assets.length) throw new Error(`No BSC tokenized-stock representation found for ${query}.`);
    const all=await this.tokens();
    const matches=all.filter(x=>assets.some(a=>a.tokenContractAddress.toLowerCase()===x.tokenContractAddress.toLowerCase()));
    if(!matches.length) throw new Error(`No live BSC market record found for ${query}.`);
    return matches;
  }

  async find(ticker:string):Promise<RwaAsset>{
    const matches=await this.findAll(ticker);
    const exact=matches.filter(x=>x.tokenSymbol.toLowerCase()===ticker.trim().toLowerCase());
    if(exact.length===1) return exact[0];
    if(matches.length>1) throw new Error(`Multiple BSC tokenized-stock representations found for ${ticker}: ${matches.map(x=>x.tokenSymbol+" ("+x.platformId+")").join(", ")}. Resolve the representation before trading.`);
    return matches[0];
  }
}

export function marketClientFromEnv(){
  return new HandeloMarketClient(process.env.BINANCE_WEB3_API_KEY?.trim()??"",process.env.BINANCE_WEB3_SECRET_KEY?.trim()??"");
}
