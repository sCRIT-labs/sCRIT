"use client";

import { useEffect, useState } from "react";
import { SCRIT_SUPPLY } from "../lib/scrit";
import { calcNav } from "../lib/nav";

export type PriceRow = {
  commodity: string;
  usd_per_kg: number;
  source: string;
  updated_at: string;
  stale?: boolean;
};

export type AttRow = {
  batch_id: string;
  commodity: string;
  mass_kg: string;
  grade_spec?: string;
  certificate_hash?: string;
  vault_id?: string;
  created_at?: string;
};

export type TreasuryRow = {
  kind: string;
  amount_text: string;
  tx_hash?: string;
  note?: string;
  created_at?: string;
};

/** Shared pilot fetch: prices + attestations + treasury, derived holdings/NAV. */
export function usePilotData() {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [atts, setAtts] = useState<AttRow[]>([]);
  const [treasury, setTreasury] = useState<TreasuryRow[]>([]);
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pr, ar, tr] = await Promise.all([
          fetch("/api/prices"), fetch("/api/attestations"), fetch("/api/treasury"),
        ]);
        if (![pr, ar, tr].every((r) => r.ok)) throw new Error("pilot_data_unavailable");
        const [p, a, t] = await Promise.all([pr.json(), ar.json(), tr.json()]);
        if (!alive) return;
        setPrices(p.prices ?? []);
        setAtts(a.attestations ?? []);
        setTreasury(t.log ?? []);
        setDataStatus("ready");
      } catch {
        if (alive) setDataStatus("unavailable");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const priceMap: Record<string, number> = {};
  for (const p of prices) priceMap[p.commodity] = p.usd_per_kg;

  const holdings: Record<string, number> = { Au: 0, Ag: 0, Pt: 0 };
  for (const a of atts) {
    const v = parseFloat(a.mass_kg);
    if (a.commodity in holdings && Number.isFinite(v) && v > 0) holdings[a.commodity] += v;
  }

  const { reserveUsd, navUsd } = calcNav(holdings, priceMap, SCRIT_SUPPLY);

  return { prices, atts, treasury, holdings, priceMap, reserveUsd, navUsd, dataStatus };
}
