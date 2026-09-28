import { describe, expect, it } from "vitest";
import { filterTokens, mapDbTokenToLaunched, mergeTokens, type LaunchedToken } from "../lib/tokens";
import type { DbToken } from "../lib/db";

describe("tokens registry", () => {
  const sampleTokens: LaunchedToken[] = [
    {
      id: "4663-0x56073943133c1c0678a753be9402b27d43cf1c22",
      chainId: 4663,
      address: "0x56073943133c1c0678a753be9402b27d43cf1c22",
      name: "sCRIT Critical Commodity Index",
      symbol: "sCRIT",
      creator: "0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d",
      supply: "1,000,000",
      pooled: "200,000",
      scritAmount: "200,000",
      txHash: "0x3429188a8761ef871b059302194bca409184511efda81084209938475a892b15",
      poolId: "0xd029d347e9706be039efab5de2da16919fc145d31ea0e3c9a8bd0a773bf6c69e",
      poolType: "v4_hook",
      backingCategory: "Critical Commodity Reserve",
      description: "Canonical Robinhood mainnet critical commodity token",
      createdAt: 1774890000000,
    },
    {
      id: "46630-0x761333eaf1cd18d3846edb11299e4162be5e8755",
      chainId: 46630,
      address: "0x761333eaf1cd18d3846edb11299e4162be5e8755",
      name: "sCRIT Testnet V2",
      symbol: "sCRIT",
      creator: "0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d",
      supply: "1,000,000",
      pooled: "100,000",
      scritAmount: "100,000",
      txHash: "0x7a2948bbef6705db8a493a54d5885f86749301da0d1723f9909c065f492a5433",
      poolId: "0x01824bb84210e7491b5c90812347ae09824c08924b10582a8710924bcf081267",
      poolType: "v3_standard",
      backingCategory: "Testnet Pilot Asset",
      description: "Robinhood testnet rehearsal token",
      createdAt: 1774900000000,
    },
  ];

  it("maps DbToken rows to LaunchedToken format", () => {
    const dbRow: DbToken = {
      id: "4663-0xabc",
      chain_id: 4663,
      address: "0xabc",
      name: "Test Token",
      symbol: "TEST",
      creator: "0x123",
      supply: "1000",
      pooled: "500",
      scrit_amount: "500",
      tx_hash: "0xdef",
      pool_id: "0xpool",
      pool_type: "v4_hook",
      logo_url: "https://example.com/logo.png",
      backing_category: "Gold",
      description: "Test description",
      created_at: "2026-03-30T10:00:00.000Z",
    };
    const mapped = mapDbTokenToLaunched(dbRow);
    expect(mapped.id).toBe("4663-0xabc");
    expect(mapped.chainId).toBe(4663);
    expect(mapped.symbol).toBe("TEST");
    expect(mapped.logoUrl).toBe("https://example.com/logo.png");
    expect(mapped.createdAt).toBeGreaterThan(0);
  });

  it("filters tokens by chainId and search query", () => {
    const filteredByChain = filterTokens(sampleTokens, 4663, "");
    expect(filteredByChain.length).toBe(1);
    expect(filteredByChain[0].chainId).toBe(4663);

    const filteredByQuery = filterTokens(sampleTokens, "all", "testnet");
    expect(filteredByQuery.length).toBe(1);
    expect(filteredByQuery[0].symbol).toBe("sCRIT");
  });

  it("merges tokens deduping by chainId and address", () => {
    const listA: LaunchedToken[] = [sampleTokens[0]];
    const listB: LaunchedToken[] = [sampleTokens[0], sampleTokens[1]];
    const merged = mergeTokens(listA, listB);
    expect(merged.length).toBe(2);
  });
});
