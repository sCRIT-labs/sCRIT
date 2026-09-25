"use client";

import React from "react";
import { usePilotData } from "../hooks/usePilotData";
import { formatUsd } from "../lib/nav";

export const FlowLedger: React.FC = () => {
  const { atts, treasury, reserveUsd, navUsd } = usePilotData();

  const rows = [
    {
      n: "i.",
      title: "Launch against the index",
      body: "Gated issuers deploy a token whose pool is forced to TOKEN/sCRIT in one atomic transaction. The single sCRIT/ETH base pool stays untaxed; project pools carry a 0% promo and a 1% issuance fee to treasury.",
      stat: `${treasury.length} logged`,
      sub: "TREASURY EVENTS",
    },
    {
      n: "ii.",
      title: "Fees wait as unspent treasury",
      body: "Collected fees are displayed apart from the reserve and never counted as metal. The two figures share a page but never a sum.",
      stat: "separated",
      sub: "BY DESIGN",
    },
    {
      n: "iii.",
      title: "Custodian signs, reserve moves",
      body: "On physical receipt the custodian signs batch, mass, grade, certificate and vault as EIP-712. Verified against the registered key, the holdings — and only then — grow. Pilot runs on one demo key; the first physical audit is pending.",
      stat: `${atts.length} posted`,
      sub: "ATTESTATIONS",
    },
    {
      n: "iv.",
      title: "NAV is reference, market is truth",
      body: `Reserve ${formatUsd(reserveUsd)} ÷ 999,000,000 = ${formatUsd(navUsd, 6)} per sCRIT. With no redemption in pilot, the premium or discount against market stays on screen — never hidden behind the word “backed”.`,
      stat: formatUsd(navUsd, 4),
      sub: "NAV LIVE",
    },
  ];

  return (
    <section id="flow" className="section" style={{ paddingTop: 0 }}>
      <div className="section-inner">
        <p className="eyebrow rv">03 · The reserve ledger</p>
        <h2 className="rv" style={{ ["--d" as string]: "80ms" }}>Four entries. In order.</h2>
        <p className="standfirst rv" style={{ ["--d" as string]: "140ms" }}>
          Read top to bottom like a ledger page. Each entry is verifiable; the
          third one is the only entry allowed to move money.
        </p>
        <div className="ledger">
          {rows.map((r, i) => (
            <div className="ledger-row rv" style={{ ["--d" as string]: `${i * 70}ms` }} key={r.n}>
              <span className="ledger-n">{r.n}</span>
              <div>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </div>
              <div className="ledger-stat">{r.stat}<small>{r.sub}</small></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
