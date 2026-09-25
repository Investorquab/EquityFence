import { createHmac, randomUUID } from "node:crypto";
import type {
  BinanceResponse,
  RwaSearchResult,
  RwaToken,
  RwaTokenPrice,
} from "./types.js";

const BASE_URL = "https://web3.binance.com/build";

export interface BinanceWeb3Config {
  apiKey: string;
  secretKey: string;
  recvWindowMs?: number;
}

export class BinanceWeb3Client {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly recvWindowMs: number;

  constructor(config: BinanceWeb3Config) {
    if (!config.apiKey.trim()) {
      throw new Error("Binance Web3 API key is required");
    }

    if (!config.secretKey.trim()) {
      throw new Error("Binance Web3 API secret key is required");
    }

    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.recvWindowMs = config.recvWindowMs ?? 5000;
  }

  async searchRwaToken(keyword: string, platformId?: "ondo" | "bstock") {
    const params: Record<string, string> = { keyword };

    if (platformId) {
      params.platformId = platformId;
    }

    return this.get<RwaSearchResult[]>(
      "/api/v1/dex/market/rwa/search",
      params,
    );
  }

  async getRwaTokens(options?: {
    binanceChainId?: string;
    platformId?: "ondo" | "bstock";
  }) {
    const params: Record<string, string> = {};

    if (options?.binanceChainId) {
      params.binanceChainId = options.binanceChainId;
    }

    if (options?.platformId) {
      params.platformId = options.platformId;
    }

    return this.get<RwaToken[]>(
      "/api/v1/dex/market/rwa/tokens",
      params,
    );
  }

  async getRwaTokenByContract(tokenContractAddress: string, platformId?: "ondo" | "bstock") {
    const results = await this.searchRwaToken(tokenContractAddress, platformId);
    const assets = results.data.flatMap((result) => result.assets);
    const match = assets.find(
      (asset) =>
        asset.binanceChainId === "56" &&
        asset.tokenContractAddress.toLowerCase() === tokenContractAddress.toLowerCase(),
    );

    if (!match) {
      throw new Error("RWA token not found on BSC: " + tokenContractAddress);
    }

    const tokens = await this.getRwaTokens({
      binanceChainId: "56",
      platformId: match.platformId as "ondo" | "bstock",
    });

    const token = tokens.data.find(
      (item) =>
        item.tokenContractAddress.toLowerCase() === tokenContractAddress.toLowerCase(),
    );

    if (!token) {
      throw new Error("RWA token details not found: " + tokenContractAddress);
    }

    return token;
  }

  async getRwaPrices(tokenContractAddresses: string[]) {
    if (tokenContractAddresses.length === 0) {
      throw new Error("At least one token contract address is required");
    }

    if (tokenContractAddresses.length > 100) {
      throw new Error("Binance Web3 API allows at most 100 token addresses per request");
    }

    return this.get<RwaTokenPrice[]>(
      "/api/v1/dex/market/rwa/price",
      {
        binanceChainId: "56",
        tokenContractAddresses: tokenContractAddresses.join(","),
      },
    );
  }

  private async get<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<BinanceResponse<T>> {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      query.set(key, value);
    }

    const queryString = query.toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;
    const requestPath = `/build${fullPath}`;
    const timestamp = new Date().toISOString();
    const nonce = randomUUID();
    const signature = createHmac(
      "sha256",
      this.secretKey,
    )
      .update(timestamp + "GET" + requestPath, "utf8")
      .digest("base64");

    const response = await fetch(BASE_URL + fullPath, {
      method: "GET",
      headers: {
        "X-OC-APIKEY": this.apiKey,
        "X-OC-TIMESTAMP": timestamp,
        "X-OC-SIGN": signature,
        "X-OC-RECV-WINDOW": String(this.recvWindowMs),
        "X-OC-NONCE": nonce,
      },
    });

    const payload = (await response.json()) as BinanceResponse<T>;

    if (!response.ok) {
      throw new Error(
        `Binance Web3 API HTTP ${response.status}: ${payload.msg || response.statusText}`,
      );
    }

    if (!payload.success || payload.code !== 0) {
      throw new Error(
        `Binance Web3 API error ${payload.code}: ${payload.msg}`,
      );
    }

    return payload;
  }
}
