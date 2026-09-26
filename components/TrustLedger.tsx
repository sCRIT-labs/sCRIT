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
    flag: "CONTRACT FEATURE",
  },
  {
    title: "Nine manual price inputs with staleness flags",
    body: "Each basket line shows its source and age. Inputs older than 24h are flagged stale, and NAV is unavailable while a target commodity lacks a price.",
    flag: "STATUS · AMBER",
  },
  {
    title: "V4 hook implementation and treasury split",
    body: "Mainnet project pools use a permission-encoded hook with a fixed 2.5% fee and published 75/25 routing. Reserve value still changes only after attestation.",
    flag: "CONTRACT FEATURE",
  },
  {
    title: "Diamonds on Rail B; uranium unavailable",
    body: "Lithium and rare earths are index targets. Diamonds are individually certified Rail B lots only. Uranium stays outside MVP and is not offered.",
    flag: "INDEX SCOPE",
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
