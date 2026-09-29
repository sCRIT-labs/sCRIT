"use client";

import { usePilotData } from "@/hooks/usePilotData";
import { BASKET } from "@/lib/scrit-basket";
import { formatUsd } from "@/lib/nav";
import { SCRIT_CHAIN_ID, TAX_ACTIVE, TAX_TARGET_BPS } from "@/lib/scrit";
import { ArrowRight } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { useReserveChainData } from "@/hooks/useReserveChainData";
import { PinnedFlowRail } from "@/components/PinnedFlowRail";
import { PinnedAssuranceStory, PinnedBasketStory, PinnedDispatch, PinnedEditorialStory, PinnedIndexStory, PinnedLaunchStory, PinnedLedgerStory, PinnedReserveStory } from "@/components/LandingScrubSections";

const DISPATCHES = [
  {
    tag: "RAIL A · LIQUIDITY ENGINE",
    title: "Every token anchored to physical critical reserves.",
    body: "Rail A pairs project tokens directly against sCRIT in Uniswap V4 pools. A 2.5% trading tax feeds the reserve treasury to acquire physical tech commodities.",
    image: "/images/scrit_uniswap_v4_rail_a.jpg",
    href: "/launch",
    link: "Explore Rail A Launchpad",
  },
  {
    tag: "THE INDEX · THREE ASSET CLASSES",
    title: "Nine strategic minerals. One industrial index.",
    body: "The starter basket spans battery metals (Lithium), permanent-magnet rare earths (Nd, Dy, Tb, Sc), and catalyst tech metals (Pt, Pd, Au, Ag).",
    image: "/images/scrit_critical_trio.jpg",
    href: "/proof",
    link: "Inspect commodity targets",
  },
  {
    tag: "THE GATE · CUSTODIAN ATTESTATIONS",
    title: "Evidence enters the ledger through signed records.",
    body: "Reserve reporting uses EIP-712 signed custodian attestations. In this pilot, signatures are verified before any physical mass is recognized on-chain.",
    image: "/images/scrit_attestation_network.jpg",
    href: "/proof",
    link: "Read the evidence model",
  },
];

const STORY = [
  {
    index: "COMPOSITION",
    title: "Strategic & critical technology commodities.",
    copy: "Target weights span Lithium, Neodymium, Dysprosium, Terbium, Scandium, Platinum, Palladium, Gold, and Silver. Engineering a verifiable physical floor.",
    image: "/images/scrit_rare_earths.jpg",
    metric: "9 ASSETS",
    metricLabel: "CRITICAL RESERVE BASKET",
  },
  {
    index: "LIQUIDITY ENGINE",
    title: "Rail A Uniswap V4 paired pools.",
    copy: "Every ecosystem launch seeds against sCRIT. The on-chain trading tax continually flows into physical commodity procurement from certified suppliers.",
    image: "/images/scrit_uniswap_v4_rail_a.jpg",
    metric: "UNISWAP V4",
    metricLabel: "RAIL A RESERVE ENGINE",
  },
  {
    index: "ASSAY EVIDENCE",
    title: "Count only signed custodian records.",
    copy: "Physical warehouse intake requires cryptographic EIP-712 attestations with assay certificates. No unbacked minting or hypothetical claims.",
    image: "/images/scrit_battery_assay.jpg",
    metric: "EIP-712",
    metricLabel: "OFF-CHAIN SIGNATURE CHECK",
  },
];

const STATUS_LINES = [
  { key: "ENVIRONMENT", value: "ROBINHOOD CHAIN / PILOT CONFIG" },
  { key: "PROJECT POOL FEE", value: TAX_ACTIVE ? `${(TAX_TARGET_BPS / 100).toFixed(1)}% / V4 HOOK` : SCRIT_CHAIN_ID === 4663 ? "2.5% TARGET / NOT DEPLOYED" : "0% / TESTNET V3" },
  { key: "FEE ROUTING", value: "75% RESERVE / 25% OPERATIONS" },
  { key: "REDEMPTION", value: "NOT AVAILABLE IN PILOT" },
];

