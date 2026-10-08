"use client";

import React from "react";
import { BASKET } from "../lib/scrit-basket";
import { usePilotData } from "../hooks/usePilotData";
import { formatUsd } from "../lib/nav";
import { Bullion3D } from "./Bullion3D";

function ageOf(iso: string): string {
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
  return `${h.toFixed(1)}h ago`;
}

export const VaultReserve: React.FC = () => {
  const { prices, holdings, priceMap, reserveUsd } = usePilotData();

  const maxVal = Math.max(
    1,
    ...BASKET.map((b) => (holdings[b.symbol] ?? 0) * (priceMap[b.symbol] ?? 0))
  );

  return (
    <section id="reserve" className="section">
      <div className="section-inner">
        <p className="eyebrow rv">01 · The vault, on screen</p>
        <h2 className="rv" style={{ ["--d" as string]: "80ms" }}>
          What the index holds.
        </h2>
        <p className="standfirst rv" style={{ ["--d" as string]: "140ms" }}>
          Bar lengths scale with attested value. Empty vault, empty bars - the
          figure below is <b className="gold">{formatUsd(reserveUsd)}</b> because
          that is all the custodian signatures say so far.
        </p>

        {/* 3D Physical Bullion Ingot Inspector - Prominently Exhibited */}
        <div style={{ margin: "32px 0 24px" }}>
          <Bullion3D />
        </div>

        <div className="vault rv" style={{ ["--d" as string]: "200ms" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span className="mono-sm" style={{ color: "var(--gold-bright)", letterSpacing: "0.1em" }}>
              REPORTED ALLOCATED HOLDINGS
            </span>
            <span className="mono-sm" style={{ color: "var(--muted)", fontSize: 11 }}>
              ATTESTED VAULT SPECS
            </span>
          </div>

          {BASKET.map((b) => {
            const kg = holdings[b.symbol] ?? 0;
            const usdPerKg = priceMap[b.symbol] ?? 0;
            const val = kg * usdPerKg;
            const p = prices.find((x) => x.commodity === b.symbol);
            const pct = Math.max(0, Math.min(100, (val / maxVal) * 100));
            return (
              <div className="vault-row" key={b.symbol}>
                <div className="vault-head">
                  <span>
                    <span className="sym">{b.symbol}</span>
                    <span className="grade">{b.grade} · target {b.weightBps / 100}% · {b.tier}</span>
                  </span>
                  <span className="val">
                    {kg.toFixed(4)} kg · {p ? `${formatUsd(usdPerKg, 0)}/kg · ${ageOf(p.updated_at)}${p.stale ? " · STALE" : ""}` : "price pending"}
                  </span>
                </div>
                <div className="vault-track">
                  <div className="vault-fill" style={{ width: `${val > 0 ? Math.max(pct, 2) : 0}%` }} />
                  {val <= 0 ? <span className="vault-empty">AWAITING FIRST ATTESTATION</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
