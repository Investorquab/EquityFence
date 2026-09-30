# Handelo Build Status

Status: ACTIVE
Last updated: 2026-09-30

This file is the execution checklist for the locked Handelo product specification.

## Operating rules

- Read HANDELO-PRODUCT-SPEC.md before changing product direction.
- Build in batches.
- Make meaningful commits during a batch.
- Push batches instead of waiting for CI after every small commit.
- If CI fails, stop the forward batch and fix the actual failure.
- Local pull/test happens at explicit checkpoints.
- Do not re-strategize unless the product specification change-control rule is triggered.

## Phase 0 — Source of truth

- [x] Lock product specification
- [x] Create persistent build status
- [ ] Align existing BUILD.md with locked product plan

## Phase 1 — Shared foundations

- [ ] Shared workspace state model
- [ ] Shared market insight model
- [ ] Shared strategy model
- [ ] Shared portfolio model
- [ ] Shared risk decision model
- [ ] Shared transaction preview model
- [ ] Structured Chat response model

## Phase 2 — Seven capabilities

### 1. Market Intelligence / Gap Radar
- [ ] On-chain price context
- [ ] Reference price context
- [ ] Divergence calculation/presentation
- [ ] Market status
- [ ] Market-hours context
- [ ] Liquidity/context
- [ ] Representation comparison

### 2. AI Analyst / Chat
- [ ] Persistent workspace Chat
- [ ] Capability prompt chips
- [ ] Structured insight cards
- [ ] Structured strategy cards
- [ ] Structured risk cards
- [ ] Structured transaction cards
- [ ] Auto-scroll to newest response

### 3. Strategy Engine
- [ ] Natural-language strategy creation
- [ ] DCA
- [ ] Recurring strategy
- [ ] Conditional strategy
- [ ] Deterministic strategy object
- [ ] Strategy preview
- [ ] Strategy activation/review
- [ ] Strategy explanation/edit flow

### 4. Portfolio Engine
- [ ] Holdings context
- [ ] Allocation context
- [ ] Target allocation
- [ ] Exposure calculations
- [ ] Rebalancing preview
- [ ] Workspace portfolio card

### 5. Risk Governor
- [ ] Max single-asset exposure
- [ ] Max transaction size
- [ ] Minimum reserve
- [ ] Strategy constraints
- [ ] Market-condition constraints
- [ ] Deterministic decision result
- [ ] Human-readable block reason

### 6. Agentic Execution
- [ ] Review boundary
- [ ] Readable transaction preview
- [ ] Explicit confirmation
- [ ] Wallet execution path
- [ ] Execution verification
- [ ] Honest FINISHED/FAILED/PENDING state
- [ ] Preserve existing audit/security blocking behavior

### 7. Strategy Intelligence
- [ ] Market-hours intelligence
- [ ] Thematic baskets
- [ ] Transparent basket composition
- [ ] Basket preview
- [ ] Strategy signals/context

## Phase 3 — Workspace

- [ ] Single workspace page
- [ ] Persistent left context column
- [ ] Market Radar card
- [ ] Charts
- [ ] Wallet balance
- [ ] Portfolio
- [ ] Active strategies
- [ ] Risk state
- [ ] Activity/history
- [ ] Persistent right Chat
- [ ] Responsive behavior
- [ ] Loading/empty/error states

## Phase 4 — Homepage

- [ ] Hero
- [ ] Problem explanation
- [ ] Product explanation
- [ ] Seven capability sections
- [ ] Real Handelo UI demo snippets
- [ ] How it works
- [ ] Launch Handelo CTA
- [ ] Workspace entry flow

## Phase 5 — Integration and polish

- [ ] End-to-end capability flows
- [ ] Motion/transitions where useful
- [ ] Accessibility
- [ ] Security regression
- [ ] Performance
- [ ] Responsive QA
- [ ] README/product positioning update

## Phase 6 — Validation

- [ ] Full clean install
- [ ] Full build
- [ ] Full test suite
- [ ] API smoke tests
- [ ] Workspace smoke test
- [ ] Chat smoke test
- [ ] Strategy flow test
- [ ] Risk blocking test
- [ ] Transaction review test
- [ ] Wallet/execution path test
- [ ] No fabricated execution evidence

## Phase 7 — Submission

- [ ] Public repo ready
- [ ] Deployed link/instructions
- [ ] <=4 minute demo
- [ ] Developer Experience Report
- [ ] Architecture explanation
- [ ] Final regression
- [ ] Submission package

## Checkpoints

### Checkpoint 0
After shared foundations + first capability batch: user pulls and performs local install/build/test.

### Checkpoint 1
After seven capability integrations + workspace: user pulls and performs full local product test.

### Checkpoint 2
After homepage + polish: user pulls and performs final demo/regression test.

## Current batch

**Batch 0 — Product source of truth**

Completed:
- Product specification created.
- Build status created.

Next:
- Align BUILD.md.
- Then begin shared domain/workspace foundations.
