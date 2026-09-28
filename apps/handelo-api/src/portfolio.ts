import { HandeloPortfolio } from "@handelo/portfolio";

export async function portfolioSnapshot(wallet:string){
  return new HandeloPortfolio().snapshot(wallet);
}
