import type { DbToken } from "./db";

export type LaunchedToken = {
  id: string;
  chainId: 4663 | 46630;
  address: string;
  name: string;
  symbol: string;
  creator: string;
  supply: string;
  pooled: string;
  scritAmount: string;
  txHash: string;
  poolId: string;
  poolType: "v4_hook" | "v3_standard";
  logoUrl?: string;
  backingCategory: string;
  description: string;
  createdAt: number;
};

const LOCAL_STORAGE_KEY = "scrit_user_launched_tokens";

export function mapDbTokenToLaunched(t: DbToken): LaunchedToken {
  return {
    id: t.id,
    chainId: (Number(t.chain_id) === 4663 ? 4663 : 46630) as 4663 | 46630,
    address: t.address,
    name: t.name,
    symbol: t.symbol,
    creator: t.creator,
    supply: t.supply,
    pooled: t.pooled,
    scritAmount: t.scrit_amount,
    txHash: t.tx_hash,
    poolId: t.pool_id,
    poolType: (t.pool_type === "v4_hook" ? "v4_hook" : "v3_standard"),
    logoUrl: t.logo_url || undefined,
    backingCategory: t.backing_category || "Critical Commodity Reserve",
    description: t.description || "",
    createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
  };
}

export function listLocalTokens(): LaunchedToken[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalToken(token: LaunchedToken): void {
  if (typeof window === "undefined") return;
  try {
    const existing = listLocalTokens();
    const deduped = existing.filter((t) => t.id !== token.id && t.address.toLowerCase() !== token.address.toLowerCase());
    deduped.unshift(token);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deduped));
  } catch (err) {
    console.error("Failed to save local token:", err);
  }
}

export function mergeTokens(primary: LaunchedToken[], fallback: LaunchedToken[] = []): LaunchedToken[] {
  const map = new Map<string, LaunchedToken>();
  for (const t of [...primary, ...fallback]) {
    const key = `${t.chainId}:${t.address.toLowerCase()}`;
    if (!map.has(key)) map.set(key, t);
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function filterTokens(
  tokens: LaunchedToken[],
  chain: 4663 | 46630 | "all" | "local",
  searchQuery: string,
  userAddress?: string | null,
): LaunchedToken[] {
  const q = searchQuery.trim().toLowerCase();
  return tokens.filter((t) => {
    if (chain === 4663 && t.chainId !== 4663) return false;
    if (chain === 46630 && t.chainId !== 46630) return false;
    if (chain === "local") {
      if (!userAddress) return false;
      if (t.creator.toLowerCase() !== userAddress.toLowerCase()) return false;
    }
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q) ||
      t.backingCategory.toLowerCase().includes(q)
    );
  });
}
