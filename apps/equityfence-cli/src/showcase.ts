import {
  BinanceTransactionClient,
  BinanceWalletClient,
  BinanceWeb3Client,
} from "@equityfence/binance-web3";
import {
  BinanceExposureSource,
  BinanceRwaStateSource,
  BinanceSimulationSource,
  evaluateAndSimulate,
  snapshotFromRwaToken,
} from "@equityfence/integration";
import { assessRisk } from "@equityfence/risk";
import { detectStateTransition, type StateSnapshot } from "@equityfence/state";

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Missing required environment variable: " + name);
  return value;
};

const parseJsonEnv = <T>(name: string): T => {
  try {
    return JSON.parse(required(name)) as T;
  } catch (error) {
    throw new Error("Environment variable " + name + " must contain valid JSON: " + (error instanceof Error ? error.message : String(error)));
  }
};

const apiKey = required("BINANCE_WEB3_API_KEY");
const secretKey = required("BINANCE_WEB3_SECRET_KEY");
const assetId = required("EQUITYFENCE_ASSET_ID");
const wallet = required("EQUITYFENCE_WALLET");
const previous = parseJsonEnv<StateSnapshot>("EQUITYFENCE_PREVIOUS_SNAPSHOT");
const txTo = required("EQUITYFENCE_TX_TO");

const web3 = new BinanceWeb3Client({ apiKey, secretKey });
const walletClient = new BinanceWalletClient({ apiKey, secretKey });
const transactionClient = new BinanceTransactionClient({ apiKey, secretKey });
const platform = process.env.EQUITYFENCE_PLATFORM === "bstock" ? "bstock" : "ondo";

const stateSource = new BinanceRwaStateSource(web3, platform);
const exposureSource = new BinanceExposureSource(walletClient);
const simulationSource = new BinanceSimulationSource(transactionClient);

const current = await stateSource.getAsset(assetId);
const currentSnapshot = snapshotFromRwaToken(current);

const live = await evaluateAndSimulate(
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
    evmTx: {
      from: wallet,
      to: txTo,
      value: process.env.EQUITYFENCE_TX_VALUE?.trim() || "0",
      data: process.env.EQUITYFENCE_TX_DATA?.trim() || "0x",
    },
  },
);

const blockedPrevious: StateSnapshot = {
  assetId,
  provider: platform,
  multiplier: currentSnapshot.multiplier,
  tokenToShareRatio: currentSnapshot.tokenToShareRatio,
  marketStatus: currentSnapshot.marketStatus,
  openState: true,
  reasonCode: "TRADING",
  observedAt: currentSnapshot.observedAt - 1000,
};

const blockedCurrent: StateSnapshot = {
  ...currentSnapshot,
  marketStatus: "pause",
  openState: false,
  reasonCode: "MARKET_PAUSED",
  observedAt: currentSnapshot.observedAt,
};

const blockedTransition = detectStateTransition(blockedPrevious, blockedCurrent);
const blockedAssessment = assessRisk({
  transition: blockedTransition,
  exposure: {
    assetId,
    wallet,
    rawBalance: "1000000000000000000",
    decimals: 18,
    isExposed: true,
  },
  exposureStatus: "KNOWN_EXPOSED",
  intent: { action: "TRANSFER", assetId, wallet },
});

console.log("");
console.log("========================================");
console.log(" EquityFence — Safety Demonstration");
console.log("========================================");

console.log("");
console.log("[1] LIVE SAFE PATH");
console.log("------------------");
console.log("Asset:         " + current.tokenSymbol + " (" + current.underlyingTicker + ")");
console.log("Provider:      " + current.platformId);
console.log("Transition:    " + (live.transition.changed ? "CHANGED" : "UNCHANGED"));
console.log("Exposure:      " + (live.exposure?.isExposed ? "KNOWN_EXPOSED" : live.exposure ? "KNOWN_ZERO" : "UNKNOWN"));
console.log("Risk gate:     " + live.assessment.decision);
console.log("Simulation:    " + (live.simulation ? "ATTEMPTED" : "SKIPPED"));
console.log("Sim status:    " + (live.simulation?.status ?? "not run"));
console.log("Final:         " + live.assessment.decision);

for (const reason of live.assessment.reasons) console.log("Reason:        " + reason);

console.log("");
console.log("[2] BLOCKED PATH — CONTROLLED REPLAY");
console.log("-------------------------------------");
console.log("Transition:    " + (blockedTransition.changed ? "CHANGED" : "UNCHANGED"));
for (const reason of blockedTransition.reasons) console.log("Transition:    " + reason);
console.log("Exposure:      KNOWN_EXPOSED");
console.log("Risk gate:     " + blockedAssessment.decision);
console.log("Simulation:    SKIPPED");
console.log("Final:         " + blockedAssessment.decision);
for (const reason of blockedAssessment.reasons) console.log("Reason:        " + reason);

if (live.assessment.decision !== "ALLOW" || live.simulation?.status !== "SUCCESS") {
  throw new Error("Live safe path did not finish as ALLOW with successful simulation.");
}

if (blockedAssessment.decision !== "BLOCK") {
  throw new Error("Controlled blocked path did not finish as BLOCK.");
}

console.log("");
console.log("========================================");
console.log(" DEMONSTRATION PASSED");
console.log("========================================");
console.log("Live:  state -> exposure -> risk -> simulation -> ALLOW");
console.log("Block: state change -> exposure -> risk -> BLOCK -> no simulation");
console.log("");
console.log("No transaction was broadcast or executed.");
