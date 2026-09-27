import { evaluateAndSimulate } from "@equityfence/integration";
import type { EvmTransaction, SimulationResult } from "@equityfence/binance-web3";
import type { ExposureSource, TokenBalance } from "@equityfence/exposure";
import type { RwaToken } from "@equityfence/binance-web3";
import type { StateSnapshot } from "@equityfence/state";

const assetId = "0x7313ea16493b2f55054df0131a3a14b043ec8992";
const wallet = "0x00d1E86040d88397F4eB187c38dC527F6659e486";

const previous: StateSnapshot = {
  assetId,
  provider: "ondo",
  multiplier: "1",
  tokenToShareRatio: "1",
  marketStatus: "regular",
  openState: true,
  reasonCode: "TRADING",
  observedAt: 1790482192251,
};

const current: RwaToken = {
  binanceChainId: "56",
  tokenContractAddress: assetId,
  platformId: "ondo",
  assetType: 1,
  tokenName: "MSTRon",
  tokenSymbol: "MSTRon",
  decimals: "18",
  underlyingTicker: "MSTR",
  underlyingName: "Strategy",
  tokenToShareRatio: "1",
  statusInfo: {
    openState: false,
    marketStatus: "paused",
    reasonCode: "MARKET_PAUSED",
    reasonMsg: "Controlled replay",
    nextOpenTime: null,
    nextCloseTime: null,
  },
  tokenPrice: "160",
  referencePrice: "160",
  volume24H: "0",
  marketCap: "0",
  peRatioTTM: null,
};

const stateSource = {
  async getAsset(requestedAssetId: string): Promise<RwaToken> {
    if (requestedAssetId !== assetId) {
      throw new Error("Unexpected asset requested");
    }
    return current;
  },
};

let simulationCalls = 0;
const simulationSource = {
  async simulateTransaction(_request: {
    binanceChainId: string;
    evmTx: EvmTransaction;
  }): Promise<SimulationResult> {
    simulationCalls += 1;
    return {
      status: "SUCCESS",
      failReason: null,
      balanceChanges: [],
      allowanceChanges: [],
    };
  },
};

const exposureSource: ExposureSource = {
  async getTokenBalance(requestedAssetId: string, requestedWallet: string): Promise<TokenBalance> {
    return {
      assetId: requestedAssetId,
      wallet: requestedWallet,
      rawBalance: "1000000000000000000",
      decimals: 18,
    };
  },
};

const transaction: EvmTransaction = {
  from: wallet,
  to: "0x1111111111111111111111111111111111111111",
  value: "0",
  data: "0x",
};

const result = await evaluateAndSimulate(
  stateSource,
  exposureSource,
  simulationSource,
  previous,
  {
    assetId,
    wallet,
    intent: {
      action: "TRANSFER",
      assetId,
      wallet,
    },
  },
  {
    binanceChainId: "56",
    evmTx: transaction,
  },
);

console.log("EquityFence pipeline replay");
console.log("---------------------------");
console.log("Mode:          REPLAY (controlled scenario)");
console.log("Exposure:      KNOWN_EXPOSED");
console.log("Transition:    CHANGED");
console.log("Risk decision: " + result.assessment.decision);
console.log("Simulation:    " + (result.simulation ? result.simulation.status : "SKIPPED"));
console.log("Simulator calls: " + simulationCalls);

if (result.assessment.decision !== "BLOCK") {
  throw new Error("Pipeline replay failed: expected BLOCK");
}

if (result.simulation !== null) {
  throw new Error("Pipeline replay failed: blocked transaction must not be simulated");
}

if (simulationCalls !== 0) {
  throw new Error("Pipeline replay failed: simulator was called for a blocked transaction");
}

console.log("");
console.log("PASS: BLOCKED transactions never reach transaction simulation.");
