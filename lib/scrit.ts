export const SCRIT_SUPPLY = 999000000n;
export const TAX_BPS = 0;
export const TAX_ACTIVE = false;
export const TAX_TARGET_BPS = 250;
export const TAX_SPLIT_RESERVE_BPS = 7500;
export const ISSUANCE_FEE_BPS = 100;
export const MAX_ETH_PER_POOL = 2n * 10n ** 18n;
export const STALENESS_MS = 24 * 3600 * 1000;

export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const SCRIT_ADDRESS = (process.env.NEXT_PUBLIC_SCRIT ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const SCRIT_LAUNCHER = (process.env.NEXT_PUBLIC_SCRIT_LAUNCHER ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const HOOD_MAINNET = {
  id: 4663,
  name: "Robinhood Chain",
  rpc: "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robinhoodchain.blockscout.com",
} as const;

export const HOOD_TESTNET = {
  id: 46630,
  name: "Robinhood Testnet",
  rpc: "https://rpc.testnet.chain.robinhood.com",
  explorer: "https://explorer.testnet.chain.robinhood.com",
} as const;
