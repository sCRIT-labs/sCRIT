export const SIMULATION_SUPPLY = 1_000_000n;
export const TAX_BPS = 250;
export const TAX_TARGET_BPS = 250;
export const TAX_SPLIT_RESERVE_BPS = 7500;
export const PROJECT_POOL_LP_FEE_BPS = 30;
export const ISSUANCE_FEE_BPS = 0;
export const MAX_ETH_PER_POOL = 2n * 10n ** 18n;
export const STALENESS_MS = 24 * 3600 * 1000;

export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const SCRIT_ADDRESS = (process.env.NEXT_PUBLIC_SCRIT ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const SCRIT_LAUNCHER = (process.env.NEXT_PUBLIC_SCRIT_LAUNCHER ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const SCRIT_V3_POSITION_MANAGER = (process.env.NEXT_PUBLIC_SCRIT_V3_POSITION_MANAGER ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
type ScritDeployment = {
  token: `0x${string}`;
  launcher: `0x${string}`;
  positionManager: `0x${string}`;
  reserveManager: `0x${string}`;
  custodianRegistry: `0x${string}`;
  priceAdapter: `0x${string}`;
  lotManager: `0x${string}`;
  lotToken: `0x${string}`;
  lotMarketplace: `0x${string}`;
  redemptionManager: `0x${string}`;
  timelock: `0x${string}`;
};

export function scritDeploymentFor(chainId: 4663 | 46630): ScritDeployment {
  if (chainId === 4663) {
    return {
      token: (process.env.NEXT_PUBLIC_SCRIT_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
      launcher: (process.env.NEXT_PUBLIC_SCRIT_LAUNCHER_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
      positionManager: (process.env.NEXT_PUBLIC_SCRIT_V4_POSITION_MANAGER_MAINNET ?? "0x58daec3116aae6d93017baaea7749052e8a04fa7") as `0x${string}`,
      reserveManager: (process.env.NEXT_PUBLIC_SCRIT_RESERVE_MANAGER_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
      custodianRegistry: (process.env.NEXT_PUBLIC_SCRIT_CUSTODIANS_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
      priceAdapter: (process.env.NEXT_PUBLIC_SCRIT_PRICE_ADAPTER_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
      lotManager: (process.env.NEXT_PUBLIC_SCRIT_LOT_MANAGER_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
      lotToken: (process.env.NEXT_PUBLIC_SCRIT_LOT_TOKEN_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
      lotMarketplace: (process.env.NEXT_PUBLIC_SCRIT_LOT_MARKETPLACE_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
      redemptionManager: (process.env.NEXT_PUBLIC_SCRIT_REDEMPTION_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
      timelock: (process.env.NEXT_PUBLIC_SCRIT_TIMELOCK_MAINNET ?? ZERO_ADDRESS) as `0x${string}`,
    };
  }
  return {
    token: (process.env.NEXT_PUBLIC_SCRIT_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT ?? ZERO_ADDRESS) as `0x${string}`,
    launcher: (process.env.NEXT_PUBLIC_SCRIT_LAUNCHER_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_LAUNCHER ?? ZERO_ADDRESS) as `0x${string}`,
    positionManager: (process.env.NEXT_PUBLIC_SCRIT_V3_POSITION_MANAGER_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_V3_POSITION_MANAGER ?? "0x15e98cf94a32c7fd23a36fabb4fee612277da47b") as `0x${string}`,
    reserveManager: (process.env.NEXT_PUBLIC_SCRIT_RESERVE_MANAGER_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_RESERVE_MANAGER ?? ZERO_ADDRESS) as `0x${string}`,
    custodianRegistry: (process.env.NEXT_PUBLIC_SCRIT_CUSTODIANS_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_CUSTODIANS ?? ZERO_ADDRESS) as `0x${string}`,
    priceAdapter: (process.env.NEXT_PUBLIC_SCRIT_PRICE_ADAPTER_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_PRICE_ADAPTER ?? ZERO_ADDRESS) as `0x${string}`,
    lotManager: (process.env.NEXT_PUBLIC_SCRIT_LOT_MANAGER_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_LOT_MANAGER ?? ZERO_ADDRESS) as `0x${string}`,
    lotToken: (process.env.NEXT_PUBLIC_SCRIT_LOT_TOKEN_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_LOT_TOKEN ?? ZERO_ADDRESS) as `0x${string}`,
    lotMarketplace: (process.env.NEXT_PUBLIC_SCRIT_LOT_MARKETPLACE_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_LOT_MARKETPLACE ?? ZERO_ADDRESS) as `0x${string}`,
    redemptionManager: (process.env.NEXT_PUBLIC_SCRIT_REDEMPTION_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_REDEMPTION ?? ZERO_ADDRESS) as `0x${string}`,
    timelock: (process.env.NEXT_PUBLIC_SCRIT_TIMELOCK_TESTNET ?? process.env.NEXT_PUBLIC_SCRIT_TIMELOCK ?? ZERO_ADDRESS) as `0x${string}`,
  };
}

export const SCRIT_CHAIN_ID: 4663 | 46630 = process.env.NEXT_PUBLIC_SCRIT_CHAIN_ID === "4663" ? 4663 : 46630;
const isConfiguredAddress = (value?: string) => Boolean(value && /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value));
export const TAX_ACTIVE = SCRIT_CHAIN_ID === 4663 && isConfiguredAddress(process.env.NEXT_PUBLIC_SCRIT_TAX_HOOK_MAINNET) && isConfiguredAddress(process.env.NEXT_PUBLIC_SCRIT_LAUNCHER_MAINNET);

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
