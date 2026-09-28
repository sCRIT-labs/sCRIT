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

  // Compute active wizard step (1: Connect, 2: Clearance, 3: Cleared/Launch)
  const isFullyCleared = serviceState === "approved" && contractState === "approved";
  const currentStep = !wallet ? 1 : !isFullyCleared ? 2 : 3;

  const refresh = useCallback(async (account: Address) => {
    setApplicationWallet(account);
    setServiceState("loading");
    setContractState(isConfigured(deployment.launcher) ? "loading" : "unconfigured");
    try {
      const result = await fetch(`/api/issuers?wallet=${account}`).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "issuer_status_unavailable");
        return data as { approved: boolean; status?: "approved" | "pending" | "not-applied" };
      });
      setServiceState(result.status ?? (result.approved ? "approved" : "pending"));
    } catch {
      setServiceState("unavailable");
    }
    if (isConfigured(deployment.launcher)) {
      try {
        setContractState(await launcherIssuerApproved(SCRIT_CHAIN_ID, account) ? "approved" : "not-approved");
      } catch {
        setContractState("unavailable");
      }
    }
  }, []);

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
    try {
      const response = await fetch("/api/issuers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: targetWallet, name: name.trim(), contact: contact.trim(), approved: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setServiceState("pending");
      setIsError(false);
      setMessage("Clearance application received successfully. Your wallet is queued for compliance verification.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Application could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadAttestationStatus() {
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
  }

  const handleCopyWallet = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  return (
    <PageShell>
      {/* Editorial Header */}
      <div style={{ maxWidth: 860, marginBottom: 32 }}>
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
            fontSize: "clamp(34px, 4.5vw, 54px)",
            fontWeight: 450,
            letterSpacing: "-0.04em",
            margin: "0 0 16px",
            lineHeight: 1.08,
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
            <span className="issuer-step-status-tag">
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
                ? "CLEARED"
                : "PENDING VERIFICATION"}
            </span>
          </div>
        </div>

        {/* Step 3 */}
        <div
          className={`issuer-step-card ${
            currentStep === 3 ? "active" : "locked"
          }`}
        >
          <div className="issuer-step-number-circle">
            <Zap size={15} />
          </div>
          <div className="issuer-step-info">
            <span className="issuer-step-title">3. Strike Token Launch</span>
            <span className="issuer-step-status-tag">
              {currentStep === 3 ? "READY TO DEPLOY" : "AWAITING CLEARANCE"}
            </span>
          </div>
        </div>
      </div>

      {/* STAGE 1: WALLET NOT CONNECTED */}
      {currentStep === 1 && (
        <div className="issuer-card" style={{ padding: "40px 32px", textAlign: "center" }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "#fbf2dc",
              border: "1.5px solid #c9922e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8c6418",
              margin: "0 auto 20px",
              boxShadow: "0 4px 14px rgba(201, 146, 46, 0.16)",
            }}
          >
            <Wallet size={26} />
          </div>

          <span className="eyebrow" style={{ color: "#8c6418" }}>
            STEP 1 · OPERATOR AUTHENTICATION
          </span>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(24px, 3vw, 32px)",
              margin: "8px 0 12px",
              color: "var(--ink)",
            }}
          >
            Connect your deployment wallet
          </h2>
          <p
            style={{
              color: "#636b60",
              fontSize: 14.5,
              lineHeight: 1.6,
              maxWidth: 580,
              margin: "0 auto 24px",
            }}
          >
            Every token launched on Rail A pairs directly with physical commodity-backed sCRIT.
            Connecting your Web3 provider allows our clearance engine to verify your on-chain allowlist status instantly.
          </p>

          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <WalletButton
              chainId={SCRIT_CHAIN_ID}
              onConnect={(account) => {
                setWallet(account);
                void refresh(account);
              }}
            />
            <span style={{ fontSize: 11.5, color: "#7a8277", fontFamily: "var(--font-mono)" }}>
              Operating Network: {network.name} (Chain ID: {network.id})
            </span>
          </div>

          <div
            style={{
              marginTop: 40,
              paddingTop: 28,
              borderTop: "1px solid rgba(24, 26, 24, 0.08)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 20,
              textAlign: "left",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
                1. Instant On-Chain Audit
              </div>
              <div style={{ fontSize: 12, color: "#697266", lineHeight: 1.5 }}>
                Verifies if your wallet is already whitelisted on the TokenLauncher contract.
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
                2. Fast Clearance Intake
              </div>
              <div style={{ fontSize: 12, color: "#697266", lineHeight: 1.5 }}>
                Submit project details in one click to queue for compliance authorization.
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
                3. Pool Deployment
              </div>
              <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>
                Directly unlock the Uniswap V4 pool seeding console with paired sCRIT liquidity.
              </div>
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
                    color: "#8a5d00",
                    background: "#fcf6e8",
                    border: "1px solid rgba(184, 134, 11, 0.3)",
                    padding: "3px 8px",
                    borderRadius: 3,
                  }}
                >
                  ACTION REQUIRED
                </span>
              </div>

              {/* Connected Wallet Bar */}
              <div className="issuer-wallet-card">
                <div className="issuer-wallet-header">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#2e332c" }}>
                    Connected Deployment Wallet
                  </span>
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
                      ? "Clearance granted automatically: your wallet holds at least 0.001 sCRIT."
                      : "Approval is fully automatic: submit the intake form, then hold at least 0.001 sCRIT in your wallet. A bot verifies the balance on-chain and approves both gates with no human involved."}
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
                    Enforced by TokenLauncher contract. Once your balance qualifies, the auto-approver adds your wallet to this allowlist via timelock.
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
                    <span style={{ color: "#1b5e20", fontWeight: 600 }}>✓ Auto-synced</span>
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

                {/* Submit Button */}
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
                  {submitting ? "Submitting Application..." : "Submit for Clearance Review"}
                  <ArrowRight size={15} />
                </button>

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
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#8c6418", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  What happens next?
                </span>
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
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1b5e20" }}>
                  ✓ APPROVED & RECORDED
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#7d6228", fontFamily: "var(--font-mono)" }}>SMART CONTRACT</span>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1b5e20" }}>
                  ✓ ON-CHAIN ALLOWLISTED
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
                    Deploy your token contract and seed an automated Uniswap V4 pool paired against physical critical reserves.
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
