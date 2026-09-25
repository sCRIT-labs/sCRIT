import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  parseAbi,
  parseEther,
  type Account,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import { SCRIT_ABI, SCRIT_LAUNCHER_ABI } from "./scrit-artifact";
import { HOOD_MAINNET, HOOD_TESTNET, SCRIT_ADDRESS, SCRIT_LAUNCHER } from "./scrit";

export const SLIPPAGE_PRESETS = [
  { label: "Low 0.5%", bps: 9950 },
  { label: "Default 2%", bps: 9800 },
  { label: "High 5%", bps: 9500 },
] as const;

export const TX_DEADLINE_SECS = 600;
/** Pilot cap per pool, revisit after price discovery. */
export const MAX_SCRIT_PER_POOL = parseEther("100000");

/** Pure: fee = 1% of contributed sCRIT. */
export function calcIssuanceFee(scritAmount: bigint): bigint {
  return (scritAmount * 100n) / 10000n;
}

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
  const w = window as unknown as { ethereum?: unknown };
  if (!w.ethereum) throw new Error("no_wallet");
  return pickInjectedProvider(w.ethereum);
}

export function publicClientFor(chainId: 4663 | 46630): PublicClient {
  const id = chainId;
  return createPublicClient({
    chain: hoodChain(id),
    transport: http(id === 4663 ? HOOD_MAINNET.rpc : HOOD_TESTNET.rpc),
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

const ERC20_TRANSFER = parseAbi(["function transfer(address to, uint256 v) returns (bool)"]);

/**
 * Full pilot launch: 1) 1% issuance fee transfer to treasury,
 * 2) approve launcher for sCRIT, 3) launch TOKEN/sCRIT pool.
 * Returns token address + all tx hashes for the treasury log.
 */
export async function launchTokenScrit(args: {
  chainId: 4663 | 46630;
  account: Address;
  params: LaunchParams;
  treasury: Address;
  scrit?: Address;
  launcher?: Address;
  slippageBps?: number;
  onStep?: (step: "fee" | "approve" | "launch") => void;
}): Promise<{ token: Address; feeHash: `0x${string}`; launchHash: `0x${string}` }> {
  const err = validateLaunchParams(args.params);
  if (err) throw new Error(err);
  const scrit = args.scrit ?? SCRIT_ADDRESS;
  const launcher = args.launcher ?? SCRIT_LAUNCHER;
  if (scrit === "0x0000000000000000000000000000000000000000" || launcher === "0x0000000000000000000000000000000000000000") {
    throw new Error("scrit_not_configured");
  }
  await ensureChain(args.chainId);
  const chain = hoodChain(args.chainId);
  const wallet: WalletClient = createWalletClient({ chain, transport: custom(ethProvider() as never) });
  const pub = publicClientFor(args.chainId);
  const acct = args.account as unknown as Account;

  const fee = calcIssuanceFee(args.params.scritAmount);
  args.onStep?.("fee");
  const feeHash = await wallet.writeContract({
    address: scrit,
    abi: ERC20_TRANSFER,
    functionName: "transfer",
    args: [args.treasury, fee],
    account: acct,
    chain,
  });
  const feeReceipt = await pub.waitForTransactionReceipt({ hash: feeHash });
  if (feeReceipt.status === "reverted") throw new Error("fee_failed");

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
  const scritMin = calcScritMin(args.params.scritAmount, args.slippageBps);
  args.onStep?.("launch");
  const launchHash = await wallet.writeContract({
    address: launcher,
    abi: SCRIT_LAUNCHER_ABI,
    functionName: "launch",
    args: [
      args.params.name || args.params.ticker,
      args.params.ticker,
      args.params.supply,
      args.params.pooled,
      args.params.scritAmount,
      scritMin,
      deadline,
    ],
    account: acct,
    chain,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash: launchHash });
  if (receipt.status === "reverted") throw new Error("tx_failed");
  const token = decodeLaunchedToken(
    receipt.logs as { address: string; topics: `0x${string}`[] }[],
    launcher
  );
  if (!token) throw new Error("no_contract_address");
  return { token, feeHash, launchHash };
}

export function toTokenUnits(amount: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error("bad_amount");
  return parseEther(amount);
}
