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
const platform = process.env.EQUITYFENCE_PLATFORM === "bstock" ? "bstock" : "ondo";

const client = new BinanceWeb3Client({ apiKey, secretKey });
const response = await client.getRwaTokens({
  binanceChainId: "56",
  platformId: platform,
});

console.log("EquityFence RWA asset discovery");
console.log("--------------------------------");
console.log("Chain:    BSC (56)");
console.log("Provider: " + platform);
console.log("Assets:   " + response.data.length);
console.log("");

for (const asset of response.data) {
  console.log(
    [
      asset.tokenSymbol,
      asset.underlyingTicker,
      asset.tokenContractAddress,
      "ratio=" + asset.tokenToShareRatio,
      "market=" + asset.statusInfo.marketStatus,
      "open=" + asset.statusInfo.openState,
    ].join(" | "),
  );
}
