"use client";

import { usePilotData } from "@/hooks/usePilotData";
import { BASKET, LITHIUM_DECISION } from "@/lib/scrit-basket";
import { formatUsd } from "@/lib/nav";
import { SCRIT_SUPPLY, TAX_ACTIVE, TAX_TARGET_BPS } from "@/lib/scrit";
import { ArrowRight } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { PinnedFlowRail } from "@/components/PinnedFlowRail";
import { PinnedAssuranceStory, PinnedBasketStory, PinnedDispatch, PinnedEditorialStory, PinnedIndexStory, PinnedLaunchStory, PinnedLedgerStory, PinnedReserveStory } from "@/components/LandingScrubSections";

const DISPATCHES = [
  {
    tag: "THE INDEX / PILOT BASKET",
    title: "Three metals. One transparent allocation model.",
    body: "The pilot basket targets 60% gold, 25% silver, and 15% platinum. Lithium is excluded while custody and price-feed coverage remain unresolved.",
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
    copy: "Target weights are explicit: 60% Au, 25% Ag, 15% Pt. They describe the pilot design, not a guarantee of current physical holdings.",
    image: "/images/scrit_gold_vault.jpg",
    metric: "60 / 25 / 15",
    metricLabel: "TARGET WEIGHTS / Au / Ag / Pt",
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
  { key: "SWAP TAX", value: TAX_ACTIVE ? "ACTIVE" : "0% / PILOT CONFIG" },
  { key: "FUTURE TARGET", value: `${(TAX_TARGET_BPS / 100).toFixed(1)}% / SUBJECT TO AUDIT` },
  { key: "REDEMPTION", value: "NOT AVAILABLE IN PILOT" },
];

export function LandingExperience() {
  useReveal();
  const { prices, atts, holdings, reserveUsd, navUsd } = usePilotData();
  const staleCount = prices.filter((p) => p.stale).length;
  const latest = atts[0];

  return (
    <div className="scrit-redesign scrit-landing">
      <section className="scrit-market-tape" aria-label="Pilot status ticker">
        <div className="scrit-market-tape-track">
          {Array.from({ length: 8 }, (_, copy) => (
            <div className="scrit-market-tape-run" key={copy} aria-hidden={copy !== 0}>
              <span><i /> PILOT STATUS</span><b>Au 60%</b><b>Ag 25%</b><b>Pt 15%</b><b>SWAP TAX 0%</b><b>NO REDEMPTION</b><b>NOT PEGGED</b>
            </div>
          ))}
        </div>
      </section>

      <PinnedDispatch items={DISPATCHES} />

      <PinnedIndexStory metrics={[
        { label: "REPORTED RESERVE VALUE", value: formatUsd(reserveUsd), detail: "From accepted records and manual prices." },
        { label: "INDICATIVE NAV / TOKEN", value: formatUsd(navUsd, 6), detail: `Configured supply · ${Number(SCRIT_SUPPLY).toLocaleString("en-US")} sCRIT.` },
        { label: "ATTESTED BATCHES", value: String(atts.length).padStart(2, "0"), detail: latest ? `Latest · ${latest.commodity} · ${latest.mass_kg} kg.` : "No batches recorded in this instance." },
      ]} />

      <PinnedReserveStory scenes={STORY} />
      <PinnedFlowRail />

      <PinnedLedgerStory
        copy={{ title: "A quiet terminal. Only real records count.", text: "Prices are manual pilot inputs. Reserve mass comes from accepted attestation records. A feed can be stale, and an empty ledger is shown as empty." }}
        session={prices.length === 0 ? "WAITING FOR PRICE FEED" : staleCount ? `${staleCount} PRICE FEED${staleCount > 1 ? "S" : ""} STALE` : "PRICE FEEDS WITHIN 24H WINDOW"}
        lines={[
          ...STATUS_LINES,
          { key: "ATTESTATION LOG", value: atts.length ? `${atts.length} SIGNED BATCH${atts.length > 1 ? "ES" : ""} · ${Object.values(holdings).reduce((a, b) => a + b, 0).toFixed(4)} KG` : "AWAITING FIRST SIGNED BATCH" },
        ]}
      />

      <PinnedAssuranceStory items={[
        { mark: "EIP", title: "Signatures tied to a custodian", body: "Attestation signatures are checked against the configured custodian key and its pilot commodity scope.", href: "/proof", link: "See the attestation ledger", image: "/images/scrit_hardware_key.jpg" },
        { mark: "Au", title: "Metals only, for now", body: "Au, Ag, and Pt form the pilot target. Lithium is excluded at 0%; other commodities remain unavailable.", href: "/proof", link: "Review basket decisions", image: "/images/scrit_platinum_assay.jpg" },
        { mark: "NAV", title: "No redemption path", body: "sCRIT is not pegged. No authorised participant is active and physical redemption is unavailable in this pilot.", href: "/legal/risk", link: "Read the risk disclosure", image: "/images/scrit_vault_barrier.jpg" },
      ]} />

      <PinnedLaunchStory image="/images/scrit_silver_vault.jpg">
        <h2>Project tokens pair<br /><em>against sCRIT.</em></h2>
        <p>Approved issuers can create a project token and seed a TOKEN/sCRIT pool through the launcher. The pilot swap tax is 0%; a 2.5% target is a future, post-audit proposal.</p>
        <div className="scrit-launch-facts"><div><b>1%</b><span>issuance fee on contributed sCRIT</span></div><div><b>0%</b><span>project-pool swap tax in pilot</span></div></div>
        <a className="scrit-button scrit-button-dark" href="/launch">Explore token launch <ArrowRight size={16} /></a>
      </PinnedLaunchStory>

      <PinnedBasketStory
        items={BASKET.map((row) => ({ symbol: row.symbol, name: row.symbol === "Au" ? "Gold" : row.symbol === "Ag" ? "Silver" : "Platinum", detail: `${row.grade} · ${row.tier}`, weight: row.weightBps / 100 }))}
        excluded={LITHIUM_DECISION.reason}
      />

      <PinnedEditorialStory items={[
        { label: "FIELD NOTE / RESERVES", title: "How an attested batch enters the reserve view", action: "Inspect the ledger", href: "/proof", image: "/images/scrit_batch_ingestion.jpg" },
        { label: "FIELD NOTE / MARKET", title: "Why NAV is not a peg, and why that matters", action: "Read the risk notes", href: "/legal/risk", image: "/images/scrit_depository_monolith.jpg" },
        { label: "FIELD NOTE / LAUNCH", title: "The TOKEN/sCRIT launch flow in the pilot", action: "Explore Rail A", href: "/launch", image: "/images/scrit_attestation_network.jpg" },
      ]} />
    </div>
  );
}
