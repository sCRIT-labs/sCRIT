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
      body: "The launcher creates project tokens paired with sCRIT for wallets approved on-chain by its owner. No Rail A issuance fee or project-pool swap tax is active.",
      stat: `${treasury.length} logged`,
      sub: "TREASURY EVENTS",
    },
    {
      n: "ii.",
      title: "Treasury transfers are separate records",
      body: "A treasury entry is stored only after the server verifies a token transfer receipt. A transfer is never counted as physical reserve.",
      stat: "separated",
      sub: "BY DESIGN",
    },
    {
      n: "iii.",
      title: "Custodian signs a service record",
      body: "A registered key signs batch, mass, grade, certificate reference, and vault label as EIP-712. The pilot service checks scope and updates its off-chain view; it does not independently prove delivery.",
      stat: `${atts.length} posted`,
      sub: "ATTESTATIONS",
    },
    {
      n: "iv.",
      title: "NAV is reference, market is truth",
      body: navUsd === null
        ? `Reported reserve ${formatUsd(reserveUsd)} is service data. Live on-chain sCRIT supply is not configured, so NAV per token is unavailable.`
        : `Reported reserve ${formatUsd(reserveUsd)} is divided by the live configured supply to calculate NAV per sCRIT. This pilot has no redemption path.`,
      stat: navUsd === null ? "NAV unavailable" : formatUsd(navUsd, 4),
      sub: "NAV LIVE",
    },
  ];

  return (
    <section id="flow" className="section" style={{ paddingTop: 0 }}>
      <div className="section-inner">
        <p className="eyebrow rv">03 · The reserve ledger</p>
        <h2 className="rv" style={{ ["--d" as string]: "80ms" }}>Four entries. In order.</h2>
        <p className="standfirst rv" style={{ ["--d" as string]: "140ms" }}>
          Read top to bottom like a ledger page. These records describe pilot data and do not move money or establish custody.
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
