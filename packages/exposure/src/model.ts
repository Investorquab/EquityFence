export interface TokenBalance {
  assetId: string;
  wallet: string;
  rawBalance: string;
  decimals: number;
}

export interface ExposurePosition {
  assetId: string;
  wallet: string;
  rawBalance: string;
  decimals: number;
  isExposed: boolean;
}

export interface ExposureSource {
  getTokenBalance(assetId: string, wallet: string): Promise<TokenBalance>;
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveExposure(
  balance: TokenBalance,
  assetId: string,
  wallet: string,
): ExposurePosition {
  const assetMatches =
    normalizeAddress(balance.assetId) === normalizeAddress(assetId);

  const walletMatches =
    normalizeAddress(balance.wallet) === normalizeAddress(wallet);

  if (!assetMatches || !walletMatches) {
    return {
      ...balance,
      assetId,
      wallet,
      isExposed: false,
    };
  }

  const isExposed = BigInt(balance.rawBalance) > 0n;

  return {
    ...balance,
    assetId,
    wallet,
    isExposed,
  };
}

export class StaticExposureSource implements ExposureSource {
  constructor(private readonly balances: TokenBalance[]) {}

  async getTokenBalance(assetId: string, wallet: string): Promise<TokenBalance> {
    const match = this.balances.find(
      (balance) =>
        normalizeAddress(balance.assetId) === normalizeAddress(assetId) &&
        normalizeAddress(balance.wallet) === normalizeAddress(wallet),
    );

    return (
      match ?? {
        assetId,
        wallet,
        rawBalance: "0",
        decimals: 18,
      }
    );
  }
}
