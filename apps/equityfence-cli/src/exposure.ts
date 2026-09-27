import { BinanceWalletClient } from "@equityfence/binance-web3";

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
};

const apiKey = required("BINANCE_WEB3_API_KEY");
const secretKey = required("BINANCE_WEB3_SECRET_KEY");
const wallet = required("EQUITYFENCE_WALLET");
const assetId = required("EQUITYFENCE_ASSET_ID");
const chainId = process.env.EQUITYFENCE_CHAIN_ID?.trim() || "56";

const client = new BinanceWalletClient({ apiKey, secretKey });
const balance = await client.getTokenBalance(wallet, assetId, chainId);

console.log("EquityFence wallet exposure");
console.log("---------------------------");
console.log("Chain:       BSC (" + chainId + ")");
console.log("Wallet:      " + balance.wallet);
console.log("Asset:       " + balance.assetId);
console.log("Raw balance: " + balance.rawBalance);
console.log("Decimals:    " + balance.decimals);
console.log(
  "Exposure:    " + (BigInt(balance.rawBalance) > 0n ? "KNOWN_EXPOSED" : "KNOWN_ZERO"),
);
