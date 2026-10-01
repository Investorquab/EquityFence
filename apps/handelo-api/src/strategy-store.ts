import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { StrategyDefinition } from "@handelo/core";

export interface StoredStrategy extends StrategyDefinition {
  wallet: string;
  activatedAt: string;
}

const storePath = resolve(process.env.HANDELO_STRATEGY_STORE_PATH ?? "./data/strategies.json");
let loaded = false;
const strategies = new Map<string, StoredStrategy>();

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === "object" && typeof (item as StoredStrategy).id === "string" && typeof (item as StoredStrategy).wallet === "string") {
          strategies.set((item as StoredStrategy).id, item as StoredStrategy);
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function persist(): Promise<void> {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify([...strategies.values()], null, 2) + "\n", "utf8");
}

export async function listActiveStrategies(wallet: string): Promise<StoredStrategy[]> {
  await ensureLoaded();
  return [...strategies.values()].filter(
    strategy => strategy.wallet.toLowerCase() === wallet.toLowerCase() && strategy.status === "ACTIVE"
  );
}

export async function activateStoredStrategy(wallet: string, strategy: StrategyDefinition): Promise<StoredStrategy> {
  await ensureLoaded();
  const active = [...strategies.values()].find(
    existing => existing.wallet.toLowerCase() === wallet.toLowerCase() && existing.id === strategy.id
  );
  if (active) return active;

  const activated: StoredStrategy = {
    ...strategy,
    status: "ACTIVE",
    wallet,
    activatedAt: new Date().toISOString()
  };
  strategies.set(activated.id, activated);
  await persist();
  return activated;
}
