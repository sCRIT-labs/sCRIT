"use client";

import { usePilotData } from "@/hooks/usePilotData";
import { PageShell } from "@/components/PageShell";
import { BASKET } from "@/lib/scrit-basket";
import { formatUsd } from "@/lib/nav";
import { Coins, FileCheck2, Scale, ShieldCheck, Warehouse } from "lucide-react";

function freshness(updatedAt: string): string {
  const age = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(age) || age < 0) return "Unknown";
  const hours = age / 3_600_000;
  return hours >= 24 ? `Stale · ${Math.floor(hours / 24)}d` : `${Math.max(1, Math.floor(hours))}h old`;
}

export default function Proof() {
  const { prices, atts, treasury, holdings, priceMap, reserveUsd, navUsd, dataStatus } = usePilotData();
  const totalMass = Object.values(holdings).reduce((sum, mass) => sum + mass, 0);
  const pricesComplete = ["Au", "Ag", "Pt"].every((commodity) => prices.some((p) => p.commodity === commodity));

  return (
    <PageShell>
      <header className="proof-page-head scrit-reveal">
        <p className="eyebrow">Pilot Reserve Ledger · Service-Verified Records</p>
        <h1>Evidence, estimates,<br /><em>and the status between them.</em></h1>
        <p>This page estimates reserve value from records accepted by the pilot service and manual commodity prices. Basket weights are targets; this page does not establish contracted vault custody or on-chain reserve balances.</p>
      </header>

      <section className="proof-summary-grid" aria-label="Current pilot summary">
        <article className="panel proof-summary-card scrit-reveal"><Coins /><span className="proof-label">Reported reserve value</span><strong>{dataStatus !== "ready" ? "Unavailable" : pricesComplete ? formatUsd(reserveUsd) : "—"}</strong><small>{pricesComplete ? "From accepted records × manual prices" : "All three manual prices are required"}</small></article>
        <article className="panel proof-summary-card scrit-reveal"><Scale /><span className="proof-label">Reported mass</span><strong>{dataStatus === "ready" ? `${totalMass.toFixed(4)} kg` : "Unavailable"}</strong><small>Sum of service-accepted batch records</small></article>
        <article className="panel proof-summary-card scrit-reveal"><ShieldCheck /><span className="proof-label">Attestation batches</span><strong>{dataStatus === "ready" ? atts.length : "Unavailable"}</strong><small>Signature checked by pilot service</small></article>
        <article className="panel proof-summary-card scrit-reveal"><Warehouse /><span className="proof-label">Custody registry</span><strong>Demo-only</strong><small>No contracted custodian represented</small></article>
      </section>

      <section className="panel proof-section scrit-reveal" id="holdings">
        <div className="proof-section-head"><div><span className="eyebrow">01 · Valuation inputs</span><h2>Basket and price records</h2></div><span className="proof-section-note">Target weights · Au 60 / Ag 25 / Pt 15</span></div>
        <div className="proof-table-wrap"><table className="dtable"><thead><tr><th>Commodity</th><th>Grade target</th><th className="num">Target weight</th><th className="num">Recorded mass</th><th className="num">Price / kg</th><th>Source · freshness</th><th className="num">Estimated value</th></tr></thead><tbody>
          {BASKET.map((row) => {
            const price = priceMap[row.symbol] ?? 0;
            const priceRow = prices.find((p) => p.commodity === row.symbol);
            return <tr key={row.symbol}><td><b>{row.symbol}</b><small className="proof-table-sub">{row.symbol === "Au" ? "Gold" : row.symbol === "Ag" ? "Silver" : "Platinum"}</small></td><td>{row.grade}</td><td className="num">{row.weightBps / 100}%</td><td className="num">{dataStatus === "ready" ? `${(holdings[row.symbol] ?? 0).toFixed(4)} kg` : "—"}</td><td className="num">{priceRow ? formatUsd(price, 0) : "—"}</td><td>{priceRow ? `${priceRow.source} · ${freshness(priceRow.updated_at)}` : "No price record"}</td><td className="num">{priceRow ? formatUsd((holdings[row.symbol] ?? 0) * price, 2) : "—"}</td></tr>;
          })}
        </tbody></table></div>
        <p className="proof-method-note">Indicative NAV per sCRIT: <b>{dataStatus !== "ready" ? "Unavailable" : pricesComplete ? formatUsd(navUsd, 6) : "—"}</b>. Calculation uses the configured pilot supply and off-chain records; it is not a market quote or redemption value.</p>
      </section>

      <section className="panel proof-section scrit-reveal" id="attestations">
        <div className="proof-section-head"><div><span className="eyebrow">02 · Signed batch records</span><h2>Attestation ledger</h2></div><span className="proof-section-note">{atts.length} record{atts.length === 1 ? "" : "s"}</span></div>
        <p className="proof-intro">The pilot service checks the EIP-712 signature against a registered demo key and its commodity scope before saving the batch. The record is off-chain; the page does not independently verify physical delivery.</p>
        {dataStatus !== "ready" ? <div className="proof-empty"><FileCheck2 /><div><b>Record service unavailable</b><span>Ledger data could not be loaded. No zero balance is inferred.</span></div></div> : atts.length === 0 ? <div className="proof-empty"><FileCheck2 /><div><b>No accepted attestation records yet</b><span>No physical reserve is inferred from an empty ledger.</span></div></div> : <div className="proof-table-wrap"><table className="dtable"><thead><tr><th>Batch ID</th><th>Asset</th><th className="num">Mass</th><th>Vault label submitted</th><th>Certificate reference</th><th>Record status</th></tr></thead><tbody>{atts.map((row) => <tr key={row.batch_id}><td><b>{row.batch_id}</b></td><td>{row.commodity}</td><td className="num">{row.mass_kg} kg</td><td>{row.vault_id || "—"}</td><td className="proof-hash">{row.certificate_hash || "—"}</td><td><span className="proof-status">Accepted by pilot API</span></td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel proof-section scrit-reveal" id="treasury">
        <div className="proof-section-head"><div><span className="eyebrow">03 · Verified token transfers</span><h2>Treasury entries</h2></div><span className="proof-section-note">Receipt checked on configured chain</span></div>
        <p className="proof-intro">Rail A has no issuance fee in the pilot. Entries shown here are token transfers to the configured treasury, recorded only after the server verifies the transaction receipt. Project-pool swap tax is 0%.</p>
        {dataStatus !== "ready" ? <div className="proof-empty"><Coins /><div><b>Record service unavailable</b><span>Treasury data could not be loaded.</span></div></div> : treasury.length === 0 ? <div className="proof-empty"><Coins /><div><b>No verified treasury transfers recorded</b><span>There are no verified transfer receipts in the ledger.</span></div></div> : <div className="proof-table-wrap"><table className="dtable"><thead><tr><th>Entry type</th><th>Amount</th><th>Transaction hash</th><th>Note</th><th>Recorded</th></tr></thead><tbody>{treasury.map((row, i) => <tr key={`${row.tx_hash}-${i}`}><td>{row.kind}</td><td>{row.amount_text}</td><td className="proof-hash">{row.tx_hash || "—"}</td><td>{row.note || "—"}</td><td>{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel proof-section scrit-reveal" id="evidence">
        <div className="proof-section-head"><div><span className="eyebrow">04 · What is established here</span><h2>Evidence and open items</h2></div></div>
        <div className="proof-evidence-list">
          <div><span>Custodian registry</span><b>Demo-only registrations · Au / Ag / Pt pilot scopes</b><small>No contracted custodian agreement is represented by this page.</small></div>
          <div><span>Physical audit</span><b>No audit report linked</b><small>Do not treat target weights or sample imagery as proof of allocated bars.</small></div>
          <div><span>Reserve calculation</span><b>Off-chain pilot service</b><small>Mass and NAV shown here are not stored in a reserve smart contract.</small></div>
          <div><span>Price inputs</span><b>Manual team feed</b><small>Values older than 24 hours are marked stale in the holdings table.</small></div>
          <div><span>Swap tax</span><b>0% in the pilot</b><small>The 2.5% / 75-25 model is a post-audit target, not an active hook.</small></div>
          <div><span>Redemption</span><b>None in the pilot</b><small>sCRIT is not pegged; no AP is active in this implementation.</small></div>
        </div>
      </section>
    </PageShell>
  );
}
