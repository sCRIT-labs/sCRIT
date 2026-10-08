"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { publicClientFor } from "@/lib/scrit-evm";
import { lookupAddress, getCanonicalAddress } from "@/lib/addresses";
import {
  parseAttestation,
  verifyAttestationLocally,
  applyTamperDemo,
  SAMPLE_TESTNET_ATTESTATION,
  SAMPLE_MAINNET_ATTESTATION,
  type EIP712AttestationPayload,
  type VerificationResult,
} from "@/lib/verify/attestation";
import { decodeHookPermissions, type DecodedHookPermissions } from "@/lib/verify/hook-decoder";
import { classifyReceiptLogs, type ClassifiedTransaction } from "@/lib/verify/transaction";
import { keccak256 } from "viem";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [inputVal, setInputVal] = useState("");
  const [detectedType, setDetectedType] = useState<"tx" | "addr" | "attestation" | "unknown">("unknown");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Block metadata
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [blockAgeSecs, setBlockAgeSecs] = useState<number | null>(null);

  // Attestation State
  const [attestationPayload, setAttestationPayload] = useState<EIP712AttestationPayload | null>(null);
  const [originalAttestation, setOriginalAttestation] = useState<EIP712AttestationPayload | null>(null);
  const [attestationResult, setAttestationResult] = useState<VerificationResult | null>(null);
  const [isTampered, setIsTampered] = useState(false);

  // Tx State
  const [classifiedTx, setClassifiedTx] = useState<ClassifiedTransaction | null>(null);
  const [rawTxReceipt, setRawTxReceipt] = useState<any | null>(null);

  // Address State
  const [addressLookup, setAddressLookup] = useState<ReturnType<typeof lookupAddress> | null>(null);
  const [hookDecoded, setHookDecoded] = useState<DecodedHookPermissions | null>(null);
  const [liveCodeHash, setLiveCodeHash] = useState<string | null>(null);

  // Fetch current block for age calculation
  useEffect(() => {
    let mounted = true;
    async function fetchBlockInfo() {
      try {
        const client = publicClientFor(4663);
        const block = await client.getBlock({ blockTag: "latest" });
        if (mounted) {
          setBlockNumber(block.number);
          const age = Math.floor(Date.now() / 1000) - Number(block.timestamp);
          setBlockAgeSecs(Math.max(0, age));
        }
      } catch (e) {
        console.warn("RPC block read failed:", e);
      }
    }
    fetchBlockInfo();
    const interval = setInterval(fetchBlockInfo, 12000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle URL query parameters on mount
  useEffect(() => {
    const txParam = searchParams.get("tx");
    const addrParam = searchParams.get("addr");

    if (txParam) {
      setInputVal(txParam);
      handleProcessInput(txParam, "tx");
    } else if (addrParam) {
      setInputVal(addrParam);
      handleProcessInput(addrParam, "addr");
    }
  }, [searchParams]);

  // Input auto-detection
  function detectInputMode(val: string): "tx" | "addr" | "attestation" | "unknown" {
    const trimmed = val.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return "attestation";
    }
    if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
      return "tx";
    }
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      return "addr";
    }
    return "unknown";
  }

  // Process input
  async function handleProcessInput(valueToProcess: string, forcedType?: "tx" | "addr" | "attestation") {
    const trimmed = valueToProcess.trim();
    if (!trimmed) {
      setDetectedType("unknown");
      setErrorMsg(null);
      return;
    }

    const mode = forcedType ?? detectInputMode(trimmed);
    setDetectedType(mode);
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === "attestation") {
        const parsed = parseAttestation(trimmed);
        if (!parsed) {
          setErrorMsg("Invalid EIP-712 Attestation JSON. Expected domain, types, message, signature.");
          setIsLoading(false);
          return;
        }
        setAttestationPayload(parsed);
        setOriginalAttestation(parsed);
        setIsTampered(false);

        // Verify attestation
        const result = await verifyAttestationLocally(parsed, {
          expectedChainId: 4663,
          registeredCustodians: [], // In pilot, 0 registered custodians
        });
        setAttestationResult(result);
      } else if (mode === "tx") {
        router.replace(`/verify?tx=${trimmed}`, { scroll: false });
        const client = publicClientFor(4663);
        const receipt = await client.getTransactionReceipt({ hash: trimmed as `0x${string}` });
        setRawTxReceipt(receipt);

        const logsFormatted = receipt.logs.map((l: any) => ({
          address: l.address,
          topics: l.topics,
          data: l.data,
          blockNumber: l.blockNumber,
        }));

        const classified = classifyReceiptLogs(logsFormatted);
        setClassifiedTx(classified);
      } else if (mode === "addr") {
        router.replace(`/verify?addr=${trimmed}`, { scroll: false });
        const lookup = lookupAddress(trimmed);
        setAddressLookup(lookup);

        // Check if hook (ends with 2044 or contains hook flags)
        const hookInfo = decodeHookPermissions(trimmed);
        setHookDecoded(hookInfo);

        // Live code hash via RPC
        try {
          const client = publicClientFor(4663);
          const bytecode = await client.getBytecode({ address: trimmed as `0x${string}` });
          if (bytecode) {
            const hash = keccak256(bytecode);
            setLiveCodeHash(hash);
          } else {
            setLiveCodeHash("0x (EOA / No Code)");
          }
        } catch {
          setLiveCodeHash("UNVERIFIED (RPC Error)");
        }
      } else {
        setErrorMsg("Input format not recognized. Please provide a 64-character tx hash, 40-character address, or EIP-712 JSON.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to inspect on-chain entity.");
    } finally {
      setIsLoading(false);
    }
  }

  // Tamper demo trigger
  async function handleTamperDemo() {
    if (!attestationPayload) return;
    if (isTampered && originalAttestation) {
      // Revert to original
      setAttestationPayload(originalAttestation);
      setIsTampered(false);
      const res = await verifyAttestationLocally(originalAttestation, {
        expectedChainId: 4663,
        registeredCustodians: [],
      });
      setAttestationResult(res);
    } else {
      // Tamper +1g
      const tampered = applyTamperDemo(attestationPayload, 1);
      setAttestationPayload(tampered);
      setIsTampered(true);
      const res = await verifyAttestationLocally(tampered, {
        expectedChainId: 4663,
        registeredCustodians: [],
      });
      setAttestationResult(res);
    }
  }

  return (
    <div className="scrit-proof-page" style={{ minHeight: "100vh", padding: "100px 24px 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header / Hero */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "#e6b43b",
                background: "rgba(230,180,59,0.1)",
                padding: "3px 8px",
                borderRadius: 4,
                border: "1px solid rgba(230,180,59,0.3)",
              }}
            >
              INDEPENDENT CRYPTOGRAPHIC AUDIT
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              CHAIN 4663 · CLIENT-SIDE TRUTH
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              margin: "0 0 12px",
            }}
          >
            Don&apos;t trust the site. Verify the chain.
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.7)",
              maxWidth: 760,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Paste a transaction, an address, or a custodian attestation. Your browser checks it
            directly against Robinhood Chain. Nothing is sent to our server.
          </p>

          {/* Block age indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 18,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <span>
              LATEST BLOCK:{" "}
              <b style={{ color: "#ffffff" }}>
                {blockNumber ? `#${blockNumber.toString()}` : "CONNECTING..."}
              </b>
            </span>
            <span>·</span>
            <span>
              BLOCK AGE:{" "}
              <b style={{ color: blockAgeSecs !== null ? "#3dd68c" : "inherit" }}>
                {blockAgeSecs !== null ? `${blockAgeSecs}s ago` : "UNKNOWN"}
              </b>
            </span>
          </div>
        </div>

        {/* Unified Input Box */}
        <div
          style={{
            background: "rgba(18,20,18,0.7)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: 24,
            marginBottom: 32,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
                color: "#e6b43b",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              UNIFIED VERIFICATION INPUT (TX HASH / CONTRACT ADDRESS / EIP-712 JSON)
            </label>
            {detectedType !== "unknown" && (
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "rgba(61,214,140,0.12)",
                  color: "#3dd68c",
                  border: "1px solid rgba(61,214,140,0.3)",
                }}
              >
                DETECTED: {detectedType.toUpperCase()}
              </span>
            )}
          </div>

          <textarea
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setDetectedType(detectInputMode(e.target.value));
            }}
            placeholder="Paste 0x... (tx hash or address) or paste EIP-712 custodian JSON payload"
            rows={inputVal.includes("\n") || inputVal.length > 80 ? 5 : 2}
            style={{
              width: "100%",
              background: "#0c0e0c",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6,
              color: "#f0f2f0",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 13,
              padding: "12px 14px",
              outline: "none",
              resize: "vertical",
              marginBottom: 16,
            }}
          />

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            {/* Quick Sample Presets */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono, monospace)" }}>
                QUICK SAMPLES:
              </span>
              <button
                type="button"
                onClick={() => {
                  const sampleStr = JSON.stringify(SAMPLE_MAINNET_ATTESTATION, null, 2);
                  setInputVal(sampleStr);
                  handleProcessInput(sampleStr, "attestation");
                }}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#e6b43b",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Attestation (Mainnet)
              </button>

              <button
                type="button"
                onClick={() => {
                  const sampleStr = JSON.stringify(SAMPLE_TESTNET_ATTESTATION, null, 2);
                  setInputVal(sampleStr);
                  handleProcessInput(sampleStr, "attestation");
                }}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#cbd5e1",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Attestation (Testnet 46630)
              </button>

              <button
                type="button"
                onClick={() => {
                  const hookAddr = "0x4bbd5c4894b75ddbf215c82304b6c21f9134a044";
                  setInputVal(hookAddr);
                  handleProcessInput(hookAddr, "addr");
                }}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#cbd5e1",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Hook (0x2044)
              </button>

              <button
                type="button"
                onClick={() => {
                  const legacyAddr = "0x56073943133c1c0678a753be9402b27d43cf1c22";
                  setInputVal(legacyAddr);
                  handleProcessInput(legacyAddr, "addr");
                }}
                style={{
                  background: "rgba(255,75,75,0.12)",
                  border: "1px solid rgba(255,75,75,0.3)",
                  color: "#ff6b6b",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Deprecated Token
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleProcessInput(inputVal)}
              disabled={isLoading || !inputVal.trim()}
              style={{
                background: "#e6b43b",
                color: "#121411",
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: "var(--font-mono, monospace)",
                padding: "8px 20px",
                borderRadius: 4,
                cursor: isLoading ? "wait" : "pointer",
                opacity: isLoading || !inputVal.trim() ? 0.6 : 1,
              }}
            >
              {isLoading ? "VERIFYING IN BROWSER..." : "VERIFY IN BROWSER"}
            </button>
          </div>

          {errorMsg && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 14px",
                background: "rgba(255,75,75,0.12)",
                border: "1px solid rgba(255,75,75,0.3)",
                color: "#ff7b7b",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
                borderRadius: 4,
              }}
            >
              ✗ {errorMsg}
            </div>
          )}
        </div>

        {/* RESULTS SECTION */}

        {/* 1. ATTESTATION MODE RESULTS */}
        {detectedType === "attestation" && attestationResult && (
          <div style={{ marginTop: 32 }}>
            {/* Verdict Header */}
            <div
              style={{
                background:
                  attestationResult.verdict === "ACCEPTED ON-CHAIN"
                    ? "rgba(61,214,140,0.12)"
                    : attestationResult.verdict === "VALID SIGNATURE, NOT SUBMITTED"
                    ? "rgba(230,180,59,0.12)"
                    : "rgba(255,75,75,0.12)",
                border: `1px solid ${
                  attestationResult.verdict === "ACCEPTED ON-CHAIN"
                    ? "#3dd68c"
                    : attestationResult.verdict === "VALID SIGNATURE, NOT SUBMITTED"
                    ? "#e6b43b"
                    : "#ff4b4b"
                }`,
                borderRadius: 8,
                padding: 24,
                marginBottom: 24,
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  VERIFICATION VERDICT
                </span>
                <h2
                  style={{
                    margin: "4px 0",
                    fontSize: 24,
                    fontWeight: 700,
                    color:
                      attestationResult.verdict === "ACCEPTED ON-CHAIN"
                        ? "#3dd68c"
                        : attestationResult.verdict === "VALID SIGNATURE, NOT SUBMITTED"
                        ? "#e6b43b"
                        : "#ff4b4b",
                  }}
                >
                  {attestationResult.verdict}
                </h2>
                {attestationResult.verdictReason && (
                  <p style={{ margin: "4px 0 0", color: "#ff8b8b", fontSize: 13 }}>
                    {attestationResult.verdictReason}
                  </p>
                )}
              </div>

              {/* Tamper Demo Interactive Button */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleTamperDemo}
                  style={{
                    background: isTampered ? "rgba(255,75,75,0.2)" : "rgba(230,180,59,0.2)",
                    border: `1px solid ${isTampered ? "#ff4b4b" : "#e6b43b"}`,
                    color: isTampered ? "#ff6b6b" : "#e6b43b",
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 600,
                    fontSize: 12,
                    padding: "8px 16px",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {isTampered ? "↺ Reset Original Mass" : "⚡ Tamper Demo: Change +1 Gram"}
                </button>
              </div>
            </div>

            {/* Checklist Steps (1 to 9) */}
            <div
              style={{
                background: "rgba(18,20,18,0.7)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: 24,
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 13,
                  color: "#e6b43b",
                  letterSpacing: "0.08em",
                  margin: "0 0 16px",
                }}
              >
                9-STEP CRYPTOGRAPHIC VERIFICATION CHECKLIST
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {attestationResult.steps.map((step) => (
                  <div
                    key={step.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: 11,
                            color: "rgba(255,255,255,0.4)",
                          }}
                        >
                          STEP {step.id}
                        </span>
                        <strong style={{ fontSize: 13, color: "#ffffff" }}>{step.label}</strong>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: 12,
                          color: "#cbd5e1",
                          wordBreak: "break-all",
                          marginBottom: 4,
                        }}
                      >
                        {step.valueText}
                      </div>
                      {step.detail && (
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                          {step.detail}
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 80, textAlign: "right" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background:
                            step.status === "PASS"
                              ? "rgba(61,214,140,0.12)"
                              : step.status === "FAIL"
                              ? "rgba(255,75,75,0.12)"
                              : "rgba(255,255,255,0.08)",
                          color:
                            step.status === "PASS"
                              ? "#3dd68c"
                              : step.status === "FAIL"
                              ? "#ff4b4b"
                              : "#94a3b8",
                          border: `1px solid ${
                            step.status === "PASS"
                              ? "rgba(61,214,140,0.3)"
                              : step.status === "FAIL"
                              ? "rgba(255,75,75,0.3)"
                              : "rgba(255,255,255,0.12)"
                          }`,
                        }}
                      >
                        {step.status === "PASS" ? "✓ PASS" : step.status === "FAIL" ? "✗ FAIL" : step.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. TRANSACTION MODE RESULTS */}
        {detectedType === "tx" && classifiedTx && (
          <div style={{ marginTop: 32 }}>
            <div
              style={{
                background: "rgba(18,20,18,0.7)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  TRANSACTION CLASSIFICATION
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 4,
                    background:
                      classifiedTx.classification === "Burn"
                        ? "rgba(230,180,59,0.15)"
                        : "rgba(61,214,140,0.15)",
                    color:
                      classifiedTx.classification === "Burn" ? "#e6b43b" : "#3dd68c",
                    border: "1px solid currentColor",
                  }}
                >
                  {classifiedTx.classification.toUpperCase()}
                </span>
              </div>

              <h2 style={{ fontSize: 20, color: "#ffffff", margin: "0 0 12px" }}>
                {classifiedTx.summary}
              </h2>

              {rawTxReceipt && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>BLOCK NUMBER:</span>
                    <div style={{ color: "#ffffff", marginTop: 4 }}>
                      #{rawTxReceipt.blockNumber?.toString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>GAS USED:</span>
                    <div style={{ color: "#ffffff", marginTop: 4 }}>
                      {rawTxReceipt.gasUsed?.toString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>STATUS:</span>
                    <div style={{ color: rawTxReceipt.status === "success" ? "#3dd68c" : "#ff4b4b", marginTop: 4 }}>
                      {rawTxReceipt.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ADDRESS MODE RESULTS */}
        {detectedType === "addr" && (
          <div style={{ marginTop: 32 }}>
            {/* Deprecated Banner */}
            {addressLookup?.type === "deprecated" && (
              <div
                style={{
                  background: "rgba(255,50,50,0.15)",
                  border: "2px solid #ff4b4b",
                  borderRadius: 8,
                  padding: 24,
                  marginBottom: 24,
                }}
              >
                <div style={{ color: "#ff4b4b", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
                  DEPRECATED CONTRACT DETECTED
                </div>
                <p style={{ color: "#ffffff", margin: "0 0 8px", fontSize: 15, fontWeight: 500 }}>
                  {(addressLookup.info as any)?.reason ?? "This is not $CRIT. Do not buy or pair against it."}
                </p>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  Canonical $CRIT Pons is {getCanonicalAddress("CRIT")}
                </span>
              </div>
            )}

            {/* Canonical Info */}
            {addressLookup?.type === "canonical" && (
              <div
                style={{
                  background: "rgba(18,20,18,0.7)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: 24,
                  marginBottom: 24,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    color: "#e6b43b",
                    letterSpacing: "0.1em",
                  }}
                >
                  CANONICAL PROTOCOL CONTRACT
                </span>
                <h2 style={{ fontSize: 22, color: "#ffffff", margin: "4px 0 10px" }}>
                  {(addressLookup.info as any)?.name}
                </h2>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 16px" }}>
                  {(addressLookup.info as any)?.description}
                </p>

                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                    padding: 12,
                    background: "#0c0e0c",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>ADDRESS: </span>
                    <span style={{ color: "#ffffff" }}>{inputVal}</span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>LIVE RUNTIME CODE HASH: </span>
                    <span style={{ color: "#3dd68c" }}>{liveCodeHash ?? "READING..."}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Hook Permission Decoder (14 Bits) */}
            {hookDecoded && (
              <div
                style={{
                  background: "rgba(18,20,18,0.7)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 14,
                        color: "#e6b43b",
                        letterSpacing: "0.08em",
                        margin: 0,
                      }}
                    >
                      UNISWAP V4 HOOK PERMISSION BIT DECODER
                    </h3>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>
                      Lowest 14 address bits: {hookDecoded.hexFlags} ({hookDecoded.activeCount} ON, {hookDecoded.inactiveCount} OFF)
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {hookDecoded.explanations.map((exp) => (
                    <div
                      key={exp.flag}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background:
                          exp.status === "ON"
                            ? "rgba(230,180,59,0.04)"
                            : "rgba(255,255,255,0.02)",
                        border: `1px solid ${
                          exp.status === "ON"
                            ? "rgba(230,180,59,0.2)"
                            : "rgba(255,255,255,0.06)"
                        }`,
                        borderRadius: 6,
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background:
                              exp.status === "ON"
                                ? "rgba(230,180,59,0.15)"
                                : "rgba(255,255,255,0.06)",
                            color: exp.status === "ON" ? "#e6b43b" : "rgba(255,255,255,0.4)",
                            border: "1px solid currentColor",
                          }}
                        >
                          {exp.status}
                        </span>
                        <span style={{ color: "#ffffff", fontWeight: 600 }}>{exp.flag}</span>
                        <span style={{ color: "rgba(255,255,255,0.3)" }}>({exp.hexMask})</span>
                      </div>

                      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, textAlign: "right" }}>
                        {exp.meaning}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", padding: 100, color: "#fff" }}>Loading Verifier...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
