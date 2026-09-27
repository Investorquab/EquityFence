import { assessRisk } from "@equityfence/risk";
import type { ExposurePosition } from "@equityfence/exposure";
import { detectStateTransition, type StateSnapshot } from "@equityfence/state";

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

const current: StateSnapshot = {
  assetId,
  provider: "ondo",
  multiplier: "1",
  tokenToShareRatio: "1",
  marketStatus: "paused",
  openState: false,
  reasonCode: "MARKET_PAUSED",
  observedAt: 1790482449079,
};

const transition = detectStateTransition(previous, current);

const exposure: ExposurePosition = {
  assetId,
  wallet,
  rawBalance: "1000000000000000000",
  decimals: 18,
  isExposed: true,
};

const assessment = assessRisk({
  transition,
  exposure,
  exposureStatus: "KNOWN_EXPOSED",
  intent: {
    action: "TRANSFER",
    assetId,
    wallet,
  },
});

console.log("EquityFence replay safety check");
console.log("------------------------------");
console.log("Mode:          REPLAY (controlled scenario)");
console.log("Asset:         MSTRon (MSTR)");
console.log("Exposure:      KNOWN_EXPOSED");
console.log("Raw balance:   " + exposure.rawBalance);
console.log("Transition:    " + (transition.changed ? "CHANGED" : "UNCHANGED"));

for (const reason of transition.reasons) {
  console.log("Transition:    " + reason);
}

console.log("Decision:      " + assessment.decision);

for (const reason of assessment.reasons) {
  console.log("Reason:        " + reason);
}

if (assessment.decision !== "BLOCK") {
  throw new Error("Replay safety check failed: expected BLOCK");
}
