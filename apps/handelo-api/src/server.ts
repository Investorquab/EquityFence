import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { HandeloAgent } from "@handelo/agent";
import { portfolioSnapshot } from "./portfolio.js";
import { BinanceAgenticWalletAdapter } from "@handelo/execution";
import { marketClientFromEnv } from "@handelo/market";
import { auditToken } from "@handelo/execution";

const port = Number(process.env.PORT ?? "8787");
const execFileAsync = promisify(execFile);
let walletAuth: { status: "IDLE" | "WAITING" | "SUCCESS" | "FAILED"; urlForWeb?: string; pairingCode?: string; error?: string } = { status: "IDLE" };
const agent = new HandeloAgent();
const market = marketClientFromEnv();
const wallet = new BinanceAgenticWalletAdapter();
const DEFAULT_BSC_QUOTE_TOKEN = "0x55d398326f99059fF775485246999027B3197955";
const REVIEW_TOKEN_TTL_MS = 5 * 60 * 1000;
const REVIEW_TOKEN_SECRET = process.env.HANDELO_REVIEW_TOKEN_SECRET ?? "handelo-local-review-secret";

function createReviewToken(input: { ticker: string; amountUsd: number; fromToken: string; contract: string }) {
  const payload = Buffer.from(JSON.stringify({ ...input, exp: Date.now() + REVIEW_TOKEN_TTL_MS })).toString("base64url");
  const signature = createHmac("sha256", REVIEW_TOKEN_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyReviewToken(token: string, input: { ticker: string; amountUsd: number; fromToken: string; contract: string }) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", REVIEW_TOKEN_SECRET).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as typeof input & { exp?: number };
    return parsed.exp !== undefined && parsed.exp > Date.now()
      && parsed.ticker === input.ticker
      && parsed.amountUsd === input.amountUsd
      && parsed.fromToken.toLowerCase() === input.fromToken.toLowerCase()
      && parsed.contract.toLowerCase() === input.contract.toLowerCase();
  } catch {
    return false;
  }
}

async function bawJson<T>(args: string[]): Promise<T> {
  const { stdout, stderr } = await execFileAsync("baw", [...args, "--json"], { maxBuffer: 1024 * 1024 });
  const raw = (stdout || stderr).trim();
  const payload = JSON.parse(raw) as { success: boolean; data: T; message?: string };
  if (!payload.success) throw new Error(payload.message ?? "Binance Agentic Wallet command failed.");
  return payload.data;
}

async function walletStatus() {
  return bawJson<{ status: "CONNECTED" | "UNCONNECTED" | "CREATING" }>(["wallet", "status"]);
}

async function verifyWalletAuth(qrCodeId: string) {
  try {
    await bawJson(["auth", "verify", "--qrCodeId", qrCodeId]);
    const status = await walletStatus();
    if (status.status !== "CONNECTED") {
      walletAuth = {
        status: "FAILED",
        error: `Wallet authentication completed, but wallet status is ${status.status}.`
      };
      return;
    }
    walletAuth = { status: "SUCCESS" };
  } catch (error) {
    walletAuth = { status: "FAILED", error: error instanceof Error ? error.message : String(error) };
  }
}

