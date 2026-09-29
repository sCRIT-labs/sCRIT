"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, defineChain, formatEther, http, parseEther, parseAbi, type Address, type WalletClient } from "viem";
import { PageShell } from "@/components/PageShell";
import { SCRIT_LOT_MARKET_ABI, SCRIT_LOT_TOKEN_ABI } from "@/lib/scrit-artifact";
import { HOOD_MAINNET, HOOD_TESTNET, SCRIT_CHAIN_ID, scritDeploymentFor } from "@/lib/scrit";

type Order = { id: bigint; maker: Address; lotId: bigint; remaining: bigint; price: bigint; expiry: bigint; side: number; active: boolean };
type EthereumProvider = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
declare global { interface Window { ethereum?: EthereumProvider } }

const activeNetwork = SCRIT_CHAIN_ID === 4663 ? HOOD_MAINNET : HOOD_TESTNET;
const chain = defineChain({ id: activeNetwork.id, name: activeNetwork.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [activeNetwork.rpc] } }, blockExplorers: { default: { name: "Robinhood Explorer", url: activeNetwork.explorer } } });
const publicClient = createPublicClient({ chain, transport: http() });
const scritAbi = parseAbi(["function approve(address,uint256) returns (bool)"]);
const deployment = scritDeploymentFor(SCRIT_CHAIN_ID);
const marketplace = deployment.lotMarketplace as Address;
const lotToken = deployment.lotToken as Address;
const scritToken = deployment.token as Address;
const valid = (address?: string) => Boolean(address && /^0x[0-9a-fA-F]{40}$/.test(address) && !/^0x0{40}$/i.test(address));

