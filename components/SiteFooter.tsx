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
          <p>Experimental token launch software and proposed commodity-index design. No pilot redemption, peg, contracted custody, or audited reserve.</p>
        </div>
        <div>
          <div className="flabel">INDEX</div>
          <a href="/#reserve">The vault</a>
          <a href="/#basket">Assay cards</a>
          <a href="/#flow">Reserve ledger</a>
          <a href="/proof">Pilot evidence ledger</a>
        </div>
        <div>
          <div className="flabel">PROTOCOL</div>
          <a href="https://github.com/sCRIT-labs/sCRIT" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://x.com/getsCRIT" target="_blank" rel="noopener noreferrer">X (@getsCRIT)</a>
          <a href={HOOD_MAINNET.explorer} target="_blank" rel="noreferrer">Blockscout</a>
          {process.env.NEXT_PUBLIC_ROUTER_ADDRESS && <a href={`${HOOD_MAINNET.explorer}/address/${process.env.NEXT_PUBLIC_ROUTER_ADDRESS}`} target="_blank" rel="noreferrer">Configured router</a>}
          <a href="/launch">Launch form</a>
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
        <span>Pilot software only - no claim of physical backing is made.</span>
      </div>

      <div className="footer-word" aria-hidden="true">sCRIT</div>
    </footer>
  );
};
