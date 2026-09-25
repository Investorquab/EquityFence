import type {
  RiskAssessment,
  SafetyDecision,
  TransactionIntent,
} from "@equityfence/core";
import type { ExposurePosition } from "@equityfence/exposure";
import type { StateTransition } from "@equityfence/state";

export type ExposureStatus = "KNOWN_EXPOSED" | "KNOWN_ZERO" | "UNKNOWN";

export interface RiskInput {
  transition: StateTransition;
  exposure: ExposurePosition | null;
  exposureStatus?: ExposureStatus;
  intent: TransactionIntent;
}

function decisionFor(
  decision: SafetyDecision,
  reasons: string[],
): RiskAssessment {
  return { decision, reasons };
}

export function assessRisk(input: RiskInput): RiskAssessment {
  const { transition, exposure, intent } = input;
  const exposureStatus: ExposureStatus =
    input.exposureStatus ??
    (exposure === null
      ? "UNKNOWN"
      : exposure.isExposed
        ? "KNOWN_EXPOSED"
        : "KNOWN_ZERO");

  if (exposureStatus === "UNKNOWN") {
    return decisionFor("BLOCK", [
      "Exposure could not be verified.",
      "The safety layer fails closed when wallet exposure is unknown.",
    ]);
  }

  if (!transition.changed) {
    return decisionFor("ALLOW", [
      "No economic state transition was detected.",
    ]);
  }

  const assetAffected =
    transition.current.assetId.toLowerCase() === intent.assetId.toLowerCase();

  if (!assetAffected) {
    return decisionFor("ALLOW", [
      "An economic state transition was detected for a different asset.",
    ]);
  }

  if (exposureStatus === "KNOWN_ZERO") {
    return decisionFor("ALLOW", [
      "The affected asset changed state, but the wallet has no verified exposure.",
    ]);
  }

  if (exposureStatus === "KNOWN_EXPOSED") {
    if (
      exposure.assetId.toLowerCase() !== intent.assetId.toLowerCase() ||
      exposure.wallet.toLowerCase() !== intent.wallet.toLowerCase()
    ) {
      return decisionFor("ALLOW", [
        "The wallet's verified exposure does not match the proposed transaction target.",
      ]);
    }

    return decisionFor("BLOCK", [
      ...transition.reasons,
      "The wallet has verified exposure to the affected asset.",
      "The proposed action targets the affected asset.",
      "The safety layer blocks execution until the new economic state is handled.",
    ]);
  }

  return decisionFor("BLOCK", [
    "The affected asset has a state transition that cannot be proven safe.",
  ]);
}
