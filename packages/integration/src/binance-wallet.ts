import {
  BinanceWalletClient,
} from "@equityfence/binance-web3";
import type {
  ExposureSource,
  TokenBalance,
} from "@equityfence/exposure";

export class BinanceExposureSource implements ExposureSource {
  constructor(
    private readonly client: BinanceWalletClient,
    private readonly chainId = "56",
  ) {}

  async getTokenBalance(
    assetId: string,
    wallet: string,
  ): Promise<TokenBalance> {
    return this.client.getTokenBalance(wallet, assetId, this.chainId);
  }
}
