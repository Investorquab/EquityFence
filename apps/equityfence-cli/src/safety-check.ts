import { BinanceWalletClient, BinanceWeb3Client } from "@equityfence/binance-web3";
import {
  BinanceExposureSource,
  BinanceRwaStateSource,
  evaluateSafety,
  snapshotFromRwaToken,
} from "@equityfence/integration";
import type { StateSnapshot } from "@equityfence/state";

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
};

const parseJsonEnv = <T>(name: string): T => {
  try {
    return JSON.parse(required(name)) as T;
  } catch (error) {
    throw new Error(
      "Environment variable " +
        name +
        " must contain valid JSON: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
};

const apiKey = required("BINANCE_WEB3_API_KEY");
const secretKey = required("BINANCE_WEB3_SECRET_KEY");
const assetId = required("EQUITYFENCE_ASSET_ID");
const wallet = required("EQUITYFENCE_WALLET");
const previous = parseJsonEnv<StateSnapshot>("EQUITYFENCE_PREVIOUS_SNAPSHOT");
const platform = process.env.EQUITYFENCE_PLATFORM === "bstock" ? "bstock" : "ondo";
const action = process.env.EQUITYFENCE_ACTION?.trim() || "TRANSFER";

const web3 = new BinanceWeb3Client({ apiKey, secretKey });
const walletClient = new BinanceWalletClient({ apiKey, secretKey });
const stateSource = new BinanceRwaStateSource(web3, platform);
const exposureSource = new BinanceExposureSource(walletClient);

const current = await stateSource.getAsset(assetId);
const currentSnapshot = snapshotFromRwaToken(current);

const result = await evaluateSafety(
  stateSource,
  exposureSource,
  previous,
  {
    assetId,
    wallet,
    intent: {
      action,
      assetId,
      wallet,
    },
  },
);

console.log("EquityFence live safety check");
console.log("----------------------------");
console.log("Asset:         " + current.tokenSymbol + " (" + current.underlyingTicker + ")");
console.log("Provider:      " + current.platformId);
console.log("Contract:      " + current.tokenContractAddress);
console.log("Market status: " + current.statusInfo.marketStatus);
console.log("Open:          " + current.statusInfo.openState);
console.log("Transition:    " + (result.transition.changed ? "CHANGED" : "UNCHANGED"));
for (const reason of result.transition.reasons) {
  console.log("Transition:    " + reason);
}
console.log(
  "Exposure:      " +
    (result.exposure
      ? result.exposure.isExposed
        ? "KNOWN_EXPOSED"
        : "KNOWN_ZERO"
      : "UNKNOWN"),
);
if (result.exposure) {
  console.log("Raw balance:   " + result.exposure.rawBalance);
}
console.log("Decision:      " + result.assessment.decision);
for (const reason of result.assessment.reasons) {
  console.log("Reason:        " + reason);
}
console.log("");
console.log("Current snapshot:");
console.log(JSON.stringify(currentSnapshot, null, 2));
