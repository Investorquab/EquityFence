# Handelo Product Specification

Status: LOCKED
Version: 1.0
Date: 2026-09-30

## 1. Product definition

Handelo is an AI operating layer for tokenized-stock markets on BNB Smart Chain.

Handelo is not only a chatbot and it is not a collection of disconnected dashboard pages. Chat is a core control surface over a broader market, strategy, portfolio, risk, and execution system.

The product turns market complexity into an understandable workflow:

Discover -> Understand -> Strategize -> Check Risk -> Review -> Approve -> Execute -> Monitor

AI interprets user intent, explains market context, and helps construct strategies. Deterministic application code remains the authority for risk, transaction construction, signing boundaries, and execution verification.

## 2. Product architecture

Handelo has exactly two primary product pages.

### Page 1 — Handelo Home

Purpose: introduce the product before the user enters the application.

The homepage must explain:
- the tokenized-stock problem Handelo addresses;
- what Handelo can do;
- the seven product capabilities;
- how the workflow works;
- why natural language is useful for this market;
- how to open the workspace.

The homepage must use real Handelo visual language and real product UI components for capability demonstrations. Demo snippets must not be unrelated fake interfaces.

Primary CTA:
- Open Handelo / Launch Handelo

### Page 2 — Handelo Workspace

The workspace is one page.

There are no separate Overview, Markets, Portfolio, Strategies, Activity, or Chat pages.

The workspace uses a persistent two-column model:

Left: financial and market context.
Right: persistent AI Chat.

The left context remains visible while the user interacts with Chat.

## 3. Workspace — persistent left context

The left side contains the user's current financial reality and relevant market state.

It may contain:
- Market Radar
- selected market / stock context
- reference price
- on-chain price
- divergence
- market status and market-hours context
- charts
- wallet balance
- portfolio allocation and positions
- active strategies
- risk state
- recent activity/history

These are context cards, not navigation tabs.

Cards should update in place rather than forcing the user into separate pages.

## 4. Workspace — persistent Chat

Chat remains a major/core feature.

Chat is the natural-language control surface for the Handelo system.

Users can ask things such as:
- What is happening with NVIDIA?
- Find the largest tokenized-stock price gaps.
- Why is this token trading above its reference?
- Create a $10 weekly DCA for NVIDIA.
- Rebalance my portfolio to target allocations.
- Why was my strategy blocked?
- Review this transaction.

Chat must:
- auto-scroll to the newest response;
- preserve the conversation;
- expose useful capability prompt chips for new users;
- render structured product cards where appropriate;
- never fabricate market data, execution, transaction success, or unsupported assets.

## 5. Seven product capabilities

### 5.1 Market Intelligence / Gap Radar

Handelo detects and explains relevant tokenized-stock market conditions.

Core concepts:
- on-chain price;
- underlying/reference price;
- price divergence;
- market status;
- market-hours awareness;
- liquidity/context;
- multiple tokenized representations of the same underlying.

The system should make the difference between an asset's reference value and its current on-chain representation understandable.

### 5.2 AI Analyst

The existing Chat experience remains the AI Analyst.

It explains:
- what is happening;
- why a market condition matters;
- representation differences;
- market-hours context;
- relevant portfolio implications;
- why a deterministic rule allowed or blocked an action.

AI is an interpretation/explanation layer, not a safety authority.

### 5.3 Strategy Engine

Users can express strategies in natural language.

Initial strategy forms:
- DCA;
- recurring strategies;
- conditional strategies;
- target/exposure rules.

A strategy must become a structured, deterministic object before activation.

Example:

STRATEGY PREVIEW
- Type: Weekly DCA
- Asset: selected tokenized-stock representation
- Amount: $10
- Frequency: Every Monday
- Maximum exposure: 35%
- Minimum USDC reserve: 10%
- Next execution: resolved from strategy schedule

The user must be able to understand and review the strategy before activation.

### 5.4 Portfolio Engine

The portfolio system provides:
- holdings;
- allocation;
- target allocation;
- exposure;
- rebalancing;
- portfolio context for strategy decisions.

Portfolio state belongs in the persistent workspace context.

### 5.5 Risk Governor

Risk decisions are deterministic.

