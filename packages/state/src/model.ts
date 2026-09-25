import type { EconomicState } from "@equityfence/core";

export interface StateSnapshot {
  assetId: string;
  provider: string;
  multiplier: string;
  tokenToShareRatio: string;
  marketStatus: string;
  openState: boolean;
  reasonCode: string;
  observedAt: number;
}

export interface StateTransition {
  changed: boolean;
  reasons: string[];
  previous: StateSnapshot;
  current: StateSnapshot;
}

export function toEconomicState(snapshot: StateSnapshot): EconomicState {
  return {
    assetId: snapshot.assetId,
    provider: snapshot.provider,
    multiplier: snapshot.multiplier,
    effectiveAt: snapshot.observedAt,
    stateVersion: [
      snapshot.provider,
      snapshot.assetId,
      snapshot.multiplier,
      snapshot.tokenToShareRatio,
      snapshot.marketStatus,
      snapshot.openState ? "open" : "closed",
      snapshot.reasonCode,
    ].join(":"),
  };
}

export function detectStateTransition(
  previous: StateSnapshot,
  current: StateSnapshot,
): StateTransition {
  const reasons: string[] = [];

  if (previous.multiplier !== current.multiplier) {
    reasons.push(
      `Multiplier changed from ${previous.multiplier} to ${current.multiplier}`,
    );
  }

  if (previous.tokenToShareRatio !== current.tokenToShareRatio) {
    reasons.push(
      `Token/share ratio changed from ${previous.tokenToShareRatio} to ${current.tokenToShareRatio}`,
    );
  }

  if (previous.marketStatus !== current.marketStatus) {
    reasons.push(
      `Market status changed from ${previous.marketStatus} to ${current.marketStatus}`,
    );
  }

  if (previous.openState !== current.openState) {
    reasons.push(
      `Open state changed from ${String(previous.openState)} to ${String(current.openState)}`,
    );
  }

  if (previous.reasonCode !== current.reasonCode) {
    reasons.push(
      `Provider reason changed from ${previous.reasonCode} to ${current.reasonCode}`,
    );
  }

  return {
    changed: reasons.length > 0,
    reasons,
    previous,
    current,
  };
}
