import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { FileText, AlertTriangle, ShieldCheck, Scale } from "lucide-react";

type LegalDoc = {
  title: string;
  badge: string;
  sections: { heading: string; content: string }[];
};

const DOCS: Record<string, LegalDoc> = {
  terms: {
    title: "Terms of Service",
    badge: "Protocol Agreement · Version 3.0",
    sections: [
      {
        heading: "1. Experimental Pilot Network",
        content:
          "sCRIT is experimental decentralized software running on Robinhood Chain (Arbitrum Nitro rollup, Chain ID 4663 / 46630). By interacting with the smart contracts, user interface, or oracles, you acknowledge that protocol features remain in gated pilot phase and are subject to ongoing architectural development.",
      },
      {
        heading: "2. Rail A Issuance & Swap Mechanics",
        content:
          "A wallet must be approved in the pilot service registry and separately allowlisted by the launcher owner before it can use Rail A to create a token and initialize a TOKEN / sCRIT liquidity pool. Rail A has no issuance fee in the pilot and project-pool swap tax is 0%. A proposed 2.5% tax and 75% reserve / 25% operations split are inactive future options; they do not automatically purchase bullion.",
      },
      {
        heading: "3. Non-Commodity Claim Separation",
        content:
          "Project and community tokens launched on Rail A do not constitute claims, titles, or warrants to physical commodities. sCRIT itself is not pegged and has no redemption in the pilot. Do not represent a project token or sCRIT as a redeemable physical commodity claim.",
      },
      {
        heading: "4. Limitation of Liability",
        content:
          "The protocol contracts are provided on an 'as-is' and 'as-available' basis without warranties of any kind. You are solely responsible for compliance with your local laws, securities regulations, and tax reporting requirements.",
      },
    ],
  },
  risk: {
    title: "Risk Disclosures & Market Realities",
    badge: "Radical Transparency · DevBrief §11",
    sections: [
      {
        heading: "1. No Physical Retail Redemption in Pilot",
        content:
          "There is no physical redemption in the pilot and sCRIT is not pegged. Its market price is determined by available market liquidity and may trade at a premium or discount to an indicative NAV. No active authorised participant provides arbitrage or redemption in this pilot.",
      },
      {
        heading: "2. Liquidity & Slippage Dynamics",
        content:
          "Pilot liquidity pools on Robinhood Chain L2 may have thin depth during rehearsal phases. Large swap orders can encounter high price impact and slippage. Users should carefully review simulated slippage tolerance settings prior to confirming transactions.",
      },
      {
        heading: "3. Oracle & Valuation Latency",
        content:
          "Commodity prices in the pilot interface are manual team inputs, not a continuously updating oracle. The interface flags prices older than 24 hours as stale. NAV calculations depend on those inputs and recorded attestation data.",
      },
      {
        heading: "4. Custody & Dual-Key Protocol",
        content:
          "Custodian entries in the pilot are demo-level records scoped to Au, Ag, or Pt. The interface does not establish a contracted vault relationship or independent physical audit. Attestation signatures are checked by the pilot service; reserve figures shown in the interface are derived from off-chain records, not a reserve smart contract.",
      },
    ],
  },
  privacy: {
    title: "Privacy & Data Policy",
    badge: "Decentralized Principles",
    sections: [
      {
        heading: "1. Onchain Records",
        content:
          "Blockchain transactions (including token deployment and liquidity additions) are public on the selected chain. Pilot attestation records are submitted to a PostgreSQL-backed off-chain service and are not themselves reserve contract transactions.",
      },
      {
        heading: "2. Off-Chain Contact Information",
        content:
          "The pilot interface currently has no newsletter signup. AP application contact details may be submitted to the pilot API and stored in PostgreSQL for diligence. Do not submit sensitive personal information; contact the project operator for data access or deletion requests.",
      },
      {
        heading: "3. Telemetry & Analytics",
        content:
          "The sCRIT interface does not include a newsletter signup. Operational records are stored in a PostgreSQL database configured by the operator. Avoid submitting sensitive personal information.",
      },
      {
        heading: "4. Pilot Guide Prompts",
        content:
          "Questions entered into the pilot guide are sent to the model provider configured by the operator and are not stored by the sCRIT application. The provider may process data under its own terms. Do not enter personal information, wallet secrets, or seed phrases.",
      },
    ],
  },
  disclaimer: {
    title: "General Pilot Disclaimer",
    badge: "Pilot Disclosures",
    sections: [
      {
        heading: "1. Pilot Status",
        content:
          "This website describes an experimental software pilot. It does not represent regulatory approval, sandbox participation, an offer, or availability in any jurisdiction. Users are responsible for determining whether their interaction is lawful where they live.",
      },
      {
        heading: "2. No Financial Advice",
        content:
          "No content, chart, calculation, or reserve simulation on this website constitutes investment, legal, or tax advice. Past metallurgical price trends do not guarantee future valuation performance.",
      },
    ],
  },
};

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const currentKey = DOCS[doc] ? doc : "terms";
  const d = DOCS[currentKey];

  return (
    <PageShell>
      {/* Header section */}
      <div className="scrit-reveal" style={{ maxWidth: 840, marginBottom: 28 }}>
        <p className="eyebrow">{d.badge}</p>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(34px, 4.5vw, 56px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: "12px 0 16px",
            lineHeight: 1.1,
          }}
        >
          {d.title}
        </h1>
        <p
          style={{
            color: "var(--parchment-dim)",
            fontSize: "clamp(15px, 1.8vw, 17px)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Pilot terms, risk limits, and disclosures for the current sCRIT implementation.
        </p>
      </div>

      {/* Separate legal routes */}
      <nav aria-label="Legal documents" className="legal-page-nav scrit-reveal"
        style={{
          display: "flex",
          gap: 10,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          paddingBottom: 16,
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/legal/terms"
          className={`btn ${currentKey === "terms" ? "btn-gold" : "btn-ghost"}`}
          style={{ padding: "8px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <FileText size={15} strokeWidth={2} />
          Terms of Service
        </Link>
        <Link
          href="/legal/risk"
          className={`btn ${currentKey === "risk" ? "btn-gold" : "btn-ghost"}`}
          style={{ padding: "8px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <AlertTriangle size={15} strokeWidth={2} />
          Risk Disclosures
        </Link>
        <Link
          href="/legal/privacy"
          className={`btn ${currentKey === "privacy" ? "btn-gold" : "btn-ghost"}`}
          style={{ padding: "8px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <ShieldCheck size={15} strokeWidth={2} />
          Privacy Policy
        </Link>
        <Link
          href="/legal/disclaimer"
          className={`btn ${currentKey === "disclaimer" ? "btn-gold" : "btn-ghost"}`}
          style={{ padding: "8px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Scale size={15} strokeWidth={2} />
          General Disclaimer
        </Link>
      </nav>

      {/* Document Sections */}
      <div className="legal-page-doc" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {d.sections.map((sec, idx) => (
          <div key={idx} className="panel scrit-reveal" style={{ padding: "28px 32px" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "var(--gold-bright)" }}>
              {sec.heading}
            </h3>
            <p style={{ color: "var(--parchment)", fontSize: 15, lineHeight: 1.75, margin: 0 }}>
              {sec.content}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          marginTop: 36,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "24px 28px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 16,
        }}
      >
        <div>
          <h4 style={{ margin: "0 0 4px", fontSize: 16 }}>Need further pilot clarification?</h4>
          <p className="mono-sm" style={{ margin: 0 }}>
            Inspect the off-chain pilot reserve records, or review deployed token contracts on the explorer.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/proof" className="btn btn-ghost" style={{ fontSize: 13 }}>
            Inspect Proof of Reserve
          </Link>
          <Link href="/launch" className="btn btn-gold" style={{ fontSize: 13 }}>
            Launch a Pair (Rail A)
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
