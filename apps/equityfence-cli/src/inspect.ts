import { BinanceWeb3Client } from "@equityfence/binance-web3";

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
};

const apiKey = required("BINANCE_WEB3_API_KEY");
const secretKey = required("BINANCE_WEB3_SECRET_KEY");
const assetId = required("EQUITYFENCE_ASSET_ID");
const platform = process.env.EQUITYFENCE_PLATFORM === "bstock" ? "bstock" : "ondo";

const client = new BinanceWeb3Client({ apiKey, secretKey });
const asset = await client.getRwaTokenByContract(assetId, platform);

console.log("EquityFence RWA asset inspection");
console.log("---------------------------------");
console.log("Chain:            BSC (56)");
console.log("Provider:         " + asset.platformId);
console.log("Token:            " + asset.tokenSymbol);
console.log("Underlying:       " + asset.underlyingTicker);
console.log("Contract:         " + asset.tokenContractAddress);
console.log("Decimals:         " + asset.decimals);
console.log("Token/share ratio:" + " " + asset.tokenToShareRatio);
console.log("Market status:    " + asset.statusInfo.marketStatus);
console.log("Open:             " + asset.statusInfo.openState);
console.log("Reason code:      " + asset.statusInfo.reasonCode);
console.log("Reason message:   " + (asset.statusInfo.reasonMsg ?? "none"));
console.log("Reference price:  " + asset.referencePrice);
console.log("Token price:      " + asset.tokenPrice);
console.log("24h volume:       " + asset.volume24H);
console.log("Market cap:       " + asset.marketCap);
console.log("Next open:        " + (asset.statusInfo.nextOpenTime ?? "none"));
console.log("Next close:       " + (asset.statusInfo.nextCloseTime ?? "none"));
