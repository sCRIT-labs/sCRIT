"use client";

import React from "react";
import { HOOD_MAINNET } from "../lib/scrit";

export const SiteFooter: React.FC = () => {
  return (
    <footer>
      <div className="footer-cta rv">
        <h2>Weigh your launch in metal, not promises.</h2>
        <a className="btn btn-ink" href="/launch">Request a slot</a>
      </div>

      <div className="footer-grid">
        <div>
          <div className="flabel">sCRIT · PILOT</div>
          <p>Pilot commodity index launchpad. Precious metals only, Robinhood Chain 4663. No redemption — premium or discount always shown.</p>
        </div>
        <div>
          <div className="flabel">INDEX</div>
          <a href="/#reserve">The vault</a>
          <a href="/#basket">Assay cards</a>
          <a href="/#flow">Reserve ledger</a>
          <a href="/proof">Proof of Reserve</a>
        </div>
        <div>
          <div className="flabel">PROTOCOL</div>
          <a href={HOOD_MAINNET.explorer} target="_blank" rel="noreferrer">Blockscout</a>
          <a href={`${HOOD_MAINNET.explorer}/address/${HOOD_MAINNET.router}`} target="_blank" rel="noreferrer">V2 router</a>
          <a href="/launch">Launch form</a>
          <a href="/admin">Ops console</a>
        </div>
        <div>
          <div className="flabel">LEGAL</div>
          <a href="/legal/terms">Terms</a>
          <a href="/legal/risk">Risk disclosure</a>
          <a href="/legal/privacy">Privacy</a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>&copy; 2026 sCRIT pilot.</span>
        <span>Nothing here is financial advice. Tokens are user-created; do your own research.</span>
      </div>
      <div className="footer-bottom" style={{ borderTop: "none", paddingTop: 0 }}>
        <span>Pilot build — no photos, no claims beyond the ledger above.</span>
      </div>

      <div className="footer-word" aria-hidden="true">sCRIT</div>
    </footer>
  );
};
