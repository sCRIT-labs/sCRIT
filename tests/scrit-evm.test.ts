import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import {
  calcScritMin,
  deadlineFromChainTs,
  decodeLaunchedToken,
  pickInjectedProvider,
  validateLaunchParams,
} from "../lib/scrit-evm";

describe("scrit-evm pure", () => {
  it("scritMin respects slippage", () => {
    expect(calcScritMin(10000n, 9800)).toBe(9800n);
    expect(calcScritMin(10000n, 9950)).toBe(9950n);
    expect(() => calcScritMin(10000n, 4999)).toThrow("bad_slippage");
  });
  it("deadline adds 600s", () => {
    expect(deadlineFromChainTs(1000)).toBe(1600n);
  });
  it("validates launch params", () => {
    const base = { name: "Test", ticker: "TEST", supply: parseEther("1000"), pooled: parseEther("100"), scritAmount: parseEther("10") };
    expect(validateLaunchParams(base)).toBeNull();
    expect(validateLaunchParams({ ...base, ticker: "bad!" })).toBe("bad_ticker");
    expect(validateLaunchParams({ ...base, pooled: parseEther("1001") })).toBe("bad_pool_amount");
    expect(validateLaunchParams({ ...base, scritAmount: 0n })).toBe("bad_scrit_amount");
  });
  it("picks MetaMask from providers[] when wallets clash", () => {
    const phantom = { isPhantom: true };
    const mm = { isMetaMask: true };
    expect(pickInjectedProvider({ providers: [phantom, mm] })).toBe(mm);
    expect(pickInjectedProvider({ providers: [phantom] })).toBe(phantom);
    const single = { isMetaMask: true };
    expect(pickInjectedProvider(single)).toBe(single);
  });
  it("decodes token from Launched log, ignores Transfer logs", () => {
    const launcher = "0x00000000000000000000000000000000000000aa";
    const tokenTopic = "0x0000000000000000000000001111111111111111111111111111111111111111";
    const creatorTopic = "0x0000000000000000000000002222222222222222222222222222222222222222";
    const logs = [
      { address: "0x3333333333333333333333333333333333333333", topics: [tokenTopic, creatorTopic, creatorTopic] as `0x${string}`[] },
      { address: launcher, topics: ["0xdeadbeef", tokenTopic, creatorTopic] as `0x${string}`[] },
    ];
    expect(decodeLaunchedToken(logs, launcher as `0x${string}`)).toBe("0x1111111111111111111111111111111111111111");
    expect(decodeLaunchedToken(logs.slice(0, 1), launcher as `0x${string}`)).toBeNull();
  });
});
