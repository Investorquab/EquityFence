import { createHmac, randomUUID } from "node:crypto";
import type { TokenBalance } from "@equityfence/exposure";

const BASE_URL = "https://web3.binance.com/build";

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
  success: boolean;
}

interface BinanceTokenAsset {
  binanceChainId: string;
  tokenContractAddress: string;
  address: string;
  symbol: string;
  balance: string;
  rawBalance: string;
}

interface BinanceTokenBalanceGroup {
  tokenAssets: BinanceTokenAsset[];
}

export class BinanceWalletClient {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly recvWindowMs: number;

  constructor(config: {
    apiKey: string;
    secretKey: string;
    recvWindowMs?: number;
  }) {
    if (!config.apiKey.trim() || !config.secretKey.trim()) {
      throw new Error("Binance Web3 API credentials are required");
    }
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.recvWindowMs = config.recvWindowMs ?? 5000;
  }

  async getTokenBalance(
    wallet: string,
    assetId: string,
    chainId = "56",
  ): Promise<TokenBalance> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      throw new Error("Invalid EVM wallet address");
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(assetId)) {
      throw new Error("Invalid ERC-20 token contract address");
    }

    const body = JSON.stringify({
      address: wallet,
      tokenContractAddresses: [
        {
          binanceChainId: chainId,
          tokenContractAddress: assetId,
        },
      ],
    });

    const path = "/api/v1/dex/balance/token-balances-by-address";
    const timestamp = new Date().toISOString();
    const nonce = randomUUID();
    const signature = createHmac("sha256", this.secretKey)
      .update(timestamp + "POST" + "/build" + path + body, "utf8")
      .digest("base64");

    const response = await fetch(BASE_URL + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-OC-APIKEY": this.apiKey,
        "X-OC-TIMESTAMP": timestamp,
        "X-OC-SIGN": signature,
        "X-OC-RECV-WINDOW": String(this.recvWindowMs),
        "X-OC-NONCE": nonce,
      },
      body,
    });

    const payload = (await response.json()) as ApiResponse<BinanceTokenBalanceGroup[]>;

    if (!response.ok) {
      throw new Error(
        "Binance Wallet API HTTP " +
          response.status +
          ": " +
          (payload.msg || response.statusText),
      );
    }

    if (!payload.success || payload.code !== 0) {
      throw new Error(
        "Binance Wallet API error " + payload.code + ": " + payload.msg,
      );
    }

    const asset = payload.data
      .flatMap((group) => group.tokenAssets)
      .find(
        (item) =>
          item.binanceChainId === chainId &&
          item.tokenContractAddress.toLowerCase() === assetId.toLowerCase() &&
          item.address.toLowerCase() === wallet.toLowerCase(),
      );

    if (!asset) {
      return {
        assetId,
        wallet,
        rawBalance: "0",
        decimals: 18,
      };
    }

    if (!asset.rawBalance) {
      throw new Error("Binance Wallet API returned no raw balance");
    }

    return {
      assetId,
      wallet,
      rawBalance: asset.rawBalance,
      decimals: 18,
    };
  }
}
