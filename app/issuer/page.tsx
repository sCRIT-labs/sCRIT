"use client";

import { useCallback, useState } from "react";
import type { Address } from "viem";
import { ArrowRight, BadgeCheck, FileClock, Landmark, ShieldAlert } from "lucide-react";
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
  const [serviceState, setServiceState] = useState<ServiceState>("not-applied");
  const [contractState, setContractState] = useState<ContractState>("unconfigured");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [applicationWallet, setApplicationWallet] = useState("");
  const [attestationCount, setAttestationCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!/^0x[0-9a-fA-F]{40}$/.test(applicationWallet) || !name.trim() || !contact.trim()) {
      setMessage("Enter a wallet, issuer name, and contact before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/issuers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: applicationWallet, name: name.trim(), contact: contact.trim(), approved: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setServiceState("pending");
      setMessage("Application received. Service approval and launcher approval are separate steps.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Application could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadAttestationStatus() {
    try {
      const response = await fetch("/api/attestations", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAttestationCount(Array.isArray(data.attestations) ? data.attestations.length : 0);
    } catch {
      setAttestationCount(null);
    }
  }

  return (
    <PageShell>
      <header className="proof-page-head scrit-reveal">
        <p className="eyebrow">RAIL A · ISSUER DESK · {network.name.toUpperCase()}</p>
        <h1>Your launch,<br /><em>one clear status at a time.</em></h1>
        <p>Check both issuer approvals, submit a pending issuer application, and open the launch form. The selected network is {network.name} ({network.id}).</p>
      </header>

      <section className="panel proof-section scrit-reveal">
        <div className="proof-section-head"><div><span className="eyebrow">WALLET</span><h2>Connect your issuer wallet</h2></div></div>
        <div style={{ maxWidth: 360 }}>
          <WalletButton chainId={SCRIT_CHAIN_ID} onConnect={(account) => { setWallet(account); void refresh(account); }} />
        </div>
        {wallet && <p className="proof-method-note">Connected wallet: <code>{wallet}</code></p>}
      </section>

      <section className="proof-summary-grid" aria-label="Issuer approval status">
        <article className="panel proof-summary-card scrit-reveal"><BadgeCheck /><span className="proof-label">Service review</span><strong>{serviceStateLabel(serviceState)}</strong><small>Pending application can be submitted below.</small></article>
        <article className="panel proof-summary-card scrit-reveal"><Landmark /><span className="proof-label">On-chain launcher</span><strong>{contractStateLabel(contractState)}</strong><small>Launcher allowlist is independent from service approval.</small></article>
        <article className="panel proof-summary-card scrit-reveal"><FileClock /><span className="proof-label">Accepted attestation records</span><strong>{attestationCount === null ? "Not loaded" : attestationCount}</strong><small>Global pilot record count; it is not specific to this issuer.</small><button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => void loadAttestationStatus()}>Refresh status</button></article>
      </section>

      <section className="panel proof-section scrit-reveal">
        <div className="proof-section-head"><div><span className="eyebrow">ISSUER INTAKE</span><h2>Request service review</h2></div></div>
        <p className="proof-intro">Submitting creates a pending record only. It cannot approve your wallet or change the on-chain launcher allowlist.</p>
        <form onSubmit={submitApplication} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          <label>Issuer wallet<input className="field" value={applicationWallet} onChange={(event) => setApplicationWallet(event.target.value)} placeholder="0x…" /></label>
          <label>Issuer name<input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Project or team" /></label>
          <label>Contact<input className="field" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Email or handle" /></label>
          <button className="btn btn-gold" type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit pending application"} <ArrowRight size={15} /></button>
        </form>
        {message && <p className="proof-method-note" role="status">{message}</p>}
      </section>

      <section className="panel proof-section scrit-reveal">
        <div className="proof-section-head"><div><span className="eyebrow">LAUNCH PIPELINE</span><h2>Next steps</h2></div></div>
        <div className="proof-evidence-list">
          <div><span>Launch form</span><b>Token / sCRIT pair</b><small>Requires service approval, on-chain launcher approval, and enough sCRIT to seed the position.</small><a href="/launch">Open launch form →</a></div>
          <div><span>Attestation status</span><b>Custodian workflow</b><small>Reserve attestations are signed by scoped custodian keys and shown on the proof page.</small><a href="/proof#attestations">Open attestation ledger →</a></div>
          <div><span>Redemption queue</span><b>No sCRIT redemption in this pilot</b><small>Rail B lot redemption is a separate contract workflow; there is no issuer redemption queue to display here.</small><a href="/lots">Open Rail B lots →</a></div>
        </div>
        {contractState === "unconfigured" && <p className="proof-method-note"><ShieldAlert size={15} style={{ verticalAlign: "middle" }} /> No launcher address is configured for this build, so on-chain approval cannot be read yet.</p>}
      </section>
    </PageShell>
  );
}

function serviceStateLabel(state: ServiceState) {
  return ({ loading: "Checking…", approved: "Approved", pending: "Pending / not approved", "not-applied": "No wallet checked", unavailable: "Unavailable" })[state];
}

function contractStateLabel(state: ContractState) {
  return ({ loading: "Checking…", approved: "Allowlisted", "not-approved": "Not allowlisted", unconfigured: "Not configured", unavailable: "Read unavailable" })[state];
}
