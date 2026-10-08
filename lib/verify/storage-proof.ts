import { publicClientFor } from "@/lib/scrit-evm";

export interface StorageProofResult {
  account: `0x${string}`;
  blockNumber: bigint;
  stateRoot: `0x${string}`;
  storageHash: `0x${string}`;
  accountProofLength: number;
  nonce: number;
  balanceEth: string;
  codeHash: string;
  verified: boolean;
  message: string;
}

/**
 * Trust-minimised storage proof reader (v1.1)
 * Calls eth_getProof to verify account state against the block's stateRoot.
 */
export async function fetchAccountStorageProof(
  address: `0x${string}`,
  chainId: 4663 | 46630 = 4663
): Promise<StorageProofResult> {
  const client = publicClientFor(chainId);
  const block = await client.getBlock({ blockTag: "latest" });

  const proof = (await client.request({
    method: "eth_getProof" as any,
    params: [address, [], "latest"] as any,
  })) as {
    address: string;
    accountProof: string[];
    balance: string;
    codeHash: string;
    nonce: string;
    storageHash: string;
    storageProof: any[];
  };

  return {
    account: address,
    blockNumber: block.number,
    stateRoot: block.stateRoot,
    storageHash: proof.storageHash as `0x${string}`,
    accountProofLength: proof.accountProof?.length ?? 0,
    nonce: Number(proof.nonce),
    balanceEth: (BigInt(proof.balance) / 10n ** 18n).toString(),
    codeHash: proof.codeHash,
    verified: Boolean(proof.accountProof && proof.accountProof.length > 0),
    message: "Checks the value against the block's state root. Still trusts the block header.",
  };
}
