// EVM multi-wallet registry for sCRIT (EVM-only pilot; no Solana wallets).
// No wallet SDKs: detect injected providers directly, EIP-6963 providers[] first.

export type EvmWalletId = "metamask" | "rabby" | "coinbase" | "okx" | "trust" | "phantom";

export type EvmProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, cb: (...a: never[]) => void) => void;
  removeListener?: (event: string, cb: (...a: never[]) => void) => void;
};

export type WalletOption = {
  id: EvmWalletId;
  name: string;
  installUrl: string;
  icon: string;
};

export const EVM_WALLETS: WalletOption[] = [
  { id: "metamask", name: "MetaMask", installUrl: "https://metamask.io/download/", icon: "/wallets/metamask.svg" },
  { id: "rabby", name: "Rabby", installUrl: "https://rabby.io/", icon: "/wallets/rabby.svg" },
  { id: "coinbase", name: "Coinbase Wallet", installUrl: "https://www.coinbase.com/wallet/downloads", icon: "/wallets/coinbase.svg" },
  { id: "okx", name: "OKX Wallet", installUrl: "https://www.okx.com/web3", icon: "/wallets/okx.svg" },
  { id: "trust", name: "Trust Wallet", installUrl: "https://trustwallet.com/download", icon: "/wallets/trust.png" },
  { id: "phantom", name: "Phantom (EVM)", installUrl: "https://phantom.app/download", icon: "/wallets/phantom.svg" },
];

type Win = typeof window & {
  ethereum?: Record<string, unknown> & { providers?: Record<string, unknown>[] };
  phantom?: { ethereum?: unknown };
  coinbaseWalletExtension?: unknown;
  okxwallet?: unknown;
  trustwallet?: unknown;
};

function win(): Win | null {
  return typeof window === "undefined" ? null : (window as unknown as Win);
}

function asEvm(p: unknown): EvmProvider | null {
  if (typeof p !== "object" || p === null) return null;
  const req = (p as { request?: unknown }).request;
  return typeof req === "function" ? (p as EvmProvider) : null;
}

function flag(p: unknown, key: string): boolean {
  return typeof p === "object" && p !== null && (p as Record<string, unknown>)[key] === true;
}

function evmCandidates(): unknown[] {
  const w = win();
  if (!w) return [];
  const multi = Array.isArray(w.ethereum?.providers) ? (w.ethereum.providers as unknown[]) : [];
  return [
    ...multi,
    w.ethereum,
    w.phantom?.ethereum,
    w.coinbaseWalletExtension,
    w.okxwallet,
    w.trustwallet,
  ].filter((p) => p !== undefined && p !== null);
}

/** Pure: does this injected object look like the given wallet? Exported for tests. */
export function matchEvm(p: unknown, id: EvmWalletId): boolean {
  switch (id) {
    case "rabby":
      return flag(p, "isRabby");
    case "metamask":
      return flag(p, "isMetaMask") && !flag(p, "isRabby");
    case "coinbase":
      return flag(p, "isCoinbaseWallet") || flag(p, "isCoinbaseBrowser");
    case "okx":
      return flag(p, "isOkxWallet");
    case "trust":
      return flag(p, "isTrust") || flag(p, "isTrustWallet");
    case "phantom":
      return flag(p, "isPhantom");
  }
}

/** Resolve the injected EVM provider for a wallet id, or null when missing. */
export function detectEvm(id: EvmWalletId): EvmProvider | null {
  for (const p of evmCandidates()) {
    if (matchEvm(p, id)) {
      const evm = asEvm(p);
      if (evm) return evm;
    }
  }
  return null;
}

/** All wallet ids with a detected provider right now. */
export function detectedEvmIds(): EvmWalletId[] {
  return (EVM_WALLETS.map((w) => w.id) as EvmWalletId[]).filter((id) => detectEvm(id) !== null);
}

export function withTimeout<T>(p: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("wallet_timeout")), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

const STORE_KEY = "scrit.wallet.v1";
const EVM_IDS: ReadonlySet<string> = new Set(EVM_WALLETS.map((w) => w.id));

export function isEvmAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadWallet(): { id: EvmWalletId; address: string } | null {
  try {
    const raw = store()?.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown; address?: unknown };
    if (parsed && typeof parsed === "object" && typeof parsed.id === "string" && typeof parsed.address === "string"
      && EVM_IDS.has(parsed.id) && isEvmAddress(parsed.address)) {
      return { id: parsed.id as EvmWalletId, address: parsed.address };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearWallet(): void {
  try {
    store()?.removeItem(STORE_KEY);
  } catch {
    // private mode: nothing persisted anyway
  }
}

function saveWallet(id: EvmWalletId, address: string): void {
  try {
    store()?.setItem(STORE_KEY, JSON.stringify({ id, address }));
  } catch {
    // private mode: session-only
  }
}

/** Connect a wallet: detect, request accounts (12s cap), validate, persist. */
export async function connectEvm(id: EvmWalletId): Promise<{ provider: EvmProvider; address: string }> {
  const provider = detectEvm(id);
  if (!provider) throw new Error("wallet_missing");
  let accounts: unknown;
  try {
    accounts = await withTimeout(provider.request({ method: "eth_requestAccounts" }));
  } catch (e) {
    if (e instanceof Error && /rejected|cancel|denied|user/i.test(e.message)) throw new Error("wallet_rejected");
    throw e instanceof Error ? e : new Error("wallet_failed");
  }
  const address = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
  if (!isEvmAddress(address)) throw new Error("wallet_failed");
  saveWallet(id, address);
  return { provider, address };
}

/** Quiet re-check: first account only if already authorized. */
export async function silentEvmAccount(id: EvmWalletId): Promise<string | null> {
  const provider = detectEvm(id);
  if (!provider) return null;
  try {
    const accounts = await withTimeout(provider.request({ method: "eth_accounts" }), 5000);
    const address = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
    return isEvmAddress(address) ? address : null;
  } catch {
    return null;
  }
}

/** Provider for the wallet chosen in the modal (no new permission prompt). */
export function getActiveEvmProvider(): EvmProvider | null {
  const w = win();
  if (!w) return null;
  const stored = loadWallet();
  if (stored) {
    const p = detectEvm(stored.id);
    if (p) return p;
  }
  return asEvm(w.ethereum);
}

export function walletLabel(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "wallet_missing") return "Wallet not detected. Install it first, or pick another.";
    if (e.message === "wallet_rejected") return "Connection cancelled in the wallet.";
    if (e.message === "wallet_timeout") return "Wallet did not respond. Unlock it and retry.";
    return e.message;
  }
  return "Wallet connection failed.";
}
