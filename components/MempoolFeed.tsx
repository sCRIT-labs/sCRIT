"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AttRow, TreasuryRow } from "../hooks/usePilotData";

type Line = { id: number; tag: "LIVE" | "SIM"; text: string; tone: "gold" | "dim" | "green" | "red" };

const SIM_POOL = [
  "pipeline > waiting for confirmed chain events",
  "indexer > no synthetic market telemetry",
  "reserve > changes require an accepted attestation",
  "price > source and timestamp are shown per record",
  "custody > signatures do not replace physical audit",
  "rail-b > testnet contracts are not deployed",
  "market > no peg or redemption in pilot",
  "system > simulated ambience · no live telemetry",
];

const short = (s?: string, n = 10) =>
  !s ? "—" : s.length <= n + 4 ? s : `${s.slice(0, n)}…`;

function fmtTime(iso?: string): string {
  if (!iso) return "--:--:--";
  const d = new Date(iso);
  return d.toTimeString().slice(0, 8);
}

/**
 * Streaming activity console. Real attestations + treasury entries are
 * injected and tagged LIVE; everything else loops as clearly-tagged SIM
 * ambience. Honest by construction.
 */
export const MempoolFeed: React.FC<{ atts: AttRow[]; treasury: TreasuryRow[] }> = ({
  atts,
  treasury,
}) => {
  const [lines, setLines] = useState<Line[]>([]);
  const idRef = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const simIdx = useRef(0);

  const liveLines = useMemo<Line[]>(() => {
    const out: Line[] = [];
    for (const a of atts.slice(-6)) {
      out.push({
        id: -1,
        tag: "LIVE",
        text: `attest > ${a.batch_id} | ${a.commodity} ${a.mass_kg}kg | vault ${short(a.vault_id, 12)} | ${fmtTime(a.created_at)}`,
        tone: "gold",
      });
    }
    for (const t of treasury.slice(-6)) {
      out.push({
        id: -1,
        tag: "LIVE",
        text: `treasury > ${t.kind} | ${t.amount_text} | ${fmtTime(t.created_at)}`,
        tone: "gold",
      });
    }
    return out;
  }, [atts, treasury]);

  useEffect(() => {
    let alive = true;
    const push = (l: Omit<Line, "id">) => {
      if (!alive) return;
      idRef.current += 1;
      const line = { ...l, id: idRef.current };
      setLines((prev) => [...prev.slice(-15), line]);
    };
    // seed with live first
    for (const l of liveLines) push(l);
    if (liveLines.length === 0) {
      push({ tag: "SIM", text: "feed > no chain entries yet - reserve honestly zero", tone: "dim" });
    }
    const id = setInterval(() => {
      const text = SIM_POOL[simIdx.current % SIM_POOL.length];
      simIdx.current += 1;
      push({ tag: "SIM", text, tone: "dim" });
    }, 2600);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLines.length]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="feed rv">
      <div className="feed-head">
        <span className="feed-title">SCRIT://ACTIVITY</span>
        <span className="feed-legend">
          <i className="lg-live">LIVE on-chain record</i>
          <i className="lg-sim">SIM ambience</i>
        </span>
      </div>
      <div className="feed-body" ref={boxRef}>
        {lines.map((l) => (
          <div className={`feed-line tone-${l.tone}`} key={l.id}>
            <span className={`feed-tag tag-${l.tag}`}>{l.tag}</span>
            <span>{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
