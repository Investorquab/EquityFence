import { BinanceWeb3Client } from "@equityfence/binance-web3";
import { snapshotFromRwaToken } from "@equityfence/integration";

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
const snapshot = snapshotFromRwaToken(asset);
const serialized = JSON.stringify(snapshot);

console.log("EquityFence baseline snapshot");
console.log("-----------------------------");
console.log("Asset:    " + asset.tokenSymbol + " (" + asset.underlyingTicker + ")");
console.log("Provider: " + asset.platformId);
console.log("");
console.log("Add this exact line to your local .env:");
console.log("");
console.log("EQUITYFENCE_PREVIOUS_SNAPSHOT=" + serialized);
