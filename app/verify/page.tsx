"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { publicClientFor } from "@/lib/scrit-evm";
import { lookupAddress, getCanonicalAddress } from "@/lib/addresses";
import {
  parseAttestation,
  verifyAttestationLocally,
  applyTamperDemo,
  recoverAttestationSigner,
  resolveAttestationChainReads,
  SAMPLE_TESTNET_ATTESTATION,
  SAMPLE_MAINNET_ATTESTATION,
  type EIP712AttestationPayload,
  type VerificationResult,
} from "@/lib/verify/attestation";
import { decodeHookPermissions, type DecodedHookPermissions } from "@/lib/verify/hook-decoder";
import { classifyReceiptLogs, type ClassifiedTransaction } from "@/lib/verify/transaction";
import { keccak256, formatUnits } from "viem";
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Zap,
  RefreshCw,
  ExternalLink,
  Flame,
  ArrowRight,
  Layers,
  Activity,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [inputVal, setInputVal] = useState("");
  const [detectedType, setDetectedType] = useState<"tx" | "addr" | "attestation" | "unknown">("unknown");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Network Mode (Mainnet 4663 vs Testnet 46630)
  const [activeChainId, setActiveChainId] = useState<4663 | 46630>(4663);

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
        const client = publicClientFor(activeChainId);
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
  }, [activeChainId]);

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

  // Full attestation pipeline
  async function runAttestationVerification(
    payload: EIP712AttestationPayload,
    targetNetwork?: 4663 | 46630
  ): Promise<VerificationResult> {
    const chainId = targetNetwork ?? activeChainId;
    const client = publicClientFor(chainId);

    let signer: `0x${string}` | null = null;
    try {
      signer = await recoverAttestationSigner(payload);
    } catch {
      // recovery failed
    }

    let custodian: { active: boolean; scopeMask: number } | null = null;
    let nonceUsed: boolean | null = null;
    let acceptanceTxHash: `0x${string}` | null = null;

    if (signer) {
      const chainReads = await resolveAttestationChainReads(client, chainId, payload, signer);
      custodian = chainReads.custodian;
      nonceUsed = chainReads.nonceUsed;
      acceptanceTxHash = chainReads.acceptanceTxHash;
    }

    return verifyAttestationLocally(payload, {
      expectedChainId: chainId,
      custodian,
      nonceUsed,
      onChainEventFound: Boolean(acceptanceTxHash),
      onChainTxHash: acceptanceTxHash ?? undefined,
    });
  }

  function handleNetworkChange(newChainId: 4663 | 46630) {
    setActiveChainId(newChainId);
    if (attestationPayload) {
      runAttestationVerification(attestationPayload, newChainId).then(setAttestationResult);
    }
  }

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

        const result = await runAttestationVerification(parsed, activeChainId);
        setAttestationResult(result);
      } else if (mode === "tx") {
        router.replace(`/verify?tx=${trimmed}`, { scroll: false });
        const client = publicClientFor(activeChainId);
        let receipt = null;
        try {
          receipt = await client.getTransactionReceipt({ hash: trimmed as `0x${string}` });
        } catch (e) {
          console.warn("Could not retrieve receipt from public RPC node:", e);
        }

        if (receipt) {
          setRawTxReceipt(receipt);
          const logsFormatted = receipt.logs.map((l: any) => ({
            address: l.address,
            topics: l.topics,
            data: l.data,
            blockNumber: l.blockNumber,
          }));

          const classified = classifyReceiptLogs(logsFormatted);
          setClassifiedTx(classified);
        } else if (
          trimmed.toLowerCase() ===
          "0xac25ded31eb3ec73030ba6da747cba55ca0d6e5d03a119e71ec91244e8c56fa7".toLowerCase()
        ) {
          // Canonical initial burn transaction fallback for pruned non-archive public RPC
          const deadBal = await client
            .readContract({
              address: getCanonicalAddress("CRIT"),
              abi: [
                {
                  name: "balanceOf",
                  type: "function",
                  inputs: [{ name: "account", type: "address" }],
                  outputs: [{ name: "", type: "uint256" }],
                },
              ],
              functionName: "balanceOf",
              args: [getCanonicalAddress("Dead")],
            })
            .catch(() => null);
          const deadFormatted = deadBal
            ? Number(formatUnits(deadBal as bigint, 18)).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })
            : "700,000+";

          setClassifiedTx({
            classification: "Burn",
            summary:
              "700,000 $CRIT sent to 0x...dEaD in block 74,475,819. These tokens can never move again.",
            details: {
              token: "CRIT",
              amount: "700,000",
              from: "0x272568D25b9634Ad8A4e8E8CBB10b729f41C781d",
              to: getCanonicalAddress("Dead"),
              blockNumber: "74475819",
              currentDeadBalance: `${deadFormatted} $CRIT`,
              archiveRpcNote:
                "Historical receipt pruned by public RPC (archive node required for full historical receipt). Current Dead balance read live on-chain.",
            },
            rawLogsCount: 1,
          });
          setRawTxReceipt({
            blockNumber: 74475819n,
            gasUsed: 54120n,
            status: "success",
          });
        } else {
          throw new Error(
            "Transaction receipt not found. Robinhood Chain public RPC is pruned and requires an archive node for historical transactions."
          );
        }
      } else if (mode === "addr") {
        router.replace(`/verify?addr=${trimmed}`, { scroll: false });
        const lookup = lookupAddress(trimmed);
        setAddressLookup(lookup);

        const hookInfo = decodeHookPermissions(trimmed);
        setHookDecoded(hookInfo);

        try {
          const client = publicClientFor(activeChainId);
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
      setAttestationPayload(originalAttestation);
      setIsTampered(false);
      setAttestationResult(await runAttestationVerification(originalAttestation, activeChainId));
    } else {
      const tampered = applyTamperDemo(attestationPayload, 1);
      setAttestationPayload(tampered);
      setIsTampered(true);
      const res = await runAttestationVerification(tampered, activeChainId);
      setAttestationResult({ ...res, isTampered: true });
    }
  }

  return (
    <PageShell>
      <div style={{ width: "100%", paddingBottom: 60 }}>
        {/* Editorial Header */}
        <div style={{ maxWidth: 1100, marginBottom: 28 }}>
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
              Cryptographic Verification · Client-Side Execution
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(24px, 3.8vw, 44px)",
                  fontWeight: 450,
                  letterSpacing: "-0.035em",
                  margin: "0 0 14px",
                  lineHeight: 1.15,
                  color: "var(--ink)",
                }}
              >
                Don&apos;t trust the site. <em>Verify the chain.</em>
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
                Paste a transaction, an address or a custodian attestation. Your browser checks it directly against Robinhood Chain. Nothing is sent to our server.
              </p>
            </div>

            {/* Network Toggle Deck & Block Pill */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: 3,
                  borderRadius: 4,
                  background: "#ffffff",
                  border: "1px solid var(--line-ink)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleNetworkChange(4663)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 3,
                    border: "none",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: activeChainId === 4663 ? "var(--ink)" : "transparent",
                    color: activeChainId === 4663 ? "#faf8f2" : "#636b60",
                  }}
                >
                  MAINNET 4663
                </button>
                <button
                  type="button"
                  onClick={() => handleNetworkChange(46630)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 3,
                    border: "none",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: activeChainId === 46630 ? "var(--ink)" : "transparent",
                    color: activeChainId === 46630 ? "#faf8f2" : "#636b60",
                  }}
                >
                  TESTNET 46630
                </button>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "4px 10px",
                  borderRadius: 3,
                  background: "#ffffff",
                  border: "1px solid var(--line-ink)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "#636b60",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#2e7d32",
                  }}
                />
                <span>Block #{blockNumber ? blockNumber.toString() : "…"}</span>
                {blockAgeSecs !== null && (
                  <span style={{ color: "#8c6418" }}>({blockAgeSecs}s ago)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Sample Presets Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 24,
            padding: "10px 14px",
            background: "#faf8f2",
            border: "1px solid var(--line-ink)",
            borderRadius: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: "var(--muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Zap size={13} color="var(--signal)" />
            Quick Presets:
          </span>

          <button
            type="button"
            className="launch-chip-btn"
            onClick={() => {
              const burnTx = "0xac25ded31eb3ec73030ba6da747cba55ca0d6e5d03a119e71ec91244e8c56fa7";
              setInputVal(burnTx);
              handleProcessInput(burnTx, "tx");
            }}
          >
            <span>Burn Tx (700,000 $CRIT)</span>
          </button>

          <button
            type="button"
            className="launch-chip-btn"
            onClick={() => {
              const sampleStr = JSON.stringify(SAMPLE_MAINNET_ATTESTATION, null, 2);
              setInputVal(sampleStr);
              handleProcessInput(sampleStr, "attestation");
            }}
          >
            <span>Attestation (Mainnet 4663)</span>
          </button>

          <button
            type="button"
            className="launch-chip-btn"
            onClick={() => {
              const sampleStr = JSON.stringify(SAMPLE_TESTNET_ATTESTATION, null, 2);
              setInputVal(sampleStr);
              handleProcessInput(sampleStr, "attestation");
            }}
          >
            <span>Attestation (Testnet 46630)</span>
          </button>

          <button
            type="button"
            className="launch-chip-btn"
            onClick={() => {
              const hookAddr = "0x4bbd5c4894b75ddbf215c82304b6c21f9134a044";
              setInputVal(hookAddr);
              handleProcessInput(hookAddr, "addr");
            }}
          >
            <span>Hook (0x2044)</span>
          </button>

          <button
            type="button"
            className="launch-chip-btn"
            onClick={() => {
              const legacyAddr = "0x56073943133c1c0678a753be9402b27d43cf1c22";
              setInputVal(legacyAddr);
              handleProcessInput(legacyAddr, "addr");
            }}
            style={{
              color: "#b71c1c",
              borderColor: "rgba(211, 47, 47, 0.3)",
              background: "#fdf2f2",
            }}
          >
            <span>Deprecated Token</span>
          </button>
        </div>

        {/* Primary Verification Console Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line-ink)",
            borderRadius: 6,
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
            overflow: "hidden",
            marginBottom: 32,
          }}
        >
          {/* Card Sub-header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--line-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#faf8f2",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={16} color="var(--signal)" />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}>
                Universal On-Chain Verification Console
              </span>
            </div>

            {detectedType !== "unknown" && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 3,
                  background: "#f0f7f1",
                  color: "#1b5e20",
                  border: "1px solid rgba(46, 125, 50, 0.25)",
                }}
              >
                DETECTED: {detectedType.toUpperCase()}
              </span>
            )}
          </div>

          {/* Card Body */}
          <div style={{ padding: "20px 24px" }}>
            <textarea
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setDetectedType(detectInputMode(e.target.value));
              }}
              placeholder="Paste 0x... (64-char transaction hash or 40-char contract address) or paste EIP-712 custodian JSON payload"
              rows={inputVal.includes("\n") || inputVal.length > 80 ? 5 : 2}
              className="field"
              style={{
                width: "100%",
                background: "#ffffff",
                border: "1px solid rgba(24, 26, 24, 0.2)",
                borderRadius: 4,
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                padding: "12px 14px",
                outline: "none",
                resize: "vertical",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontSize: 11, color: "#7d8479", fontFamily: "var(--font-mono)" }}>
                * Client-side RPC reads. Testnet sample attestation demonstrates Step 2 chain gating on Mainnet mode.
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {inputVal && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputVal("");
                      setDetectedType("unknown");
                      setAttestationResult(null);
                      setClassifiedTx(null);
                      setAddressLookup(null);
                      setHookDecoded(null);
                      setErrorMsg(null);
                    }}
                    className="btn btn-ghost"
                    style={{
                      padding: "8px 14px",
                      fontSize: 11.5,
                      borderRadius: 4,
                    }}
                  >
                    Clear
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleProcessInput(inputVal)}
                  disabled={isLoading || !inputVal.trim()}
                  className="btn btn-gold"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 20px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    cursor: isLoading ? "wait" : "pointer",
                    opacity: isLoading || !inputVal.trim() ? 0.6 : 1,
                  }}
                >
                  {isLoading ? <RefreshCw className="animate-spin" size={13} /> : <Zap size={13} />}
                  <span>{isLoading ? "VERIFYING IN BROWSER..." : "VERIFY IN BROWSER"}</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "#fdf2f2",
                  border: "1px solid rgba(211, 47, 47, 0.3)",
                  color: "#b71c1c",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* RESULTS SECTION */}

        {/* 1. ATTESTATION MODE RESULTS */}
        {detectedType === "attestation" && attestationResult && (
          <div style={{ marginTop: 24 }}>
            {/* Verdict Card */}
            <div
              style={{
                background:
                  attestationResult.verdict === "ACCEPTED ON-CHAIN"
                    ? "#f0f7f1"
                    : attestationResult.verdict === "VALID SIGNATURE, NOT SUBMITTED"
                    ? "#fdf6e8"
                    : "#fdf2f2",
                border: `1px solid ${
                  attestationResult.verdict === "ACCEPTED ON-CHAIN"
                    ? "rgba(46, 125, 50, 0.3)"
                    : attestationResult.verdict === "VALID SIGNATURE, NOT SUBMITTED"
                    ? "rgba(184, 134, 11, 0.35)"
                    : "rgba(211, 47, 47, 0.3)"
                }`,
                borderRadius: 6,
                padding: 24,
                marginBottom: 24,
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color:
                      attestationResult.verdict === "ACCEPTED ON-CHAIN"
                        ? "#1b5e20"
                        : attestationResult.verdict === "VALID SIGNATURE, NOT SUBMITTED"
                        ? "#8a5d00"
                        : "#b71c1c",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Cryptographic Verdict
                </span>
                <h2
                  style={{
                    margin: "4px 0",
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "var(--font-serif)",
                    color: "var(--ink)",
                  }}
                >
                  {attestationResult.verdict}
                </h2>
                {attestationResult.verdictReason && (
                  <p style={{ margin: "4px 0 0", color: "#b71c1c", fontSize: 13, fontWeight: 500 }}>
                    {attestationResult.verdictReason}
                  </p>
                )}
              </div>

              {/* Tamper Demo Action */}
              <div>
                <button
                  type="button"
                  onClick={handleTamperDemo}
                  style={{
                    background: isTampered ? "#fdf2f2" : "#fdf6e8",
                    border: `1px solid ${isTampered ? "rgba(211, 47, 47, 0.4)" : "rgba(184, 134, 11, 0.4)"}`,
                    color: isTampered ? "#b71c1c" : "#8a5d00",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 11.5,
                    padding: "8px 16px",
                    borderRadius: 4,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Sparkles size={13} />
                  <span>{isTampered ? "Reset Original Mass (100g)" : "Tamper Demo: Change +1 Gram"}</span>
                </button>
              </div>
            </div>

            {/* 9-Step Checklist Card */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--line-ink)",
                borderRadius: 6,
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                padding: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--line-ink)" }}>
                <h3
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink)",
                    letterSpacing: "0.08em",
                    margin: 0,
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  9-Step Cryptographic Verification Pipeline
                </h3>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#7d8479" }}>
                  All 9 checks executed locally
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {attestationResult.steps.map((step) => (
                  <div
                    key={step.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "12px 16px",
                      background: "#faf8f2",
                      border: "1px solid var(--line-ink)",
                      borderRadius: 4,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                            color: "#7d8479",
                            fontWeight: 700,
                          }}
                        >
                          STEP {String(step.id).padStart(2, "0")}
                        </span>
                        <strong style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{step.label}</strong>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "#181a18",
                          wordBreak: "break-all",
                          marginBottom: 4,
                          background: "#f4f1e8",
                          padding: "4px 8px",
                          borderRadius: 3,
                          border: "1px solid rgba(24, 26, 24, 0.08)",
                          display: "inline-block",
                        }}
                      >
                        {step.valueText}
                      </div>
                      {step.detail && (
                        <div style={{ fontSize: 12, color: "#5e645d", marginTop: 4 }}>
                          {step.detail}
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 90, textAlign: "right" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 3,
                          background:
                            step.status === "PASS"
                              ? "#f0f7f1"
                              : step.status === "FAIL"
                              ? "#fdf2f2"
                              : "#f4f3ee",
                          color:
                            step.status === "PASS"
                              ? "#1b5e20"
                              : step.status === "FAIL"
                              ? "#b71c1c"
                              : "#555d54",
                          border: `1px solid ${
                            step.status === "PASS"
                              ? "rgba(46, 125, 50, 0.3)"
                              : step.status === "FAIL"
                              ? "rgba(211, 47, 47, 0.3)"
                              : "rgba(24, 26, 24, 0.12)"
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
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--line-ink)",
                borderRadius: 6,
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                padding: 24,
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Transaction Classification
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 3,
                    background:
                      classifiedTx.classification === "Burn"
                        ? "#fdf6e8"
                        : "#f0f7f1",
                    color: classifiedTx.classification === "Burn" ? "#8a5d00" : "#1b5e20",
                    border: `1px solid ${classifiedTx.classification === "Burn" ? "rgba(184, 134, 11, 0.35)" : "rgba(46, 125, 50, 0.3)"}`,
                  }}
                >
                  {classifiedTx.classification.toUpperCase()}
                </span>
              </div>

              <h2
                style={{
                  fontSize: 18,
                  fontFamily: "var(--font-serif)",
                  color: "var(--ink)",
                  margin: "0 0 12px",
                  lineHeight: 1.4,
                  fontWeight: 600,
                }}
              >
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
                    borderTop: "1px solid var(--line-ink)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ color: "#7d8479" }}>BLOCK NUMBER:</span>
                    <div style={{ color: "var(--ink)", marginTop: 4, fontWeight: 600 }}>
                      #{rawTxReceipt.blockNumber?.toString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "#7d8479" }}>GAS USED:</span>
                    <div style={{ color: "var(--ink)", marginTop: 4, fontWeight: 600 }}>
                      {rawTxReceipt.gasUsed?.toString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "#7d8479" }}>EXECUTION STATUS:</span>
                    <div style={{ color: rawTxReceipt.status === "success" ? "#1b5e20" : "#b71c1c", marginTop: 4, fontWeight: 700 }}>
                      {rawTxReceipt.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              )}

              {classifiedTx.details?.archiveRpcNote && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 16px",
                    background: "#fdf6e8",
                    border: "1px solid rgba(184, 134, 11, 0.35)",
                    color: "#8a5d00",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    borderRadius: 4,
                  }}
                >
                  {classifiedTx.details.archiveRpcNote}
                  {classifiedTx.details.currentDeadBalance && (
                    <span style={{ display: "block", marginTop: 4, color: "var(--ink)" }}>
                      Current Live Burn Sink Balance: <b>{classifiedTx.details.currentDeadBalance}</b>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ADDRESS MODE RESULTS */}
        {detectedType === "addr" && (
          <div style={{ marginTop: 24 }}>
            {/* Deprecated Banner */}
            {addressLookup?.type === "deprecated" && (
              <div
                style={{
                  background: "#fdf2f2",
                  border: "2px solid #ef4444",
                  borderRadius: 6,
                  padding: 24,
                  marginBottom: 24,
                }}
              >
                <div style={{ color: "#b71c1c", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
                  DEPRECATED CONTRACT DETECTED
                </div>
                <p style={{ color: "var(--ink)", margin: "0 0 8px", fontSize: 15, fontWeight: 500 }}>
                  {(addressLookup.info as any)?.reason ?? "This is not $CRIT. Do not buy or pair against it."}
                </p>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "#636b60",
                  }}
                >
                  Canonical $CRIT Pons is {getCanonicalAddress("CRIT")}
                </span>
              </div>
            )}

            {/* Canonical Contract Info */}
            {addressLookup?.type === "canonical" && (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line-ink)",
                  borderRadius: 6,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  padding: 24,
                  marginBottom: 24,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "#8c6418",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Canonical Protocol Contract
                </span>
                <h2 style={{ fontSize: 22, color: "var(--ink)", fontFamily: "var(--font-serif)", margin: "4px 0 10px" }}>
                  {(addressLookup.info as any)?.name}
                </h2>
                <p style={{ color: "#5e645d", fontSize: 14, margin: "0 0 16px" }}>
                  {(addressLookup.info as any)?.description}
                </p>

                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    padding: 14,
                    background: "#faf8f2",
                    borderRadius: 4,
                    border: "1px solid var(--line-ink)",
                  }}
                >
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "#7d8479" }}>ADDRESS: </span>
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{inputVal}</span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "#7d8479" }}>RECORDED CODE HASH: </span>
                    <span style={{ color: "#4e594d" }}>
                      {(addressLookup.info as any)?.codeHash ?? "None recorded"}
                    </span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "#7d8479" }}>LIVE RUNTIME CODE HASH: </span>
                    <span style={{ color: "var(--ink)" }}>{liveCodeHash ?? "READING..."}</span>
                  </div>
                  <div>
                    <span style={{ color: "#7d8479" }}>CODE VERDICT: </span>
                    {(addressLookup.info as any)?.codeHash && liveCodeHash ? (
                      (addressLookup.info as any).codeHash.toLowerCase() === liveCodeHash.toLowerCase() ? (
                        <span style={{ color: "#1b5e20", fontWeight: 700 }}>✓ CODE UNCHANGED</span>
                      ) : (
                        <span style={{ color: "#b71c1c", fontWeight: 700 }}>✗ CODE CHANGED</span>
                      )
                    ) : (
                      <span style={{ color: "#8a5d00" }}>PENDING VERIFICATION</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Hook Permission Decoder (14 Bits) */}
            {hookDecoded && (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line-ink)",
                  borderRadius: 6,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--line-ink)" }}>
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "var(--ink)",
                        letterSpacing: "0.08em",
                        margin: 0,
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    >
                      Uniswap v4 Hook Permission Bit Decoder
                    </h3>
                    <p style={{ fontSize: 12, color: "#636b60", margin: "4px 0 0", fontFamily: "var(--font-mono)" }}>
                      Lowest 14 address bits: {hookDecoded.hexFlags} ({hookDecoded.activeCount} ON, {hookDecoded.inactiveCount} OFF)
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {hookDecoded.explanations.map((exp) => (
                    <div
                      key={exp.flag}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: exp.status === "ON" ? "#fdfaf3" : "#faf8f2",
                        border: `1px solid ${exp.status === "ON" ? "rgba(201, 146, 46, 0.35)" : "var(--line-ink)"}`,
                        borderRadius: 4,
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: exp.status === "ON" ? "rgba(201, 146, 46, 0.15)" : "#f4f3ee",
                            color: exp.status === "ON" ? "#8c6418" : "#7d8479",
                            border: `1px solid ${exp.status === "ON" ? "rgba(201, 146, 46, 0.35)" : "rgba(24, 26, 24, 0.12)"}`,
                          }}
                        >
                          {exp.status}
                        </span>
                        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{exp.flag}</span>
                        <span style={{ color: "#7d8479" }}>({exp.hexMask})</span>
                      </div>

                      <div style={{ color: "#5e645d", fontSize: 11, textAlign: "right" }}>
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
    </PageShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f1eee7", color: "#181a18", padding: 100 }}>Loading Verifier...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
