"use client";

import { useEffect, useState } from "react";
import { usePilotData } from "@/hooks/usePilotData";
import { PageShell } from "@/components/PageShell";
import { VerificationToolbar } from "@/components/VerificationToolbar";
import { BASKET } from "@/lib/scrit-basket";
import { formatUsd } from "@/lib/nav";
import {
  Activity,
  Clock,
  Coins,
  ExternalLink,
  FileCheck2,
  Layers,
  Scale,
  ShieldCheck,
  TrendingUp,
  Warehouse,
  RefreshCw,
} from "lucide-react";
import { useReserveChainData } from "@/hooks/useReserveChainData";
import { HOOD_MAINNET, HOOD_TESTNET, SCRIT_CHAIN_ID, TAX_ACTIVE } from "@/lib/scrit";
import { calcPremiumPercent } from "@/lib/scrit-market";
import { WEEK_3_REPORT, verifyReportHash, type ReportVerification } from "@/lib/reports/anchored-reports";

const activeNetwork = SCRIT_CHAIN_ID === 4663 ? HOOD_MAINNET : HOOD_TESTNET;

function renderPayload(payload: unknown) {
  const obj =
    payload !== null && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const entries = Object.entries(obj);
  if (entries.length === 0) return <span style={{ color: "#8a9185" }}>-</span>;
  return (
    <div className="proof-payload-tags">
      {entries.map(([key, value]) => (
        <span key={key} className="proof-payload-chip">
          <span className="key">{key}:</span>
          <span className="val">{String(value)}</span>
        </span>
      ))}
    </div>
  );
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
  const [market, setMarket] = useState<
    | {
        status: "ready";
        marketPriceUsd: number;
        marketPriceEth: number;
        ethUsdSource: string;
        ethUsdUpdatedAt: string;
        poolPriceSource: string;
        blockNumber: string;
      }
    | { status: "unavailable"; reason: string }
  >({ status: "unavailable", reason: "loading" });
  const [chainEvents, setChainEvents] = useState<
    Array<{ event_name: string; tx_hash: string; block_number: string; payload: Record<string, string> }>
  >([]);
  const [reportVerification, setReportVerification] = useState<ReportVerification>(() =>
    verifyReportHash(WEEK_3_REPORT)
  );
  const [isVerifyingReport, setIsVerifyingReport] = useState(false);

  function reVerifyReport() {
    setIsVerifyingReport(true);
    setTimeout(() => {
      const res = verifyReportHash(WEEK_3_REPORT);
      setReportVerification(res);
      setIsVerifyingReport(false);
    }, 300);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/events?limit=30&chainId=${SCRIT_CHAIN_ID}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (active) setChainEvents(data.events ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const readMarket = async () => {
      try {
        const response = await fetch("/api/market", { cache: "no-store" });
        const data = await response.json();
        if (!active) return;
        setMarket(
          response.ok && data.status === "ready"
            ? data
            : { status: "unavailable", reason: data.reason ?? "market_unavailable" }
        );
      } catch {
        if (active) setMarket({ status: "unavailable", reason: "market_unavailable" });
      }
    };
    void readMarket();
    const timer = window.setInterval(readMarket, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const totalMass = Object.values(holdings).reduce((sum, mass) => sum + mass, 0);
  const pricesComplete = BASKET.every((row) => prices.some((p) => p.commodity === row.symbol));
  const onchainReserveUsd =
    chain.status === "ready" && chain.reserveValueUsdE8 !== null
      ? Number(chain.reserveValueUsdE8 ?? 0n) / 1e8
      : null;
  const onchainSupply =
    chain.status === "ready" && (chain.supplyE18 ?? 0n) > 0n
      ? Number(chain.supplyE18 ?? 0n) / 1e18
      : null;
  const liveNavUsd =
    onchainReserveUsd !== null && onchainSupply !== null ? onchainReserveUsd / onchainSupply : null;
  const premiumPercent =
    market.status === "ready" && liveNavUsd !== null
      ? calcPremiumPercent(market.marketPriceUsd, liveNavUsd)
      : null;

  return (
    <PageShell>
      <header className="proof-page-head scrit-reveal">
        <p className="eyebrow">Pilot Reserve Ledger · Service-Verified Records</p>
        <h1>
          Evidence, estimates, <em>and the status between them.</em>
        </h1>
        <p>
          This page estimates reserve value from records accepted by the pilot service and manual commodity prices.
          Basket weights are targets across{" "}
          <abbr
            title="Technology-critical elements - the metals modern hardware can't be built without."
            style={{ textDecoration: "underline dotted", cursor: "help" }}
          >
            technology-critical elements (TCEs)
          </abbr>{" "}
          and monetary ballast; this page does not establish contracted vault custody or on-chain reserve balances.
        </p>
      </header>

      {/* Universal Verification Toolbar */}
      <VerificationToolbar
        networkName={activeNetwork.name}
        chainId={activeNetwork.id}
        blockNumber={chain.blockNumber ?? null}
        blockAgeSecs={null}
        subtitle="Reserve Manager V2 · Cryptographic Oracle Proofs"
        onRecheck={reVerifyReport}
        isRechecking={isVerifyingReport}
        recheckLabel="RE-VERIFY SHA-256 HASH"
        recheckProgressText="VERIFYING HASH..."
      />

      {/* Subpage In-Page Navigation Bar */}
      <nav className="proof-subnav-bar scrit-reveal" aria-label="Proof sections navigation">
        <a href="#onchain-reserve" className="proof-subnav-chip">
          <Activity size={12} /> 01 On-Chain State
        </a>
        <a href="#holdings" className="proof-subnav-chip">
          <Layers size={12} /> 02 Valuation Inputs
        </a>
        <a href="#attestations" className="proof-subnav-chip">
          <FileCheck2 size={12} /> 03 Attestation Ledger
        </a>
        <a href="#chain-events" className="proof-subnav-chip">
          <Clock size={12} /> 04 Event Stream
        </a>
        <a href="#treasury" className="proof-subnav-chip">
          <Coins size={12} /> 05 Treasury Entries
        </a>
        <a href="#evidence" className="proof-subnav-chip">
          <ShieldCheck size={12} /> 06 Verification Scope
        </a>
      </nav>

      {/* 6-Card Executive Summary Grid */}
      <section className="proof-summary-grid" aria-label="Current pilot summary">
        <article className="panel proof-summary-card scrit-reveal">
          <div className="proof-card-topbar">
            <span className="proof-label">NAV per sCRIT · USD</span>
            <span className="proof-card-badge">LIVE STATE</span>
          </div>
          <strong>{liveNavUsd === null ? "Unavailable" : formatUsd(liveNavUsd, 6)}</strong>
          <small>
            {liveNavUsd === null
              ? "Needs live on-chain reserve value and total supply."
              : "On-chain reserve value ÷ on-chain total supply."}
          </small>
        </article>

        <article className="panel proof-summary-card scrit-reveal">
          <div className="proof-card-topbar">
            <span className="proof-label">Market · Premium / Discount</span>
            <span className="proof-card-badge">{market.status === "ready" ? "POOL QUOTE" : "PENDING"}</span>
          </div>
          <strong>{market.status === "ready" ? formatUsd(market.marketPriceUsd, 6) : "Unavailable"}</strong>
          <small>
            {market.status === "ready"
              ? `${market.marketPriceEth.toPrecision(5)} ETH / sCRIT · ${
                  premiumPercent === null
                    ? "NAV comparison unavailable"
                    : `${premiumPercent >= 0 ? "+" : ""}${premiumPercent.toFixed(2)}% ${
                        premiumPercent >= 0 ? "premium" : "discount"
                      } to NAV`
                }`
              : "Price unavailable until canonical mainnet pool and ETH/USD feed resolve."}
          </small>
        </article>

        <article className="panel proof-summary-card scrit-reveal">
          <div className="proof-card-topbar">
            <span className="proof-label">Reported Reserve Value</span>
            <span className="proof-card-badge">OFF-CHAIN MODEL</span>
          </div>
          <strong>
            {dataStatus !== "ready" ? "Unavailable" : pricesComplete ? formatUsd(reserveUsd) : "-"}
          </strong>
          <small>
            {pricesComplete
              ? "From accepted batch records × manual commodity prices."
              : "All nine manual prices across the five sleeves are required."}
          </small>
        </article>

        <article className="panel proof-summary-card scrit-reveal">
          <div className="proof-card-topbar">
            <span className="proof-label">Reported Physical Mass</span>
            <span className="proof-card-badge">PILOT LEDGER</span>
          </div>
          <strong>{dataStatus === "ready" ? `${totalMass.toFixed(4)} kg` : "Unavailable"}</strong>
          <small>Sum of service-accepted signed batch records across all elements.</small>
        </article>

        <article className="panel proof-summary-card scrit-reveal">
          <div className="proof-card-topbar">
            <span className="proof-label">Attestation Batches</span>
            <span className="proof-card-badge">EIP-712 SIGNED</span>
          </div>
          <strong>{dataStatus === "ready" ? atts.length : "Unavailable"}</strong>
          <small>Cryptographically checked against registered demo keys by pilot API.</small>
        </article>

        <article className="panel proof-summary-card scrit-reveal">
          <div className="proof-card-topbar">
            <span className="proof-label">Custody Registry</span>
            <span className="proof-card-badge">DEMO PILOT</span>
          </div>
          <strong>Demo-only</strong>
          <small>No commercial contracted vault custodian represented on this page.</small>
        </article>
      </section>

      <p className="proof-method-note" suppressHydrationWarning>
        Market source:{" "}
        {market.status === "ready"
          ? `${market.poolPriceSource}; ${market.ethUsdSource} updated ${freshness(market.ethUsdUpdatedAt)}.`
          : "Canonical mainnet market not configured or its quote is unavailable."}{" "}
        Spot price is indicative and can be distorted by low liquidity.
      </p>

      {/* 01 · On-Chain State */}
      <section className="panel proof-section scrit-reveal" id="onchain-reserve">
        <div className="proof-section-head">
          <div>
            <span className="eyebrow">01 · ON-CHAIN STATE</span>
            <h2>Reserve manager v2</h2>
          </div>
          <span className="proof-section-note">
            {activeNetwork.name} · chain {activeNetwork.id}
          </span>
        </div>
        {chain.status === "unconfigured" ? (
          <div className="proof-empty">
            <ShieldCheck />
            <div>
              <b>v2 contracts not configured</b>
              <span>The legacy pilot ledger above is off-chain. No on-chain v2 reserve value is inferred.</span>
            </div>
          </div>
        ) : chain.status === "loading" ? (
          <div className="proof-empty">
            <ShieldCheck />
            <div>
              <b>Reading {activeNetwork.name} contracts</b>
              <span>Waiting for the configured token and reserve manager.</span>
            </div>
          </div>
        ) : chain.status === "unavailable" ? (
          <div className="proof-empty">
            <ShieldCheck />
            <div>
              <b>{activeNetwork.name} contracts unavailable</b>
              <span>RPC read failed or the configured address is not the sCRIT v2 deployment.</span>
            </div>
          </div>
        ) : (
          <>
            <div className="proof-summary-grid">
              <article className="panel proof-summary-card">
                <div className="proof-card-topbar">
                  <span className="proof-label">On-chain reserve estimate</span>
                  <span className="proof-card-badge">SMART CONTRACT</span>
                </div>
                <strong>
                  {chain.reserveValueUsdE8 === null
                    ? "Price unavailable"
                    : formatUsd(Number(chain.reserveValueUsdE8 ?? 0n) / 1e8)}
                </strong>
                <small>
                  {chain.reserveValueUsdE8 === null
                    ? "One or more signed commodity prices are missing or stale."
                    : "Valued from attested mass × current signed feed; not an independent audit."}
                </small>
              </article>
              <article className="panel proof-summary-card">
                <div className="proof-card-topbar">
                  <span className="proof-label">On-chain supply</span>
                  <span className="proof-card-badge">ERC-20</span>
                </div>
                <strong>
                  {(Number(chain.supplyE18 ?? 0n) / 1e18).toLocaleString("en-US", {
                    maximumFractionDigits: 4,
                  })}
                </strong>
                <small>Total circulating tokens read directly from sCRIT v2 contract.</small>
              </article>
              <article className="panel proof-summary-card">
                <div className="proof-card-topbar">
                  <span className="proof-label">Last read block</span>
                  <span className="proof-card-badge">ROBINHOOD RPC</span>
                </div>
                <strong>{chain.blockNumber?.toString()}</strong>
                <small>{activeNetwork.name} state · block explorer records are authoritative.</small>
              </article>
            </div>
            <p className="proof-intro" style={{ marginTop: 14, overflowWrap: "anywhere" }}>
              Reserve manager: <code>{chain.reserveManager}</code> · Token: <code>{chain.token}</code>
            </p>
            <div className="proof-table-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th className="num">On-chain attested mass</th>
                  </tr>
                </thead>
                <tbody>
                  {BASKET.map((row) => (
                    <tr key={row.symbol}>
                      <td>
                        {row.symbol} · {row.name}
                      </td>
                      <td className="num">
                        {(
                          Number(chain.holdingsKgE12?.[row.symbol] ?? 0n) / 1e12
                        ).toLocaleString("en-US", { maximumFractionDigits: 6 })}{" "}
                        kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="proof-method-note">
              The contract sums only signed batch records, but trusts custodian signatures and operator supplied
              prices. These reads do not establish physical delivery or redeemability. Pilot sCRIT is not pegged
              and has no redemption.
            </p>
          </>
        )}
      </section>

      {/* 02 · Valuation Inputs */}
      <section className="panel proof-section scrit-reveal" id="holdings">
        <div className="proof-section-head">
          <div>
            <span className="eyebrow">02 · VALUATION INPUTS</span>
            <h2>Stockpile sleeves and price records</h2>
          </div>
          <span className="proof-section-note">Five sleeves · nine element design targets</span>
        </div>
        <div className="proof-table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>Commodity</th>
                <th>Grade target</th>
                <th className="num">Target weight</th>
                <th className="num">Recorded mass</th>
                <th className="num">Price / kg</th>
                <th>Source · freshness</th>
                <th className="num">Estimated value</th>
              </tr>
            </thead>
            <tbody>
              {BASKET.map((row) => {
                const price = priceMap[row.symbol] ?? 0;
                const priceRow = prices.find((p) => p.commodity === row.symbol);
                return (
                  <tr key={row.symbol}>
                    <td>
                      <b>{row.symbol}</b>
                      <small className="proof-table-sub">
                        {row.name} · {row.sleeveLabel}
                      </small>
                    </td>
                    <td>{row.grade}</td>
                    <td className="num">{row.weightBps / 100}%</td>
                    <td className="num">
                      {dataStatus === "ready" ? `${(holdings[row.symbol] ?? 0).toFixed(4)} kg` : "-"}
                    </td>
                    <td className="num">
                      {priceRow
                        ? formatUsd(price, 0)
                        : row.sleeve === "hree"
                        ? "manual pilot input"
                        : "-"}
                    </td>
                    <td suppressHydrationWarning>
                      {priceRow
                        ? `${priceRow.source} · ${freshness(priceRow.updated_at)}`
                        : row.sleeve === "hree"
                        ? "Market reports"
                        : "No price record"}
                    </td>
                    <td className="num">
                      {priceRow ? formatUsd((holdings[row.symbol] ?? 0) * price, 2) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="proof-method-note">
          <abbr
            title="Heavy rare earth elements - the scarcest, most concentrated rare earths."
            style={{ textDecoration: "underline dotted", cursor: "help" }}
          >
            HREE
          </abbr>{" "}
          has no on-chain price feed. Dy and Tb prices are manual pilot inputs from market reports. On-chain NAV
          per sCRIT: <b>{liveNavUsd === null ? "Unavailable" : formatUsd(liveNavUsd, 6)}</b>.{" "}
          {premiumPercent === null
            ? "Premium/discount is unavailable until both current on-chain NAV and canonical sCRIT/ETH market price are readable."
            : `Current market is ${premiumPercent >= 0 ? "above" : "below"} NAV by ${Math.abs(premiumPercent).toFixed(2)}%.`}{" "}
          The spot market price is not an oracle or redemption value.
        </p>
      </section>

      {/* 03 · Signed Batch Records */}
      <section className="panel proof-section scrit-reveal" id="attestations">
        <div className="proof-section-head">
          <div>
            <span className="eyebrow">03 · SIGNED BATCH RECORDS</span>
            <h2>Attestation ledger</h2>
          </div>
          <span className="proof-section-note">
            {atts.length} record{atts.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="proof-intro">
          The pilot service checks the EIP-712 signature against a registered demo key and its commodity scope
          before saving the batch. The record is off-chain; the page does not independently verify physical delivery.
        </p>
        {dataStatus !== "ready" ? (
          <div className="proof-empty">
            <FileCheck2 />
            <div>
              <b>Record service unavailable</b>
              <span>Ledger data could not be loaded. No zero balance is inferred.</span>
            </div>
          </div>
        ) : atts.length === 0 ? (
          <div className="proof-empty">
            <FileCheck2 />
            <div>
              <b>No accepted attestation records yet</b>
              <span>No physical reserve is inferred from an empty ledger.</span>
            </div>
          </div>
        ) : (
          <div className="proof-table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Asset</th>
                  <th className="num">Mass</th>
                  <th>Vault label submitted</th>
                  <th>Certificate reference</th>
                  <th>Record status</th>
                </tr>
              </thead>
              <tbody>
                {atts.map((row) => (
                  <tr key={row.batch_id}>
                    <td>
                      <b>{row.batch_id}</b>
                    </td>
                    <td>{row.commodity}</td>
                    <td className="num">{row.mass_kg} kg</td>
                    <td>{row.vault_id || "-"}</td>
                    <td className="proof-hash">
                      {row.certificate_hash
                        ? `${row.certificate_hash.slice(0, 10)}...${row.certificate_hash.slice(-8)}`
                        : "-"}
                    </td>
                    <td>
                      <span className="proof-status">Accepted by pilot API</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 04 · Contract Event Stream */}
      <section className="panel proof-section scrit-reveal" id="chain-events">
        <div className="proof-section-head">
          <div>
            <span className="eyebrow">04 · CONTRACT EVENT STREAM</span>
            <h2>Indexer &amp; confirmed {activeNetwork.name} logs</h2>
          </div>
          <span className="proof-section-note">
            {activeNetwork.name} · chain {activeNetwork.id} · 5 confirmations
          </span>
        </div>
        {chainEvents.length === 0 ? (
          <div className="proof-empty">
            <FileCheck2 />
            <div>
              <b>No indexed contract events</b>
              <span>
                Configure v2 contract addresses and run the event indexer. An empty event list does not imply a
                zero chain history.
              </span>
            </div>
          </div>
        ) : (
          <div className="proof-table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Block</th>
                  <th>Transaction</th>
                  <th>Indexed fields</th>
                </tr>
              </thead>
              <tbody>
                {chainEvents.map((event, index) => (
                  <tr key={`${event.tx_hash}-${index}`}>
                    <td>
                      <b>{event.event_name}</b>
                    </td>
                    <td>
                      <a
                        href={`${activeNetwork.explorer}/block/${event.block_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="proof-tx-link"
                      >
                        {event.block_number}
                        <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="proof-hash">
                      <a
                        href={`${activeNetwork.explorer}/tx/${event.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="proof-tx-link"
                      >
                        {event.tx_hash.slice(0, 10)}...{event.tx_hash.slice(-8)}
                        <ExternalLink size={11} />
                      </a>
                    </td>
                    <td>{renderPayload(event.payload)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 05 · Verified Token Transfers */}
      <section className="panel proof-section scrit-reveal" id="treasury">
        <div className="proof-section-head">
          <div>
            <span className="eyebrow">05 · VERIFIED TOKEN TRANSFERS</span>
            <h2>Treasury entries</h2>
          </div>
          <span className="proof-section-note">Receipt checked on configured chain</span>
        </div>
        <p className="proof-intro">
          Rail A has no issuance fee. Entries shown here are token transfers to the configured treasury, recorded
          only after the server verifies the transaction receipt. Mainnet project-pool swap fees are indexed from
          the V4 hook event; collected tokens remain unspent treasury until procurement and attestation.
        </p>
        {dataStatus !== "ready" ? (
          <div className="proof-empty">
            <Coins />
            <div>
              <b>Record service unavailable</b>
              <span>Treasury data could not be loaded.</span>
            </div>
          </div>
        ) : treasury.length === 0 ? (
          <div className="proof-empty">
            <Coins />
            <div>
              <b>No verified treasury transfers recorded</b>
              <span>There are no verified transfer receipts in the ledger.</span>
            </div>
          </div>
        ) : (
          <div className="proof-table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Entry type</th>
                  <th>Amount</th>
                  <th>Transaction hash</th>
                  <th>Note</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {treasury.map((row, i) => (
                  <tr key={`${row.tx_hash}-${i}`}>
                    <td>{row.kind}</td>
                    <td>{row.amount_text}</td>
                    <td className="proof-hash">
                      {row.tx_hash ? (
                        <a
                          href={`${activeNetwork.explorer}/tx/${row.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="proof-tx-link"
                        >
                          {row.tx_hash.slice(0, 10)}...{row.tx_hash.slice(-8)}
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{row.note || "-"}</td>
                    <td suppressHydrationWarning>
                      {row.created_at ? new Date(row.created_at).toLocaleString("en-US") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 06 · Verification Scope & Open Items */}
      <section className="panel proof-section scrit-reveal" id="evidence">
        <div className="proof-section-head">
          <div>
            <span className="eyebrow">06 · VERIFICATION SCOPE</span>
            <h2>Disclosures, pilot limits, and open items</h2>
          </div>
          <span className="proof-section-note">Strict Institutional Boundaries</span>
        </div>
        <p className="proof-intro">
          Transparent disclosure of current pilot boundaries. sCRIT separates verified smart contract states from
          off-chain estimates and experimental test infrastructure.
        </p>
        <div className="proof-evidence-list">
          <div className="proof-evidence-card">
            <div className="proof-evidence-card-top">
              <span className="cat">CUSTODIAN REGISTRY</span>
              <span className="proof-card-badge">DEMO PILOT</span>
            </div>
            <b>Demo-only registrations (Au / Ag / Pt pilot scopes)</b>
            <small>
              No contracted commercial vault custodian or legal custody agreement is represented by this deployment.
            </small>
          </div>

          <div className="proof-evidence-card">
            <div className="proof-evidence-card-top">
              <span className="cat">PHYSICAL AUDIT</span>
              <span className="proof-card-badge" style={{ color: "#8c6418", background: "#fcf4e3" }}>
                DISCLOSURE
              </span>
            </div>
            <b>No third-party audit report linked</b>
            <small>
              Do not treat target weights, basket allocations, or sample imagery as proof of allocated physical
              bars in custody.
            </small>
          </div>

          <div className="proof-evidence-card">
            <div className="proof-evidence-card-top">
              <span className="cat">RESERVE CALCULATION</span>
              <span className="proof-card-badge">OFF-CHAIN MODEL</span>
            </div>
            <b>Service-computed estimate</b>
            <small>
              Estimated mass and NAV shown in the top summary combine off-chain pilot inputs with signed records;
              verified on-chain reads are isolated in section 01.
            </small>
          </div>

          <div className="proof-evidence-card">
            <div className="proof-evidence-card-top">
              <span className="cat">PRICE INPUTS</span>
              <span className="proof-card-badge">MANUAL FEED</span>
            </div>
            <b>Manual pilot pricing feed</b>
            <small>
              Commodity spot prices are maintained via operator API. Entries older than 24 hours are flagged as
              stale in the valuation table.
            </small>
          </div>

          <div className="proof-evidence-card">
            <div className="proof-evidence-card-top">
              <span className="cat">PROJECT-POOL FEE</span>
              <span className="proof-card-badge">{TAX_ACTIVE ? "ACTIVE V4" : "GOVERNANCE"}</span>
            </div>
            <b>
              {TAX_ACTIVE
                ? "2.5% · V4 hook"
                : SCRIT_CHAIN_ID === 4663
                ? "2.5% target · not deployed"
                : "0% · V3 testnet"}
            </b>
            <small>
              When active: 75% reserve treasury / 25% operations. Fee collection alone does not increase physical
              reserve value.
            </small>
          </div>

          <div className="proof-evidence-card">
            <div className="proof-evidence-card-top">
              <span className="cat">REDEMPTION</span>
              <span className="proof-card-badge">PILOT LIMIT</span>
            </div>
            <b>None in the pilot</b>
            <small>
              sCRIT is not pegged to fiat or commodity spot. No authorized participant (AP) or physical redemption
              mechanism is active.
            </small>
          </div>
        </div>
      </section>

      {/* 05. Anchored Reports */}
      <section className="proof-section" style={{ marginTop: 48 }}>
        <div className="proof-section-head">
          <div>
            <span className="mono-label">05 // TAMPER-EVIDENT HISTORY</span>
            <h2>Anchored Reports</h2>
          </div>
          <button
            type="button"
            onClick={reVerifyReport}
            disabled={isVerifyingReport}
            className="scrit-verify-btn"
            style={{
              padding: "6px 14px",
              fontSize: 11,
            }}
          >
            <RefreshCw size={12} className={isVerifyingReport ? "animate-spin" : ""} />
            <span>{isVerifyingReport ? "RE-HASHING KECCAK256..." : "RE-HASH IN BROWSER"}</span>
          </button>
        </div>

        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 20px" }}>
          Anchoring proves a report hasn&apos;t changed since it was posted. The inputs are on-chain,
          so you can check they were right. Week 3 summary was hashed and anchored on Robinhood Chain
          mainnet in transaction 0x684d25ec13686b47b14b20e4ecfd8bcc30c2cc78278c30065caf261f4d6b0cec.
        </p>

        <div className="proof-evidence-card" style={{ padding: 24, border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <span className="cat" style={{ color: "#e6b43b" }}>WEEK {WEEK_3_REPORT.week} REPORT</span>
              <h3 style={{ margin: "4px 0 0", color: "#ffffff", fontSize: 18 }}>
                Weekly Burn &amp; Stockpile Summary
              </h3>
            </div>

            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 4,
                background: reportVerification.isValid
                  ? "rgba(61,214,140,0.15)"
                  : reportVerification.statusText.includes("UNANCHORED")
                  ? "rgba(230,180,59,0.15)"
                  : "rgba(255,75,75,0.15)",
                color: reportVerification.isValid
                  ? "#3dd68c"
                  : reportVerification.statusText.includes("UNANCHORED")
                  ? "#e6b43b"
                  : "#ff4b4b",
                border: `1px solid ${
                  reportVerification.isValid
                    ? "rgba(61,214,140,0.3)"
                    : reportVerification.statusText.includes("UNANCHORED")
                    ? "rgba(230,180,59,0.4)"
                    : "#ff4b4b"
                }`,
              }}
            >
              {reportVerification.statusText}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
            <div>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>CRIT BURNED:</span>
              <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                {Number(WEEK_3_REPORT.burn.critBurned).toLocaleString("en-US")} $CRIT
              </div>
            </div>
            <div>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>ATTESTED STOCKPILE:</span>
              <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                {WEEK_3_REPORT.stockpile.attestedKg} kg
              </div>
            </div>
            <div>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>BLOCK RANGE:</span>
              <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                #{WEEK_3_REPORT.fromBlock} - #{WEEK_3_REPORT.toBlock}
              </div>
            </div>
            <div>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>ANCHOR TX:</span>
              <div style={{ marginTop: 4 }}>
                {/^0x[a-fA-F0-9]{64}$/.test(reportVerification.anchorTx) ? (
                  <a
                    href={`${HOOD_MAINNET.explorer}/tx/${reportVerification.anchorTx}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#e6b43b", textDecoration: "underline" }}
                  >
                    {reportVerification.anchorTx.slice(0, 10)}...
                  </a>
                ) : (
                  <span style={{ color: "#e6b43b", fontSize: 12 }}>
                    UNANCHORED — pending team multisig tx carrying the report hash
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: 12, background: "#0c0e0c", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>CANONICAL JSON HASH: </span>
              <span style={{ color: "#3dd68c" }}>{reportVerification.computedHash}</span>
            </div>
            <div>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>CANONICAL PAYLOAD: </span>
              <a href="/reports/week-3.json" target="_blank" rel="noreferrer" style={{ color: "#e6b43b" }}>
                /reports/week-3.json (Download)
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