export function LandingExperience() {
  useReveal();
  const { prices, atts, holdings, reserveUsd, navUsd, dataStatus } = usePilotData();
  const chain = useReserveChainData();
  const staleCount = prices.filter((p) => p.stale).length;
  const latest = atts[0];
  const pricesComplete = BASKET.every((row) => prices.some((p) => p.commodity === row.symbol));
  const reserveLabel = dataStatus === "unavailable" ? "Unavailable" : pricesComplete ? formatUsd(reserveUsd) : "—";
  const liveChainNav = chain.status === "ready" && chain.reserveValueUsdE8 !== null && (chain.supplyE18 ?? 0n) > 0n
    ? Number(chain.reserveValueUsdE8 ?? 0n) / 1e8 / (Number(chain.supplyE18 ?? 0n) / 1e18)
    : null;
  const navLabel = liveChainNav === null ? "Unavailable" : formatUsd(liveChainNav, 6);

  return (
    <div className="scrit-redesign scrit-landing">
      <section className="scrit-market-tape" aria-label="Pilot status ticker">
        <div className="scrit-market-tape-track">
          {Array.from({ length: 8 }, (_, copy) => (
            <div className="scrit-market-tape-run" key={copy} aria-hidden={copy !== 0}>
              <span className="scrit-market-tape-item">
                <img src="/images/ticker/ticker_index.png" alt="" className="scrit-market-tape-icon" width={22} height={22} />
                STARTER INDEX
              </span>
              <b>
                <span className="scrit-market-tape-item">
                  <img src="/images/ticker/ticker_commodities.png" alt="" className="scrit-market-tape-icon" width={22} height={22} />
                  9 COMMODITIES
                </span>
              </b>
              <b>
                <span className="scrit-market-tape-item">
                  <img src="/images/ticker/ticker_diamond.png" alt="" className="scrit-market-tape-icon" width={22} height={22} />
                  DIAMONDS · RAIL B
                </span>
              </b>
              <b>
                <span className="scrit-market-tape-item">
                  <img src="/images/ticker/ticker_uranium.png" alt="" className="scrit-market-tape-icon" width={22} height={22} />
                  URANIUM · UNAVAILABLE
                </span>
              </b>
              <b>
                <span className="scrit-market-tape-item">
                  <img src="/images/ticker/ticker_fee.png" alt="" className="scrit-market-tape-icon" width={22} height={22} />
                  {TAX_ACTIVE ? "PROJECT FEE 2.5%" : SCRIT_CHAIN_ID === 4663 ? "V4 HOOK PENDING" : "TESTNET FEE 0%"}
                </span>
              </b>
              <b>
                <span className="scrit-market-tape-item">
                  <img src="/images/ticker/ticker_no_peg.png" alt="" className="scrit-market-tape-icon" width={22} height={22} />
                  NO PEG
                </span>
              </b>
            </div>
          ))}
        </div>
      </section>

      <div data-nav-theme="light">
        <PinnedDispatch items={DISPATCHES} />
      </div>

      <div data-nav-theme="light">
        <PinnedIndexStory metrics={[
          { label: "REPORTED RESERVE VALUE", value: reserveLabel, detail: pricesComplete ? "From accepted records and manual prices." : "Requires all nine manual price inputs." },
          { label: "ON-CHAIN NAV / TOKEN", value: navLabel, detail: "On-chain reserve value ÷ live sCRIT supply. Hidden until both are available." },
          { label: "ATTESTED BATCHES", value: dataStatus === "ready" ? String(atts.length) : "—", detail: dataStatus !== "ready" ? "Pilot record service unavailable." : latest ? `Latest · ${latest.commodity} · ${latest.mass_kg} kg.` : "No batches recorded in this instance." },
        ]} />
      </div>

      <div data-nav-theme="dark">
        <PinnedReserveStory scenes={STORY} />
      </div>

      <div data-nav-theme="light">
        <PinnedFlowRail />
      </div>

      <div data-nav-theme="light">
        <PinnedLedgerStory
          copy={{ title: "A quiet terminal. Only real records count.", text: "Prices are manual pilot inputs. Reserve mass comes from accepted attestation records. A feed can be stale, and an empty ledger is shown as empty." }}
          session={dataStatus === "unavailable" ? "PILOT DATA SERVICE UNAVAILABLE" : prices.length === 0 ? "WAITING FOR PRICE INPUTS" : staleCount ? `${staleCount} PRICE FEED${staleCount > 1 ? "S" : ""} STALE` : "PRICE INPUTS WITHIN 24H WINDOW"}
          lines={[
            ...STATUS_LINES,
            { key: "ATTESTATION LOG", value: atts.length ? `${atts.length} SIGNED BATCH${atts.length > 1 ? "ES" : ""} · ${Object.values(holdings).reduce((a, b) => a + b, 0).toFixed(4)} KG` : "AWAITING FIRST SIGNED BATCH" },
          ]}
        />
      </div>

      <div data-nav-theme="dark">
        <PinnedAssuranceStory items={[
          { mark: "EIP", title: "Signatures tied to a custodian", body: "Attestation signatures are checked against the configured custodian key and its pilot commodity scope.", href: "/proof", link: "See the attestation ledger", image: "/images/scrit_hardware_key.jpg" },
          { mark: "9×", title: "Three commodity classes", body: "The index design targets precious metals, rare earths, and battery-grade lithium. Uranium remains outside the MVP; diamonds use individually certified Rail B lots only.", href: "/proof", link: "Review basket targets", image: "/images/scrit_critical_vault.jpg" },
          { mark: "NAV", title: "No redemption path", body: "sCRIT is not pegged. No authorised participant is active and physical redemption is unavailable in this pilot.", href: "/legal/risk", link: "Read the risk disclosure", image: "/images/scrit_vault_barrier.jpg" },
        ]} />
      </div>

      <div data-nav-theme="light">
        <PinnedLaunchStory image="/images/scrit_uniswap_v4_rail_a.jpg">
          <h2 style={{ whiteSpace: "nowrap" }}>Project tokens <em>pair against sCRIT.</em></h2>
          <p>Approved issuers create tokens backed by Uniswap V4 pools paired directly with sCRIT. On mainnet, a 2.5% swap tax feeds physical critical commodity procurement; Rail B manages certified individual warehouse lots.</p>
          <div className="scrit-launch-facts"><div><b>0%</b><span>Rail A issuance fee</span></div><div><b>2.5%</b><span>mainnet project-pool fee · 75/25</span></div></div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <a className="scrit-button" href="/issuer" style={{ background: "#d9a92e", color: "#121411", borderColor: "#c29323", display: "inline-flex", alignItems: "center", gap: 8, padding: "0 22px" }}>
              <span>Step 1 · Issuer Clearance</span>
              <ArrowRight size={15} />
            </a>
            <a className="scrit-button scrit-button-dark" href="/launch" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 22px" }}>
              <span>Step 2 · Strike Pair</span>
              <ArrowRight size={15} />
            </a>
          </div>
        </PinnedLaunchStory>
      </div>

      <div data-nav-theme="light">
        <PinnedBasketStory
          items={BASKET.map((row) => ({ symbol: row.symbol, name: row.name, detail: `${row.grade} · ${row.tier}`, weight: row.weightBps / 100 }))}
          excluded="Diamonds are Rail B only. Uranium is unavailable and outside the MVP. Targets do not establish holdings."
        />
      </div>

      <PinnedEditorialStory items={[
        { label: "FIELD NOTE / RESERVES", title: "How an attested batch enters the reserve view", action: "Inspect the ledger", href: "/proof", image: "/images/scrit_batch_ingestion.jpg" },
        { label: "FIELD NOTE / MARKET", title: "Why NAV is not a peg, and why that matters", action: "Read the risk notes", href: "/legal/risk", image: "/images/scrit_depository_monolith.jpg" },
        { label: "FIELD NOTE / LAUNCH", title: "The TOKEN/sCRIT launch flow in the pilot", action: "Explore Rail A", href: "/launch", image: "/images/scrit_concrete_vault.jpg" },
      ]} />
    </div>
  );
}
