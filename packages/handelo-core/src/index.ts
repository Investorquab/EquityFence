export type HandeloPage = "home" | "workspace";

export type MarketStatus = "OPEN" | "CLOSED" | "UNKNOWN";
export type RiskDecision = "PASS" | "BLOCK";
export type ExecutionState = "PENDING" | "FINISHED" | "FAILED";
export type StrategyType = "DCA" | "RECURRING" | "CONDITIONAL" | "REBALANCE";

export interface MarketInsight {
  underlyingTicker: string;
  tokenSymbol: string;
  provider: string;
  onChainPrice: number | null;
  referencePrice: number | null;
  divergencePercent: number | null;
  marketStatus: MarketStatus;
  nextOpenAt?: string | null;
  liquidityContext?: string | null;
}

export interface StrategyConstraints {
  maxSingleAssetExposurePercent?: number;
  maxTransactionUsd?: number;
  minimumReservePercent?: number;
}

export interface StrategyDefinition {
  id: string;
  type: StrategyType;
  asset: string;
  amountUsd?: number;
  frequency?: string;
  condition?: string;
  targetAllocation?: Record<string, number>;
  constraints: StrategyConstraints;
  nextExecutionAt?: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "BLOCKED";
}

export interface PortfolioPosition {
  asset: string;
  tokenSymbol: string;
  allocationPercent: number | null;
  valueUsd: number | null;
}

export interface PortfolioSnapshot {
  wallet: string;
  balanceUsd: number | null;
  positions: PortfolioPosition[];
  totalValueUsd: number | null;
}

export interface RiskResult {
  decision: RiskDecision;
  reasons: string[];
  checkedAt: string;
  constraints: StrategyConstraints;
}

export interface TransactionPreview {
  action: "BUY" | "SELL" | "REBALANCE";
  asset: string;
  amountUsd: number;
  estimatedQuantity?: number | null;
  referencePrice?: number | null;
  onChainPrice?: number | null;
  network: "BSC";
  wallet: string;
  risk: RiskResult;
  executionState?: ExecutionState;
}

export type ChatCard =
  | {type:"MARKET_INSIGHT"; data:MarketInsight}
  | {type:"STRATEGY_PREVIEW"; data:StrategyDefinition}
  | {type:"RISK_RESULT"; data:RiskResult}
  | {type:"TRANSACTION_PREVIEW"; data:TransactionPreview}
  | {type:"PORTFOLIO_PREVIEW"; data:PortfolioSnapshot};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards?: ChatCard[];
  createdAt: string;
}

export interface WorkspaceState {
  selectedMarket: MarketInsight | null;
  wallet: {address:string|null; balanceUsd:number|null};
  portfolio: PortfolioSnapshot | null;
  activeStrategies: StrategyDefinition[];
  risk: RiskResult | null;
  activity: Array<{id:string; label:string; state:ExecutionState; createdAt:string}>;
  messages: ChatMessage[];
}

export function calculateDivergencePercent(
  onChainPrice: number | null,
  referencePrice: number | null
): number | null {
  if (
    onChainPrice === null ||
    referencePrice === null ||
    !Number.isFinite(onChainPrice) ||
    !Number.isFinite(referencePrice) ||
    referencePrice === 0
  ) return null;

  return ((onChainPrice - referencePrice) / referencePrice) * 100;
}

export function createRiskResult(
  constraints: StrategyConstraints,
  context: {
    proposedAmountUsd?: number;
    projectedAssetExposurePercent?: number;
    projectedReservePercent?: number;
    now?: string;
  }
): RiskResult {
  const reasons:string[] = [];

  if (
    constraints.maxTransactionUsd !== undefined &&
    context.proposedAmountUsd !== undefined &&
    context.proposedAmountUsd > constraints.maxTransactionUsd
  ) {
    reasons.push("Transaction amount exceeds the $" + constraints.maxTransactionUsd + " limit.");
  }

  if (
    constraints.maxSingleAssetExposurePercent !== undefined &&
    context.projectedAssetExposurePercent !== undefined &&
    context.projectedAssetExposurePercent > constraints.maxSingleAssetExposurePercent
  ) {
    reasons.push(
      "Projected asset exposure exceeds the " +
      constraints.maxSingleAssetExposurePercent +
      "% limit."
    );
  }

  if (
    constraints.minimumReservePercent !== undefined &&
    context.projectedReservePercent !== undefined &&
    context.projectedReservePercent < constraints.minimumReservePercent
  ) {
    reasons.push(
      "Projected reserve is below the " +
      constraints.minimumReservePercent +
      "% minimum."
    );
  }

  return {
    decision: reasons.length === 0 ? "PASS" : "BLOCK",
    reasons,
    checkedAt: context.now ?? new Date().toISOString(),
    constraints
  };
}

export function createStrategyId(prefix = "strategy"): string {
  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "strategy";
  return safePrefix + "-" + Date.now().toString(36);
}


export function evaluatePortfolioStrategyRisk(
  portfolio: PortfolioSnapshot,
  asset: string,
  amountUsd: number,
  constraints: StrategyConstraints = {
    maxSingleAssetExposurePercent: 35,
    maxTransactionUsd: 100,
    minimumReservePercent: 10
  }
): RiskResult {
  const total = Number(portfolio.totalValueUsd);
  const current = portfolio.positions.find(
    (position) =>
      position.asset.toLowerCase() === asset.toLowerCase() ||
      position.tokenSymbol.toLowerCase() === asset.toLowerCase()
  );
  const currentValue = Number(current?.valueUsd ?? 0);
  const projectedTotal = Number.isFinite(total) && total >= 0 ? total + amountUsd : amountUsd;
  const projectedExposurePercent = projectedTotal > 0
    ? ((currentValue + amountUsd) / projectedTotal) * 100
    : 100;
  return createRiskResult(constraints, {
    proposedAmountUsd: amountUsd,
    projectedAssetExposurePercent: projectedExposurePercent,
    now: new Date().toISOString()
  });
}
