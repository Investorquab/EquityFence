import {
  BinanceWeb3Client,
  type RwaToken,
} from "@equityfence/binance-web3";
import type { RwaStateSource } from "./model.js";

export class BinanceRwaStateSource implements RwaStateSource {
  constructor(
    private readonly client: BinanceWeb3Client,
    private readonly platformId?: "ondo" | "bstock",
  ) {}

  async getAsset(assetId: string): Promise<RwaToken> {
    return this.client.getRwaTokenByContract(assetId, this.platformId);
  }
}
