"use client";

import React from "react";
import { useBlockNumber } from "../hooks/useBlockNumber";

const LINKS = [
  { label: "Reserve", href: "/#reserve" },
  { label: "Basket", href: "/#basket" },
  { label: "Launch", href: "/launch" },
  { label: "Proof", href: "/proof" },
];

export const Topbar: React.FC = () => {
  const block = useBlockNumber();
  return (
    <header className="topbar">
      <a className="brandmark" href="/" aria-label="sCRIT home">
        <span className="diamond" aria-hidden="true" />
        sCRIT
      </a>
      <nav aria-label="Primary">
        {LINKS.map((l) => (
          <a key={l.label} href={l.href}>{l.label}</a>
        ))}
      </nav>
      {block !== null ? (
        <span className="blockheight" title="Live Robinhood Chain height">
          BLOCK <b>#{block.toString()}</b>
        </span>
      ) : null}
      <span className="livepill" title="Pilot status">
        <span className="dot" aria-hidden="true" />
        PILOT · HOOD 4663
      </span>
    </header>
  );
};
