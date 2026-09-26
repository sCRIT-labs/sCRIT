import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ganache from "ganache";
import { createPublicClient, createWalletClient, custom, defineChain, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  SCRIT_INDEX_ABI, SCRIT_INDEX_BYTECODE,
  SCRIT_LOT_MARKET_ABI, SCRIT_LOT_MARKET_BYTECODE,
  SCRIT_LOT_TOKEN_ABI, SCRIT_LOT_TOKEN_BYTECODE,
} from "../lib/scrit-artifact";

const chain = defineChain({ id: 46630, name: "sCRIT Local Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://127.0.0.1"] } } });
const keys = [21, 22].map((n) => `0x${n.toString(16).padStart(64, "0")}` as `0x${string}`);
const [seller, buyer] = keys.map((key) => privateKeyToAccount(key));
const lotId = 404n;

describe("Rail B marketplace", () => {
  const provider = ganache.provider({ logging: { quiet: true }, chain: { chainId: chain.id }, wallet: { accounts: keys.map((secretKey) => ({ secretKey, balance: "0x3635C9ADC5DEA00000" })) } });
  const publicClient = createPublicClient({ chain, transport: custom(provider as never) });
  const sellerClient = createWalletClient({ account: seller, chain, transport: custom(provider as never) });
  const buyerClient = createWalletClient({ account: buyer, chain, transport: custom(provider as never) });
  let token: Address; let lots: Address; let market: Address;

  beforeAll(async () => {
    const tokenTx = await sellerClient.deployContract({ abi: SCRIT_INDEX_ABI, bytecode: SCRIT_INDEX_BYTECODE, args: [seller.address, seller.address, seller.address] });
    token = (await publicClient.waitForTransactionReceipt({ hash: tokenTx })).contractAddress!;
    const lotTx = await sellerClient.deployContract({ abi: SCRIT_LOT_TOKEN_ABI, bytecode: SCRIT_LOT_TOKEN_BYTECODE, args: [seller.address, seller.address, seller.address, seller.address, ""] });
    lots = (await publicClient.waitForTransactionReceipt({ hash: lotTx })).contractAddress!;
    const marketTx = await sellerClient.deployContract({ abi: SCRIT_LOT_MARKET_ABI, bytecode: SCRIT_LOT_MARKET_BYTECODE, args: [token, lots] });
    market = (await publicClient.waitForTransactionReceipt({ hash: marketTx })).contractAddress!;
    const mintToken = await sellerClient.writeContract({ address: token, abi: SCRIT_INDEX_ABI, functionName: "mint", args: [buyer.address, 1_000n, `0x${"11".repeat(32)}`] });
    await publicClient.waitForTransactionReceipt({ hash: mintToken });
    const mintLots = await sellerClient.writeContract({ address: lots, abi: SCRIT_LOT_TOKEN_ABI, functionName: "mintLot", args: [seller.address, lotId, `0x${"22".repeat(32)}`] });
    await publicClient.waitForTransactionReceipt({ hash: mintLots });
  }, 30_000);

  afterAll(async () => { await provider.disconnect(); });

  it("escrows asks and bids, settles partial fills at ask price, returns improvement, and refunds cancellations", async () => {
    const approval1155 = await sellerClient.writeContract({ address: lots, abi: SCRIT_LOT_TOKEN_ABI, functionName: "setApprovalForAll", args: [market, true] });
    await publicClient.waitForTransactionReceipt({ hash: approval1155 });
    const askExpiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const askTx = await sellerClient.writeContract({ address: market, abi: SCRIT_LOT_MARKET_ABI, functionName: "placeAsk", args: [lotId, 100n, 2n, askExpiry] });
    expect((await publicClient.waitForTransactionReceipt({ hash: askTx })).status).toBe("success");

    const approveERC20 = await buyerClient.writeContract({ address: token, abi: [{ type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ type: "bool" }] }], functionName: "approve", args: [market, 900n] });
    await publicClient.waitForTransactionReceipt({ hash: approveERC20 });
    const bidTx = await buyerClient.writeContract({ address: market, abi: SCRIT_LOT_MARKET_ABI, functionName: "placeBid", args: [lotId, 100n, 9n, askExpiry] });
    expect((await publicClient.waitForTransactionReceipt({ hash: bidTx })).status).toBe("success");

    const fillTx = await buyerClient.writeContract({ address: market, abi: SCRIT_LOT_MARKET_ABI, functionName: "matchOrders", args: [1n, 2n, 40n] });
    expect((await publicClient.waitForTransactionReceipt({ hash: fillTx })).status).toBe("success");
    expect(await publicClient.readContract({ address: token, abi: SCRIT_INDEX_ABI, functionName: "balanceOf", args: [seller.address] })).toBe(80n);
    expect(await publicClient.readContract({ address: token, abi: SCRIT_INDEX_ABI, functionName: "balanceOf", args: [buyer.address] })).toBe(380n);
    expect(await publicClient.readContract({ address: lots, abi: SCRIT_LOT_TOKEN_ABI, functionName: "balanceOf", args: [buyer.address, lotId] })).toBe(40n);
    expect(await publicClient.readContract({ address: market, abi: SCRIT_LOT_MARKET_ABI, functionName: "orders", args: [1n] })).toMatchObject([seller.address, lotId, 60n, 2n, askExpiry, 0, true]);

    const cancelAsk = await sellerClient.writeContract({ address: market, abi: SCRIT_LOT_MARKET_ABI, functionName: "cancelOrder", args: [1n] });
    expect((await publicClient.waitForTransactionReceipt({ hash: cancelAsk })).status).toBe("success");
    expect(await publicClient.readContract({ address: lots, abi: SCRIT_LOT_TOKEN_ABI, functionName: "balanceOf", args: [seller.address, lotId] })).toBe(60n);
    const cancelBid = await buyerClient.writeContract({ address: market, abi: SCRIT_LOT_MARKET_ABI, functionName: "cancelOrder", args: [2n] });
    expect((await publicClient.waitForTransactionReceipt({ hash: cancelBid })).status).toBe("success");
    expect(await publicClient.readContract({ address: token, abi: SCRIT_INDEX_ABI, functionName: "balanceOf", args: [buyer.address] })).toBe(920n);
    expect(await publicClient.readContract({ address: token, abi: SCRIT_INDEX_ABI, functionName: "balanceOf", args: [buyer.address] })).toBe(920n);
  }, 30_000);
});