function json(res: import("node:http").ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type"
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST,GET,OPTIONS"
    });
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true, service: "handelo-agent" });
  }

  if (req.method === "GET" && req.url === "/api/wallet/status") {
    try {
      const status = await walletStatus();
      return json(res, 200, status);
    } catch (error) {
      return json(res, 200, { status: "UNAVAILABLE", error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && req.url === "/api/wallet/auth") {
    if (walletAuth.status === "WAITING") return json(res, 200, walletAuth);

    try {
      const signin = await bawJson<{ urlForWeb?: string; qrCodeId?: string; pairingCode?: string; status?: string }>(["auth", "signin"]);
      if (signin.status === "ALREADY_CONNECTED") {
        const status = await walletStatus();
        if (status.status !== "CONNECTED") {
          return json(res, 502, {
            error: `Binance Agentic Wallet reported an existing session, but wallet status is ${status.status}.`
          });
        }
        walletAuth = { status: "SUCCESS" };
        return json(res, 200, walletAuth);
      }
      if (!signin.qrCodeId || !signin.urlForWeb || !signin.pairingCode) {
        return json(res, 502, { error: "Binance Agentic Wallet returned an incomplete sign-in response." });
      }

      walletAuth = { status: "WAITING", urlForWeb: signin.urlForWeb, pairingCode: signin.pairingCode };

      void verifyWalletAuth(signin.qrCodeId).catch(() => undefined);
      return json(res, 200, walletAuth);
    } catch (error) {
      return json(res, 502, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && req.url === "/api/markets") {
    try {
      return json(res, 200, await market.discover(8));
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && req.url === "/api/wallet/address") {
    try {
      const status = await walletStatus();
      if (status.status !== "CONNECTED") return json(res, 200, { connected: false, address: null });
      const wallet = await bawJson<{ address?: string }>(["wallet", "address"]);
      const address = wallet.address?.trim() ?? "";
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return json(res, 502, {
          connected: false,
          address: null,
          error: "Binance Agentic Wallet returned an invalid EVM wallet address."
        });
      }
      return json(res, 200, { connected: true, address });
    } catch (error) {
      return json(res, 200, { connected: false, address: null, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && req.url?.startsWith("/api/history")) {
    const walletAddress =
      new URL(req.url, "http://localhost").searchParams.get("wallet") ??
      process.env.HANDELO_WALLET;

    if (!walletAddress) {
      return json(res, 400, { error: "wallet query parameter or HANDELO_WALLET is required" });
    }

    try {
      return json(res, 200, { wallet: walletAddress, transactions: await market.transactions(walletAddress, 20) });
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && req.url?.startsWith("/api/portfolio")) {
    const walletAddress =
      new URL(req.url, "http://localhost").searchParams.get("wallet") ??
      process.env.HANDELO_WALLET;

    if (!walletAddress) {
      return json(res, 400, { error: "wallet query parameter or HANDELO_WALLET is required" });
    }

    try {
      return json(res, 200, await portfolioSnapshot(walletAddress));
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && req.url === "/api/review") {
    try {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw) as {
        ticker?: unknown;
        amountUsd?: unknown;
        action?: unknown;
        fromToken?: unknown;
        slippage?: unknown;
      };

      const ticker = String(body.ticker ?? "").trim().toUpperCase();
      const amountUsd = Number(body.amountUsd);
      const action = body.action === "sell" ? "sell" : body.action === "invest" ? "invest" : "buy";
      const executableAction = (await import("@handelo/policy")).executionAction(action);

      if (!executableAction) {
        return json(res, 400, { error: "Handelo execution currently supports buy/invest only. Sell execution is not enabled." });
      }

      if (!ticker || !Number.isFinite(amountUsd) || amountUsd <= 0) {
        return json(res, 400, { error: "ticker and positive amountUsd are required" });
      }

      const asset = await market.find(ticker);
      const premiumPct = (() => {
        const token = Number(asset.tokenPrice);
        const reference = Number(asset.referencePrice);
        if (!Number.isFinite(token) || !Number.isFinite(reference) || reference === 0) return null;
        return ((token - reference) / reference) * 100;
      })();

      const policy = (await import("@handelo/policy")).evaluatePolicy({
        action,
        amountUsd,
        marketOpen: asset.statusInfo.openState,
        premiumPct
      });

      let securityAudit: Awaited<ReturnType<typeof auditToken>> | null = null;
      let securityAuditError: string | null = null;
      let executionBlocked = false;
      try {
        securityAudit = await auditToken("56", asset.tokenContractAddress);
        executionBlocked =
          !securityAudit.hasResult ||
          !securityAudit.isSupported ||
          (typeof securityAudit.riskLevel === "number" && securityAudit.riskLevel >= 4);
        if (!securityAudit.hasResult || !securityAudit.isSupported) {
          securityAuditError = "Token security audit data is unavailable for this token.";
        }
      } catch (error) {
        executionBlocked = true;
        securityAuditError = error instanceof Error ? error.message : String(error);
      }

      let quote: unknown = null;
      const fromToken = String(body.fromToken ?? process.env.HANDELO_QUOTE_TOKEN ?? DEFAULT_BSC_QUOTE_TOKEN).trim();
      let quoteError: string | null = null;

      if (fromToken && policy.decision !== "BLOCK") {
        try {
          if (fromToken.toLowerCase() !== DEFAULT_BSC_QUOTE_TOKEN.toLowerCase()) {
            throw new Error("Handelo's USD-notional execution path currently requires the BSC USDT quote token.");
          }
          quote = await wallet.quote({
            fromTokenQty: String(amountUsd),
            fromToken,
            toToken: asset.tokenContractAddress,
            binanceChainId: "56",
            slippage: typeof body.slippage === "string" ? body.slippage : undefined
          });
        } catch (error) {
          quoteError = error instanceof Error ? error.message : String(error);
        }
      }

      return json(res, 200, {
        asset: {
          ticker: asset.underlyingTicker,
          tokenSymbol: asset.tokenSymbol,
          contract: asset.tokenContractAddress,
          provider: asset.platformId,
          tokenPrice: asset.tokenPrice,
          referencePrice: asset.referencePrice,
          premiumPct,
          market: asset.statusInfo
        },
        policy,
        securityAudit,
        securityAuditError,
        executionBlocked,
        quote,
        quoteError,
        quoteToken: fromToken || null,
        reviewToken: quote ? createReviewToken({
          ticker: asset.underlyingTicker,
          amountUsd,
          fromToken,
          contract: asset.tokenContractAddress
        }) : null
      });
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && req.url === "/api/quote") {
    try {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw) as {
        ticker?: unknown;
        fromTokenQty?: unknown;
        fromToken?: unknown;
        slippage?: unknown;
      };

      const ticker = String(body.ticker ?? "").trim().toUpperCase();
      const amount = Number(body.fromTokenQty);
      const fromToken = String(body.fromToken ?? "").trim();

      if (!ticker || !Number.isFinite(amount) || amount <= 0 || !fromToken) {
        return json(res, 400, {
          error: "ticker, positive fromTokenQty, and fromToken are required"
        });
      }

      const asset = await market.find(ticker);
      const quote = await wallet.quote({
        fromTokenQty: String(amount),
        fromToken,
        toToken: asset.tokenContractAddress,
        binanceChainId: "56",
        slippage: typeof body.slippage === "string" ? body.slippage : undefined
      });

      return json(res, 200, {
        asset: {
          ticker: asset.underlyingTicker,
          tokenSymbol: asset.tokenSymbol,
          contract: asset.tokenContractAddress,
          provider: asset.platformId,
          tokenPrice: asset.tokenPrice,
          referencePrice: asset.referencePrice,
          market: asset.statusInfo
        },
        quote
      });
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && req.url === "/api/execute") {
    if (process.env.HANDELO_EXECUTION_ENABLED !== "true") {
      return json(res, 403, {
        error: "Execution is disabled. Set HANDELO_EXECUTION_ENABLED=true only in a controlled demo environment."
      });
    }

    try {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw) as {
        ticker?: unknown;
        amountUsd?: unknown;
        fromToken?: unknown;
        slippage?: unknown;
        confirmed?: unknown;
        reviewToken?: unknown;
      };

      const ticker = String(body.ticker ?? "").trim().toUpperCase();
      const fromToken = String(body.fromToken ?? "").trim();
      const amount = Number(body.amountUsd);
      const reviewToken = String(body.reviewToken ?? "").trim();

      if (!ticker || !Number.isFinite(amount) || amount <= 0 || !fromToken || !reviewToken) {
        return json(res, 400, {
          error: "ticker, positive amountUsd, fromToken, and reviewToken are required"
        });
      }
        return json(res, 400, {
          error: "ticker, positive amountUsd, and fromToken are required"
        });
      }

      if (fromToken.toLowerCase() !== DEFAULT_BSC_QUOTE_TOKEN.toLowerCase()) {
        return json(res, 400, { error: "Handelo's USD-notional execution path currently requires the BSC USDT quote token." });
      }

      const asset = await market.find(ticker);
      if (!verifyReviewToken(reviewToken, {
        ticker: asset.underlyingTicker,
        amountUsd: amount,
        fromToken,
        contract: asset.tokenContractAddress
      })) {
        return json(res, 409, { error: "This transaction no longer matches the reviewed trade or the review has expired. Start a new review." });
      }

      const tokenPrice = Number(asset.tokenPrice);
      const referencePrice = Number(asset.referencePrice);
      const premiumPct = Number.isFinite(tokenPrice) && Number.isFinite(referencePrice) && referencePrice !== 0
        ? ((tokenPrice - referencePrice) / referencePrice) * 100
        : null;
      const policy = (await import("@handelo/policy")).evaluatePolicy({
        action: "buy",
        amountUsd: amount,
        marketOpen: asset.statusInfo.openState,
        premiumPct
      });

      if (policy.decision === "BLOCK") {
        return json(res, 409, {
          error: "Execution blocked by Handelo safety policy.",
          policy
        });
      }

      if (policy.decision === "CONFIRM" && body.confirmed !== true) {
        return json(res, 409, {
          error: "Additional confirmation is required by Handelo safety policy.",
          policy
        });
      }

      const reviewedQuote = await wallet.quote({
        fromTokenQty: String(amount),
        fromToken,
        toToken: asset.tokenContractAddress,
        binanceChainId: "56",
        slippage: typeof body.slippage === "string" ? body.slippage : undefined
      });

      const result = await wallet.execute(
        {
          fromTokenQty: reviewedQuote.fromCoinAmount,
          fromToken,
          toToken: asset.tokenContractAddress,
          binanceChainId: "56",
          slippage: typeof body.slippage === "string" ? body.slippage : undefined
        },
        body.confirmed === true
      );

      return json(res, 200, {
        asset: {
          ticker: asset.underlyingTicker,
          tokenSymbol: asset.tokenSymbol,
          contract: asset.tokenContractAddress,
          provider: asset.platformId
        },
        policy,
        result
      });
    } catch (error) {
      return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method !== "POST" || req.url !== "/api/chat") {
    return json(res, 404, { error: "Not found" });
  }

  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw) as { message?: unknown };

    if (typeof body.message !== "string" || !body.message.trim()) {
      return json(res, 400, { error: "message is required" });
    }

    const result = await agent.run(body.message.trim());
    return json(res, 200, result);
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => console.log(`Handelo API listening on http://localhost:${port}`));
