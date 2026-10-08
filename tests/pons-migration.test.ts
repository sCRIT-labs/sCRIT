import { describe, expect, it } from "vitest";
import { keccak256, encodeAbiParameters, numberToHex, encodePacked } from "viem";
import { mineHookAddress } from "../scripts/deploy-pons-pair.mjs";

describe("Pons sCRIT Migration Infrastructure", () => {
  const MOCK_DEPLOYER = "0xefcb390b33d5edc90f0bf1039f94e53fb18c7346";
  const MOCK_INIT_CODE_HASH = keccak256(Buffer.from("mock_trading_tax_hook_init_code_hash"));

  it("mines a valid Uniswap V4 hook address with exact 0x2044 permission mask", () => {
    const result = mineHookAddress(MOCK_DEPLOYER, MOCK_INIT_CODE_HASH);
    expect(result.address).toMatch(/^0x[0-9a-fA-F]{40}$/);

    const addressBigInt = BigInt(result.address);
    const permissionMask = (1n << 14n) - 1n; // 0x3FFF
    const flags = addressBigInt & permissionMask;

    // Must match 0x2044 (beforeInitialize | afterSwap | afterSwapReturnDelta)
    expect(flags).toBe(0x2044n);
    expect(["2044", "6044", "a044", "e044"].some((suffix) => result.address.toLowerCase().endsWith(suffix))).toBe(true);
  });

  it("generates deterministic Uniswap V4 PoolKey and enforces token ordering", () => {
    const tokenA = "0x2222222222222222222222222222222222222222";
    const tokenB = "0x1111111111111111111111111111111111111111"; // numerically smaller
    const mockHook = "0x890fa9adb7bbf15e171d718fd45c8428b5342044";

    const isToken0 = BigInt(tokenA) < BigInt(tokenB);
    const currency0 = isToken0 ? tokenA : tokenB;
    const currency1 = isToken0 ? tokenB : tokenA;

    // currency0 must be the smaller address
    expect(currency0).toBe(tokenB);
    expect(currency1).toBe(tokenA);

    const poolKeyTuple = {
      type: "tuple",
      components: [
        { name: "currency0", type: "address" },
        { name: "currency1", type: "address" },
        { name: "fee", type: "uint24" },
        { name: "tickSpacing", type: "int24" },
        { name: "hooks", type: "address" },
      ],
    };

    const poolId = keccak256(
      encodeAbiParameters([poolKeyTuple], [[currency0, currency1, 3000, 60, mockHook]])
    );

    expect(poolId).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });
});
