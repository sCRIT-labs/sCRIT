"use client";

import React from "react";

const ITEMS = [
  {
    title: "sCRIT is not pegged and has no redemption in pilot",
    body: "A project token is paired with sCRIT — it is not a claim on metal. Only sCRIT relates to the aggregate basket, never to a specific bar.",
    flag: "COPY RULE · NEVER CALL IT BACKED",
  },
  {
    title: "The reserve moves on attestation only",
    body: "Fees collected but not converted into attested metal sit as unspent treasury, shown apart. Any page that merges the two is wrong.",
    flag: "ACCOUNTING RULE",
  },
  {
    title: "Demo custodian key; first physical audit pending",
    body: "One team key signs today. Per-class custodians, SLAs, insurance and audit rights are unsigned — every dependent row stays red.",
    flag: "STATUS · RED",
  },
  {
    title: "Manual price feed with staleness flags",
    body: "Gold, silver and platinum update by hand; each line shows source and age. Older than 24h is flagged stale, and NAV carries the flag.",
    flag: "STATUS · AMBER",
  },
  {
    title: "No contract audit, no legal opinion yet",
    body: "Hence no swap-tax hook on mainnet, gated issuance and capped pools. The tax-to-reserve shape may be a collective investment scheme somewhere — counsel has not cleared it.",
    flag: "STATUS · RED",
  },
  {
    title: "Lithium, rare earths, uranium, diamonds: locked",
    body: "Lithium wants its own humidity-controlled warehouse. Rare earths have no public feeds. Uranium wants nuclear licensing. Diamonds want a lot marketplace — never the index.",
    flag: "SCOPE · SEALED",
  },
];

export const TrustLedger: React.FC = () => {
  return (
    <section id="trust" className="section" style={{ paddingTop: 0 }}>
      <div className="section-inner">
        <p className="eyebrow rv">05 · Full disclosure</p>
        <h2 className="rv" style={{ ["--d" as string]: "80ms" }}>The pilot&apos;s red ledger.</h2>
        <p className="standfirst rv" style={{ ["--d" as string]: "140ms" }}>
          Six entries a reserve pilot must print about itself. Open each one —
          none of them flatter us.
        </p>
        <div className="trust rv" style={{ ["--d" as string]: "200ms" }}>
          {ITEMS.map((it, i) => (
            <details key={it.title} open={i === 0}>
              <summary>
                <span className="t-n">{String(i + 1).padStart(2, "0")}</span>
                {it.title}
                <span className="t-x">+</span>
              </summary>
              <div className="t-body">
                {it.body}
                <br />
                <span className="t-flag">{it.flag}</span>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
