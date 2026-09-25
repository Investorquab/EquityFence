import type {
  ExposureSource,
  TokenBalance,
} from "@equityfence/exposure";

export interface EvmRpcConfig {
  rpcUrl: string;
}

export interface EvmCall {
  to: string;
  data: string;
}

export interface EvmRpcTransport {
  request<T>(method: string, params: unknown[]): Promise<T>;
}

const BALANCE_OF_SELECTOR = "70a08231";

function normalizeHex(value: string): string {
  return value.replace(/^0x/, "").padStart(64, "0");
}

function encodeBalanceOf(wallet: string): string {
  const address = wallet.replace(/^0x/, "");

  if (!/^[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error("Invalid EVM wallet address");
  }

  return `0x${BALANCE_OF_SELECTOR}${normalizeHex(address)}`;
}

function decodeUint256(value: string): string {
  const normalized = value.replace(/^0x/, "");

  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new Error("RPC returned an invalid uint256 value");
  }

  return BigInt(`0x${normalized}`).toString(10);
}

export class HttpEvmRpcTransport implements EvmRpcTransport {
  constructor(private readonly rpcUrl: string) {
    if (!rpcUrl.startsWith("http://") && !rpcUrl.startsWith("https://")) {
      throw new Error("RPC URL must use HTTP or HTTPS");
    }
  }

  async request<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`EVM RPC HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      result?: T;
      error?: { code: number; message: string };
    };

    if (payload.error) {
      throw new Error(
        `EVM RPC ${payload.error.code}: ${payload.error.message}`,
      );
    }

    if (payload.result === undefined) {
      throw new Error("EVM RPC response did not contain a result");
    }

    return payload.result;
  }
}

export class Erc20ExposureSource implements ExposureSource {
  constructor(
    private readonly transport: EvmRpcTransport,
    private readonly assetResolver: (assetId: string) => string = (assetId) =>
      assetId,
  ) {}

  async getTokenBalance(assetId: string, wallet: string): Promise<TokenBalance> {
    const tokenAddress = this.assetResolver(assetId);

    if (!/^0x[0-9a-fA-F]{40}$/.test(tokenAddress)) {
      throw new Error("Invalid ERC-20 token contract address");
    }

    const data = encodeBalanceOf(wallet);
    const result = await this.transport.request<string>("eth_call", [
      {
        to: tokenAddress,
        data,
      },
      "latest",
    ]);

    return {
      assetId,
      wallet,
      rawBalance: decodeUint256(result),
      decimals: 18,
    };
  }
}
