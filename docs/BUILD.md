# Handelo Build Plan

## Product thesis

**The agent that understands the market for the user, rather than simply trading for the user.**

Handelo is being built around the 24/7 nature of tokenized equities on BNB Smart Chain. The agent translates ordinary language into market context, portfolio context, deterministic checks, and—when explicitly approved—secured execution.

## Build order

1. Live tokenized-stock market intelligence.
2. Natural-language intent and market discovery.
3. Portfolio understanding.
4. Deterministic transaction policy.
5. Transaction simulation.
6. Secured agent-wallet execution.
7. Verification and evidence.
8. Read-only MCP + SDK.
9. Telegram interface.
10. Premium web application and storytelling landing page.
11. Demo, testing, and Developer Experience Report.

## Engineering rule

AI may interpret intent and explain observations. It must not be the source of truth for transaction safety, signing, or verification.

The execution boundary must re-check deterministic policy before any broadcast.

## Demo principle

The final demo should show a normal person saying something like:

> "I have $20. Help me invest."

Handelo should expose the relevant market state in understandable language, surface the conditions that matter, present the transaction for review, and only then execute through the secured wallet path.

No fake transaction should be presented as live execution.
