"use client";

import React, { useState } from "react";
import { usePilotData } from "../hooks/usePilotData";
import { useCountUp } from "../hooks/useCountUp";
import { calcPremium, formatPct, formatUsd, premiumBand } from "../lib/nav";
import { TickerTape } from "./TickerTape";
import { ChainField } from "./ChainField";

export const Hero: React.FC = () => {
  const { prices, atts, reserveUsd, navUsd } = usePilotData();
  const [market, setMarket] = useState("");
  const shownNav = useCountUp(navUsd ?? 0);
  const shownReserve = useCountUp(reserveUsd);

  const marketNum = parseFloat(market);
  const premium = navUsd !== null && Number.isFinite(marketNum) && navUsd > 0 ? calcPremium(marketNum, navUsd) : null;
  const band = premium === null ? null : premiumBand(premium);

  return (
    <section className="hero">
      <ChainField density={1.15} />
      <div className="hero-inner" style={{ position: "relative" }}>
        <p className="eyebrow rv">Commodity index pilot · precious basket</p>
        <h1 className="rv" style={{ ["--d" as string]: "90ms" }}>
          Every launch,<br /><em className="shimmer">paired with sCRIT.</em>
        </h1>
        <p className="lede rv" style={{ ["--d" as string]: "180ms" }}>
          sCRIT pairs every new token against one pilot index - gold, silver and
          platinum, recognised only on custodian signature. No redemption in
          pilot, so the price tells the truth about itself.
        </p>
        <div className="hero-ctas rv" style={{ ["--d" as string]: "260ms" }}>
          <a className="btn btn-gold" href="/launch">Launch a token</a>
          <a className="btn btn-ghost" href="/proof">Inspect the reserve</a>
        </div>

        <div className="nav-display rv" style={{ ["--d" as string]: "340ms" }}>
          <div className="nav-num glitch" data-text={formatUsd(shownNav, 6)}>{formatUsd(shownNav, 6)}</div>
          <div className="nav-cap">NAV PER sCRIT · USD · PRIMARY FIGURE</div>
          <div className="nav-sub">
            <span>RESERVE {formatUsd(shownReserve)}</span>
            <span>SUPPLY {navUsd === null ? "UNAVAILABLE" : "ON-CHAIN"}</span>
            <span>ATTESTATIONS {atts.length}</span>
            <span>
              {premium === null ? (
                <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  MARKET
                  <input
                    aria-label="sCRIT market price in USD"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    placeholder="paste pool price"
                    style={{ width: 130, background: "transparent", border: "none", borderBottom: "1px solid var(--line)", color: "var(--parchment)", font: "inherit", outline: "none" }}
                  />
                </label>
              ) : (
                <span className={premium >= 0 ? "up" : "down"} title={(band ?? "ok") === "alert" ? "Significant deviation - no arbitrageur of record" : (band ?? "ok") === "watch" ? "Notable deviation" : "Tracking NAV"}>
                  PREMIUM {formatPct(premium)}{(band ?? "ok") !== "ok" ? ` · ${(band ?? "ok").toUpperCase()}` : ""}
                </span>
              )}
            </span>
          </div>
          {band === "alert" ? (
            <div className="notice-bad" style={{ marginTop: 14, textAlign: "left" }}>
              Significant deviation (±25%+) with no arbitrageur of record. No AP counterparties are signed;
              price discovery is governed purely by liquidity pool flow.
            </div>
          ) : band === "watch" ? (
            <div className="notice-gold" style={{ marginTop: 14, textAlign: "left" }}>
              Notable deviation (±10%+). Watch - the pilot has no redemption anchor.
            </div>
          ) : null}
        </div>
      </div>

      <TickerTape prices={prices} />
    </section>
  );
};
