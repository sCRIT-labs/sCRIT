/**
 * Uniswap v4 Hook Permissions Decoder
 * References Uniswap v4 Hooks.sol 14-bit permission flags encoded in the hook address.
 */

export interface HookFlagDefinition {
  name: string;
  bit: number;
  mask: number;
  hexMask: string;
  key: string;
  description: string;
  securityImplication: {
    on: string;
    off: string;
  };
}

export const HOOK_FLAGS: HookFlagDefinition[] = [
  {
    name: "beforeInitialize",
    key: "beforeInitialize",
    bit: 13,
    mask: 1 << 13, // 0x2000
    hexMask: "0x2000",
    description: "Executed before a pool is initialized",
    securityImplication: {
      on: "Enforces pool creation parameters (verifies canonical tokens and parameters at init).",
      off: "Allows unconstrained pool initialization.",
    },
  },
  {
    name: "afterInitialize",
    key: "afterInitialize",
    bit: 12,
    mask: 1 << 12, // 0x1000
    hexMask: "0x1000",
    description: "Executed after a pool is initialized",
    securityImplication: {
      on: "Executes custom logic post initialization.",
      off: "Standard pool initialization without post-hook interception.",
    },
  },
  {
    name: "beforeAddLiquidity",
    key: "beforeAddLiquidity",
    bit: 11,
    mask: 1 << 11, // 0x0800
    hexMask: "0x0800",
    description: "Executed before liquidity is added",
    securityImplication: {
      on: "Can inspect or gate liquidity addition.",
      off: "This hook cannot restrict or gate LP deposits.",
    },
  },
  {
    name: "afterAddLiquidity",
    key: "afterAddLiquidity",
    bit: 10,
    mask: 1 << 10, // 0x0400
    hexMask: "0x0400",
    description: "Executed after liquidity is added",
    securityImplication: {
      on: "Post-processes liquidity addition.",
      off: "Standard liquidity addition without post-processing.",
    },
  },
  {
    name: "beforeRemoveLiquidity",
    key: "beforeRemoveLiquidity",
    bit: 9,
    mask: 1 << 9, // 0x0200
    hexMask: "0x0200",
    description: "Executed before liquidity is removed",
    securityImplication: {
      on: "Can inspect or potentially block liquidity removal.",
      off: "This hook cannot block LP withdrawals.",
    },
  },
  {
    name: "afterRemoveLiquidity",
    key: "afterRemoveLiquidity",
    bit: 8,
    mask: 1 << 8, // 0x0100
    hexMask: "0x0100",
    description: "Executed after liquidity is removed",
    securityImplication: {
      on: "Post-processes liquidity removal.",
      off: "Standard liquidity removal without post-processing.",
    },
  },
  {
    name: "beforeSwap",
    key: "beforeSwap",
    bit: 7,
    mask: 1 << 7, // 0x0080
    hexMask: "0x0080",
    description: "Executed before a swap occurs",
    securityImplication: {
      on: "Can modify swap parameters or gate swaps.",
      off: "This hook cannot censor or front-run swaps before execution.",
    },
  },
  {
    name: "afterSwap",
    key: "afterSwap",
    bit: 6,
    mask: 1 << 6, // 0x0040
    hexMask: "0x0040",
    description: "Executed after a swap occurs",
    securityImplication: {
      on: "Assesses the 2.5% protocol tax on completed swaps.",
      off: "No post-swap tax assessment.",
    },
  },
  {
    name: "beforeDonate",
    key: "beforeDonate",
    bit: 5,
    mask: 1 << 5, // 0x0020
    hexMask: "0x0020",
    description: "Executed before fee donation",
    securityImplication: {
      on: "Can intercept donations.",
      off: "Standard donation handling.",
    },
  },
  {
    name: "afterDonate",
    key: "afterDonate",
    bit: 4,
    mask: 1 << 4, // 0x0010
    hexMask: "0x0010",
    description: "Executed after fee donation",
    securityImplication: {
      on: "Post-processes fee donations.",
      off: "Standard donation handling without hook logic.",
    },
  },
  {
    name: "beforeSwapReturnsDelta",
    key: "beforeSwapReturnsDelta",
    bit: 3,
    mask: 1 << 3, // 0x0008
    hexMask: "0x0008",
    description: "beforeSwap returns delta accounting adjustment",
    securityImplication: {
      on: "Modifies token balance deltas before swap.",
      off: "No pre-swap balance delta modification.",
    },
  },
  {
    name: "afterSwapReturnDelta",
    key: "afterSwapReturnDelta",
    bit: 2,
    mask: 1 << 2, // 0x0004
    hexMask: "0x0004",
    description: "afterSwap returns delta accounting adjustment",
    securityImplication: {
      on: "Routes 75% tax delta to StockpileTreasury and 25% to Operations.",
      off: "No post-swap balance delta modification.",
    },
  },
  {
    name: "afterAddLiquidityReturnsDelta",
    key: "afterAddLiquidityReturnsDelta",
    bit: 1,
    mask: 1 << 1, // 0x0002
    hexMask: "0x0002",
    description: "afterAddLiquidity returns delta adjustment",
    securityImplication: {
      on: "Modifies LP add balance deltas.",
      off: "Standard LP addition accounting.",
    },
  },
  {
    name: "afterRemoveLiquidityReturnsDelta",
    key: "afterRemoveLiquidityReturnsDelta",
    bit: 0,
    mask: 1 << 0, // 0x0001
    hexMask: "0x0001",
    description: "afterRemoveLiquidity returns delta adjustment",
    securityImplication: {
      on: "Modifies LP removal balance deltas.",
      off: "Standard LP removal accounting.",
    },
  },
];

export interface DecodedHookPermissions {
  address: string;
  numericFlags: number;
  hexFlags: string;
  flags: Record<string, boolean>;
  activeCount: number;
  inactiveCount: number;
  explanations: {
    flag: string;
    hexMask: string;
    status: "ON" | "OFF";
    meaning: string;
  }[];
}

export function decodeHookPermissions(hookAddress: string): DecodedHookPermissions {
  const cleanAddr = hookAddress.toLowerCase().replace(/^0x/, "");
  // Parse lowest 14 bits (masked with 0x3FFF = 16383)
  const fullBigInt = BigInt(`0x${cleanAddr}`);
  const numericFlags = Number(fullBigInt & BigInt(0x3fff));
  const hexFlags = `0x${numericFlags.toString(16).padStart(4, "0")}`;

  const flags: Record<string, boolean> = {};
  const explanations: DecodedHookPermissions["explanations"] = [];
  let activeCount = 0;
  let inactiveCount = 0;

  for (const def of HOOK_FLAGS) {
    const isSet = (numericFlags & def.mask) !== 0;
    flags[def.key] = isSet;
    if (isSet) activeCount++;
    else inactiveCount++;

    explanations.push({
      flag: def.name,
      hexMask: def.hexMask,
      status: isSet ? "ON" : "OFF",
      meaning: isSet ? def.securityImplication.on : def.securityImplication.off,
    });
  }

  return {
    address: hookAddress,
    numericFlags,
    hexFlags,
    flags,
    activeCount,
    inactiveCount,
    explanations,
  };
}
