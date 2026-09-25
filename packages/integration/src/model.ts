import type { RwaToken } from "@equityfence/binance-web3";
import type { ExposurePosition, ExposureSource } from "@equityfence/exposure";
import type { RiskAssessment, TransactionIntent } from "@equityfence/core";
import type { EvmTransaction, SimulationResult } from "@equityfence/binance-web3";
import { assessRisk } from "@equityfence/risk";
import { detectStateTransition, type StateSnapshot } from "@equityfence/state";

export interface RwaStateSource {
  getAsset(assetId: string): Promise<RwaToken>;
}

export interface SafetyCheckInput {
  assetId: string;
  wallet: string;
  intent: TransactionIntent;
}

export interface SafetyCheckResult {
  assessment: RiskAssessment;
  transition: ReturnType<typeof detectStateTransition>;
  exposure: ExposurePosition | null;
}

export interface SimulationSource {
  simulateTransaction(request: {
    binanceChainId: string;
    evmTx: EvmTransaction;
  }): Promise<SimulationResult>;
}

export interface GuardedSimulationResult {
  assessment: RiskAssessment;
  simulation: SimulationResult | null;
}

export async function simulateIfAllowed(
  simulationSource: SimulationSource,
  assessment: RiskAssessment,
  request: { binanceChainId: string; evmTx: EvmTransaction },
): Promise<GuardedSimulationResult> {
  if (assessment.decision !== "ALLOW") {
    return { assessment, simulation: null };
  }

  const simulation = await simulationSource.simulateTransaction(request);

  if (simulation.status !== "SUCCESS") {
    return {
      assessment: {
        decision: "BLOCK",
        reasons: [
          "The transaction passed the economic-state risk gate but failed simulation.",
          simulation.failReason
            ? "Simulation failure: " + simulation.failReason
            : "The simulator did not report SUCCESS.",
        ],
      },
      simulation,
    };
  }

  return { assessment, simulation };
}

function toSnapshot(asset: RwaToken): StateSnapshot {
  return {
    assetId: asset.tokenContractAddress,
    provider: asset.platformId,
    multiplier: asset.tokenToShareRatio,
    tokenToShareRatio: asset.tokenToShareRatio,
    marketStatus: asset.statusInfo.marketStatus,
    openState: asset.statusInfo.openState,
    reasonCode: asset.statusInfo.reasonCode,
    observedAt: Date.now(),
  };
}

export function snapshotFromRwaToken(asset: RwaToken): StateSnapshot {
  return toSnapshot(asset);
}

export async function evaluateSafety(
  source: RwaStateSource,
  exposureSource: ExposureSource,
  previous: StateSnapshot,
  input: SafetyCheckInput,
): Promise<SafetyCheckResult> {
  const currentAsset = await source.getAsset(input.assetId);
  const current = toSnapshot(currentAsset);
  const transition = detectStateTransition(previous, current);

  let exposure: ExposurePosition | null = null;

  try {
    const balance = await exposureSource.getTokenBalance(input.assetId, input.wallet);
    const assetMatches = balance.assetId.toLowerCase() === input.assetId.toLowerCase();
    const walletMatches = balance.wallet.toLowerCase() === input.wallet.toLowerCase();

    exposure = assetMatches && walletMatches
      ? { ...balance, isExposed: BigInt(balance.rawBalance) > 0n }
      : null;
  } catch {
    exposure = null;
  }

  const assessment = assessRisk({ transition, exposure, intent: input.intent });
  return { assessment, transition, exposure };
}
