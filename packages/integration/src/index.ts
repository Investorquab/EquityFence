export { BinanceRwaStateSource } from "./binance.js";
export { BinanceExposureSource } from "./binance-wallet.js";
export {
  evaluateSafety,
  snapshotFromRwaToken,
  simulateIfAllowed,
} from "./model.js";

export type {
  GuardedSimulationResult,
  RwaStateSource,
  SafetyCheckInput,
  SafetyCheckResult,
  SimulationSource,
} from "./model.js";
