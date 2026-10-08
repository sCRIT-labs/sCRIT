import { describe, it, expect } from "vitest";
import { fetchAccountStorageProof } from "../lib/verify/storage-proof";
import { getCanonicalAddress } from "../lib/addresses";

describe("Trust-Minimised Storage Proof (v1.1)", () => {
  it("fetches and validates Merkle-Patricia account storage proof from RPC", async () => {
    const deadAddr = getCanonicalAddress("Dead");
    const result = await fetchAccountStorageProof(deadAddr as `0x${string}`, 4663);

    expect(result.account.toLowerCase()).toBe(deadAddr.toLowerCase());
    expect(result.blockNumber).toBeGreaterThan(0n);
    expect(result.stateRoot).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.storageHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.verified).toBe(true);
    expect(result.message).toBe(
      "Checks the value against the block's state root. Still trusts the block header."
    );
  }, 15000);
});
