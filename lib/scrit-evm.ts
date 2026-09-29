import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeAbiParameters,
  defineChain,
  fallback,
  http,
  parseAbiParameters,
  parseEther,
  type Account,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import { SCRIT_ABI, SCRIT_LAUNCHER_ABI, SCRIT_LAUNCHER_V4_ABI } from "./scrit-artifact";
import { HOOD_MAINNET, HOOD_TESTNET, scritDeploymentFor } from "./scrit";
import { getActiveEvmProvider } from "./wallets";

export const SLIPPAGE_PRESETS = [
  { label: "Low 0.5%", bps: 9950 },
  { label: "Default 2%", bps: 9800 },
  { label: "High 5%", bps: 9500 },
] as const;

export const TX_DEADLINE_SECS = 600;
/** Pilot cap per pool, revisit after price discovery. */
export const MAX_SCRIT_PER_POOL = parseEther("100000");

/** Pure: minimum accepted sCRIT by the router given slippage. */
export function calcScritMin(scritAmount: bigint, bps = 9800): bigint {
  if (!Number.isInteger(bps) || bps < 5000 || bps > 10000) throw new Error("bad_slippage");
  const result = (scritAmount * BigInt(bps)) / 10000n;
  if (scritAmount > 0n && result === 0n) return 1n;
  return result;
}

/** Pure: chain timestamp (secs) + deadline window. */
export function deadlineFromChainTs(chainTsSecs: number | bigint): bigint {
  return BigInt(chainTsSecs) + BigInt(TX_DEADLINE_SECS);
}

export type LaunchParams = {
  name: string;
  ticker: string;
  supply: bigint;
  pooled: bigint;
  scritAmount: bigint;
};

/** Pure: validate before any wallet prompt. Returns error code or null. */
export function validateLaunchParams(p: LaunchParams): string | null {
  if (!/^[A-Z0-9]{1,12}$/.test(p.ticker)) return "bad_ticker";
  if (p.name.length === 0 || p.name.length > 32) return "bad_name";
  if (p.supply <= 0n) return "bad_supply";
  if (p.pooled <= 0n || p.pooled > p.supply) return "bad_pool_amount";
  if (p.scritAmount <= 0n) return "bad_scrit_amount";
  if (p.scritAmount > MAX_SCRIT_PER_POOL) return "over_pool_cap";
  return null;
}

function hoodChain(id: 4663 | 46630) {
  const cfg = id === 4663 ? HOOD_MAINNET : HOOD_TESTNET;
  return defineChain({
    id,
    name: cfg.name,
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [cfg.rpc] } },
    blockExplorers: { default: { name: "explorer", url: cfg.explorer } },
  });
}

type InjectedWallet = { isMetaMask?: boolean; providers?: InjectedWallet[] } & Record<string, unknown>;

/** Pure: pick stable provider when multiple wallets inject (MetaMask exposes providers[]). */
export function pickInjectedProvider(eth: unknown): unknown {
  const e = eth as InjectedWallet | null | undefined;
  const list = Array.isArray(e?.providers) ? (e?.providers as InjectedWallet[]) : null;
  if (list && list.length > 0) return list.find((p) => p?.isMetaMask) ?? list[0];
  return eth;
}

function ethProvider() {
  // Prefer the wallet chosen in the wallet modal (persisted); otherwise fall
  // back to the previous default-provider behavior.
  const active = getActiveEvmProvider();
  if (active) return active as never;
  const w = window as unknown as { ethereum?: unknown };
  if (!w.ethereum) throw new Error("no_wallet");
  return pickInjectedProvider(w.ethereum);
}

export function publicClientFor(chainId: 4663 | 46630): PublicClient {
  const id = chainId;
  const isBrowser = typeof window !== "undefined";
  const rpcUrl = isBrowser ? `/api/rpc?chainId=${id}` : (id === 4663 ? HOOD_MAINNET.rpc : HOOD_TESTNET.rpc);
  return createPublicClient({
    chain: hoodChain(id),
    transport: fallback([
      http(rpcUrl),
      http(id === 4663 ? HOOD_MAINNET.rpc : HOOD_TESTNET.rpc),
    ]),
  });
}

export async function connectWallet(): Promise<Address> {
  const client = createWalletClient({ transport: custom(ethProvider() as never) });
  const [account] = await client.requestAddresses();
  if (!account) throw new Error("no_account");
  return account;
}

export async function ensureChain(chainId: 4663 | 46630): Promise<void> {
  const eth = ethProvider() as {
    request: (a: { method: string; params?: unknown }) => Promise<unknown>;
  };
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  const want = `0x${chainId.toString(16)}`;
  if (current.toLowerCase() === want) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: want }] });
  } catch (e: unknown) {
    if ((e as { code?: number })?.code !== 4902) throw e;
    const cfg = chainId === 4663 ? HOOD_MAINNET : HOOD_TESTNET;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: want,
          chainName: cfg.name,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [cfg.rpc],
          blockExplorerUrls: [cfg.explorer],
        },
      ],
    });
  }
}

export async function scritBalanceOf(chainId: 4663 | 46630, account: Address, scrit: Address): Promise<bigint> {
  const pub = publicClientFor(chainId);
  return pub.readContract({ address: scrit, abi: SCRIT_ABI, functionName: "balanceOf", args: [account] }) as Promise<bigint>;
}

export async function scritAllowance(chainId: 4663 | 46630, owner: Address, spender: Address, scrit: Address): Promise<bigint> {
  const pub = publicClientFor(chainId);
  return pub.readContract({
    address: scrit,
    abi: SCRIT_ABI,
    functionName: "allowance",
    args: [owner, spender],
  }) as Promise<bigint>;
}