Initial policy dimensions:
- maximum single-asset exposure;
- maximum transaction/trade size;
- minimum reserve;
- strategy constraints;
- market-condition restrictions.

The Risk Governor returns an explicit decision and reason.

A blocked action must be explainable in user language without allowing the LLM to override the deterministic decision.

### 5.6 Agentic Execution

Execution follows a human-approval boundary.

Flow:
Review -> deterministic policy -> transaction preview -> explicit confirmation -> wallet execution -> verification

Transaction previews must explain what the user is approving.

Example fields:
- action;
- asset;
- amount;
- estimated quantity;
- relevant prices;
- execution context;
- network;
- wallet;
- risk/policy result;
- security/audit result where available.

Unsupported or unavailable security/audit paths remain blocking conditions. Handelo must never bypass them merely to produce a successful demo.

Execution status must be honest: FINISHED, FAILED, or PENDING where applicable.

### 5.7 Strategy Intelligence

This capability combines market intelligence into useful strategy context.

Initial scope:
- market-hours intelligence;
- thematic baskets;
- transparent basket composition;
- basket explanation;
- strategy signals/context.

Thematic examples may include AI, semiconductors, energy, or other supported groups when live data supports them.

## 6. Structured Chat cards

Chat may render structured UI cards for:
- Market Insight
- Strategy Preview
- Risk Result
- Transaction Preview
- Portfolio/Rebalance Preview
- Basket Preview

Cards must be readable and actionable.

The UI should not reduce a complex action to a vague “Sign transaction” message.

## 7. First-stock onboarding

Onboarding is part of the product flow, not a separate eighth subsystem.

A new user should be able to understand the path from first stock discovery to a reviewed transaction without seed-phrase friction in the product experience.

The workspace should guide users toward supported tokenized-stock representations and wallet connection when required.

## 8. Visual and interaction rules

Preserve the existing Handelo visual identity:
- typography;
- colors;
- card language;
- spacing;
- premium feel;
- restrained motion.

Add transitions where they improve comprehension and continuity, not as decoration.

The product should feel like one coherent application rather than seven tools assembled together.

## 9. Data and truth rules

Live market data is authoritative for market observations.

Deterministic application code is authoritative for:
- policy;
- transaction constraints;
- confirmation state;
- execution state;
- verification.

The LLM must not invent:
- tickers;
- prices;
- execution results;
- transaction hashes;
- unsupported token representations.

Ambiguous stock requests must not silently select a representation.

## 10. Security rules

- Private keys never enter the LLM.
- Explicit user approval is required before execution.
- Execution policy is rechecked at the execution boundary.
- Unsupported/high-risk audit results block execution according to the existing security path.
- External links remain HTTPS-only.
- User-controlled UI values remain safely escaped.
- No fake execution evidence.
- No bypass of wallet or audit controls for demos.

## 11. Engineering direction

Build the product as integrated vertical slices.

Do not build seven disconnected backend subsystems and postpone the UI until the end.

For each capability:
1. define domain/data contract;
2. implement deterministic/service behavior;
3. expose required API/agent behavior;
4. add workspace representation;
5. add Chat integration where relevant;
6. test the slice;
7. commit it;
8. continue the batch.

## 12. Build order

1. Product/spec source of truth.
2. Shared domain contracts and workspace state.
3. Market Intelligence / Gap Radar.
4. AI Analyst / structured Chat foundation.
5. Strategy Engine.
6. Portfolio Engine.
7. Risk Governor.
8. Agentic Execution integration.
9. Strategy Intelligence / baskets.
10. Workspace integration and polish.
11. Homepage and real UI demo snippets.
12. Full regression, security review, demo and submission preparation.

## 13. Explicit non-goals

Handelo must not become:
- a chatbot-only product;
- a multi-page admin dashboard;
- seven disconnected mini-apps;
- an autonomous trading system that hides approval;
- a UI that claims unsupported execution is working;
- a fake demo assembled from unrelated mock screens.

## 14. Change-control rule

This specification is the source of truth.

The direction is not to be re-strategized during implementation unless:
- a technical constraint makes a requirement impossible;
- a security issue requires a change;
- a hackathon requirement changes;
- testing proves the architecture is materially wrong;
- the product owner explicitly changes direction.

Any accepted change must be recorded in this specification and the build status before implementation continues.
