export interface BinanceResponse<T> {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
  success: boolean;
}

export interface RwaToken {
  binanceChainId: string;
  tokenContractAddress: string;
  platformId: string;
  assetType: 1 | 2 | 3;
  tokenName: string;
  tokenSymbol: string;
  decimals: string;
  underlyingTicker: string;
  underlyingName: string;
  tokenToShareRatio: string;
  statusInfo: {
    openState: boolean;
    marketStatus: "premarket" | "regular" | "postmarket" | "overnight" | "closed" | "pause";
    reasonCode:
      | "TRADING"
      | "MARKET_CLOSED"
      | "MARKET_PAUSED"
      | "MARKET_MAINTENANCE"
      | "ASSET_PAUSED"
      | "ASSET_LIMITED"
      | "UNSUPPORTED";
    reasonMsg: string | null;
    nextOpenTime: number | null;
    nextCloseTime: number | null;
  };
  tokenPrice: string;
  referencePrice: string;
  volume24H: string;
  marketCap: string;
  peRatioTTM: string | null;
}

export interface RwaSearchAsset {
  platformId: string;
  binanceChainId: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  assetType: 1 | 2 | 3;
}

export interface RwaSearchResult {
  ticker: string;
  companyName: string;
  assets: RwaSearchAsset[];
}

export interface RwaTokenPrice {
  binanceChainId: string;
  tokenContractAddress: string;
  platformId: string;
  tokenPrice: string;
  referencePrice: string;
  tokenPriceUpdatedAt: number;
}
