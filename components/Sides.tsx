"use client";

import React from "react";

const SIDES = [
  {
    kicker: "For issuers",
    title: "Borrow weight for your launch.",
    points: ["Gated slots - reviewed humans, no spam pools", "Pair locked to sCRIT with previewed economics", "Fee and launch hashes logged in public"],
    cta: "Request a slot",
    href: "/launch",
  },
  {
    kicker: "For holders",
    title: "Read the vault before the story.",
    points: ["NAV in USD, premium computed live", "Holdings, prices and sources per line", "No redemption - the gap stays visible"],
    cta: "Open Proof of Reserve",
    href: "/proof",
  },
  {
    kicker: "For custodians",
    title: "Your signature is the mint.",
    points: ["EIP-712 attestations verified on receipt", "Per-class key scoping on the roadmap", "Pilot on a demo key - audit pending"],
    cta: "Read the risk disclosure",
    href: "/legal/risk",
  },
];

export const Sides: React.FC = () => {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-inner">
        <p className="eyebrow rv">04 · Three counterparties</p>
        <h2 className="rv" style={{ ["--d" as string]: "80ms" }}>One ledger, three readers.</h2>
        <div className="sides">
          {SIDES.map((s, i) => (
            <div className="side rv" style={{ ["--d" as string]: `${i * 90}ms` }} key={s.kicker}>
              <span className="kicker">{s.kicker}</span>
              <h3>{s.title}</h3>
              <ul>
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <a className="btn btn-ghost" style={{ marginTop: "auto" }} href={s.href}>{s.cta}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
