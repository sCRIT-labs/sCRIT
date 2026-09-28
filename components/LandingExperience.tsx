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
    tag: "THE INDEX / STARTER BASKET",
    title: "Nine target weights. One index design.",
    body: "The starter basket spans precious metals, rare earths, and lithium. The weights are design inputs, not proof of inventory or contracted custody.",
    image: "/images/scrit_basket_trio.jpg",
    href: "/proof",
    link: "Explore the reserve",
  },
  {
    tag: "THE GATE / CUSTODIAN ATTESTATION",
    title: "Evidence enters the ledger through a signed record.",
    body: "Reserve reporting uses EIP-712 signed custodian attestations. In this pilot, signatures are verified by the service and the reserve view is derived from its recorded batches.",
    image: "/images/scrit_attestation_network.jpg",
    href: "/proof",
    link: "Read the evidence model",
  },
  {
    tag: "THE MARKET / NO PEG OR REDEMPTION",
    title: "Market price can move away from reserve value.",
    body: "sCRIT is not pegged and has no redemption in the pilot. The interface keeps that distinction visible while price discovery develops.",
    image: "/images/scrit_kinetic_scale.jpg",
    href: "/legal/risk",
    link: "Review the risks",
  },
];

const STORY = [
  {
    index: "COMPOSITION",
    title: "Start with a defined basket.",
    copy: "Target weights span Au, Ag, Pt, Pd, Nd, Dy, Tb, Sc, and Li. They describe a starter design, not current physical holdings.",
    image: "/images/scrit_gold_vault.jpg",
    metric: "9 ASSETS",
    metricLabel: "STARTER INDEX BASKET",
  },
  {
    index: "EVIDENCE",
    title: "Count only signed records.",
    copy: "A custodian key signs a typed batch record. The pilot service checks the signature and configured scope before the batch appears in the reserve ledger.",
    image: "/images/scrit_custody_sign.jpg",
    metric: "EIP-712",
    metricLabel: "OFF-CHAIN SIGNATURE CHECK",
  },
  {
    index: "MARKET",
    title: "Keep NAV and market price distinct.",
    copy: "NAV is estimated from attested mass and manual commodity prices. The market can trade above or below that estimate; there is no pilot redemption arbitrage.",
    image: "/images/scrit_market_scale.jpg",
    metric: "NO PEG",
    metricLabel: "NO PILOT REDEMPTION",
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
              <span><i /> STARTER INDEX</span><b>9 COMMODITIES</b><b>DIAMONDS · RAIL B</b><b>URANIUM · UNAVAILABLE</b><b>{TAX_ACTIVE ? "PROJECT FEE 2.5%" : SCRIT_CHAIN_ID === 4663 ? "V4 HOOK PENDING" : "TESTNET FEE 0%"}</b><b>NO PEG</b>
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
          { mark: "9×", title: "Three commodity classes", body: "The index design targets precious metals, rare earths, and battery-grade lithium. Uranium remains outside the MVP; diamonds use individually certified Rail B lots only.", href: "/proof", link: "Review basket targets", image: "/images/scrit_platinum_assay.jpg" },
          { mark: "NAV", title: "No redemption path", body: "sCRIT is not pegged. No authorised participant is active and physical redemption is unavailable in this pilot.", href: "/legal/risk", link: "Read the risk disclosure", image: "/images/scrit_vault_barrier.jpg" },
        ]} />
      </div>

      <div data-nav-theme="light">
        <PinnedLaunchStory image="/images/scrit_silver_vault.jpg">
          <h2>Project tokens<br /><em>pair against<br />sCRIT.</em></h2>
          <p>Approved issuers can create a project token and seed a TOKEN/sCRIT pool. Mainnet project pools use the V4 hook for a 2.5% swap fee split 75/25; testnet V3 rehearsal pools do not collect that fee.</p>
          <div className="scrit-launch-facts"><div><b>0%</b><span>Rail A issuance fee</span></div><div><b>2.5%</b><span>mainnet project-pool fee · 75/25</span></div></div>
          <a className="scrit-button scrit-button-dark" href="/launch">Explore token launch <ArrowRight size={16} /></a>
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