export default function LotsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [account, setAccount] = useState<Address>();
  const [wallet, setWallet] = useState<WalletClient>();
  const [lotId, setLotId] = useState("");
  const [fractions, setFractions] = useState("100");
  const [price, setPrice] = useState("");
  const [fillId, setFillId] = useState("");
  const [fillAmount, setFillAmount] = useState("100");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = valid(marketplace) && valid(lotToken) && valid(scritToken);

  const refresh = useCallback(async () => {
    if (!configured) return;
    try {
      const nextId = await publicClient.readContract({ address: marketplace!, abi: SCRIT_LOT_MARKET_ABI, functionName: "nextOrderId" });
      const ids = Array.from({ length: Math.min(Number(nextId - 1n), 100) }, (_, index) => BigInt(index + 1));
      const results = await Promise.all(ids.map((id) => publicClient.readContract({ address: marketplace!, abi: SCRIT_LOT_MARKET_ABI, functionName: "orders", args: [id] })));
      setOrders(results.map((row, index) => ({ id: ids[index], maker: row[0], lotId: row[1], remaining: row[2], price: row[3], expiry: row[4], side: row[5], active: row[6] })).filter((order) => order.active && order.expiry >= BigInt(Math.floor(Date.now() / 1000))));
    } catch { setStatus(`Could not read the configured ${activeNetwork.name} order book.`); }
  }, [configured]);

  useEffect(() => { void refresh(); const timer = window.setInterval(refresh, 15_000); return () => window.clearInterval(timer); }, [refresh]);

  async function connect() {
    const { getActiveEvmProvider, walletLabel } = await import("@/lib/wallets");
    const provider = getActiveEvmProvider();
    if (!provider) { setStatus("Install an EVM wallet to use the sCRIT order book."); return; }
    try {
      const chainId = await provider.request({ method: "eth_chainId" });
      if (Number(chainId) !== chain.id) {
        const chainHex = `0x${chain.id.toString(16)}`;
        try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] }); }
        catch { setStatus(`Switch your wallet to ${activeNetwork.name} (${chain.id}).`); return; }
      }
      const addresses = await provider.request({ method: "eth_requestAccounts" }) as Address[];
      const client = createWalletClient({ account: addresses[0], chain, transport: custom(provider as never) });
      setAccount(addresses[0]); setWallet(client); setStatus(`Wallet connected to ${activeNetwork.name}.`);
    } catch (e: unknown) { setStatus(walletLabel(e)); }
  }

  async function place(side: "ask" | "bid") {
    if (!wallet || !account || !configured) { setStatus(`Connect a wallet after ${activeNetwork.name} contracts are configured.`); return; }
    if (!/^\d+$/.test(lotId) || BigInt(lotId) <= 0n || !/^\d+$/.test(fractions) || BigInt(fractions) <= 0n || BigInt(fractions) > 100n || !/^\d+(?:\.\d{1,18})?$/.test(price) || parseEther(price) <= 0n) { setStatus("Enter a valid lot ID, 1–100 units, and a positive sCRIT price per unit."); return; }
    setLoading(true);
    try {
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);
      if (side === "ask") {
        const approval = await wallet.writeContract({ account: account!, chain, address: lotToken!, abi: SCRIT_LOT_TOKEN_ABI, functionName: "setApprovalForAll", args: [marketplace!, true] });
        await publicClient.waitForTransactionReceipt({ hash: approval });
      } else {
        const approval = await wallet.writeContract({ account: account!, chain, address: scritToken!, abi: scritAbi, functionName: "approve", args: [marketplace!, BigInt(fractions) * parseEther(price)] });
        await publicClient.waitForTransactionReceipt({ hash: approval });
      }
      const hash = side === "ask"
        ? await wallet.writeContract({ account: account!, chain, address: marketplace!, abi: SCRIT_LOT_MARKET_ABI, functionName: "placeAsk", args: [BigInt(lotId), BigInt(fractions), parseEther(price), expiry] })
        : await wallet.writeContract({ account: account!, chain, address: marketplace!, abi: SCRIT_LOT_MARKET_ABI, functionName: "placeBid", args: [BigInt(lotId), BigInt(fractions), parseEther(price), expiry] });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(`Order confirmed: ${hash}`); await refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Order failed."); }
    finally { setLoading(false); }
  }

  async function match(ask: Order, bid: Order) {
    if (!wallet || !account || !configured) return;
    const fill = BigInt(fillAmount);
    if (ask.lotId !== bid.lotId || bid.price < ask.price || fill <= 0n || fill > ask.remaining || fill > bid.remaining) { setStatus("Ask and bid must match the lot and price; fill must fit both open amounts."); return; }
    setLoading(true);
    try {
      const hash = await wallet.writeContract({ account: account!, chain, address: marketplace!, abi: SCRIT_LOT_MARKET_ABI, functionName: "matchOrders", args: [ask.id, bid.id, fill] });
      await publicClient.waitForTransactionReceipt({ hash }); setStatus(`Fill confirmed: ${hash}`); await refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Order match failed."); }
    finally { setLoading(false); }
  }

  async function cancel(order: Order) {
    if (!wallet || !account || order.maker.toLowerCase() !== account.toLowerCase()) return;
    setLoading(true);
    try {
      const hash = await wallet.writeContract({ account, chain, address: marketplace!, abi: SCRIT_LOT_MARKET_ABI, functionName: "cancelOrder", args: [order.id] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Cancellation transaction reverted.");
      setStatus(`Order ${order.id} cancelled and escrow returned.`);
      await refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Order cancellation failed."); }
    finally { setLoading(false); }
  }

  const book = useMemo(() => orders.toSorted((a, b) => a.price < b.price ? -1 : a.price > b.price ? 1 : 0), [orders]);
  return <PageShell>
    <header className="proof-page-head scrit-reveal"><p className="eyebrow">RAIL B · {activeNetwork.name.toUpperCase()} ORDER BOOK</p><h1>Certified lots, <em>fractionalised into 100 units.</em></h1><p>Orders settle in sCRIT on {activeNetwork.name}. Demo/testnet records do not prove item authenticity, custody, liquidity, or redemption.</p></header>
    {!configured ? <section className="panel proof-section"><h2>{activeNetwork.name} contracts are not configured</h2><p>Deploy the sCRIT stack and set the network-specific Rail B addresses before using this screen.</p></section> : <>
      <section className="panel proof-section"><div className="proof-section-head"><div><span className="eyebrow">WALLET</span><h2>{account ? `${account.slice(0, 8)}…${account.slice(-6)}` : `Connect to ${activeNetwork.name}`}</h2></div><button className="btn btn-gold" disabled={loading} onClick={connect}>{account ? "Connected" : "Connect wallet"}</button></div><p className="proof-intro">Lot token: {lotToken}<br />sCRIT: {scritToken}<br />Marketplace: {marketplace}</p>{status && <p role="status" className="proof-intro">{status}</p>}</section>
      <section className="panel proof-section">
        <div className="proof-section-head">
          <div><span className="eyebrow">ORDER ENTRY</span><h2>Place a limit order</h2></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div>
            <label className="launch-field-label">Lot ID <span>ERC-1155 Token</span></label>
            <input className="field" inputMode="numeric" placeholder="e.g. 1" value={lotId} onChange={(event) => setLotId(event.target.value)} />
          </div>
          <div>
            <label className="launch-field-label">Fractions <span>Max 100 units</span></label>
            <input className="field" inputMode="numeric" placeholder="100" value={fractions} onChange={(event) => setFractions(event.target.value)} />
          </div>
          <div>
            <label className="launch-field-label">Price per fraction <span>sCRIT units</span></label>
            <input className="field" inputMode="decimal" placeholder="e.g. 25.5" value={price} onChange={(event) => setPrice(event.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button className="btn btn-ghost" disabled={loading || !account} onClick={() => place("ask")}>Place Ask (Sell)</button>
          <button className="btn btn-gold" disabled={loading || !account} onClick={() => place("bid")}>Place Bid (Buy)</button>
        </div>
        <p className="proof-method-note">Asks escrow ERC-1155 units; bids escrow sCRIT. Prices include no platform fee. Expired orders can be cancelled by their maker; open orders are public.</p>
      </section>
      <section className="panel proof-section">
        <div className="proof-section-head">
          <div><span className="eyebrow">OPEN ORDERS</span><h2>{activeNetwork.name} Order Book</h2></div>
          <button className="btn btn-ghost" onClick={() => void refresh()}>Refresh</button>
        </div>
        {book.length === 0 ? (
          <div className="proof-empty">
            <div><b>No active orders read</b><span>Order book is empty or contract data is unavailable.</span></div>
          </div>
        ) : (
          <div className="proof-table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Side</th>
                  <th>Lot ID</th>
                  <th>Open fractions</th>
                  <th>Price / unit</th>
                  <th>Maker</th>
                  <th>Expiry</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {book.map((order) => (
                  <tr key={order.id.toString()}>
                    <td>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 7px",
                        borderRadius: 3,
                        fontWeight: 650,
                        fontSize: 11,
                        background: order.side === 0 ? "rgba(220, 38, 38, 0.1)" : "rgba(184, 150, 46, 0.12)",
                        color: order.side === 0 ? "#b91c1c" : "#8c6418",
                      }}>
                        {order.side === 0 ? "ASK" : "BID"}
                      </span>
                    </td>
                    <td className="mono-sm"><b>Lot #{order.lotId.toString()}</b></td>
                    <td className="mono-sm">{order.remaining.toString()} / 100</td>
                    <td className="mono-sm"><b>{formatEther(order.price)} sCRIT</b></td>
                    <td className="mono-sm">{order.maker.slice(0, 8)}…{order.maker.slice(-6)}</td>
                    <td className="mono-sm" suppressHydrationWarning>{new Date(Number(order.expiry) * 1000).toLocaleString("en-US")}</td>
                    <td>{account && order.maker.toLowerCase() === account.toLowerCase() && <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} disabled={loading} onClick={() => void cancel(order)}>Cancel</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, alignItems: "end", marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(24,26,24,0.1)" }}>
          <div>
            <label className="launch-field-label">Fill fractions <span>Units</span></label>
            <input className="field" inputMode="numeric" value={fillAmount} onChange={(event) => setFillAmount(event.target.value)} />
          </div>
          <div>
            <label className="launch-field-label">Ask order ID <span>Order #</span></label>
            <input className="field" inputMode="numeric" placeholder="e.g. 1" value={fillId} onChange={(event) => setFillId(event.target.value)} />
          </div>
          <button className="btn btn-gold" style={{ height: 46 }} disabled={loading || !account} onClick={() => { if (!/^\d+$/.test(fillId)) { setStatus("Enter a valid ask order ID."); return; } const ask = book.find((order) => order.id === BigInt(fillId) && order.side === 0); const bid = book.filter((order) => order.side === 1 && ask && order.lotId === ask.lotId && order.price >= ask.price).toSorted((a, b) => a.price > b.price ? -1 : 1)[0]; if (!ask || !bid) { setStatus("No compatible open bid found for this ask."); return; } void match(ask, bid); }}>Match ask with best bid</button>
        </div>
      </section>
      <section className="panel proof-section"><div className="proof-section-head"><div><span className="eyebrow">PHYSICAL REDEMPTION</span><h2>KYC and delivery workflow</h2></div></div><p className="proof-intro">The testnet contracts provide a KYC approval interface and request → approved → shipped → completed state machine. This app does not yet connect a production KYC provider or carrier, and a testnet status is not proof of physical delivery. sCRIT itself remains non-redeemable.</p></section>
    </>}
  </PageShell>;
}
