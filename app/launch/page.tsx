"use client";

import { useState } from "react";
import type { Address } from "viem";
import { formatEther } from "viem";
import Image from "next/image";
import { PageShell } from "@/components/PageShell";
import WalletButton from "@/components/WalletButton";
import { Rocket, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Sparkles, ExternalLink } from "lucide-react";
import {
  SLIPPAGE_PRESETS,
  launcherIssuerApproved,
  launchTokenScrit,
  toTokenUnits,
  validateLaunchParams,
} from "@/lib/scrit-evm";
import { HOOD_MAINNET, HOOD_TESTNET, PROJECT_POOL_LP_FEE_BPS, SCRIT_CHAIN_ID, scritDeploymentFor } from "@/lib/scrit";
import { BASKET } from "@/lib/scrit-basket";
import { TAX_ACTIVE } from "@/lib/scrit";

type Step = "idle" | "checking" | "ready" | "approve" | "launch" | "done" | "error";

export default function Launch() {
  const [chainId, setChainId] = useState<4663 | 46630>(SCRIT_CHAIN_ID);
  const [account, setAccount] = useState<Address | null>(null);
  const [scritBal, setScritBal] = useState<bigint>(0n);
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [supply, setSupply] = useState("1000000000");
  const [pooled, setPooled] = useState("200000000");
  const [scritAmt, setScritAmt] = useState("1000");
  const [slippage, setSlippage] = useState<number>(9800);
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<{
    token: string;
    pool: string;
    positionId: bigint;
    launchHash: string;
  } | null>(null);

  const explorer = chainId === 4663 ? HOOD_MAINNET.explorer : HOOD_TESTNET.explorer;
  const deployment = scritDeploymentFor(chainId);
  const indicativePrice = (() => {
    try {
      const p = parseFloat(pooled);
      const s = parseFloat(scritAmt);
      if (p > 0 && s > 0) {
        return (s / p).toLocaleString("en-US", { maximumSignificantDigits: 6 });
      }
      return "—";
    } catch {
      return "—";
    }
  })();

  async function checkAccess() {
    setStep("checking");
    setMsg("");
    setResult(null);
    try {
      const supplyU = toTokenUnits(supply);
      const pooledU = toTokenUnits(pooled);
      const scritU = toTokenUnits(scritAmt);
      const err = validateLaunchParams({
        name: name || ticker,
        ticker: ticker.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        supply: supplyU,
        pooled: pooledU,
        scritAmount: scritU,
      });
      if (err) {
        setStep("error");
        setMsg(`Invalid params: ${err}`);
        return;
      }
      if (!account) {
        setStep("error");
        setMsg("Connect wallet first.");
        return;
      }
      if (scritU > scritBal) {
        setStep("error");
        setMsg("Insufficient sCRIT for the selected pool contribution.");
        return;
      }
      if (chainId === 4663) {
        const r = await fetch(`/api/issuers?wallet=${account}`).then((x) => x.json()).catch(() => null);
        if (!r?.approved) {
          setStep("error");
          setMsg("Gated pilot — wallet not approved. Submit an application via the issuer desk.");
          return;
        }
      }
      if (!/^0x[0-9a-fA-F]{40}$/.test(deployment.launcher) || /^0x0{40}$/i.test(deployment.launcher) || /^0x0{40}$/i.test(deployment.token)) {
        setStep("error");
        setMsg(`sCRIT and its launcher are not configured for ${chainId === 4663 ? "Robinhood Chain mainnet" : "Robinhood Chain testnet"}.`);
        return;
      }
      const onchainApproved = await launcherIssuerApproved(chainId, account, deployment.launcher as Address).catch(() => false);
      if (!onchainApproved) {
        setStep("error");
        setMsg("Wallet is not approved in the launcher contract. Ask the launcher owner to enable it on-chain.");
        return;
      }
      if (!ack1 || !ack2) {
        setStep("error");
        setMsg("Tick both disclosures first.");
        return;
      }
      setStep("ready");
      setMsg("Parameters verified. Proceed with Strike Pair.");
    } catch (e: unknown) {
      setStep("error");
      setMsg(e instanceof Error ? e.message : "check_failed");
    }
  }

  async function launch() {
    if (!account) return;
    setStep("approve");
    setMsg("Confirm the sCRIT allowance if requested, then create the pool.");
    try {
      const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const out = await launchTokenScrit({
        chainId,
        account,
        scrit: deployment.token as Address,
        launcher: deployment.launcher as Address,
        params: {
          name: name || cleanTicker,
          ticker: cleanTicker,
          supply: toTokenUnits(supply),
          pooled: toTokenUnits(pooled),
          scritAmount: toTokenUnits(scritAmt),
        },
        slippageBps: slippage,
        onStep: (s) => {
          setStep(s);
          setMsg(s === "approve" ? "Authorize the launcher to use the selected sCRIT amount." : "Deploy token and initialize the sCRIT liquidity pool.");
        },
      });
      setResult({ token: out.token, pool: out.pool, positionId: out.positionId, launchHash: out.launchHash });
      setStep("done");
      setMsg(`Token and ${chainId === 4663 ? "V4 taxed" : "V3 testnet rehearsal"} liquidity position successfully deployed.`);
    } catch (e: unknown) {
      setStep("error");
      setMsg(e instanceof Error ? e.message : "launch_failed");
    }
  }

  return (
    <PageShell>
      {/* Header section */}
      <div className="scrit-reveal" style={{ maxWidth: 840, marginBottom: 28 }}>
        <p className="eyebrow">Rail A · Gated Pilot & Testnet Rehearsal</p>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(34px, 4.5vw, 56px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: "12px 0 16px",
            lineHeight: 1.1,
          }}
        >
          Strike your liquidity engine.
        </h1>
        <p
          style={{
            color: "var(--parchment-dim)",
            fontSize: "clamp(15px, 1.8vw, 17px)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Every ecosystem launch is anchored to <b style={{ color: "#ffffff" }}>TOKEN / sCRIT</b>.
          New project pools pair with <b className="gold">sCRIT</b>, the index target across nine critical and strategic commodities. Basket weights are allocation targets, not a claim of funded custody.
        </p>
      </div>

      <div className="launch-grid-layout scrit-reveal">
        {/* Left Column: Real-time Pool Economics & Metal Anchor Console */}
        <div className="launch-preview-panel">
          <div className="launch-header-row">
            <div>
              <span className="mono-sm" style={{ letterSpacing: "0.08em" }}>PAIR ANCHOR</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0" }}>
                {ticker ? ticker.toUpperCase() : "TOKEN"} / sCRIT
              </h3>
            </div>
            <div className="launch-token-avatar-badge">
              {ticker ? ticker.slice(0, 3).toUpperCase() : "SCR"}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#a1a1a6", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={14} color="var(--gold-bright)" strokeWidth={2} />
                Base Bullion Anchor
              </span>
              <span className="mono-sm" style={{ color: "var(--gold-bright)" }}>Index basket target</span>
            </div>
            <div className="metal-composition-bar" aria-label="Nine-commodity target basket" style={{ display: "flex", overflow: "hidden" }}>
              {BASKET.map((row, index) => <div key={row.symbol} title={`${row.name} ${row.weightBps / 100}%`} style={{ width: `${row.weightBps / 100}%`, height: 10, background: ["#d9a92e", "#b8b8c0", "#50e3c2", "#c27a50", "#8db4d8", "#7b93cd", "#9b7bc4", "#719875", "#b8a15f"][index] }} />)}
            </div>
            <div className="metal-legend-row" style={{ flexWrap: "wrap" }}>
              {BASKET.map((row, index) => <span className="metal-legend-item" key={row.symbol}><span className="metal-dot" style={{ background: ["#d9a92e", "#b8b8c0", "#50e3c2", "#c27a50", "#8db4d8", "#7b93cd", "#9b7bc4", "#719875", "#b8a15f"][index] }} />{row.symbol} {row.weightBps / 100}%</span>)}
            </div>
          </div>

          <div className="launch-metrics-card">
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Indicative Price</span>
              <span className="launch-metric-val">{indicativePrice} sCRIT / token</span>
            </div>
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Project hook fee</span>
              <span className="launch-metric-val" style={{ color: TAX_ACTIVE ? "#2ed573" : "#f1bb65" }}>{TAX_ACTIVE ? "2.5% · 75/25 split" : chainId === 46630 ? "0% testnet rehearsal" : "Hook not configured"}</span>
            </div>
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">V4 LP fee</span>
              <span className="launch-metric-val">{chainId === 4663 ? `${(PROJECT_POOL_LP_FEE_BPS / 100).toFixed(2)}% · additional` : "V3 pool tier 0.30%"}</span>
            </div>
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Pool Pair</span>
              <span className="launch-metric-val">TOKEN / sCRIT</span>
            </div>
          </div>

          {/* Visual card */}
          <div
            style={{
              position: "relative",
              height: 140,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Image
              src="/images/scrit_kinetic_scale.jpg"
              alt="Quantum Metal Anchor"
              fill
              style={{ objectFit: "cover", opacity: 0.65 }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, transparent 0%, rgba(9,9,12,0.85) 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: 16,
              }}
            >
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold-bright)", textTransform: "uppercase" }}>
                {TAX_ACTIVE ? "V4 PROJECT POOL FEE" : "NETWORK FEE STATUS"}
              </span>
              <span style={{ fontSize: 13, color: "#ffffff", fontWeight: 500 }}>
                {TAX_ACTIVE ? "Mainnet project pools add a 2.5% V4 hook fee (75% reserve treasury / 25% operations) to the 0.30% LP fee. Collected fees are not counted as reserve until a custody attestation." : "The mainnet design adds a 2.5% V4 hook fee to the 0.30% LP fee when deployed. The testnet V3 rehearsal does not collect the hook fee."}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Deployment Console */}
        <div className="launch-form-panel">
          {/* Notice banner */}
          <div className="launch-disclaimer-box">
            <p>
              <b>Pilot &amp; risk notice:</b> Project tokens are not commodity claims. sCRIT is not pegged and has no redemption in the pilot. Basket weights are targets, not proof of funded custody.
            </p>
          </div>

          {/* Network & Wallet Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div className="launch-field-group" style={{ marginBottom: 0 }}>
              <label className="launch-field-label">Target Network</label>
              <select
                className="field"
                value={chainId}
                onChange={(e) => { setChainId(Number(e.target.value) as 4663 | 46630); setAccount(null); setScritBal(0n); setStep("idle"); setMsg(""); }}
              >
                <option value={46630}>Robinhood Testnet 46630 (Rehearsal)</option>
                <option value={4663}>Robinhood Mainnet 4663 (Gated Pilot)</option>
              </select>
            </div>
            <div className="launch-field-group" style={{ marginBottom: 0 }}>
              <label className="launch-field-label">
                Issuer Wallet {account ? <span>{account.slice(0, 6)}...{account.slice(-4)}</span> : null}
              </label>
              <WalletButton chainId={chainId} onConnect={(acc, bal) => { setAccount(acc); setScritBal(bal); }} />
            </div>
          </div>

          {account ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 14px",
                background: "rgba(217, 169, 46, 0.06)",
                border: "1px solid rgba(217, 169, 46, 0.2)",
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <span className="mono-sm" style={{ color: "#a1a1a6" }}>Available sCRIT balance</span>
              <span className="mono-sm" style={{ color: "var(--gold-bright)", fontWeight: 700 }}>
                {parseFloat(formatEther(scritBal)).toLocaleString("en-US", { maximumFractionDigits: 4 })} sCRIT
              </span>
            </div>
          ) : null}

          {/* Token Name and Ticker */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginBottom: 18 }}>
            <div className="launch-field-group" style={{ marginBottom: 0 }}>
              <label className="launch-field-label">Token Name <span>Max 32 chars</span></label>
              <input
                className="field"
                placeholder="e.g. Apex Sovereign"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="launch-field-group" style={{ marginBottom: 0 }}>
              <label className="launch-field-label">Symbol / Ticker <span>A-Z0-9</span></label>
              <input
                className="field"
                placeholder="e.g. APEX"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {/* Supply and Pooled */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            <div className="launch-field-group" style={{ marginBottom: 0 }}>
              <label className="launch-field-label">Total Supply <span>18 decimals</span></label>
              <input
                className="field"
                placeholder="1000000000"
                value={supply}
                onChange={(e) => setSupply(e.target.value)}
              />
              <div className="launch-quick-chips">
                <button type="button" className="launch-chip-btn" onClick={() => setSupply("100000000")}>100M</button>
                <button type="button" className="launch-chip-btn" onClick={() => setSupply("1000000000")}>1B</button>
                <button type="button" className="launch-chip-btn" onClick={() => setSupply("10000000000")}>10B</button>
              </div>
            </div>

            <div className="launch-field-group" style={{ marginBottom: 0 }}>
              <label className="launch-field-label">Pooled to Liquidity <span>Tokens to pair</span></label>
              <input
                className="field"
                placeholder="200000000"
                value={pooled}
                onChange={(e) => setPooled(e.target.value)}
              />
              <div className="launch-quick-chips">
                <button
                  type="button"
                  className="launch-chip-btn"
                  onClick={() => {
                    const s = parseFloat(supply) || 0;
                    setPooled(Math.round(s * 0.2).toString());
                  }}
                >
                  20%
                </button>
                <button
                  type="button"
                  className="launch-chip-btn"
                  onClick={() => {
                    const s = parseFloat(supply) || 0;
                    setPooled(Math.round(s * 0.5).toString());
                  }}
                >
                  50%
                </button>
                <button
                  type="button"
                  className="launch-chip-btn"
                  onClick={() => {
                    setPooled(supply);
                  }}
                >
                  100%
                </button>
              </div>
            </div>
          </div>

          {/* sCRIT and Slippage */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginBottom: 22 }}>
            <div className="launch-field-group" style={{ marginBottom: 0 }}>
              <label className="launch-field-label">sCRIT to Pair <span>Initial depth</span></label>
              <input
                className="field"
                placeholder="1000"
                value={scritAmt}
                onChange={(e) => setScritAmt(e.target.value)}
              />
              <div className="launch-quick-chips">
                <button type="button" className="launch-chip-btn" onClick={() => setScritAmt("500")}>500</button>
                <button type="button" className="launch-chip-btn" onClick={() => setScritAmt("1000")}>1,000</button>
                <button type="button" className="launch-chip-btn" onClick={() => setScritAmt("5000")}>5,000</button>
                <button type="button" className="launch-chip-btn" onClick={() => setScritAmt("10000")}>10,000</button>
              </div>
            </div>

            <div className="launch-field-group" style={{ marginBottom: 0 }}>
              <label className="launch-field-label">Slippage Tolerance <span>Pool bounds</span></label>
              <select className="field" value={slippage} onChange={(e) => setSlippage(Number(e.target.value))}>
                {SLIPPAGE_PRESETS.map((s) => (
                  <option key={s.bps} value={s.bps}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Disclosures checkboxes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            <label className="check">
              <input type="checkbox" checked={ack1} onChange={(e) => setAck1(e.target.checked)} />
              <span>I understand this token is not a direct claim on any physical commodity.</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={ack2} onChange={(e) => setAck2(e.target.checked)} />
              <span>I accept Rail A Pilot Terms and understand sCRIT has no pilot redemption or peg.</span>
            </label>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost"
              style={{ flex: "1 1 200px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={checkAccess}
              disabled={step === "checking" || step === "approve" || step === "launch"}
            >
              {step === "checking" ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              <span>{step === "checking" ? "Verifying..." : "1 · Validate Parameters"}</span>
            </button>
            <button
              className="btn btn-gold"
              style={{ flex: "1 1 240px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={launch}
              disabled={step !== "ready"}
            >
              <Rocket size={15} strokeWidth={2} />
              <span>2 · Strike Liquidity Pair</span>
            </button>
          </div>

          {/* Status Tracker */}
          <div className="launch-stepper-tracker">
            <span
              className={`launch-step-dot ${
                step === "checking" || step === "approve" || step === "launch" || step === "done"
                  ? "active"
                  : ""
              }`}
            />
            <div style={{ flex: 1 }}>
              <span className="mono-sm" style={{ color: "#8e8e93", textTransform: "uppercase" }}>
                Engine Status: <b style={{ color: step === "error" ? "#f87171" : "#ffffff" }}>{step}</b>
              </span>
              {msg ? (
                <p style={{ margin: "3px 0 0", fontSize: 13, color: step === "error" ? "#fca5a5" : "#e5e5ea" }}>
                  {msg}
                </p>
              ) : null}
            </div>
          </div>

          {/* Result panel */}
          {result ? (
            <div
              className="panel"
              style={{
                marginTop: 20,
                borderColor: "rgba(217, 169, 46, 0.45)",
                background: "rgba(217, 169, 46, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
                <CheckCircle2 size={18} color="#2ed573" />
                <h4 style={{ margin: 0, color: "var(--gold-bright)", fontSize: 16 }}>
                  Deployment Success
                </h4>
              </div>
              <p style={{ fontSize: 13, marginBottom: 8, wordBreak: "break-all" }}>
                Token Contract:{" "}
                <a className="mono-sm" href={`${explorer}/address/${result.token}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span>{result.token}</span>
                  <ExternalLink size={12} />
                </a>
              </p>
              <p style={{ fontSize: 13, marginBottom: 8, wordBreak: "break-all" }}>
                {chainId === 4663 ? "V4 Pool ID: " : "V3 Pool: "}
                {result.pool.length === 42 ? <a className="mono-sm" href={`${explorer}/address/${result.pool}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span>{result.pool}</span><ExternalLink size={12} /></a> : <span className="mono-sm">{result.pool}</span>}
              </p>
              <p style={{ fontSize: 13, marginBottom: 8, wordBreak: "break-all" }}>
                Position NFT: #{result.positionId.toString()} at{" "}
                <a className="mono-sm" href={`${explorer}/address/${deployment.positionManager}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span>{deployment.positionManager}</span>
                  <ExternalLink size={12} />
                </a>
              </p>
              <p style={{ fontSize: 13, margin: 0, wordBreak: "break-all" }}>
                Launch Tx:{" "}
                <a className="mono-sm" href={`${explorer}/tx/${result.launchHash}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span>{result.launchHash}</span>
                  <ExternalLink size={12} />
                </a>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
