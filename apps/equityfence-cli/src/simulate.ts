import {
  BinanceTransactionClient,
  BinanceWalletClient,
  BinanceWeb3Client,
  type EvmTransaction,
} from "@equityfence/binance-web3";
import {
  BinanceExposureSource,
  BinanceRwaStateSource,
  BinanceSimulationSource,
  evaluateAndSimulate,
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
const txTo = required("EQUITYFENCE_TX_TO");

const transaction: EvmTransaction = {
  from: wallet,
  to: txTo,
  value: process.env.EQUITYFENCE_TX_VALUE?.trim() || "0",
  data: process.env.EQUITYFENCE_TX_DATA?.trim() || "0x",
};

const web3 = new BinanceWeb3Client({ apiKey, secretKey });
const walletClient = new BinanceWalletClient({ apiKey, secretKey });
const transactionClient = new BinanceTransactionClient({ apiKey, secretKey });

const platform = process.env.EQUITYFENCE_PLATFORM === "bstock" ? "bstock" : "ondo";
const stateSource = new BinanceRwaStateSource(web3, platform);
const exposureSource = new BinanceExposureSource(walletClient);
const simulationSource = new BinanceSimulationSource(transactionClient);

const current = await stateSource.getAsset(assetId);
const currentSnapshot = snapshotFromRwaToken(current);

const result = await evaluateAndSimulate(
  stateSource,
  exposureSource,
  simulationSource,
  previous,
  {
    assetId,
    wallet,
    intent: {
      action: process.env.EQUITYFENCE_ACTION?.trim() || "TRANSFER",
      assetId,
      wallet,
    },
  },
  {
    binanceChainId: process.env.EQUITYFENCE_CHAIN_ID?.trim() || "56",
    evmTx: transaction,
  },
);

console.log("EquityFence live guarded simulation");
console.log("-----------------------------------");
console.log("Asset:         " + current.tokenSymbol + " (" + current.underlyingTicker + ")");
console.log("Provider:      " + current.platformId);
console.log("Contract:      " + current.tokenContractAddress);
console.log("Transition:    " + (result.transition.changed ? "CHANGED" : "UNCHANGED"));
console.log(
  "Exposure:      " +
    (result.exposure
      ? result.exposure.isExposed
        ? "KNOWN_EXPOSED"
        : "KNOWN_ZERO"
      : "UNKNOWN"),
);
console.log("Risk decision: " + result.assessment.decision);
for (const reason of result.assessment.reasons) {
  console.log("Reason:        " + reason);
}
console.log("Simulation:    " + (result.simulation ? "ATTEMPTED" : "SKIPPED"));

if (result.simulation) {
  console.log("Sim status:    " + result.simulation.status);
  console.log("Sim failure:   " + (result.simulation.failReason ?? "none"));
}

console.log("");
console.log("Final decision: " + result.assessment.decision);
console.log("Note: Binance transaction simulation does not broadcast or execute the transaction.");
console.log("");
console.log("Current snapshot:");
console.log(JSON.stringify(currentSnapshot, null, 2));
