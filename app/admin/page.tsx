"use client";

import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Key, Radio, Users, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { BASKET } from "@/lib/scrit-basket";

type Custodian = { address: string; name: string; scope: string[]; status: string };
type ApApp = { wallet: string; name: string; contact: string; status: string };
type Issuer = { wallet: string; name: string; contact: string; approved: boolean };

export default function Admin() {
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"info" | "success" | "error">("info");
  const [commodity, setCommodity] = useState("Au");
  const [price, setPrice] = useState("");
  const [priceSource, setPriceSource] = useState("");
  const [custAddr, setCustAddr] = useState("");
  const [custName, setCustName] = useState("");
  const [custScope, setCustScope] = useState<string[]>([]);
  const [custodians, setCustodians] = useState<Custodian[]>([]);
  const [apApps, setApApps] = useState<ApApp[]>([]);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [issuerWallet, setIssuerWallet] = useState("");
  const [issuerName, setIssuerName] = useState("");
  const [issuerContact, setIssuerContact] = useState("");
  const [activeTab, setActiveTab] = useState<"prices" | "custodians" | "issuers" | "ap">("prices");

  async function updatePrice() {
    if (!key) {
      setMsg("Please enter the ADMIN_KEY first.");
      setMsgType("error");
      return;
    }
    if (!price || isNaN(parseFloat(price))) {
      setMsg("Please enter a valid USD price per kg.");
      setMsgType("error");
      return;
    }
    setMsg("Submitting price feed update...");
    setMsgType("info");
    try {
      const r = await fetch("/api/prices", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ commodity, usd_per_kg: parseFloat(price), source: priceSource }),
      });
      if (r.ok) {
        setMsg(`Success: ${commodity} updated to $${parseFloat(price).toLocaleString("en-US")}/kg.`);
        setMsgType("success");
      } else {
        setMsg(`Update failed with status code ${r.status}. Check ADMIN_KEY.`);
        setMsgType("error");
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Network error");
      setMsgType("error");
    }
  }

  async function loadRegistry() {
    setMsg("Querying custodian registry...");
    setMsgType("info");
    try {
      const c = await fetch("/api/custodians").then((r) => r.json()).catch(() => ({ custodians: [] }));
      setCustodians(c.custodians ?? []);
      setMsg(`Registry loaded: ${c.custodians?.length ?? 0} registered pilot key(s).`);
      setMsgType("success");
    } catch {
      setMsg("Failed to query custodian registry endpoint.");
      setMsgType("error");
    }
  }

  async function loadAps() {
    setMsg("Checking Authorised Participant status...");
    setMsgType("info");
    try {
      const j = await fetch("/api/ap", { headers: { "x-admin-key": key } }).then((r) => r.json()).catch(() => null);
      if (j) {
        setMsg(
          `AP Policy: ${j.pending || 0} pending queue, ${j.active?.length || 0} active, redemption ${j.redemption}. Approvals require off-chain counsel.`
        );
        setMsgType("info");
      } else {
        setMsg("AP endpoint unreachable.");
        setMsgType("error");
      }
    } catch {
      setMsg("Error fetching AP status.");
      setMsgType("error");
    }
  }

  async function loadIssuers() {
    if (!key) { setMsg("Please enter the ADMIN_KEY."); setMsgType("error"); return; }
    try {
      const r = await fetch("/api/issuers", { headers: { "x-admin-key": key } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setIssuers(j.issuers ?? []);
      setMsg(`Issuer registry loaded: ${j.issuers?.length ?? 0} wallet(s).`);
      setMsgType("success");
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Issuer registry unavailable."); setMsgType("error"); }
  }

  async function saveIssuer(wallet: string, approved: boolean, name = issuerName, contact = issuerContact) {
    if (!key) { setMsg("Please enter the ADMIN_KEY."); setMsgType("error"); return; }
    try {
      const r = await fetch("/api/issuers", {
        method: "POST", headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ wallet, name, contact, approved }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setMsg(`Service registry updated. ${approved ? "On-chain launcher approval is still required from its owner." : "Wallet revoked in service registry."}`);
      setMsgType("success");
      if (wallet.toLowerCase() === issuerWallet.toLowerCase()) { setIssuerWallet(""); setIssuerName(""); setIssuerContact(""); }
      await loadIssuers();
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Issuer update failed."); setMsgType("error"); }
  }

  function toggleScope(s: string) {
    setCustScope((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function registerCustodian() {
    if (!key) {
      setMsg("Please enter the ADMIN_KEY.");
      setMsgType("error");
      return;
    }
    if (!custAddr || !custAddr.startsWith("0x")) {
      setMsg("Please enter a valid 0x EVM custodian wallet address.");
      setMsgType("error");
      return;
    }
    setMsg("Registering custodian key with typed EIP-712 scope...");
    setMsgType("info");
    try {
      const r = await fetch("/api/custodians", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ address: custAddr, name: custName || "Bonded Vault Key", scope: custScope, status: "demo" }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setMsg(`Custodian registered: ${custAddr.slice(0, 10)}... with scope [${custScope.join(", ")}].`);
        setMsgType("success");
        void loadRegistry();
      } else {
        setMsg(`Registration failed: ${j.error ?? r.status}`);
        setMsgType("error");
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Registration failed");
      setMsgType("error");
    }
  }

  return (
    <PageShell>
      {/* Header section */}
      <div className="scrit-reveal" style={{ maxWidth: 1100, marginBottom: 28 }}>
        <p className="eyebrow">Manual Operations · Pilot Console</p>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(34px, 4.5vw, 56px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: "12px 0 16px",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
          }}
        >
          Protocol ops console.
        </h1>
        <p
          style={{
            color: "var(--parchment-dim)",
            fontSize: "clamp(15px, 1.8vw, 17px)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Manual pilot console for price inputs, a demo custodian registry, and AP diligence. Registry entries do not prove contracted custody; attestation submission still uses the configured demo signer.
        </p>
      </div>

      {/* Admin Key Input Card */}
      <div className="panel scrit-reveal" style={{ marginBottom: 24, borderColor: "rgba(217, 169, 46, 0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <label className="launch-field-label" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Key size={14} color="var(--gold-bright)" strokeWidth={2} />
            Admin key <span>x-admin-key</span>
          </label>
          <span className="mono-sm" style={{ color: "var(--gold-bright)" }}>Gated Route Verification</span>
        </div>
        <input
          className="field"
          type="password"
          placeholder="Enter ADMIN_KEY for authorized mutations"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        {msg && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background:
                msgType === "success"
                  ? "rgba(46, 213, 115, 0.1)"
                  : msgType === "error"
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(217, 169, 46, 0.08)",
              border: `1px solid ${
                msgType === "success"
                  ? "rgba(46, 213, 115, 0.3)"
                  : msgType === "error"
                  ? "rgba(239, 68, 68, 0.3)"
                  : "rgba(217, 169, 46, 0.25)"
              }`,
              color:
                msgType === "success"
                  ? "#2ed573"
                  : msgType === "error"
                  ? "#fca5a5"
                  : "var(--gold-bright)",
            }}
          >
            {msgType === "success" ? <CheckCircle2 size={16} strokeWidth={2} /> : <AlertCircle size={16} strokeWidth={2} />}
            <span>{msg}</span>
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div
        style={{
          display: "flex",
          gap: 10,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          paddingBottom: 16,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("prices")}
          className={`btn ${activeTab === "prices" ? "btn-gold" : "btn-ghost"}`}
          style={{ padding: "8px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Radio size={15} strokeWidth={2} />
          Price Oracle Feed
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("custodians")}
          className={`btn ${activeTab === "custodians" ? "btn-gold" : "btn-ghost"}`}
          style={{ padding: "8px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Key size={15} strokeWidth={2} />
          Custodian Keys ({custodians.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("issuers")}
          className={`btn ${activeTab === "issuers" ? "btn-gold" : "btn-ghost"}`}
          style={{ padding: "8px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <ShieldCheck size={15} strokeWidth={2} />
          Issuer approvals ({issuers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ap")}
          className={`btn ${activeTab === "ap" ? "btn-gold" : "btn-ghost"}`}
          style={{ padding: "8px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Users size={15} strokeWidth={2} />
          Authorised Participant Policy
        </button>
      </div>

      {/* TAB 1: Price Feed */}
      {activeTab === "prices" && (
        <div className="panel scrit-reveal" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Update Commodity Price Feed</h3>
          <p className="mono-sm" style={{ marginBottom: 20, color: "#a1a1a6" }}>
            Manual pilot inputs for the NAV estimate. This is not a live market feed or continuously updating oracle.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
            <div>
              <label className="launch-field-label">Target Asset</label>
              <select className="field" value={commodity} onChange={(e) => setCommodity(e.target.value)}>
                {BASKET.map((row) => <option key={row.symbol} value={row.symbol}>{row.name} ({row.symbol}) · {row.grade}</option>)}
              </select>
            </div>
            <div>
              <label className="launch-field-label">USD per Kilogram</label>
              <input
                className="field"
                placeholder="e.g. 84500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="launch-field-label">Price source / reference</label>
              <input className="field" placeholder="Provider, benchmark, date" value={priceSource} onChange={(e) => setPriceSource(e.target.value)} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn btn-gold" style={{ width: "100%" }} onClick={updatePrice}>
                Publish Feed
              </button>
            </div>
          </div>

          <div className="notice-gold">
            <b>Pilot attestation policy:</b> The API checks EIP-712 signatures against <code>CUSTODIAN_DEMO_ADDRESS</code> and its configured scope. Registering another key here does not change the expected signer in the current implementation.
          </div>
        </div>
      )}

      {/* TAB 2: Custodians */}
      {activeTab === "custodians" && (
        <div className="panel scrit-reveal" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Register Scoped Custodian Key</h3>
          <p className="mono-sm" style={{ marginBottom: 20, color: "#a1a1a6" }}>
            Enforce cryptographic scoping: an authorized gold vault key cannot sign attestations for silver or platinum.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 14 }}>
            <input
              className="field"
              placeholder="0x Custodian Public Address"
              value={custAddr}
              onChange={(e) => setCustAddr(e.target.value)}
            />
            <input
              className="field"
              placeholder="Custodian display label"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: "#a1a1a6", fontWeight: 600 }}>Permitted Commodity Scopes:</span>
            {BASKET.map(({ symbol: s, name }) => (
              <label className="check" key={s}>
                <input type="checkbox" checked={custScope.includes(s)} onChange={() => toggleScope(s)} />
                <span>{s} · {name}</span>
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <button className="btn btn-gold" onClick={registerCustodian}>
              Register Custodian Key
            </button>
            <button className="btn btn-ghost" onClick={loadRegistry}>
              Query Current Registry
            </button>
          </div>

          {custodians.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Name</th>
                    <th>Commodity Scope</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {custodians.map((c) => (
                    <tr key={c.address}>
                      <td className="mono-sm">{c.address}</td>
                      <td><b>{c.name}</b></td>
                      <td className="gold">{c.scope.join(", ")}</td>
                      <td>
                        <span style={{ fontSize: 11, background: "rgba(208,170,91,0.12)", color: "#d0aa5b", padding: "2px 8px", borderRadius: 999 }}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "issuers" && (
        <div className="panel scrit-reveal" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px" }}>Issuer service registry</h3>
          <p className="mono-sm" style={{ marginBottom: 20, color: "#a1a1a6" }}>
            This approval controls the service precheck. The launcher also has its own on-chain allowlist; the launcher owner must approve the same wallet there.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr", gap: 14, marginBottom: 14 }}>
            <input className="field" placeholder="0x issuer wallet" value={issuerWallet} onChange={(e) => setIssuerWallet(e.target.value)} />
            <input className="field" placeholder="Issuer name" value={issuerName} onChange={(e) => setIssuerName(e.target.value)} />
            <input className="field" placeholder="Contact (optional)" value={issuerContact} onChange={(e) => setIssuerContact(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <button className="btn btn-gold" onClick={() => saveIssuer(issuerWallet, true)}>Approve in service registry</button>
            <button className="btn btn-ghost" onClick={loadIssuers}>Refresh issuer list</button>
          </div>
          {issuers.length > 0 && <div style={{ overflowX: "auto" }}><table className="dtable"><thead><tr><th>Wallet</th><th>Name</th><th>Contact</th><th>Status</th><th>Action</th></tr></thead><tbody>
            {issuers.map((issuer) => <tr key={issuer.wallet}><td className="mono-sm">{issuer.wallet}</td><td>{issuer.name}</td><td>{issuer.contact || "—"}</td><td>{issuer.approved ? "Service approved" : "Revoked"}</td><td><button className="btn btn-ghost" onClick={() => saveIssuer(issuer.wallet, !issuer.approved, issuer.name, issuer.contact)}>{issuer.approved ? "Revoke" : "Approve"}</button></td></tr>)}
          </tbody></table></div>}
        </div>
      )}

      {/* TAB: AP Policy */}
      {activeTab === "ap" && (
        <div className="panel scrit-reveal" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Authorised Participant (AP) Queue</h3>
          <p className="mono-sm" style={{ marginBottom: 20, color: "#a1a1a6" }}>
            No authorised participant is active. Applications are queued for diligence only; there is no pilot redemption.
          </p>

          <button className="btn btn-ghost" onClick={loadAps} style={{ marginBottom: 20 }}>
            Query AP Queue &amp; Policy
          </button>

          <div className="launch-disclaimer-box" style={{ margin: 0 }}>
            <p>
              <b>Roadmap only:</b> An authorised-participant model could support large-basket creation and redemption after counterparties, legal terms, and contract support are in place. This is not active in the pilot.
            </p>
          </div>
        </div>
      )}
    </PageShell>
  );
}
