"use client";

import React, { useState } from "react";
import { BASKET, TIER_RULE, UNAVAILABLE } from "../lib/scrit-basket";
import { usePilotData } from "../hooks/usePilotData";
import { ChevronDown, ChevronUp } from "lucide-react";

export const AssayCards: React.FC = () => {
  const { prices, holdings } = usePilotData();
  const [activeCert, setActiveCert] = useState<string | null>(null);

  return (
    <section id="basket" className="section" style={{ paddingTop: 0 }}>
      <div className="section-inner">
        <p className="eyebrow rv">02 · Assay cards & Physical Custody</p>
        <h2 className="rv" style={{ ["--d" as string]: "80ms" }}>
          Three metals. Graded & Attested.
        </h2>
        <p className="standfirst rv" style={{ ["--d" as string]: "140ms" }}>
          Each card reads like the physical certificate shipped with the bullion — grade, weight
          target, live holdings. Tiers derive strictly from global USGS scarcity data: {TIER_RULE}
        </p>

        <div className="assay-grid">
          {BASKET.map((b, i) => {
            const p = prices.find((x) => x.commodity === b.symbol);
            const kg = holdings[b.symbol] ?? 0;
            const stamped = kg > 0;
            return (
              <div key={b.symbol} className="card-tilt-wrap">
                <article
                  className={`assay holographic-foil rv ${activeCert === b.symbol ? "cert-active" : ""}`}
                  style={{ ["--d" as string]: `${i * 90}ms`, cursor: "pointer" }}
                  onClick={() => setActiveCert(activeCert === b.symbol ? null : b.symbol)}
                >
                  <div className="assay-no">ASSAY Nº 00{i + 1} · sCRIT PILOT</div>
                  <h3>{b.symbol === "Au" ? "Gold" : b.symbol === "Ag" ? "Silver" : "Platinum"}</h3>
                  <div className="assay-grade">{b.grade} · {b.tier}</div>
                  <dl>
                    <dt>Target</dt><dd>{b.weightBps / 100}% of new funds</dd>
                    <dt>Held</dt><dd>{kg.toFixed(4)} kg</dd>
                    <dt>Price</dt><dd>{p ? `$${p.usd_per_kg.toLocaleString("en-US")}/kg${p.stale ? " · stale" : ""}` : "pending"}</dd>
                    <dt>Source</dt><dd>{p?.source ?? "—"}</dd>
                  </dl>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                    <span className={`stamp ${stamped ? "stamp-ok" : "stamp-wait"}`}>
                      {stamped ? "Attested" : "Awaiting metal"}
                    </span>
                    <span className="mono-sm" style={{ color: "var(--muted)", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {activeCert === b.symbol ? <ChevronUp size={12} strokeWidth={2.5} /> : <ChevronDown size={12} strokeWidth={2.5} />}
                      <span>{activeCert === b.symbol ? "Hide spec" : "Inspect spec"}</span>
                    </span>
                  </div>

                  {activeCert === b.symbol ? (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px dashed var(--line)",
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--parchment-dim)",
                      }}
                    >
                      <div>VAULT SPEC: Allocated Good Delivery Bar</div>
                      <div>CUSTODIAN KEY: EIP-712 Demo Key Enforced</div>
                      <div>AUDIT STATUS: First Physical Audit Pending</div>
                    </div>
                  ) : null}
                </article>
              </div>
            );
          })}
        </div>

        <div className="assay-grid" style={{ marginTop: 24 }}>
          {UNAVAILABLE.map((u, i) => (
            <article className="assay locked rv" style={{ ["--d" as string]: `${i * 60}ms` }} key={u.symbol}>
              <div className="assay-no">SEALED · NOT IN PILOT</div>
              <h3>{u.symbol}</h3>
              <div className="assay-grade">{u.reason}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
