import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ganache from "ganache";
import { createPublicClient, createWalletClient, custom, defineChain, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SCRIT_ABI, SCRIT_BYTECODE } from "../lib/scrit-artifact";

const chain = defineChain({ id: 46630, name: "sCRIT Local Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://127.0.0.1"] } } });
const keys = [31, 32].map((n) => `0x${n.toString(16).padStart(64, "0")}` as `0x${string}`);
const [issuer, holder] = keys.map((key) => privateKeyToAccount(key));

describe("Legacy launch ERC-20", () => {
  const provider = ganache.provider({ logging: { quiet: true }, chain: { chainId: chain.id }, wallet: { accounts: keys.map((secretKey) => ({ secretKey, balance: "0x3635C9ADC5DEA00000" })) } });
  const publicClient = createPublicClient({ chain, transport: custom(provider as never) });
  const issuerClient = createWalletClient({ account: issuer, chain, transport: custom(provider as never) });
  const holderClient = createWalletClient({ account: holder, chain, transport: custom(provider as never) });
  let token: Address;

  beforeAll(async () => {
    const hash = await issuerClient.deployContract({ abi: SCRIT_ABI, bytecode: SCRIT_BYTECODE, args: ["Legacy sCRIT", "sCRIT", 1_000n] });
    token = (await publicClient.waitForTransactionReceipt({ hash })).contractAddress!;
  }, 30_000);

  afterAll(async () => { await provider.disconnect(); });

  it("supports ERC-20 allowance transfers and rejects transfers to the zero address", async () => {
    const approve = await issuerClient.writeContract({ address: token, abi: SCRIT_ABI, functionName: "approve", args: [holder.address, 300n] });
    expect((await publicClient.waitForTransactionReceipt({ hash: approve })).status).toBe("success");
    const transfer = await holderClient.writeContract({ address: token, abi: SCRIT_ABI, functionName: "transferFrom", args: [issuer.address, holder.address, 125n] });
    expect((await publicClient.waitForTransactionReceipt({ hash: transfer })).status).toBe("success");
    expect(await publicClient.readContract({ address: token, abi: SCRIT_ABI, functionName: "balanceOf", args: [holder.address] })).toBe(125n);
    expect(await publicClient.readContract({ address: token, abi: SCRIT_ABI, functionName: "allowance", args: [issuer.address, holder.address] })).toBe(175n);
    await expect(issuerClient.writeContract({ address: token, abi: SCRIT_ABI, functionName: "transfer", args: ["0x0000000000000000000000000000000000000000", 1n] })).rejects.toThrow();
  }, 30_000);
});
