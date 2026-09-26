import { describe, expect, it } from "vitest";
import { assertExpectedDeployer, getTimelockMinDelay } from "../scripts/deploy-config.mjs";

describe("testnet deployer configuration", () => {
  it("allows the funded wallet and rejects a private key for a different address", () => {
    const funded = "0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d";
    expect(() => assertExpectedDeployer(funded, funded.toLowerCase())).not.toThrow();
    expect(() => assertExpectedDeployer("0x0000000000000000000000000000000000000001", funded)).toThrow(/does not match/);
  });

  it("allows the expected address to be omitted and rejects malformed values", () => {
    expect(() => assertExpectedDeployer("0x0000000000000000000000000000000000000001", "")).not.toThrow();
    expect(() => assertExpectedDeployer("0x0000000000000000000000000000000000000001", "invalid")).toThrow(/non-zero EVM address/);
  });
});

describe("network-specific timelock configuration", () => {
  it("requires a mainnet-only delay instead of inheriting the testnet delay", () => {
    expect(() => getTimelockMinDelay("mainnet", { SCRIT_TIMELOCK_DELAY_SECONDS: "0" })).toThrow(/MAINNET_TIMELOCK_DELAY_SECONDS/);
  });

  it("reads the explicit zero-delay mainnet choice", () => {
    expect(getTimelockMinDelay("mainnet", { MAINNET_TIMELOCK_DELAY_SECONDS: "0", SCRIT_TIMELOCK_DELAY_SECONDS: "172800" })).toBe(0n);
  });

  it("keeps the testnet delay on its own setting", () => {
    expect(getTimelockMinDelay("testnet", { MAINNET_TIMELOCK_DELAY_SECONDS: "172800", SCRIT_TIMELOCK_DELAY_SECONDS: "0" })).toBe(0n);
  });
});
