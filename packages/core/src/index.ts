export type SafetyDecision = "ALLOW" | "WARN" | "BLOCK";

export interface EconomicState {
  assetId: string;
  provider: string;
  multiplier: string;
  effectiveAt: number | null;
  stateVersion: string;
}

export interface Exposure {
  assetId: string;
  wallet: string;
  quantity: string;
}

export interface TransactionIntent {
  action: string;
  assetId: string;
  wallet: string;
}

export interface RiskAssessment {
  decision: SafetyDecision;
  reasons: string[];
}

export function assessStateTransition(
  previous: EconomicState,
  current: EconomicState,
  exposure: Exposure,
  intent: TransactionIntent,
): RiskAssessment {
  const stateChanged =
    previous.stateVersion !== current.stateVersion ||
    previous.multiplier !== current.multiplier;

  const positionAffected =
    exposure.assetId === current.assetId &&
    exposure.quantity !== "0";

  const intentAffected =
    intent.assetId === current.assetId &&
    intent.wallet.toLowerCase() === exposure.wallet.toLowerCase();

  if (stateChanged && positionAffected && intentAffected) {
    return {
      decision: "BLOCK",
      reasons: [
        "The tokenized equity economic state changed.",
        "The wallet has non-zero exposure to the affected asset.",
        "The proposed action targets that exposed asset.",
      ],
    };
  }

  return {
    decision: "ALLOW",
    reasons: ["No affected state transition was detected for this intent."],
  };
}
