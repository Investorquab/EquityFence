import {
  createStrategyId,
  type StrategyConstraints,
  type StrategyDefinition,
  type StrategyType
} from "@handelo/core";

export interface StrategyInput {
  type: StrategyType;
  asset: string;
  amountUsd?: number;
  frequency?: string;
  condition?: string;
  targetAllocation?: Record<string, number>;
  constraints?: StrategyConstraints;
  nextExecutionAt?: string | null;
}

export function validateStrategyInput(input: StrategyInput): string[] {
  const errors:string[] = [];

  if (!input.asset.trim()) errors.push("Strategy asset is required.");

  if (input.amountUsd !== undefined && (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0)) {
    errors.push("Strategy amount must be greater than zero.");
  }

  if ((input.type === "DCA" || input.type === "RECURRING") && !input.frequency?.trim()) {
    errors.push("A recurring strategy requires a frequency.");
  }

  if (input.type === "CONDITIONAL" && !input.condition?.trim()) {
    errors.push("A conditional strategy requires a condition.");
  }

  if (input.type === "REBALANCE" && !input.targetAllocation) {
    errors.push("A rebalance strategy requires target allocation.");
  }

  if (input.targetAllocation) {
    const values = Object.values(input.targetAllocation);
    if (values.some(value => !Number.isFinite(value) || value < 0)) {
      errors.push("Target allocations must be non-negative finite percentages.");
    } else {
      const total = values.reduce((sum,value)=>sum+value,0);
      if (Math.abs(total-100) > 0.01) errors.push("Target allocations must total 100%.");
    }
  }

  return errors;
}

export function createDraftStrategy(input: StrategyInput): StrategyDefinition {
  const errors = validateStrategyInput(input);
  if (errors.length) throw new Error(errors.join(" "));

  return {
    id: createStrategyId(input.type.toLowerCase()),
    type: input.type,
    asset: input.asset.trim(),
    amountUsd: input.amountUsd,
    frequency: input.frequency?.trim(),
    condition: input.condition?.trim(),
    targetAllocation: input.targetAllocation,
    constraints: input.constraints ?? {},
    nextExecutionAt: input.nextExecutionAt ?? null,
    status: "DRAFT"
  };
}

export function activateStrategy(strategy: StrategyDefinition): StrategyDefinition {
  if (strategy.status !== "DRAFT") {
    throw new Error("Only draft strategies can be activated.");
  }

  return {...strategy,status:"ACTIVE"};
}
