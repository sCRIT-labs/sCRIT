import { verifyTypedData, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export type AttestationMsg = {
  batchId: string;
  commodity: string;
  massKg: string;
  gradeSpec: string;
  certificateHash: string;
  vaultId: string;
  timestamp: bigint;
};

export const ATTEST_TYPES = {
  Attestation: [
    { name: "batchId", type: "string" },
    { name: "commodity", type: "string" },
    { name: "massKg", type: "string" },
    { name: "gradeSpec", type: "string" },
    { name: "certificateHash", type: "string" },
    { name: "vaultId", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
} as const;

export function attestationDomain(chainId: number, verifying: string) {
  return {
    name: "sCRIT-Reserve",
    version: "1",
    chainId,
    verifyingContract: verifying as Address,
  };
}

export async function signAttestation(a: {
  chainId: number;
  verifying: string;
  message: AttestationMsg;
  privateKey: Hex;
}): Promise<Hex> {
  const acc = privateKeyToAccount(a.privateKey);
  return acc.signTypedData({
    domain: attestationDomain(a.chainId, a.verifying),
    types: ATTEST_TYPES,
    primaryType: "Attestation",
    message: a.message as never,
  });
}

export async function verifyAttestation(a: {
  chainId: number;
  verifying: string;
  message: AttestationMsg;
  signature: Hex;
  expected: string;
}): Promise<boolean> {
  return verifyTypedData({
    address: a.expected as Address,
    domain: attestationDomain(a.chainId, a.verifying),
    types: ATTEST_TYPES,
    primaryType: "Attestation",
    message: a.message as never,
    signature: a.signature,
  });
}
