import { describe, expect, it } from "vitest";
import { attestationConfigFor, treasuryConfigFor } from "../lib/network-api-config";

const address = (suffix: string) => `0x${suffix.repeat(40)}`;

describe("network-bound API configuration", () => {
  it("uses only the selected mainnet launcher for attestations", () => {
    expect(attestationConfigFor({
      NEXT_PUBLIC_SCRIT_CHAIN_ID: "4663",
      NEXT_PUBLIC_SCRIT_LAUNCHER: address("1"),
      NEXT_PUBLIC_SCRIT_LAUNCHER_MAINNET: address("2"),
      NEXT_PUBLIC_SCRIT_LAUNCHER_TESTNET: address("3"),
    })).toEqual({ chainId: 4663, verifying: address("2") });
  });

  it("fails closed when the selected network has no verifier", () => {
    expect(attestationConfigFor({
      NEXT_PUBLIC_SCRIT_CHAIN_ID: "4663",
      NEXT_PUBLIC_SCRIT_LAUNCHER: address("1"),
      NEXT_PUBLIC_SCRIT_LAUNCHER_TESTNET: address("3"),
    })).toBeNull();
  });

  it("binds treasury token, recipient, and RPC to mainnet", () => {
    expect(treasuryConfigFor({
      NEXT_PUBLIC_SCRIT_CHAIN_ID: "4663",
      NEXT_PUBLIC_SCRIT: address("1"),
      NEXT_PUBLIC_TREASURY: address("2"),
      NEXT_PUBLIC_SCRIT_MAINNET: address("3"),
      MAINNET_RESERVE_TREASURY_ADDRESS: address("4"),
      ROBINHOOD_MAINNET_RPC_URL: "https://mainnet.example/rpc",
      TREASURY_CHAIN_ID: "46630",
      TREASURY_RPC_URL: "https://testnet.example/rpc",
    })).toEqual({ chainId: 4663, token: address("3"), recipient: address("4"), rpcUrl: "https://mainnet.example/rpc" });
  });

  it("does not use testnet fallbacks for mainnet treasury verification", () => {
    expect(treasuryConfigFor({
      NEXT_PUBLIC_SCRIT_CHAIN_ID: "4663",
      NEXT_PUBLIC_SCRIT: address("1"),
      NEXT_PUBLIC_TREASURY: address("2"),
    })).toBeNull();
  });
});
