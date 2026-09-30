"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import { formatEther } from "viem";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import WalletButton from "@/components/WalletButton";
import ChainLogo from "@/components/ChainLogo";
import CropModal from "@/components/CropModal";
import { saveLocalToken } from "@/lib/tokens";
import {
  Rocket,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Coins,
  TrendingUp,
  Layers,
  ArrowRight,
  Info,
  CheckSquare,
  Square,
  Zap,
  Upload,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import {
  SLIPPAGE_PRESETS,
  launcherIssuerApproved,
  launchTokenScrit,
  scritBalanceOf,
  toTokenUnits,
  validateLaunchParams,
} from "@/lib/scrit-evm";
import { HOOD_MAINNET, HOOD_TESTNET, PROJECT_POOL_LP_FEE_BPS, SCRIT_CHAIN_ID, scritDeploymentFor } from "@/lib/scrit";
import { BASKET, SLEEVES } from "@/lib/scrit-basket";
import { TAX_ACTIVE } from "@/lib/scrit";
import { loadWallet } from "@/lib/wallets";
import { CopilotDrawerWidget } from "@/components/CopilotDrawerWidget";
import type { IssuanceDraft } from "@/components/IssuanceDraftCard";

type Step = "idle" | "checking" | "ready" | "approve" | "launch" | "done" | "error";

export default function Launch() {
  const [chainId, setChainId] = useState<4663 | 46630>(SCRIT_CHAIN_ID);
  const [account, setAccount] = useState<Address | null>(null);
  const [scritBal, setScritBal] = useState<bigint>(0n);
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<{ src: string; fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [supply, setSupply] = useState("1000000000");
  const [pooled, setPooled] = useState("200000000");
  const [scritAmt, setScritAmt] = useState("1000");
  const [slippage, setSlippage] = useState<number>(9800);
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [msg, setMsg] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [result, setResult] = useState<{
    token: string;
    pool: string;
    positionId: bigint;
    launchHash: string;
  } | null>(null);
  const [issuerApproved, setIssuerApproved] = useState<boolean | null>(null);
  const [faucetLoading, setFaucetLoading] = useState(false);

  const explorer = chainId === 4663 ? HOOD_MAINNET.explorer : HOOD_TESTNET.explorer;
  const deployment = scritDeploymentFor(chainId);

  const [copilotOpen, setCopilotOpen] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [highlightDraft, setHighlightDraft] = useState(false);

  // Load draft from localStorage on mount & check URL search params
  useEffect(() => {
    try {
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const isFromCopilot = params?.get("fromCopilot") === "true";

      const raw = localStorage.getItem("scrit.launch.draft");
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; ticker?: string; supply?: string; pooled?: string; scritAmt?: string };
        if (parsed.name) setName(parsed.name);
        if (parsed.ticker) setTicker(parsed.ticker);
        if (parsed.supply) setSupply(parsed.supply);
        if (parsed.pooled) setPooled(parsed.pooled);
        if (parsed.scritAmt) setScritAmt(parsed.scritAmt);

        if (isFromCopilot && parsed.name) {
          setDraftNotice(`Draft loaded from Copilot AI: $${parsed.ticker || "TOKEN"} (${parsed.name}). Human review mandatory before signing.`);
          setHighlightDraft(true);
          setTimeout(() => setHighlightDraft(false), 2400);
        }
      }
      const saved = loadWallet();
      if (saved?.address && /^0x[0-9a-fA-F]{40}$/.test(saved.address)) {
        setAccount(saved.address as Address);
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  function handleApplyDraftFromCopilot(d: IssuanceDraft) {
    if (d.name) setName(d.name);
    if (d.ticker) setTicker(d.ticker);
    if (d.supply) setSupply(d.supply);
    if (d.pooled) setPooled(d.pooled);
    if (d.scritAmt) setScritAmt(d.scritAmt);
    setDraftNotice(`Draft loaded from Copilot AI: $${d.ticker} (${d.name}). All fields remain fully editable.`);
    setHighlightDraft(true);
    setTimeout(() => setHighlightDraft(false), 2500);
    setCopilotOpen(false);

    // Scroll to Step 3 container smoothly
    setTimeout(() => {
      const el = document.getElementById("launch-step-3-container");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  // Save draft on changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "scrit.launch.draft",
        JSON.stringify({ name, ticker, supply, pooled, scritAmt })
      );
    } catch {
      // ignore
    }
  }, [name, ticker, supply, pooled, scritAmt]);

  // Reactive verification of issuer clearance status
  useEffect(() => {
    if (!account) {
      setIssuerApproved(null);
      return;
    }
    fetch(`/api/issuers?wallet=${account}`)
      .then((r) => r.json())
      .then((data) => {
        setIssuerApproved(Boolean(data?.approved));
      })
      .catch(() => setIssuerApproved(null));
  }, [account]);

  async function requestTestnetFaucet() {
    if (!account) return;
    setFaucetLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: account, chainId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Faucet transfer failed");
      const newBal = await scritBalanceOf(chainId, account, deployment.token);
      setScritBal(newBal);
      setMsg("Received 1,000 pilot testnet sCRIT! Liquidity pool can now be seeded.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Faucet request failed");
    } finally {
      setFaucetLoading(false);
    }
  }

  // Computed Economics
  const parsedSupply = parseFloat(supply) || 0;
  const parsedPooled = parseFloat(pooled) || 0;
  const parsedScrit = parseFloat(scritAmt) || 0;

  const pooledPercent = useMemo(() => {
    if (parsedSupply <= 0 || parsedPooled <= 0) return 0;
    return Math.min(100, Math.max(0, (parsedPooled / parsedSupply) * 100));
  }, [parsedSupply, parsedPooled]);

  const indicativePrice = useMemo(() => {
    if (parsedPooled > 0 && parsedScrit > 0) {
      return (parsedScrit / parsedPooled).toLocaleString("en-US", { maximumSignificantDigits: 6 });
    }
    return "—";
  }, [parsedPooled, parsedScrit]);

  const impliedFdvScrit = useMemo(() => {
    if (parsedPooled > 0 && parsedScrit > 0 && parsedSupply > 0) {
      const pricePerToken = parsedScrit / parsedPooled;
      const totalFdv = pricePerToken * parsedSupply;
      return totalFdv.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    return "—";
  }, [parsedPooled, parsedScrit, parsedSupply]);

  // Procedural gradient avatar based on ticker
  const avatarGradient = useMemo(() => {
    const chars = (ticker || "SCR").toUpperCase();
    let hash = 0;
    for (let i = 0; i < chars.length; i++) hash = chars.charCodeAt(i) + ((hash << 5) - hash);
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 45) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 70%, 25%) 0%, hsl(${h2}, 80%, 15%) 100%)`;
  }, [ticker]);

  function copyToClipboard(text: string, key: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }

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
        setMsg(`Parameter validation error: ${err}`);
        return;
      }
      if (!account) {
        setStep("error");
        setMsg("Please connect your issuer wallet first.");
        return;
      }
      if (scritU > scritBal) {
        setStep("error");
        setMsg("Insufficient sCRIT balance for the chosen liquidity contribution.");
        return;
      }
      if (chainId === 4663) {
        const r = await fetch(`/api/issuers?wallet=${account}`).then((x) => x.json()).catch(() => null);
        if (!r?.approved) {
          setStep("error");
          setMsg("Gated pilot: wallet not approved in issuer registry. Submit an application via Issuer Desk.");
          return;
        }
      }
      if (!/^0x[0-9a-fA-F]{40}$/.test(deployment.launcher) || /^0x0{40}$/i.test(deployment.launcher) || /^0x0{40}$/i.test(deployment.token)) {
        setStep("error");
        setMsg(`sCRIT and its launcher contracts are not configured for ${chainId === 4663 ? "Robinhood Chain mainnet" : "Robinhood Chain testnet"}.`);
        return;
      }
      const onchainApproved = await launcherIssuerApproved(chainId, account, deployment.launcher as Address).catch(() => false);
      if (!onchainApproved) {
        setStep("error");
        setMsg("Wallet is not approved in the launcher contract. The launcher owner must enable this issuer on-chain.");
        return;
      }
      if (!ack1 || !ack2) {
        setStep("error");
        setMsg("Please accept both required compliance and risk disclosures below.");
        return;
      }
      setStep("ready");
      setMsg("Parameters and permissions verified! Ready to Strike Pair.");
    } catch (e: unknown) {
      setStep("error");
      setMsg(e instanceof Error ? e.message : "check_failed");
    }
  }

  async function launch() {
    if (!account) return;
    setStep("approve");
    setMsg("Authorizing sCRIT allowance in your wallet...");
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
          if (s === "approve") {
            setMsg("Step 1/2: Authorize the launcher contract to spend your sCRIT tokens.");
          } else if (s === "launch") {
            setMsg("Step 2/2: Deploying token contract and initializing the Uniswap liquidity pool...");
          }
        },
      });
      setResult({ token: out.token, pool: out.pool, positionId: out.positionId, launchHash: out.launchHash });
      const newLaunchedToken = {
        id: `${chainId}-${out.token.toLowerCase()}`,
        chainId,
        address: out.token,
        name: name || cleanTicker,
        symbol: cleanTicker,
        creator: account,
        supply,
        pooled,
        scritAmount: scritAmt,
        txHash: out.launchHash,
        poolId: out.pool,
        poolType: chainId === 4663 ? "v4_hook" as const : "v3_standard" as const,
        logoUrl: logoUrl || undefined,
        backingCategory: "Critical Commodity Reserve",
        description: `Deployed via Rail A token launcher on ${chainId === 4663 ? "Robinhood Mainnet" : "Robinhood Testnet"}.`,
        createdAt: Date.now(),
      };
      saveLocalToken(newLaunchedToken);
      fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLaunchedToken),
      }).catch((err) => console.warn("Could not sync token to db:", err));
      setStep("done");
      setMsg(`Success! Token contract and ${chainId === 4663 ? "Uniswap V4 taxed pool" : "V3 rehearsal pool"} successfully deployed.`);
    } catch (e: unknown) {
      setStep("error");
      setMsg(e instanceof Error ? e.message : "launch_failed");
    }
  }

  return (
    <PageShell>
      {/* Editorial Header */}
      <div style={{ maxWidth: 1100, marginBottom: 36 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 2, background: "rgba(83, 103, 83, 0.08)", border: "1px solid rgba(83, 103, 83, 0.2)", marginBottom: 14 }}>
          <Sparkles size={13} color="var(--moss)" />
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--moss)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Rail A · Uniswap V4 Liquidity Engine
          </span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(20px, 3.8vw, 46px)",
            fontWeight: 450,
            letterSpacing: "-0.035em",
            margin: "0 0 16px",
            lineHeight: 1.15,
            color: "var(--ink)",
          }}
        >
          Strike your liquidity engine.
        </h1>
        <p
          style={{
            color: "#5e645d",
            fontSize: "clamp(15px, 1.8vw, 17px)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 780,
          }}
        >
          Every ecosystem launch is anchored to <b style={{ color: "var(--ink)" }}>TOKEN / sCRIT</b>.
          Project pools pair with <b style={{ color: "#8c6418" }}>sCRIT</b>, funding accessions to an on-chain stockpile across five sleeves of <abbr title="Technology-critical elements — the metals modern hardware can't be built without." style={{ textDecoration: "underline dotted", cursor: "help" }}>technology-critical elements (TCEs)</abbr> and <abbr title="Gold and silver keep the index stable while TCEs move." style={{ textDecoration: "underline dotted", cursor: "help" }}>monetary ballast</abbr>.
        </p>
      </div>

      {/* Guided 3-Step Wizard Progress Bar */}
      <div className="issuer-wizard-stepper" style={{ marginBottom: 32 }}>
        {/* Step 1 */}
        <div
          className={`issuer-step-card ${
            !account ? "active" : "completed"
          }`}
        >
          <div className="issuer-step-number-circle">
            {account ? <Check size={16} /> : "1"}
          </div>
          <div className="issuer-step-info">
            <span className="issuer-step-title">1. Connect Wallet</span>
            <span className="issuer-step-status-tag" style={{ whiteSpace: "nowrap" }}>
              {account ? `AUTHENTICATED (${account.slice(0, 6)}…)` : "ACTION REQUIRED"}
            </span>
          </div>
        </div>

        {/* Step 2 */}
        <div
          className={`issuer-step-card ${
            !account
              ? "locked"
              : issuerApproved
              ? "completed"
              : "active"
          }`}
        >
          <div className="issuer-step-number-circle">
            {issuerApproved ? <Check size={16} /> : "2"}
          </div>
          <div className="issuer-step-info">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="issuer-step-title">2. Dual-Gate Clearance</span>
              {!issuerApproved && account && (
                <Link
                  href="/issuer"
                  style={{
                    fontSize: 10.5,
                    fontFamily: "var(--font-mono)",
                    color: "#8c6418",
                    textDecoration: "underline",
                    fontWeight: 700,
                  }}
                >
                  Clearance Desk ↗
                </Link>
              )}
            </div>
            <span className="issuer-step-status-tag" style={{ whiteSpace: "nowrap" }}>
              {!account
                ? "LOCKED"
                : issuerApproved
                ? "CLEARED"
                : "CLEARANCE REQUIRED"}
            </span>
          </div>
        </div>

        {/* Step 3 */}
        <div
          className={`issuer-step-card ${
            account && issuerApproved ? "active" : "locked"
          }`}
        >
          <div className="issuer-step-number-circle">
            <Zap size={15} />
          </div>
          <div className="issuer-step-info">
            <span className="issuer-step-title">3. Strike Token Launch</span>
            <span className="issuer-step-status-tag" style={{ whiteSpace: "nowrap" }}>
              {account && issuerApproved ? "READY TO DEPLOY" : "AWAITING CLEARANCE"}
            </span>
          </div>
        </div>
      </div>

      <div className="launch-grid-layout">
        {/* Left Column: Live Economics & Metal Anchor Console */}
        <div className="launch-preview-panel">
          {/* Token Card Live Header */}
          <div className="launch-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--line-ink)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="launch-token-avatar-badge" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Token Emblem" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  ticker ? ticker.slice(0, 3).toUpperCase() : "SCR"
                )}
              </div>
              <div>
                <span className="mono-sm" style={{ letterSpacing: "0.08em", color: "#6b7268", textTransform: "uppercase", fontSize: 10 }}>
                  PAIR ANCHOR
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "1px 0 0", color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                  {ticker ? ticker.toUpperCase() : "TOKEN"} <span style={{ color: "#a5aba1" }}>/</span> <span style={{ color: "#8c6418" }}>sCRIT</span>
                </h3>
                <span style={{ fontSize: 11, color: "#6b7268" }}>
                  {name ? name : "Unnamed Token"}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="scrit-nav-pill-active" style={{ fontSize: 9.5, padding: "2px 8px" }}>
                {chainId === 4663 ? "Mainnet" : "Testnet"}
              </span>
            </div>
          </div>

          {/* Real-time Economics & FDV */}
          <div className="launch-metrics-card">
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Indicative Price</span>
              <span className="launch-metric-val" style={{ color: "#8c6418" }}>
                {indicativePrice} sCRIT
              </span>
            </div>
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Implied Market Cap (FDV)</span>
              <span className="launch-metric-val">
                {impliedFdvScrit} sCRIT
              </span>
            </div>
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Initial Liquidity Depth</span>
              <span className="launch-metric-val" suppressHydrationWarning>
                {parsedScrit.toLocaleString("en-US")} sCRIT + {parsedPooled.toLocaleString("en-US")} {ticker || "tokens"}
              </span>
            </div>
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Trading Hook Fee</span>
              <span className="launch-metric-val" style={{ color: TAX_ACTIVE ? "#b8962e" : "#8c6418" }}>
                {TAX_ACTIVE ? "2.5% · 75/25 split" : chainId === 46630 ? "0% testnet rehearsal" : "V4 Hook Pending"}
              </span>
            </div>
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Uniswap V4 LP Fee</span>
              <span className="launch-metric-val">
                {chainId === 4663 ? `${(PROJECT_POOL_LP_FEE_BPS / 100).toFixed(2)}% · LP share` : "0.30% V3 standard"}
              </span>
            </div>
          </div>

          {/* Allocation Ratio Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 5, color: "#636b60" }}>
              <span>Liquidity Allocation</span>
              <span className="mono-sm" style={{ color: "var(--ink)" }}>
                <b>{pooledPercent.toFixed(1)}%</b> in LP ({parsedSupply > 0 ? (100 - pooledPercent).toFixed(1) : 0}% retained)
              </span>
            </div>
            <div style={{ height: 6, background: "#edeae0", borderRadius: 999, overflow: "hidden", display: "flex" }}>
              <div
                style={{
                  width: `${pooledPercent}%`,
                  background: "linear-gradient(90deg, #997022, #536753)",
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Five-Sleeve Stockpile Target Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <ShieldCheck size={13} color="#8c6418" strokeWidth={2} />
                Stockpile Target Allocation
              </span>
              <span className="mono-sm" style={{ color: "#8c6418", fontSize: 10.5 }}>
                5 sleeves · 9 elements
              </span>
            </div>
            <div className="metal-composition-bar" aria-label="Five-sleeve stockpile target" style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden" }}>
              {SLEEVES.map((sleeve) => {
                const totalBps = BASKET.filter((b) => b.sleeve === sleeve.id).reduce((sum, b) => sum + b.weightBps, 0);
                return (
                  <div
                    key={sleeve.id}
                    title={`${sleeve.label} ${totalBps / 100}%`}
                    style={{
                      width: `${totalBps / 100}%`,
                      height: "100%",
                      background: sleeve.color,
                    }}
                  />
                );
              })}
            </div>
            {/* Direct labels: sleeve name + % */}
            <div className="metal-legend-row" style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px", marginTop: 7 }}>
              {SLEEVES.map((sleeve) => {
                const totalBps = BASKET.filter((b) => b.sleeve === sleeve.id).reduce((sum, b) => sum + b.weightBps, 0);
                return (
                  <span className="metal-legend-item" key={sleeve.id} style={{ fontSize: 10.5, fontWeight: 600, color: "#1b2019", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span
                      className="metal-dot"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: sleeve.color,
                      }}
                    />
                    {sleeve.label} {totalBps / 100}%
                  </span>
                );
              })}
            </div>
            {/* Per-element details */}
            <div style={{ fontSize: 9.5, color: "#747d70", marginTop: 4, display: "flex", flexWrap: "wrap", gap: "2px 6px" }}>
              {BASKET.map((row) => (
                <span key={row.symbol}>{row.symbol} {row.weightBps / 100}%</span>
              ))}
            </div>
            {/* Under-chart note required by §5 */}
            <div style={{ fontSize: 10, color: "#8a9486", marginTop: 4, fontStyle: "italic" }}>
              <abbr title="Heavy rare earth elements — the scarcest, most concentrated rare earths." style={{ textDecoration: "underline dotted", cursor: "help" }}>HREE</abbr> has no on-chain price feed. Dy and Tb prices are manual pilot inputs from market reports.
            </div>
          </div>

          {/* Interactive V4 Dynamic Hook Revenue Simulator */}
          <div
            style={{
              background: "linear-gradient(135deg, #fdfaf3 0%, #f6f0e2 100%)",
              border: "1.5px solid rgba(201, 146, 46, 0.45)",
              borderRadius: 6,
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              boxShadow: "0 6px 20px rgba(201, 146, 46, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#8c6418", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                V4 Hook Perpetual Revenue
              </span>
              <span style={{ fontSize: 9.5, background: "#8c6418", color: "#ffffff", padding: "1px 6px", borderRadius: 3, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                75% TO ISSUER
              </span>
            </div>
            <p style={{ fontSize: 11, color: "#555d54", margin: 0, lineHeight: 1.35 }}>
              On Rail A, your project treasury earns <b>1.875% perpetual volume fee</b> from every swap through the Uniswap V4 Tax Hook.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingTop: 5, borderTop: "1px dashed rgba(140, 100, 24, 0.2)" }}>
              <div>
                <span style={{ fontSize: 9.5, color: "#7a8277", fontFamily: "var(--font-mono)" }}>AT $100K DAILY VOL</span>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#8c6418" }}>$1,875 / day</div>
              </div>
              <div>
                <span style={{ fontSize: 9.5, color: "#7a8277", fontFamily: "var(--font-mono)" }}>EST. MONTHLY</span>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1b5e20" }}>~$56,250 / mo</div>
              </div>
            </div>
          </div>

          {/* Visual Vault Card */}
          <div
            style={{
              position: "relative",
              height: 54,
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid var(--line-ink)",
            }}
          >
            <Image
              src="/images/scrit_kinetic_scale.jpg"
              alt="Physical Metal Anchor"
              fill
              style={{ objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(24,26,24,0.3) 0%, rgba(24,26,24,0.88) 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "6px 12px",
              }}
            >
              <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: "#f2c94c", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                {TAX_ACTIVE ? "V4 PROJECT POOL FEE STRUCTURE" : "ROBINHOOD NETWORK STATUS"}
              </span>
              <span style={{ fontSize: 10.5, color: "#ffffff", fontWeight: 500, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {TAX_ACTIVE
                  ? "2.5% hook tax split 75% reserve treasury / 25% operations."
                  : "Mainnet applies 2.5% V4 hook fee. Testnet rehearsal runs V3 zero-tax pools."}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Deployment Terminal */}
        <div className="launch-form-panel">
          {/* Important Pilot Disclaimer */}
          <div className="launch-disclaimer-box">
            <p style={{ margin: 0 }}>
              <b>Pilot &amp; Compliance Notice:</b> Project tokens launched on Rail A pair exclusively with sCRIT. They are <u>not</u> direct claims on specific physical metal. sCRIT market price floats on pool liquidity and is not pegged to NAV.
            </p>
          </div>

          {/* Early Compliance Gate Status Alert Bar */}
          {account ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 4,
                marginBottom: 16,
                background: issuerApproved ? "#f0f7f1" : "#fdf6e8",
                border: issuerApproved ? "1px solid rgba(46, 125, 50, 0.3)" : "1px solid rgba(184, 134, 11, 0.35)",
                color: issuerApproved ? "#1b5e20" : "#8a5d00",
                fontSize: 12.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {issuerApproved ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>
                  {issuerApproved
                    ? "Institutional Clearance Active · Dual-Gate Verified for Rail A Deployment."
                    : "Intake Clearance Required: Complete 1-click verification at Issuer Desk before launching."}
                </span>
              </div>
              {!issuerApproved && (
                <Link
                  href="/issuer"
                  style={{
                    color: "#8a5d00",
                    fontWeight: 700,
                    textDecoration: "underline",
                    fontSize: 11.5,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Clearance Desk ↗
                </Link>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 4,
                marginBottom: 16,
                background: "#f4f3ee",
                border: "1px solid rgba(24, 26, 24, 0.12)",
                color: "#555d54",
                fontSize: 12.5,
              }}
            >
              <Info size={16} />
              <span>Connect deployment wallet below to inspect live allowlist permissions &amp; balance.</span>
            </div>
          )}

          {/* SECTION 01: Network & Issuer Wallet */}
          <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--line-ink)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="launch-field-group">
                <label className="launch-field-label">Target Network</label>
                <select
                  className="field"
                  value={chainId}
                  onChange={(e) => {
                    setChainId(Number(e.target.value) as 4663 | 46630);
                    setAccount(null);
                    setScritBal(0n);
                    setStep("idle");
                    setMsg("");
                  }}
                >
                  <option value={46630}>Robinhood Testnet 46630 (V3 Rehearsal)</option>
                  <option value={4663}>Robinhood Mainnet 4663 (V4 Gated Pilot)</option>
                </select>
                <p className="mono-sm" style={{ color: "#8e8e93", margin: "6px 0 0", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <ChainLogo kind="hood" size={14} />
                  {chainId === 4663 ? "Robinhood Chain · Chain 4663" : "Robinhood Testnet · Chain 46630"}
                </p>
              </div>

              <div className="launch-field-group">
                <label className="launch-field-label">
                  Issuer Wallet
                  {account ? <span style={{ color: "#d0aa5b" }}>● Connected</span> : null}
                </label>
                <WalletButton
                  chainId={chainId}
                  onConnect={(acc, bal) => {
                    setAccount(acc);
                    setScritBal(bal);
                  }}
                  onDisconnect={() => {
                    setAccount(null);
                    setScritBal(0n);
                    setStep("idle");
                  }}
                />
              </div>
            </div>

            {account ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "#fbf6ea",
                  border: "1px solid rgba(153, 112, 34, 0.3)",
                  borderRadius: 4,
                  marginTop: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Coins size={15} color="#8c6418" />
                  <span className="mono-sm" style={{ color: "#636b60", fontSize: 12 }}>Available sCRIT Balance:</span>
                </div>
                <span className="mono-sm" style={{ color: "#8c6418", fontWeight: 700, fontSize: 13 }}>
                  {parseFloat(formatEther(scritBal)).toLocaleString("en-US", { maximumFractionDigits: 4 })} sCRIT
                </span>
              </div>
            ) : null}
          </div>

          {/* Step 3 Notice Banner if imported from Copilot AI */}
          {draftNotice && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "#fcf8ee",
                border: "1px solid rgba(184, 134, 11, 0.4)",
                borderRadius: 4,
                marginBottom: 16,
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6e4e0c" }}>
                <Sparkles size={14} color="#8c6418" style={{ flexShrink: 0 }} />
                <span>{draftNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setDraftNotice(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "#8c6418",
                  textDecoration: "underline",
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* SECTION 01: Token Identity */}
          <div style={{ paddingBottom: 18, borderBottom: "1px solid var(--line-ink)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "2px 8px", background: "#edf2ed", border: "1px solid rgba(83, 103, 83, 0.22)", borderRadius: 3 }}>
                <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "#2e4a2e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  01 · Token Identity
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCopilotOpen(true)}
                className="btn btn-ghost"
                style={{
                  minHeight: 28,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 650,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 3,
                  borderColor: "rgba(184, 134, 11, 0.35)",
                  background: "#fdfbf5",
                  color: "#785208",
                  cursor: "pointer",
                }}
              >
                <Sparkles size={12} color="#8c6418" />
                <span>Draft with Copilot AI</span>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
              <div className="launch-field-group">
                <label className="launch-field-label">
                  Token Name <span>{name.length}/32</span>
                </label>
                <input
                  className={`field ${highlightDraft ? "draft-highlight" : ""}`}
                  placeholder="e.g. Sovereign Bullion"
                  maxLength={32}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="launch-field-group">
                <label className="launch-field-label">
                  Symbol / Ticker <span>A-Z0-9</span>
                </label>
                <input
                  className={`field ${highlightDraft ? "draft-highlight" : ""}`}
                  placeholder="e.g. SOV"
                  maxLength={12}
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                />
              </div>
            </div>
            {/* Quick Suggestions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "#7d8479", fontFamily: "var(--font-mono)" }}>Suggestions:</span>
              {["APEX", "TITAN", "AURUM", "NOVA"].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  className="launch-chip-btn"
                  onClick={() => {
                    setTicker(sug);
                    if (!name) setName(`${sug.charAt(0) + sug.slice(1).toLowerCase()} Protocol`);
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Logo / Emblem Artwork Section */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed rgba(24, 26, 24, 0.12)" }}>
              <label className="launch-field-label" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                <span>Token Emblem / Artwork</span>
                <span>Square 1:1 · Optional</span>
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 8,
                    border: "1.5px dashed rgba(24, 26, 24, 0.25)",
                    background: logoUrl ? "transparent" : "#f6f3eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                  title="Click to upload custom emblem"
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Emblem" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Upload size={18} color="#7d8479" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      className="launch-chip-btn"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px" }}
                    >
                      <Upload size={12} />
                      <span>Upload &amp; Crop Emblem</span>
                    </button>
                    {logoUrl ? (
                      <button
                        type="button"
                        className="launch-chip-btn"
                        onClick={() => setLogoUrl(null)}
                        style={{ color: "#b91c1c", borderColor: "rgba(185, 28, 28, 0.3)" }}
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          setCropSource({ src: reader.result, fileName: file.name });
                        }
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                  <p style={{ margin: "5px 0 0", fontSize: 11, color: "#7d8479", fontFamily: "var(--font-mono)" }}>
                    PNG, JPG, WebP · Cropped to 512×512 square.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 03: Supply & Liquidity Configuration */}
          <div style={{ paddingBottom: 18, borderBottom: "1px solid var(--line-ink)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "2px 8px", background: "#edf2ed", border: "1px solid rgba(83, 103, 83, 0.22)", borderRadius: 3, marginBottom: 14 }}>
              <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "#2e4a2e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                02 · Economics &amp; Liquidity Parameters
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div className="launch-field-group">
                <label className="launch-field-label">
                  Total Supply <span>18 decimals</span>
                </label>
                <input
                  className={`field ${highlightDraft ? "draft-highlight" : ""}`}
                  placeholder="1000000000"
                  value={supply}
                  onChange={(e) => setSupply(e.target.value.replace(/[^0-9]/g, ""))}
                />
                <div className="launch-quick-chips">
                  <button type="button" className={`launch-chip-btn ${supply === "100000000" ? "active" : ""}`} onClick={() => setSupply("100000000")}>100M</button>
                  <button type="button" className={`launch-chip-btn ${supply === "1000000000" ? "active" : ""}`} onClick={() => setSupply("1000000000")}>1 Billion</button>
                  <button type="button" className={`launch-chip-btn ${supply === "10000000000" ? "active" : ""}`} onClick={() => setSupply("10000000000")}>10 Billion</button>
                </div>
              </div>

              <div className="launch-field-group">
                <label className="launch-field-label">
                  Pooled to Liquidity <span>{pooledPercent.toFixed(0)}% of supply</span>
                </label>
                <input
                  className={`field ${highlightDraft ? "draft-highlight" : ""}`}
                  placeholder="200000000"
                  value={pooled}
                  onChange={(e) => setPooled(e.target.value.replace(/[^0-9]/g, ""))}
                />
                <div className="launch-quick-chips">
                  <button
                    type="button"
                    className={`launch-chip-btn ${pooledPercent === 20 ? "active" : ""}`}
                    onClick={() => {
                      const s = parseFloat(supply) || 0;
                      setPooled(Math.round(s * 0.2).toString());
                    }}
                  >
                    20%
                  </button>
                  <button
                    type="button"
                    className={`launch-chip-btn ${pooledPercent === 50 ? "active" : ""}`}
                    onClick={() => {
                      const s = parseFloat(supply) || 0;
                      setPooled(Math.round(s * 0.5).toString());
                    }}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className={`launch-chip-btn ${pooledPercent === 80 ? "active" : ""}`}
                    onClick={() => {
                      const s = parseFloat(supply) || 0;
                      setPooled(Math.round(s * 0.8).toString());
                    }}
                  >
                    80%
                  </button>
                  <button
                    type="button"
                    className={`launch-chip-btn ${pooledPercent === 100 ? "active" : ""}`}
                    onClick={() => setPooled(supply)}
                  >
                    100%
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
              <div className="launch-field-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <label className="launch-field-label" style={{ margin: 0 }}>
                    sCRIT to Pair <span>Initial pool depth</span>
                  </label>
                  {account && (
                    <span className="mono-sm" style={{ fontSize: 11, color: scritBal > 0n ? "#1b5e20" : "#8a5d00", fontWeight: 600 }}>
                      Bal: {parseFloat(formatEther(scritBal)).toLocaleString("en-US", { maximumFractionDigits: 4 })} sCRIT
                    </span>
                  )}
                </div>
                <input
                  className={`field ${highlightDraft ? "draft-highlight" : ""}`}
                  placeholder="1000"
                  value={scritAmt}
                  onChange={(e) => setScritAmt(e.target.value.replace(/[^0-9.]/g, ""))}
                />
                <div className="launch-quick-chips">
                  <button type="button" className={`launch-chip-btn ${scritAmt === "500" ? "active" : ""}`} onClick={() => setScritAmt("500")}>500</button>
                  <button type="button" className={`launch-chip-btn ${scritAmt === "1000" ? "active" : ""}`} onClick={() => setScritAmt("1000")}>1,000</button>
                  <button type="button" className={`launch-chip-btn ${scritAmt === "5000" ? "active" : ""}`} onClick={() => setScritAmt("5000")}>5,000</button>
                  {scritBal > 0n ? (
                    <button
                      type="button"
                      className="launch-chip-btn"
                      onClick={() => setScritAmt(formatEther(scritBal))}
                      style={{ color: "#7a5205", borderColor: "rgba(184, 134, 11, 0.4)", fontWeight: 700 }}
                    >
                      Max Balance
                    </button>
                  ) : null}
                </div>

                {/* Helpful Zero/Low Balance Recovery Box */}
                {account && scritBal === 0n && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      borderRadius: 4,
                      background: "#fdf8ee",
                      border: "1px solid rgba(184, 134, 11, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 11.5, color: "#8a5d00" }}>
                      Notice: 0 sCRIT in wallet. Required to seed pool liquidity.
                    </span>
                    {chainId === 46630 ? (
                      <button
                        type="button"
                        onClick={requestTestnetFaucet}
                        disabled={faucetLoading}
                        style={{
                          background: "#8c6418",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 3,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {faucetLoading ? "Transferring..." : "Request 1,000 Pilot sCRIT"}
                      </button>
                    ) : (
                      <Link
                        href="/proof#reserve"
                        style={{
                          color: "#8c6418",
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: "underline",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Acquire Reserve Tokens ↗
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="launch-field-group">
                <label className="launch-field-label">
                  Slippage Tolerance <span>Pool bounds</span>
                </label>
                <select
                  className="field"
                  value={slippage}
                  onChange={(e) => setSlippage(Number(e.target.value))}
                >
                  {SLIPPAGE_PRESETS.map((s) => (
                    <option key={s.bps} value={s.bps}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 04: Compliance & Risk Disclosures */}
          <div style={{ paddingBottom: 18, borderBottom: "1px solid var(--line-ink)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "2px 8px", background: "#edf2ed", border: "1px solid rgba(83, 103, 83, 0.22)", borderRadius: 3, marginBottom: 14 }}>
              <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "#2e4a2e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                03 · Mandatory Regulatory Acknowledgements
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                className={`launch-disclosure-card ${ack1 ? "is-checked" : ""}`}
                onClick={() => setAck1(!ack1)}
              >
                <input
                  type="checkbox"
                  className="launch-disclosure-checkbox"
                  checked={ack1}
                  onChange={(e) => setAck1(e.target.checked)}
                />
                <div className="launch-disclosure-text">
                  <strong>Not a Direct Claim on Physical Inventory</strong>
                  I acknowledge that this token is paired with sCRIT in an AMM liquidity pool. It does not represent title or direct redeemability to any specific gold bar, diamond, or physical commodity.
                </div>
              </div>

              <div
                className={`launch-disclosure-card ${ack2 ? "is-checked" : ""}`}
                onClick={() => setAck2(!ack2)}
              >
                <input
                  type="checkbox"
                  className="launch-disclosure-checkbox"
                  checked={ack2}
                  onChange={(e) => setAck2(e.target.checked)}
                />
                <div className="launch-disclosure-text">
                  <strong>Acceptance of sCRIT Float &amp; Hook Fee Model</strong>
                  I accept the 2.5% V4 project pool trading tax (75% reserve / 25% ops) and acknowledge that sCRIT is not pegged to NAV and has no physical redemption in this pilot.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 05: Action Deck & Stepper */}
          <div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: "1 1 200px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={checkAccess}
                disabled={step === "checking" || step === "approve" || step === "launch"}
              >
                {step === "checking" ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
                <span>{step === "checking" ? "Verifying..." : "1 · Validate Parameters"}</span>
              </button>

              <button
                className="btn btn-gold"
                style={{ flex: "1 1 240px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={launch}
                disabled={step !== "ready"}
              >
                {step === "approve" || step === "launch" ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Rocket size={16} strokeWidth={2.2} />
                )}
                <span>
                  {step === "approve"
                    ? "Confirming Approval..."
                    : step === "launch"
                    ? "Striking Pair on-chain..."
                    : "2 · Strike Liquidity Pair"}
                </span>
              </button>
            </div>

            {/* Stepper Status Feedback */}
            <div className="launch-stepper-tracker">
              <span
                className={`launch-step-dot ${
                  step === "error"
                    ? "error"
                    : step === "done"
                    ? "done"
                    : step === "checking" || step === "approve" || step === "launch" || step === "ready"
                    ? "active"
                    : ""
                }`}
              />
              <div style={{ flex: 1 }}>
                <span className="mono-sm" style={{ color: "#636b60", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em" }}>
                  ENGINE STATUS:{" "}
                  <b style={{ color: step === "error" ? "#dc2626" : step === "done" ? "#b8962e" : "var(--ink)" }}>
                    {step.toUpperCase()}
                  </b>
                </span>
                {msg ? (
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: step === "error" ? "#b91c1c" : "#b8962e" }}>
                    {msg}
                  </p>
                ) : (
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "#7d8479" }}>
                    Complete token parameters and click Validate to proceed.
                  </p>
                )}
              </div>
            </div>

            {/* Result Trophy Card */}
            {result ? (
              <div className="launch-success-trophy">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(184, 150, 46, 0.12)", border: "1px solid rgba(184, 150, 46, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CheckCircle2 size={20} color="#b8962e" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: "#b8962e", fontSize: 17, fontWeight: 700 }}>
                        Liquidity Pair Successfully Struck!
                      </h4>
                      <span style={{ fontSize: 12, color: "#636b60" }}>
                        Token and pool position minted on {chainId === 4663 ? "Robinhood Mainnet" : "Robinhood Testnet"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Token Address */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#ffffff", borderRadius: 4, border: "1px solid var(--line-ink)" }}>
                    <div>
                      <span className="mono-sm" style={{ color: "#7d8479", fontSize: 11, display: "block" }}>TOKEN CONTRACT</span>
                      <a href={`${explorer}/address/${result.token}`} target="_blank" rel="noreferrer" className="mono-sm" style={{ color: "#8c6418", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {result.token}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <button type="button" className="launch-chip-btn" onClick={() => copyToClipboard(result.token, "token")}>
                      {copiedKey === "token" ? <Check size={13} color="#b8962e" /> : <Copy size={13} />}
                    </button>
                  </div>

                  {/* Pool Address / ID */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#ffffff", borderRadius: 4, border: "1px solid var(--line-ink)" }}>
                    <div>
                      <span className="mono-sm" style={{ color: "#7d8479", fontSize: 11, display: "block" }}>
                        {chainId === 4663 ? "UNISWAP V4 POOL ID" : "UNISWAP V3 POOL"}
                      </span>
                      <span className="mono-sm" style={{ color: "var(--ink)", fontSize: 13 }}>
                        {result.pool}
                      </span>
                    </div>
                    <button type="button" className="launch-chip-btn" onClick={() => copyToClipboard(result.pool, "pool")}>
                      {copiedKey === "pool" ? <Check size={13} color="#b8962e" /> : <Copy size={13} />}
                    </button>
                  </div>

                  {/* Position NFT */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#ffffff", borderRadius: 4, border: "1px solid var(--line-ink)" }}>
                    <div>
                      <span className="mono-sm" style={{ color: "#7d8479", fontSize: 11, display: "block" }}>LIQUIDITY POSITION NFT</span>
                      <span className="mono-sm" style={{ color: "var(--ink)", fontSize: 13 }}>
                        Token ID #{result.positionId.toString()} (Owned by you)
                      </span>
                    </div>
                    <a
                      href={`${explorer}/address/${deployment.positionManager}`}
                      target="_blank"
                      rel="noreferrer"
                      className="launch-chip-btn"
                      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                    >
                      <span>Position Manager</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Tx Hash */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#ffffff", borderRadius: 4, border: "1px solid var(--line-ink)" }}>
                    <div>
                      <span className="mono-sm" style={{ color: "#7d8479", fontSize: 11, display: "block" }}>TRANSACTION HASH</span>
                      <a href={`${explorer}/tx/${result.launchHash}`} target="_blank" rel="noreferrer" className="mono-sm" style={{ color: "var(--ink)", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {result.launchHash.slice(0, 18)}...{result.launchHash.slice(-10)}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <button type="button" className="launch-chip-btn" onClick={() => copyToClipboard(result.launchHash, "tx")}>
                      {copiedKey === "tx" ? <Check size={13} color="#b8962e" /> : <Copy size={13} />}
                    </button>
                  </div>

                  {/* View in Directory Button */}
                  <Link
                    href="/tokens"
                    className="btn btn-gold"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      textDecoration: "none",
                      marginTop: 6,
                      width: "100%",
                      height: 40,
                    }}
                  >
                    <span>View in Launched Tokens Directory</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {cropSource ? (
        <CropModal
          src={cropSource.src}
          fileName={cropSource.fileName}
          onCancel={() => setCropSource(null)}
          onDone={(dataUrl) => {
            setLogoUrl(dataUrl);
            setCropSource(null);
          }}
        />
      ) : null}

      {/* Floating Copilot Chat Widget (Reference: aoksokqwosow.jpg) */}
      <CopilotDrawerWidget
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onToggle={() => setCopilotOpen((prev) => !prev)}
        onApplyDraft={handleApplyDraftFromCopilot}
      />
    </PageShell>
  );
}
