import assert from "node:assert/strict";
import test from "node:test";
import { HandeloMarketClient, normalizeTransactionLimit, normalizeTransactions, type RwaAsset, type WalletTransaction } from "./index.js";

const asset = (overrides: Partial<RwaAsset> = {}): RwaAsset => ({
  binanceChainId: "56",
  tokenContractAddress: "0x0000000000000000000000000000000000000001",
  platformId: "ondo",
  tokenSymbol: "NVDAon",
  decimals: "18",
  underlyingTicker: "NVDA",
  underlyingName: "NVIDIA Corporation",
  tokenToShareRatio: "1",
  tokenPrice: "120",
  referencePrice: "125",
  volume24H: "1000",
  marketCap: "1000000",
  statusInfo: {
    openState: true,
    marketStatus: "OPEN",
    reasonCode: "",
    reasonMsg: null,
    nextOpenTime: null,
    nextCloseTime: null,
  },
  ...overrides,
});

function client(searchResults: unknown[], tokenResults: RwaAsset[]) {
  const market = new HandeloMarketClient("test-key", "test-secret");
  market.search = async () => searchResults as never;
  market.tokens = async () => tokenResults;
  return market;
}

test("findAll only returns exact underlying ticker matches", async () => {
  const nvda = asset();
  const related = asset({
    tokenContractAddress: "0x0000000000000000000000000000000000000002",
    tokenSymbol: "NVDX",
    underlyingTicker: "NVDX",
  });

  const market = client(
    [{
      ticker: "NVDA",
      companyName: "NVIDIA Corporation",
      assets: [
        {
          platformId: "ondo",
          binanceChainId: "56",
          tokenContractAddress: nvda.tokenContractAddress,
          tokenSymbol: nvda.tokenSymbol,
          assetType: 1,
        },
        {
          platformId: "other",
          binanceChainId: "56",
          tokenContractAddress: related.tokenContractAddress,
          tokenSymbol: related.tokenSymbol,
          assetType: 1,
        },
      ],
    }],
    [nvda, related],
  );

  const matches = await market.findAll(" nvda ");
  assert.deepEqual(matches.map((item: RwaAsset) => item.tokenContractAddress), [nvda.tokenContractAddress]);
});

test("findAll deduplicates the same contract returned by search", async () => {
  const nvda = asset();

  const market = client(
    [{
      ticker: "NVDA",
      companyName: "NVIDIA Corporation",
      assets: [
        {
          platformId: "ondo",
          binanceChainId: "56",
          tokenContractAddress: nvda.tokenContractAddress.toUpperCase(),
          tokenSymbol: nvda.tokenSymbol,
          assetType: 1,
        },
        {
          platformId: "ondo",
          binanceChainId: "56",
          tokenContractAddress: nvda.tokenContractAddress,
          tokenSymbol: nvda.tokenSymbol,
          assetType: 1,
        },
      ],
    }],
    [nvda],
  );

  const matches = await market.findAll("NVDA");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].tokenContractAddress, nvda.tokenContractAddress);
});

test("findAll rejects search results that have no matching live market record", async () => {
  const market = client(
    [{
      ticker: "NVDA",
      companyName: "NVIDIA Corporation",
      assets: [{
        platformId: "ondo",
        binanceChainId: "56",
        tokenContractAddress: "0x0000000000000000000000000000000000000001",
        tokenSymbol: "NVDAon",
        assetType: 1,
      }],
    }],
    [asset({
      tokenContractAddress: "0x0000000000000000000000000000000000000002",
      underlyingTicker: "NVDA",
    })],
  );

  await assert.rejects(
    () => market.findAll("NVDA"),
    /No live BSC tokenized-stock market record found for NVDA/,
  );
});

test("find refuses to silently choose between multiple live representations", async () => {
  const first = asset();
  const second = asset({
    tokenContractAddress: "0x0000000000000000000000000000000000000002",
    platformId: "xstocks",
    tokenSymbol: "NVDAx",
  });

  const market = client(
    [{
      ticker: "NVDA",
      companyName: "NVIDIA Corporation",
      assets: [
        {
          platformId: first.platformId,
          binanceChainId: "56",
          tokenContractAddress: first.tokenContractAddress,
          tokenSymbol: first.tokenSymbol,
          assetType: 1,
        },
        {
          platformId: second.platformId,
          binanceChainId: "56",
          tokenContractAddress: second.tokenContractAddress,
          tokenSymbol: second.tokenSymbol,
          assetType: 1,
        },
      ],
    }],
    [first, second],
  );

  await assert.rejects(
    () => market.find("NVDA"),
    /Multiple BSC tokenized-stock representations found for NVDA/,
  );
});


test("transaction limits normalize invalid and out-of-range values", () => {
  assert.equal(normalizeTransactionLimit(Number.NaN), 20);
  assert.equal(normalizeTransactionLimit(Number.POSITIVE_INFINITY), 20);
  assert.equal(normalizeTransactionLimit(0), 1);
  assert.equal(normalizeTransactionLimit(25.9), 25);
  assert.equal(normalizeTransactionLimit(500), 100);
});

test("transaction normalization keeps BSC records and removes duplicate or empty hashes", () => {
  const tx = (overrides: Partial<WalletTransaction> = {}): WalletTransaction => ({
    binanceChainId: "56",
    txHash: "0xabc",
    txTime: "1",
    amount: "20",
    symbol: "NVDAon",
    txStatus: "FINISHED",
    tokenContractAddress: "0x0000000000000000000000000000000000000001",
    from: [],
    to: [],
    ...overrides,
  });

  const result = normalizeTransactions([
    tx(),
    tx({ txHash: "0xABC" }),
    tx({ txHash: "0xdef" }),
    tx({ binanceChainId: "1", txHash: "0xeth" }),
    tx({ txHash: "   " }),
  ]);

  assert.deepEqual(result.map(item => item.txHash), ["0xabc", "0xdef"]);
});
