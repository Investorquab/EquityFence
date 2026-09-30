import assert from "node:assert/strict";
import test from "node:test";
import {activateStrategy,createDraftStrategy,validateStrategyInput} from "./index.js";

test("requires frequency for DCA",()=>{
  assert.deepEqual(
    validateStrategyInput({type:"DCA",asset:"NVDAB",amountUsd:10}),
    ["A recurring strategy requires a frequency."]
  );
});

test("requires target allocation to total 100 percent",()=>{
  const errors=validateStrategyInput({
    type:"REBALANCE",
    asset:"portfolio",
    targetAllocation:{NVDAB:60,AAPL:30}
  });
  assert.deepEqual(errors,["Target allocations must total 100%."]);
});

test("creates and activates a valid DCA strategy",()=>{
  const draft=createDraftStrategy({
    type:"DCA",
    asset:"NVDAB",
    amountUsd:10,
    frequency:"Every Monday",
    constraints:{maxTransactionUsd:20}
  });
  assert.equal(draft.status,"DRAFT");
  assert.equal(draft.asset,"NVDAB");

  const active=activateStrategy(draft);
  assert.equal(active.status,"ACTIVE");
});