export async function launcherIssuerApproved(chainId: 4663 | 46630, issuer: Address, launcher: Address = scritDeploymentFor(chainId).launcher): Promise<boolean> {
  try {
    const onchain = await publicClientFor(chainId).readContract({
      address: launcher,
      abi: chainId === 4663 ? SCRIT_LAUNCHER_V4_ABI : SCRIT_LAUNCHER_ABI,
      functionName: "issuerApproved",
      args: [issuer],
    }) as boolean;
    if (onchain) return true;
  } catch {
    // contract call could revert if RPC is unreachable or mock
  }

  // Fallback to compliance database registry
  try {
    if (typeof window !== "undefined") {
      const res = await fetch(`/api/issuers?wallet=${issuer}`).then((r) => r.json()).catch(() => null);
      if (res?.approved) return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export function decodeLaunchedToken(
  logs: { address: string; topics: `0x${string}`[] }[],
  launcher: Address
): Address | null {
  // Launched(token indexed, creator indexed, ...): token is first indexed topic.
  // Address check filters out Transfer logs emitted by the token itself.
  for (const log of logs) {
    if (log.topics.length >= 3 && log.address.toLowerCase() === launcher.toLowerCase()) {
      const token = `0x${log.topics[1].slice(-40)}` as Address;
      if (/^0x[0-9a-fA-F]{40}$/.test(token) && token !== "0x0000000000000000000000000000000000000000") {
        return token;
      }
    }
  }
  return null;
}

export type LaunchedV3Position = {
  token: Address;
  creator: Address;
  pool: string;
  positionId: bigint;
  liquidity: bigint;
  tokenAmount: bigint;
  scritAmount: bigint;
};

/** Decode the V3 launch receipt, only accepting events emitted by the configured launcher. */
export function decodeLaunchedPosition(
  logs: { address: string; topics: `0x${string}`[]; data: `0x${string}` }[],
  launcher: Address,
  v4 = false,
): LaunchedV3Position | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== launcher.toLowerCase() || log.topics.length < 4) continue;
    const topicAddress = (topic: `0x${string}`) => `0x${topic.slice(-40)}` as Address;
    if ([log.topics[1], log.topics[2], log.topics[3]].some((topic) => !/^0x[0-9a-fA-F]{64}$/.test(topic))) continue;
    try {
      const [positionId, liquidity, tokenAmount, scritAmount] = decodeAbiParameters(
        parseAbiParameters("uint256 positionId, uint128 liquidity, uint256 tokenAmount, uint256 scritAmount"),
        log.data
      );
      return {
        token: topicAddress(log.topics[1]),
        creator: topicAddress(log.topics[2]),
        pool: v4 ? log.topics[3] : topicAddress(log.topics[3]),
        positionId,
        liquidity,
        tokenAmount,
        scritAmount,
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Rail A launch: V4 taxed pools on mainnet and the existing V3 rehearsal on testnet.
 */
export async function launchTokenScrit(args: {
  chainId: 4663 | 46630;
  account: Address;
  params: LaunchParams;
  scrit?: Address;
  launcher?: Address;
  slippageBps?: number;
  onStep?: (step: "approve" | "launch") => void;
}): Promise<LaunchedV3Position & { launchHash: `0x${string}` }> {
  const err = validateLaunchParams(args.params);
  if (err) throw new Error(err);
  const deployment = scritDeploymentFor(args.chainId);
  const isV4 = args.chainId === 4663;
  const launcherAbi = isV4 ? SCRIT_LAUNCHER_V4_ABI : SCRIT_LAUNCHER_ABI;
  const scrit = args.scrit ?? deployment.token;
  const launcher = args.launcher ?? deployment.launcher;
  if (scrit === "0x0000000000000000000000000000000000000000" || launcher === "0x0000000000000000000000000000000000000000") {
    throw new Error("scrit_not_configured");
  }
  await ensureChain(args.chainId);
  const chain = hoodChain(args.chainId);
  const wallet: WalletClient = createWalletClient({ chain, transport: custom(ethProvider() as never) });
  const pub = publicClientFor(args.chainId);
  const acct = args.account as unknown as Account;

  const need = args.params.scritAmount;
  const allowed = await scritAllowance(args.chainId, args.account, launcher, scrit);
  if (allowed < need) {
    args.onStep?.("approve");
    const approveHash = await wallet.writeContract({
      address: scrit,
      abi: SCRIT_ABI,
      functionName: "approve",
      args: [launcher, need],
      account: acct,
      chain,
    });
    const approveReceipt = await pub.waitForTransactionReceipt({ hash: approveHash });
    if (approveReceipt.status === "reverted") throw new Error("approve_failed");
  }

  let deadline: bigint;
  try {
    const block = await pub.getBlock();
    deadline = deadlineFromChainTs(block.timestamp);
  } catch {
    deadline = BigInt(Math.floor(Date.now() / 1000) + TX_DEADLINE_SECS);
  }
  args.onStep?.("launch");
  const launchHash = await wallet.writeContract({
    address: launcher,
    abi: launcherAbi,
    functionName: "launch",
    args: [
      args.params.name || args.params.ticker,
      args.params.ticker,
      args.params.supply,
      args.params.pooled,
      args.params.scritAmount,
      args.slippageBps ?? 9800,
      deadline,
    ],
    account: acct,
    chain,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash: launchHash });
  if (receipt.status !== "success") throw new Error("tx_failed");
  const launch = decodeLaunchedPosition(
    receipt.logs as { address: string; topics: `0x${string}`[]; data: `0x${string}` }[],
    launcher,
    isV4
  );
  if (!launch) throw new Error("no_launch_event");
  return { ...launch, launchHash };
}

export function toTokenUnits(amount: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error("bad_amount");
  return parseEther(amount);
}
