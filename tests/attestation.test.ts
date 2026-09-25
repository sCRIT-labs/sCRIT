import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  ATTEST_TYPES,
  attestationDomain,
  signAttestation,
  verifyAttestation,
} from "../lib/attestation";

describe("attestation", () => {
  it("domain and types shape", () => {
    expect(ATTEST_TYPES.Attestation.map((f) => f.name)).toEqual([
      "batchId",
      "commodity",
      "massKg",
      "gradeSpec",
      "certificateHash",
      "vaultId",
      "timestamp",
    ]);
    expect(
      attestationDomain(
        4663,
        "0x0000000000000000000000000000000000000001"
      ).name
    ).toBe("sCRIT-Reserve");
  });
  it("sign then verify roundtrip", async () => {
    const pk = generatePrivateKey();
    const acc = privateKeyToAccount(pk);
    const msg = {
      batchId: "B-001",
      commodity: "Au",
      massKg: "0.005",
      gradeSpec: "LBMA 999.9",
      certificateHash: "ipfs://x",
      vaultId: "VAULT-AU-1",
      timestamp: 1720000000n,
    };
    const sig = await signAttestation({
      chainId: 4663,
      verifying: "0x0000000000000000000000000000000000000001",
      message: msg,
      privateKey: pk,
    });
    const ok = await verifyAttestation({
      chainId: 4663,
      verifying: "0x0000000000000000000000000000000000000001",
      message: msg,
      signature: sig,
      expected: acc.address,
    });
    expect(ok).toBe(true);
  });
});
