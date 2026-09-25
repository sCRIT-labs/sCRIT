"use client";

import React from "react";
import type { PriceRow } from "../hooks/usePilotData";

const CREED = [
  "RESERVE MOVES ON ATTESTATION ONLY",
  "UNSPENT IS NOT RESERVE",
  "NOT PEGGED — NO REDEMPTION IN PILOT",
  "PREMIUM ALWAYS VISIBLE",
];

export const TickerTape: React.FC<{ prices: PriceRow[] }> = ({ prices }) => {
  const items: React.ReactNode[] = [];
  prices.forEach((p, i) => {
    items.push(
      <span className="tape-item" key={`p-${i}`}>
        {p.commodity} <b>${p.usd_per_kg.toLocaleString("en-US")}/kg</b>
        {p.stale ? <span style={{ color: "var(--red)" }}>STALE</span> : null}
        <span className="sep">/</span>
      </span>
    );
  });
  CREED.forEach((c, i) => {
    items.push(
      <span className="tape-item" key={`c-${i}`}>
        {c} <span className="sep">/</span>
      </span>
    );
  });

  return (
    <div className="tape" aria-label="Live prices and pilot principles">
      <div className="tape-track">
        <div style={{ display: "flex" }}>{items}</div>
        <div style={{ display: "flex" }} aria-hidden="true">{items}</div>
      </div>
    </div>
  );
};
