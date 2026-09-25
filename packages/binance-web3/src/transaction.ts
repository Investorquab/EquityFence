import { createHmac } from "node:crypto";

const BASE_URL = "https://web3.binance.com/build";

export interface EvmTransaction {
  from: string;
  to: string;
  value: string;
  data?: string;
}

export interface SimulationRequest {
  binanceChainId: string;
  evmTx: EvmTransaction;
}

export interface BalanceChange {
  contractAddress: string;
  tokenType: string;
  change: string;
  owner: string;
}

export interface AllowanceChange {
  tokenAddress: string;
  owner: string;
  spender: string;
  preAmount: string;
  postAmount: string;
}

export interface SimulationResult {
  status: string;
  failReason: string | null;
  balanceChanges: BalanceChange[];
  allowanceChanges: AllowanceChange[];
}

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
  success: boolean;
}

export class BinanceTransactionClient {
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

  async simulateTransaction(
    request: SimulationRequest,
  ): Promise<SimulationResult> {
    const body = JSON.stringify(request);
    const path = "/api/v1/dex/pre-transaction/simulate";
    const timestamp = new Date().toISOString();
    const requestPath = "/build" + path;
    const signature = createHmac("sha256", this.secretKey)
      .update(timestamp + "POST" + requestPath + body, "utf8")
      .digest("base64");

    const response = await fetch(BASE_URL + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-OC-APIKEY": this.apiKey,
        "X-OC-TIMESTAMP": timestamp,
        "X-OC-SIGN": signature,
        "X-OC-RECV-WINDOW": String(this.recvWindowMs),
      },
      body,
    });

    const payload = (await response.json()) as ApiResponse<SimulationResult>;

    if (!response.ok) {
      throw new Error(
        "Binance Transaction API HTTP " +
          response.status +
          ": " +
          (payload.msg || response.statusText),
      );
    }

    if (!payload.success || payload.code !== 0) {
      throw new Error(
        "Binance Transaction API error " +
          payload.code +
          ": " +
          payload.msg,
      );
    }

    return payload.data;
  }
}
