import { HandeloMarketClient, marketClientFromEnv, type RwaAsset } from "@handelo/market";

export interface PortfolioPosition{
  ticker:string;tokenSymbol:string;contract:string;balance:string;estimatedValueUsd:number|null;tokenPrice:string;provider:string;
}
export interface PortfolioSnapshot{wallet:string;positions:PortfolioPosition[];totalEstimatedValueUsd:number|null;}

function position(asset:RwaAsset,balance:string):PortfolioPosition{
  const units=Number(balance)/10**Number(asset.decimals);
  const price=Number(asset.tokenPrice);
  return {ticker:asset.underlyingTicker,tokenSymbol:asset.tokenSymbol,contract:asset.tokenContractAddress,balance,estimatedValueUsd:Number.isFinite(units*price)?units*price:null,tokenPrice:asset.tokenPrice,provider:asset.platformId};
}

export class HandeloPortfolio{
  constructor(private readonly market:HandeloMarketClient=marketClientFromEnv()){}
  async snapshot(wallet:string):Promise<PortfolioSnapshot>{
    if(!/^0x[0-9a-fA-F]{40}$/.test(wallet)) throw new Error("Invalid EVM wallet address.");
    const assets=await this.market.discover(20);
    const positions:PortfolioPosition[]=[];
    const balances=await this.market.tokenBalances(wallet,assets.map(asset=>asset.tokenContractAddress));
    for(const asset of assets){
      const rawBalance=balances.get(asset.tokenContractAddress.toLowerCase())??"0";
      if(BigInt(rawBalance)>0n) positions.push(position(asset,rawBalance));
    }
    const values=positions.map(p=>p.estimatedValueUsd).filter((v):v is number=>v!==null);
    return {wallet,positions,totalEstimatedValueUsd:values.length===positions.length?values.reduce((a,b)=>a+b,0):null};
  }
}
