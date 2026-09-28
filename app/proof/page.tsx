"use client";

import { useEffect, useState } from "react";
import { usePilotData } from "@/hooks/usePilotData";
import { PageShell } from "@/components/PageShell";
import { BASKET } from "@/lib/scrit-basket";
import { formatUsd } from "@/lib/nav";
import { Coins, FileCheck2, Scale, ShieldCheck, Warehouse } from "lucide-react";
import { useReserveChainData } from "@/hooks/useReserveChainData";
import { HOOD_MAINNET, HOOD_TESTNET, SCRIT_CHAIN_ID, TAX_ACTIVE } from "@/lib/scrit";
import { calcPremiumPercent } from "@/lib/scrit-market";

const activeNetwork = SCRIT_CHAIN_ID === 4663 ? HOOD_MAINNET : HOOD_TESTNET;

function formatPayload(payload: unknown): string {
  const obj = payload !== null && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
  return Object.entries(obj).map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

function freshness(updatedAt: string): string {
  const age = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(age) || age < 0) return "Unknown";
  const hours = age / 3_600_000;
  return hours >= 24 ? `Stale · ${Math.floor(hours / 24)}d` : `${Math.max(1, Math.floor(hours))}h old`;
}

export default function Proof() {
  const { prices, atts, treasury, holdings, priceMap, reserveUsd, dataStatus } = usePilotData();
  const chain = useReserveChainData();
  const [market, setMarket] = useState<{ status: "ready"; marketPriceUsd: number; marketPriceEth: number; ethUsdSource: string; ethUsdUpdatedAt: string; poolPriceSource: string; blockNumber: string } | { status: "unavailable"; reason: string }>({ status: "unavailable", reason: "loading" });
  const [chainEvents, setChainEvents] = useState<Array<{ event_name: string; tx_hash: string; block_number: string; payload: Record<string, string> }>>([]);
  useEffect(() => {
    let active = true;
    fetch(`/api/events?limit=30&chainId=${SCRIT_CHAIN_ID}`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (active) setChainEvents(data.events ?? []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const readMarket = async () => {
      try {
        const response = await fetch("/api/market", { cache: "no-store" });
        const data = await response.json();
        if (!active) return;
        setMarket(response.ok && data.status === "ready" ? data : { status: "unavailable", reason: data.reason ?? "market_unavailable" });
      } catch {
        if (active) setMarket({ status: "unavailable", reason: "market_unavailable" });
      }
    };
    void readMarket();
    const timer = window.setInterval(readMarket, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const totalMass = Object.values(holdings).reduce((sum, mass) => sum + mass, 0);
  const pricesComplete = BASKET.every((row) => prices.some((p) => p.commodity === row.symbol));
  const onchainReserveUsd = chain.status === "ready" && chain.reserveValueUsdE8 !== null ? Number(chain.reserveValueUsdE8 ?? 0n) / 1e8 : null;
  const onchainSupply = chain.status === "ready" && (chain.supplyE18 ?? 0n) > 0n ? Number(chain.supplyE18 ?? 0n) / 1e18 : null;
  const liveNavUsd = onchainReserveUsd !== null && onchainSupply !== null ? onchainReserveUsd / onchainSupply : null;
  const premiumPercent = market.status === "ready" && liveNavUsd !== null ? calcPremiumPercent(market.marketPriceUsd, liveNavUsd) : null;

  return (
    <PageShell>
      <header className="proof-page-head scrit-reveal">
        <p className="eyebrow">Pilot Reserve Ledger · Service-Verified Records</p>
        <h1>Evidence, estimates,<br /><em>and the status between them.</em></h1>
        <p>This page estimates reserve value from records accepted by the pilot service and manual commodity prices. Basket weights are targets; this page does not establish contracted vault custody or on-chain reserve balances.</p>
      </header>

      <section className="proof-summary-grid" aria-label="Current pilot summary">
        <article className="panel proof-summary-card scrit-reveal"><Scale /><span className="proof-label">NAV per sCRIT · USD</span><strong>{liveNavUsd === null ? "Unavailable" : formatUsd(liveNavUsd, 6)}</strong><small>{liveNavUsd === null ? "Needs live on-chain reserve value and supply." : "On-chain reserve value ÷ on-chain supply."}</small></article>
        <article className="panel proof-summary-card scrit-reveal"><Coins /><span className="proof-label">Market · premium / discount</span><strong>{market.status === "ready" ? formatUsd(market.marketPriceUsd, 6) : "Unavailable"}</strong><small>{market.status === "ready" ? `${market.marketPriceEth.toPrecision(5)} ETH / sCRIT · ${premiumPercent === null ? "NAV comparison unavailable" : `${premiumPercent >= 0 ? "+" : ""}${premiumPercent.toFixed(2)}% ${premiumPercent >= 0 ? "premium" : "discount"} to NAV`}` : "Price unavailable until mainnet pool and ETH/USD source are ready."}</small></article>
        <article className="panel proof-summary-card scrit-reveal"><Coins /><span className="proof-label">Reported reserve value</span><strong>{dataStatus !== "ready" ? "Unavailable" : pricesComplete ? formatUsd(reserveUsd) : "—"}</strong><small>{pricesComplete ? "From accepted records × manual prices" : "All nine manual prices are required"}</small></article>
        <article className="panel proof-summary-card scrit-reveal"><Scale /><span className="proof-label">Reported mass</span><strong>{dataStatus === "ready" ? `${totalMass.toFixed(4)} kg` : "Unavailable"}</strong><small>Sum of service-accepted batch records</small></article>
        <article className="panel proof-summary-card scrit-reveal"><ShieldCheck /><span className="proof-label">Attestation batches</span><strong>{dataStatus === "ready" ? atts.length : "Unavailable"}</strong><small>Signature checked by pilot service</small></article>
        <article className="panel proof-summary-card scrit-reveal"><Warehouse /><span className="proof-label">Custody registry</span><strong>Demo-only</strong><small>No contracted custodian represented</small></article>
      </section>
      <p className="proof-method-note">Market source: {market.status === "ready" ? `${market.poolPriceSource}; ${market.ethUsdSource} updated ${freshness(market.ethUsdUpdatedAt)}.` : "Canonical mainnet market not configured or its quote is unavailable."} Spot price is indicative and can be distorted by low liquidity.</p>

      <section className="panel proof-section scrit-reveal" id="onchain-reserve">
        <div className="proof-section-head"><div><span className="eyebrow">{activeNetwork.name.toUpperCase()} · ON-CHAIN RECORDS</span><h2>Reserve manager v2</h2></div><span className="proof-section-note">{activeNetwork.name} · chain {activeNetwork.id}</span></div>
        {chain.status === "unconfigured" ? <div className="proof-empty"><ShieldCheck /><div><b>v2 contracts not configured</b><span>The legacy pilot ledger above is off-chain. No on-chain v2 reserve value is inferred.</span></div></div>
          : chain.status === "loading" ? <div className="proof-empty"><ShieldCheck /><div><b>Reading {activeNetwork.name} contracts</b><span>Waiting for the configured token and reserve manager.</span></div></div>
            : chain.status === "unavailable" ? <div className="proof-empty"><ShieldCheck /><div><b>{activeNetwork.name} contracts unavailable</b><span>RPC read failed or the configured address is not the sCRIT v2 deployment.</span></div></div>
              : <>
                <div className="proof-summary-grid">
                  <article className="panel proof-summary-card"><Coins /><span className="proof-label">On-chain reserve estimate</span><strong>{chain.reserveValueUsdE8 === null ? "Price unavailable" : formatUsd(Number(chain.reserveValueUsdE8 ?? 0n) / 1e8)}</strong><small>{chain.reserveValueUsdE8 === null ? "One or more signed commodity prices are missing or stale." : "Repriced from attested mass × current signed feed; not an independent audit."}</small></article>
                  <article className="panel proof-summary-card"><Scale /><span className="proof-label">On-chain supply</span><strong>{(Number(chain.supplyE18 ?? 0n) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 4 })}</strong><small>From the sCRIT v2 token contract.</small></article>
                  <article className="panel proof-summary-card"><Warehouse /><span className="proof-label">Last read block</span><strong>{chain.blockNumber?.toString()}</strong><small>{activeNetwork.name} read · block explorer records are authoritative.</small></article>
                </div>
                <p className="proof-intro" style={{ marginTop: 14, overflowWrap: "anywhere" }}>Reserve manager: <code>{chain.reserveManager}</code> · Token: <code>{chain.token}</code></p>
                <div className="proof-table-wrap"><table className="dtable"><thead><tr><th>Commodity</th><th className="num">On-chain attested mass</th></tr></thead><tbody>{BASKET.map((row) => <tr key={row.symbol}><td>{row.symbol} · {row.name}</td><td className="num">{(Number(chain.holdingsKgE12?.[row.symbol] ?? 0n) / 1e12).toLocaleString("en-US", { maximumFractionDigits: 6 })} kg</td></tr>)}</tbody></table></div>
                <p className="proof-method-note">The contract sums only signed batch records, but trusts custodian signatures and operator supplied prices. These reads do not establish physical delivery or redeemability. Pilot sCRIT is not pegged and has no redemption.</p>
              </>}
      </section>

      <section className="panel proof-section scrit-reveal" id="holdings">
        <div className="proof-section-head"><div><span className="eyebrow">01 · Valuation inputs</span><h2>Basket and price records</h2></div><span className="proof-section-note">Nine design targets · no custody implied</span></div>
        <div className="proof-table-wrap"><table className="dtable"><thead><tr><th>Commodity</th><th>Grade target</th><th className="num">Target weight</th><th className="num">Recorded mass</th><th className="num">Price / kg</th><th>Source · freshness</th><th className="num">Estimated value</th></tr></thead><tbody>
          {BASKET.map((row) => {
            const price = priceMap[row.symbol] ?? 0;
            const priceRow = prices.find((p) => p.commodity === row.symbol);
            return <tr key={row.symbol}><td><b>{row.symbol}</b><small className="proof-table-sub">{row.name} · {row.assetClass}</small></td><td>{row.grade}</td><td className="num">{row.weightBps / 100}%</td><td className="num">{dataStatus === "ready" ? `${(holdings[row.symbol] ?? 0).toFixed(4)} kg` : "—"}</td><td className="num">{priceRow ? formatUsd(price, 0) : "—"}</td><td>{priceRow ? `${priceRow.source} · ${freshness(priceRow.updated_at)}` : "No price record"}</td><td className="num">{priceRow ? formatUsd((holdings[row.symbol] ?? 0) * price, 2) : "—"}</td></tr>;
          })}
        </tbody></table></div>
        <p className="proof-method-note">On-chain NAV per sCRIT: <b>{liveNavUsd === null ? "Unavailable" : formatUsd(liveNavUsd, 6)}</b>. {premiumPercent === null ? "Premium/discount is unavailable until both current on-chain NAV and canonical sCRIT/ETH market price are readable." : `Current market is ${premiumPercent >= 0 ? "above" : "below"} NAV by ${Math.abs(premiumPercent).toFixed(2)}%.`} The spot market price is not an oracle or redemption value.</p>
      </section>

      <section className="panel proof-section scrit-reveal" id="attestations">
        <div className="proof-section-head"><div><span className="eyebrow">02 · Signed batch records</span><h2>Attestation ledger</h2></div><span className="proof-section-note">{atts.length} record{atts.length === 1 ? "" : "s"}</span></div>
        <p className="proof-intro">The pilot service checks the EIP-712 signature against a registered demo key and its commodity scope before saving the batch. The record is off-chain; the page does not independently verify physical delivery.</p>
        {dataStatus !== "ready" ? <div className="proof-empty"><FileCheck2 /><div><b>Record service unavailable</b><span>Ledger data could not be loaded. No zero balance is inferred.</span></div></div> : atts.length === 0 ? <div className="proof-empty"><FileCheck2 /><div><b>No accepted attestation records yet</b><span>No physical reserve is inferred from an empty ledger.</span></div></div> : <div className="proof-table-wrap"><table className="dtable"><thead><tr><th>Batch ID</th><th>Asset</th><th className="num">Mass</th><th>Vault label submitted</th><th>Certificate reference</th><th>Record status</th></tr></thead><tbody>{atts.map((row) => <tr key={row.batch_id}><td><b>{row.batch_id}</b></td><td>{row.commodity}</td><td className="num">{row.mass_kg} kg</td><td>{row.vault_id || "—"}</td><td className="proof-hash">{row.certificate_hash || "—"}</td><td><span className="proof-status">Accepted by pilot API</span></td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel proof-section scrit-reveal" id="chain-events">
        <div className="proof-section-head"><div><span className="eyebrow">INDEXER · CONFIRMED TESTNET LOGS</span><h2>Contract event stream</h2></div><span className="proof-section-note">5 confirmation target · database indexed</span></div>
        {chainEvents.length === 0 ? <div className="proof-empty"><FileCheck2 /><div><b>No indexed contract events</b><span>Configure v2 contract addresses and run the event indexer. An empty event list does not imply a zero chain history.</span></div></div> : <div className="proof-table-wrap"><table className="dtable"><thead><tr><th>Event</th><th>Block</th><th>Transaction</th><th>Indexed fields</th></tr></thead><tbody>{chainEvents.map((event, index) => <tr key={`${event.tx_hash}-${index}`}><td>{event.event_name}</td><td>{event.block_number}</td><td className="proof-hash">{event.tx_hash}</td><td>{formatPayload(event.payload)}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel proof-section scrit-reveal" id="treasury">
        <div className="proof-section-head"><div><span className="eyebrow">03 · Verified token transfers</span><h2>Treasury entries</h2></div><span className="proof-section-note">Receipt checked on configured chain</span></div>
        <p className="proof-intro">Rail A has no issuance fee. Entries shown here are token transfers to the configured treasury, recorded only after the server verifies the transaction receipt. Mainnet project-pool swap fees are indexed from the V4 hook event; collected tokens remain unspent treasury until procurement and attestation.</p>
        {dataStatus !== "ready" ? <div className="proof-empty"><Coins /><div><b>Record service unavailable</b><span>Treasury data could not be loaded.</span></div></div> : treasury.length === 0 ? <div className="proof-empty"><Coins /><div><b>No verified treasury transfers recorded</b><span>There are no verified transfer receipts in the ledger.</span></div></div> : <div className="proof-table-wrap"><table className="dtable"><thead><tr><th>Entry type</th><th>Amount</th><th>Transaction hash</th><th>Note</th><th>Recorded</th></tr></thead><tbody>{treasury.map((row, i) => <tr key={`${row.tx_hash}-${i}`}><td>{row.kind}</td><td>{row.amount_text}</td><td className="proof-hash">{row.tx_hash || "—"}</td><td>{row.note || "—"}</td><td suppressHydrationWarning>{row.created_at ? new Date(row.created_at).toLocaleString("en-US") : "—"}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel proof-section scrit-reveal" id="evidence">
        <div className="proof-section-head"><div><span className="eyebrow">04 · What is established here</span><h2>Evidence and open items</h2></div></div>
        <div className="proof-evidence-list">
          <div><span>Custodian registry</span><b>Demo-only registrations · Au / Ag / Pt pilot scopes</b><small>No contracted custodian agreement is represented by this page.</small></div>
          <div><span>Physical audit</span><b>No audit report linked</b><small>Do not treat target weights or sample imagery as proof of allocated bars.</small></div>
          <div><span>Reserve calculation</span><b>Off-chain pilot service</b><small>Mass and NAV shown here are not stored in a reserve smart contract.</small></div>
          <div><span>Price inputs</span><b>Manual team feed</b><small>Values older than 24 hours are marked stale in the holdings table.</small></div>
          <div><span>Project-pool fee</span><b>{TAX_ACTIVE ? "2.5% · V4 hook" : SCRIT_CHAIN_ID === 4663 ? "2.5% target · not deployed" : "0% · V3 testnet"}</b><small>When active: 75% reserve treasury / 25% operations. Fee collection alone does not increase reserve value.</small></div>
          <div><span>Redemption</span><b>None in the pilot</b><small>sCRIT is not pegged; no AP is active in this implementation.</small></div>
        </div>
      </section>
    </PageShell>
  );
}
