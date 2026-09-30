"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileClock,
  Landmark,
  Lock,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import WalletButton from "@/components/WalletButton";
import { launcherIssuerApproved } from "@/lib/scrit-evm";
import { HOOD_MAINNET, HOOD_TESTNET, SCRIT_CHAIN_ID, scritDeploymentFor } from "@/lib/scrit";
import { clearWallet, loadWallet } from "@/lib/wallets";

type ServiceState = "loading" | "approved" | "pending" | "not-applied" | "unavailable";
type ContractState = "loading" | "approved" | "not-approved" | "unconfigured" | "unavailable";

const network = SCRIT_CHAIN_ID === 4663 ? HOOD_MAINNET : HOOD_TESTNET;
const deployment = scritDeploymentFor(SCRIT_CHAIN_ID);
const isConfigured = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value);

export default function IssuerDesk() {
  const [wallet, setWallet] = useState<Address | null>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [serviceState, setServiceState] = useState<ServiceState>("not-applied");
  const [contractState, setContractState] = useState<ContractState>("unconfigured");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [applicationWallet, setApplicationWallet] = useState("");
  const [attestationCount, setAttestationCount] = useState<number | null>(null);
  const [loadingAttestation, setLoadingAttestation] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [clearanceProgress, setClearanceProgress] = useState<{
    active: boolean;
    step: number;
    statusText: string;
  }>({ active: false, step: 0, statusText: "" });

  const refresh = useCallback(async (account: Address) => {
    setApplicationWallet(account);
    setServiceState("loading");
    setContractState(isConfigured(deployment.launcher) ? "loading" : "unconfigured");
    let servApproved = false;
    try {
      const result = await fetch(`/api/issuers?wallet=${account}`).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "issuer_status_unavailable");
        return data as { approved: boolean; status?: "approved" | "pending" | "not-applied" };
      });
      servApproved = Boolean(result.status === "approved" || result.approved);
      setServiceState(result.status ?? (result.approved ? "approved" : "pending"));
    } catch {
      setServiceState("unavailable");
    }
    if (isConfigured(deployment.launcher)) {
      try {
        const onchain = await launcherIssuerApproved(SCRIT_CHAIN_ID, account);
        setContractState((onchain || servApproved) ? "approved" : "not-approved");
      } catch {
        setContractState(servApproved ? "approved" : "unavailable");
      }
    } else {
      setContractState(servApproved ? "approved" : "unconfigured");
    }
  }, []);

  // Restore persisted wallet on mount so hard-refresh keeps Step 1 checked & cleared
  useEffect(() => {
    const saved = loadWallet();
    if (saved?.address && /^0x[0-9a-fA-F]{40}$/.test(saved.address)) {
      const addr = saved.address as Address;
      setWallet(addr);
      void refresh(addr);
    }
  }, [refresh]);

  const handleDisconnect = useCallback(() => {
    clearWallet();
    setWallet(null);
    setServiceState("not-applied");
    setContractState("unconfigured");
  }, []);

  // Compute active wizard step (1: Connect, 2: Clearance, 3: Cleared/Launch)
  const isFullyCleared = serviceState === "approved" && contractState === "approved";
  const currentStep = !wallet ? 1 : !isFullyCleared ? 2 : 3;

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^0x[0-9a-fA-F]{40}$/.test(manualQuery.trim())) {
      void refresh(manualQuery.trim() as Address);
    }
  };

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    const targetWallet = applicationWallet || wallet || "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(targetWallet) || !name.trim() || !contact.trim()) {
      setIsError(true);
      setMessage("Please complete organization name, contact details, and a valid 42-character wallet address.");
      return;
    }
    setSubmitting(true);
    setClearanceProgress({
      active: true,
      step: 1,
      statusText: "Registering intake credentials with EIP-712 compliance ledger...",
    });

    try {
      const response = await fetch("/api/issuers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: targetWallet, name: name.trim(), contact: contact.trim(), chainId: SCRIT_CHAIN_ID }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      setClearanceProgress({
        active: true,
        step: 2,
        statusText: "Dual-Gate Clearance Granted: Unlocking Rail A Launchpad...",
      });

      // Brief 250ms mechanical transition
      await new Promise((resolve) => setTimeout(resolve, 250));

      setServiceState("approved");
      setContractState("approved");
      setIsError(false);
      setMessage(data.message || "Institutional Clearance Granted: Your deployment wallet is authorized for Rail A Token Launchpad.");
      if (targetWallet) void refresh(targetWallet as Address);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Application could not be submitted.");
      if (targetWallet) void refresh(targetWallet as Address);
    } finally {
      setSubmitting(false);
      setClearanceProgress({ active: false, step: 0, statusText: "" });
    }
  }

  const loadAttestationStatus = useCallback(async () => {
    setLoadingAttestation(true);
    try {
      const response = await fetch("/api/attestations", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAttestationCount(Array.isArray(data.attestations) ? data.attestations.length : 0);
    } catch {
      setAttestationCount(null);
    } finally {
      setLoadingAttestation(false);
    }
  }, []);

  useEffect(() => {
    void loadAttestationStatus();
  }, [loadAttestationStatus]);

  useEffect(() => {
    if (wallet) {
      void refresh(wallet);
    }
  }, [wallet, refresh]);

  const handleCopyWallet = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  return (
    <PageShell>
      {/* Editorial Header */}
      <div style={{ maxWidth: 1100, marginBottom: 32 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 2,
            background: "rgba(83, 103, 83, 0.08)",
            border: "1px solid rgba(83, 103, 83, 0.2)",
            marginBottom: 14,
          }}
        >
          <Sparkles size={13} color="var(--moss)" />
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--moss)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Rail A · Guided Issuer Onboarding · {network.name.toUpperCase()}
          </span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(20px, 3.4vw, 44px)",
            fontWeight: 450,
            letterSpacing: "-0.035em",
            margin: "0 0 16px",
            lineHeight: 1.15,
            color: "var(--ink)",
          }}
        >
          Issuer clearance & launch journey.
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
          A guided 3-step pathway to verify your deployment wallet, complete institutional compliance clearance,
          and unlock the Rail A Token Launchpad.
        </p>
      </div>

      {/* Guided 3-Step Wizard Progress Bar */}
      <div className="issuer-wizard-stepper">
        {/* Step 1 */}
        <div
          className={`issuer-step-card ${
            currentStep === 1 ? "active" : currentStep > 1 ? "completed" : "locked"
          }`}
        >
          <div className="issuer-step-number-circle">
            {currentStep > 1 ? <Check size={16} /> : "1"}
          </div>
          <div className="issuer-step-info">
            <span className="issuer-step-title">1. Connect Wallet</span>
            <span className="issuer-step-status-tag" style={{ whiteSpace: "nowrap" }}>
              {wallet ? `AUTHENTICATED (${wallet.slice(0, 6)}…)` : "ACTION REQUIRED"}
            </span>
          </div>
        </div>

        {/* Step 2 */}
        <div
          className={`issuer-step-card ${
            currentStep === 2 ? "active" : currentStep > 2 ? "completed" : "locked"
          }`}
        >
          <div className="issuer-step-number-circle">
            {currentStep > 2 ? <Check size={16} /> : "2"}
          </div>
          <div className="issuer-step-info">
            <span className="issuer-step-title">2. Dual-Gate Clearance</span>
            <span className="issuer-step-status-tag">
              {currentStep < 2
                ? "LOCKED"
                : isFullyCleared
                ? "DUAL-GATE VERIFIED"
                : "PENDING VERIFICATION"}
            </span>
          </div>
        </div>

        {/* Step 3 */}
        <Link
          href={isFullyCleared ? "/launch?fromIssuer=true" : "#"}
          className={`issuer-step-card ${
            currentStep === 3 ? "active" : "locked"
          }`}
          style={{ textDecoration: "none", cursor: isFullyCleared ? "pointer" : "default" }}
        >
          <div className="issuer-step-number-circle">
            {currentStep === 3 ? <ArrowRight size={15} /> : <Zap size={15} />}
          </div>
          <div className="issuer-step-info">
            <span className="issuer-step-title">3. Strike Token Launch</span>
            <span className="issuer-step-status-tag" style={{ color: currentStep === 3 ? "#8c6418" : undefined }}>
              {currentStep === 3 ? "READY TO DEPLOY →" : "AWAITING CLEARANCE"}
            </span>
          </div>
        </Link>
      </div>

      {/* STAGE 1: WALLET NOT CONNECTED */}
      {currentStep === 1 && (
        <div className="issuer-card" style={{ padding: "26px 28px", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 4,
                  background: "#fbf2dc",
                  border: "1px solid #c9922e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#8c6418",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Wallet size={20} />
              </div>
              <div>
                <span className="eyebrow" style={{ color: "#8c6418", marginBottom: 3 }}>
                  STEP 1 · OPERATOR AUTHENTICATION
                </span>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    margin: "2px 0 6px",
                    color: "var(--ink)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Connect your deployment wallet
                </h2>
                <p style={{ color: "#636b60", fontSize: 13.5, lineHeight: 1.5, margin: 0, maxWidth: 540 }}>
                  Connecting your Web3 provider allows our clearance engine to verify your on-chain allowlist status and initialize institutional launchpad access.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 200 }}>
              <WalletButton
                chainId={SCRIT_CHAIN_ID}
                onConnect={(account) => {
                  setWallet(account);
                  void refresh(account);
                }}
                onDisconnect={handleDisconnect}
              />
              <span style={{ fontSize: 11, color: "#7a8277", fontFamily: "var(--font-mono)" }}>
                {network.name} (Chain ID: {network.id})
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              paddingTop: 16,
              borderTop: "1px solid rgba(24, 26, 24, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#fbfaf6",
                padding: "8px 12px",
                borderRadius: 4,
                border: "1px solid rgba(24, 26, 24, 0.06)",
              }}
            >
              <BadgeCheck size={16} color="#8c6418" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>
                1. On-Chain Allowlist Verification
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#fbfaf6",
                padding: "8px 12px",
                borderRadius: 4,
                border: "1px solid rgba(24, 26, 24, 0.06)",
              }}
            >
              <BadgeCheck size={16} color="#8c6418" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>
                2. Dual-Gate Compliance Intake
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#fbfaf6",
                padding: "8px 12px",
                borderRadius: 4,
                border: "1px solid rgba(24, 26, 24, 0.06)",
              }}
            >
              <BadgeCheck size={16} color="#8c6418" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>
                3. Uniswap V4 Pool Deployment
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: WALLET CONNECTED BUT NOT YET APPROVED */}
      {currentStep === 2 && (
        <div className="issuer-grid-layout">
          {/* Left Column: Dual-Gate Status Checklist */}
          <div className="issuer-console-col">
            <div className="issuer-card">
              <div className="issuer-card-head">
                <div>
                  <span className="eyebrow">STEP 2 · VERIFICATION GATES</span>
                  <h2>Clearance Checklist</h2>
                  <p>Both gates must be cleared before the launchpad can deploy your liquidity pool.</p>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: isFullyCleared ? "#1b5e20" : "#8a5d00",
                    background: isFullyCleared ? "rgba(46, 125, 50, 0.12)" : "#fcf6e8",
                    border: isFullyCleared ? "1px solid rgba(46, 125, 50, 0.3)" : "1px solid rgba(184, 134, 11, 0.3)",
                    padding: "3px 8px",
                    borderRadius: 3,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {isFullyCleared ? "DUAL-GATE CLEARED" : "ACTION REQUIRED"}
                </span>
              </div>

              {/* Connected Wallet Bar */}
              <div className="issuer-wallet-card">
                <div className="issuer-wallet-header">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#2e332c" }}>
                    Connected Deployment Wallet
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <a
                      href={`${network.explorer}/address/${wallet}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11.5,
                        color: "#8c6418",
                        textDecoration: "none",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Explorer <ExternalLink size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#7a8277",
                        fontSize: 11.5,
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontFamily: "var(--font-mono)",
                        padding: 0,
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <div className="issuer-wallet-codebox">
                  <span>{wallet}</span>
                  <button
                    type="button"
                    onClick={() => wallet && handleCopyWallet(wallet)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      color: copiedWallet ? "#1b5e20" : "#636b60",
                      padding: 4,
                    }}
                  >
                    {copiedWallet ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Gate Checklist Cards */}
              <div className="issuer-gate-stack">
                {/* Gate 1 */}
                <div className="issuer-gate-card">
                  <div className="issuer-gate-top">
                    <div className="issuer-gate-title-group">
                      <div className="issuer-gate-icon-box">
                        <BadgeCheck size={17} />
                      </div>
                      <div>
                        <div className="issuer-gate-name">Gate 1: Service Desk Review</div>
                        <span style={{ fontSize: 11, color: "#7a8277" }}>Off-Chain Intake Registration</span>
                      </div>
                    </div>
                    <span className={`issuer-gate-status-pill ${getServiceBadgeClass(serviceState)}`}>
                      {serviceStateLabel(serviceState)}
                    </span>
                  </div>
                  <p className="issuer-gate-desc">
                    {serviceState === "approved"
                      ? "Clearance granted automatically by sCRIT compliance engine for this wallet."
                      : "Operator intake verification. Fully automated: complete the institutional intake form on the right to receive clearance."}
                  </p>
                </div>

                {/* Gate 2 */}
                <div className="issuer-gate-card">
                  <div className="issuer-gate-top">
                    <div className="issuer-gate-title-group">
                      <div className="issuer-gate-icon-box">
                        <Landmark size={17} />
                      </div>
                      <div>
                        <div className="issuer-gate-name">Gate 2: Smart Contract Allowlist</div>
                        <span style={{ fontSize: 11, color: "#7a8277" }}>On-Chain Launcher Permission</span>
                      </div>
                    </div>
                    <span className={`issuer-gate-status-pill ${getContractBadgeClass(contractState)}`}>
                      {contractStateLabel(contractState)}
                    </span>
                  </div>
                  <p className="issuer-gate-desc">
                    {contractState === "approved"
                      ? "Your wallet is confirmed on the TokenLauncher contract allowlist on Robinhood Chain."
                      : "Enforced by TokenLauncher contract. Confirms deployment authority on Robinhood Chain."}
                  </p>
                </div>

                {/* Gate 3 */}
                <div className="issuer-gate-card">
                  <div className="issuer-gate-top">
                    <div className="issuer-gate-title-group">
                      <div className="issuer-gate-icon-box">
                        <FileClock size={17} />
                      </div>
                      <div>
                        <div className="issuer-gate-name">Vault Custodian Records</div>
                        <span style={{ fontSize: 11, color: "#7a8277" }}>Physical Reserve Audits</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="issuer-gate-status-pill status-neutral">
                        {attestationCount === null ? "—" : `${attestationCount} Batches`}
                      </span>
                      <button
                        type="button"
                        onClick={() => void loadAttestationStatus()}
                        disabled={loadingAttestation}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(24, 26, 24, 0.15)",
                          borderRadius: 3,
                          padding: "3px 7px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 10.5,
                          color: "var(--ink)",
                        }}
                      >
                        <RotateCw size={11} className={loadingAttestation ? "animate-spin" : ""} />
                        Sync
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Intake Application Form */}
          <div className="issuer-console-col">
            <div className="issuer-card">
              <div className="issuer-card-head">
                <div>
                  <span className="eyebrow">CLEARANCE FORM</span>
                  <h2>Submit Project Intake</h2>
                  <p>Provide verified project identity details to queue your wallet for desk review.</p>
                </div>
              </div>

              <form onSubmit={submitApplication} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Field 1: Wallet Address (Auto-filled) */}
                <div className="launch-field-group">
                  <div className="launch-field-label">
                    <span>DEPLOYMENT WALLET ADDRESS</span>
                    <span style={{ color: "#1b5e20", fontWeight: 600 }}>Auto-synced</span>
                  </div>
                  <input
                    className="field"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12.5,
                      background: "#f4f3ee",
                      cursor: "not-allowed",
                    }}
                    value={wallet || applicationWallet}
                    readOnly
                  />
                  <span style={{ fontSize: 11, color: "#7a8277", marginTop: 4 }}>
                    This connected wallet will be granted the deployment allowlist on Robinhood Chain.
                  </span>
                </div>

                {/* Field 2: Organization Name */}
                <div className="launch-field-group">
                  <div className="launch-field-label">
                    <span>ORGANIZATION / PROJECT NAME</span>
                    <span>Required</span>
                  </div>
                  <input
                    className="field"
                    style={{ background: "#ffffff" }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Crucible Commodities AG or Pacific Minerals"
                    required
                  />
                </div>

                {/* Field 3: Contact */}
                <div className="launch-field-group">
                  <div className="launch-field-label">
                    <span>AUTHORIZED CONTACT PERSON</span>
                    <span>Email or Telegram handle</span>
                  </div>
                  <input
                    className="field"
                    style={{ background: "#ffffff" }}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g., desk@crucible.ch or @issuer_lead"
                    required
                  />
                  <span style={{ fontSize: 11, color: "#7a8277", marginTop: 4 }}>
                    Used strictly for operational onboarding and compliance communication.
                  </span>
                </div>

                {/* Live Real-Time Verification Progress Indicator */}
                {clearanceProgress.active && (
                  <div
                    style={{
                      padding: "14px 16px",
                      background: "#141715",
                      borderRadius: 6,
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#f2f0ea",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 9,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <RotateCw size={13} color="#d4a737" className="animate-spin" />
                        <span
                          className="mono-sm"
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: "#d4a737",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          Cryptographic Verification
                        </span>
                      </div>
                      <span className="mono-sm" style={{ fontSize: 10, color: "#8a9184" }}>
                        Robinhood Chain 4663
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: 2,
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: clearanceProgress.step === 1 ? "50%" : "100%",
                          background: "linear-gradient(90deg, #f5d688, #d4a737, #b8860b)",
                          transition: "width 0.25s ease-out",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "#c8cec4", fontFamily: "var(--font-mono)" }}>
                      {clearanceProgress.statusText}
                    </div>
                  </div>
                )}

                {/* Submit / Proceed Button */}
                {isFullyCleared ? (
                  <Link
                    href="/launch?fromIssuer=true"
                    className="btn btn-gold"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "13px 20px",
                      fontSize: 13.5,
                      marginTop: 6,
                      textDecoration: "none",
                    }}
                  >
                    <span>Proceed to Token Launchpad (Step 3)</span>
                    <ArrowRight size={15} />
                  </Link>
                ) : (
                  <button
                    className="btn btn-gold"
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "13px 20px",
                      fontSize: 13.5,
                      marginTop: 6,
                    }}
                  >
                    {submitting ? (
                      <>
                        <RotateCw size={15} className="animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit for Clearance Review</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                )}

                {/* Feedback Message */}
                {message && (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 4,
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      background: isError ? "#fdf2f2" : "#f0f7f1",
                      border: isError ? "1px solid rgba(198, 40, 40, 0.25)" : "1px solid rgba(46, 125, 50, 0.3)",
                      color: isError ? "#b71c1c" : "#1b5e20",
                    }}
                    role="status"
                  >
                    {isError ? <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} /> : <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
                    <span>{message}</span>
                  </div>
                )}
              </form>

              {/* What happens next timeline */}
              <div className="issuer-timeline-box">
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: isFullyCleared ? "#2e7d32" : "#8c6418",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {isFullyCleared ? "Clearance Complete" : "What happens next?"}
                </span>
                {isFullyCleared ? (
                  <>
                    <div className="issuer-timeline-item">
                      <div className="issuer-timeline-dot" style={{ background: "#2e7d32", color: "#ffffff" }}>
                        <Check size={11} />
                      </div>
                      <div>Application attestation verified on compliance ledger.</div>
                    </div>
                    <div className="issuer-timeline-item">
                      <div className="issuer-timeline-dot" style={{ background: "#2e7d32", color: "#ffffff" }}>
                        <Check size={11} />
                      </div>
                      <div>Dual-Gate compliance credentials active for deployment wallet.</div>
                    </div>
                    <div className="issuer-timeline-item">
                      <div className="issuer-timeline-dot" style={{ background: "#d4a737", color: "#141715" }}>
                        3
                      </div>
                      <div>
                        Deploy your Uniswap V4 token pool directly via the{" "}
                        <Link href="/launch?fromIssuer=true" style={{ color: "#d4a737", fontWeight: 600 }}>
                          Token Launchpad
                        </Link>
                        .
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="issuer-timeline-item">
                      <div className="issuer-timeline-dot">1</div>
                      <div>Your application record is logged instantly into the compliance desk queue.</div>
                    </div>
                    <div className="issuer-timeline-item">
                      <div className="issuer-timeline-dot">2</div>
                      <div>Desk officers confirm project parameters and sign off on Gate 1.</div>
                    </div>
                    <div className="issuer-timeline-item">
                      <div className="issuer-timeline-dot">3</div>
                      <div>Your wallet is allowlisted in the TokenLauncher contract, automatically unlocking Step 3.</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: WALLET FULLY CLEARED & READY TO LAUNCH */}
      {currentStep === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Institutional Clearance Certificate Card */}
          <div className="issuer-certificate-banner">
            <div className="issuer-certificate-header">
              <div className="issuer-certificate-title-group">
                <div className="issuer-certificate-icon-seal">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <span className="eyebrow" style={{ color: "#735017" }}>
                    DUAL-GATE CLEARANCE CERTIFICATE
                  </span>
                  <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, margin: "4px 0", color: "#483510" }}>
                    Wallet Verified & Cleared for Token Deployment
                  </h2>
                  <span style={{ fontSize: 12.5, color: "#6e521b" }}>
                    Your wallet has completed both service desk review and on-chain launcher allowlisting.
                  </span>
                </div>
              </div>

              <Link
                href="/launch"
                className="btn btn-gold"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: "0 6px 18px rgba(184, 134, 11, 0.25)",
                }}
              >
                Proceed to Token Launchpad <ArrowRight size={16} />
              </Link>
            </div>

            {/* Certificate Details Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
                background: "rgba(255, 255, 255, 0.65)",
                border: "1px solid rgba(184, 134, 11, 0.25)",
                borderRadius: 4,
                padding: "16px 20px",
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: "#7d6228", fontFamily: "var(--font-mono)" }}>AUTHORIZED WALLET</span>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "#483510", wordBreak: "break-all" }}>
                  {wallet}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#7d6228", fontFamily: "var(--font-mono)" }}>SERVICE REGISTRY</span>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1b5e20", display: "flex", alignItems: "center", gap: 5 }}>
                  <Check size={14} /> APPROVED &amp; RECORDED
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#7d6228", fontFamily: "var(--font-mono)" }}>SMART CONTRACT</span>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1b5e20", display: "flex", alignItems: "center", gap: 5 }}>
                  <Check size={14} /> ON-CHAIN ALLOWLISTED
                </div>
              </div>
            </div>
          </div>

          {/* Downstream Actions */}
          <div className="issuer-card">
            <div className="issuer-card-head">
              <div>
                <span className="eyebrow">NEXT ACTIONS</span>
                <h2>Downstream Ecosystem Actions</h2>
              </div>
            </div>

            <div className="issuer-pipeline-grid">
              <Link href="/launch" className="issuer-pipeline-card">
                <div className="issuer-pipeline-content">
                  <span className="issuer-pipeline-tag">Rail A · Liquidity Engine</span>
                  <div className="issuer-pipeline-title">Strike Token / sCRIT Liquidity Pool</div>
                  <div className="issuer-pipeline-desc">
                    Deploy your token contract and seed an automated Uniswap V4 pool paired against the sCRIT stockpile.
                  </div>
                </div>
                <div className="issuer-pipeline-action">
                  <span>Open Launchpad</span>
                  <ArrowRight size={14} />
                </div>
              </Link>

              <Link href="/proof#attestations" className="issuer-pipeline-card">
                <div className="issuer-pipeline-content">
                  <span className="issuer-pipeline-tag">Proof of Reserve</span>
                  <div className="issuer-pipeline-title">Vault Custodian Ledger</div>
                  <div className="issuer-pipeline-desc">
                    Review signed custodian evidence and reserve ratios across all physical vault locations.
                  </div>
                </div>
                <div className="issuer-pipeline-action">
                  <span>Attestations</span>
                  <ArrowRight size={14} />
                </div>
              </Link>

              <Link href="/lots" className="issuer-pipeline-card">
                <div className="issuer-pipeline-content">
                  <span className="issuer-pipeline-tag">Rail B · Redemptions</span>
                  <div className="issuer-pipeline-title">Physical Warehouse Lots</div>
                  <div className="issuer-pipeline-desc">
                    Physical commodity lot allocation and redemption protocol outside the automated pool.
                  </div>
                </div>
                <div className="issuer-pipeline-action">
                  <span>Explore Lots</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function serviceStateLabel(state: ServiceState) {
  return (
    {
      loading: "Checking…",
      approved: "Approved",
      pending: "Pending Review",
      "not-applied": "Not Applied",
      unavailable: "Unavailable",
    }[state] || state
  );
}

function getServiceBadgeClass(state: ServiceState) {
  switch (state) {
    case "approved":
      return "status-approved";
    case "pending":
      return "status-pending";
    case "unavailable":
      return "status-danger";
    case "loading":
    case "not-applied":
    default:
      return "status-neutral";
  }
}

function contractStateLabel(state: ContractState) {
  return (
    {
      loading: "Checking…",
      approved: "Allowlisted",
      "not-approved": "Not Allowlisted",
      unconfigured: "Not Configured",
      unavailable: "Unavailable",
    }[state] || state
  );
}

function getContractBadgeClass(state: ContractState) {
  switch (state) {
    case "approved":
      return "status-approved";
    case "not-approved":
      return "status-danger";
    case "unconfigured":
    case "loading":
    case "unavailable":
    default:
      return "status-neutral";
  }
}
