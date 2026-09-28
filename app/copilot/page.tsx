"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUpRight,
  Bot,
  Check,
  Compass,
  Copy,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";

type Message = { role: "user" | "assistant"; content: string; source?: string };

const SUGGESTED_PROMPTS = [
  {
    label: "9 Critical Commodities",
    query: "What are the 9 critical commodities in the sCRIT starter basket and their target allocations?",
  },
  {
    label: "Peg & Redemption Policy",
    query: "Is sCRIT pegged 1:1 to physical gold and can it be physically redeemed in this pilot?",
  },
  {
    label: "2.5% Uniswap V4 Fee",
    query: "How does the 2.5% swap fee Uniswap V4 hook operate and how is it distributed?",
  },
  {
    label: "EIP-712 Verification",
    query: "How does EIP-712 typed data verification work for sCRIT custody attestations?",
  },
  {
    label: "Rail A vs Rail B",
    query: "What is the architectural difference between Rail A token launcher and Rail B certified lots?",
  },
  {
    label: "Regulatory Framework",
    query: "What is the regulatory compliance and legal status of the sCRIT protocol?",
  },
];

const THINK_STEPS = [
  "Analyzing query…",
  "Checking 9-commodity parameters…",
  "Verifying EIP-712 attestation rules…",
  "Inspecting Uniswap V4 hook specs…",
  "Synthesizing institutional facts…",
];

const TYPE_STEP = 12;
const TYPE_MS = 14;
const THINK_MS = 2200;

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [thinkIdx, setThinkIdx] = useState(0);
  const [reveal, setReveal] = useState<{ i: number; n: number } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const transcript = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef(false);

  // Auto-scroll when messages update or typewriter streams
  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, reveal]);

  // Rotate thinking status while waiting
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => {
      setThinkIdx((i) => (i + 1) % THINK_STEPS.length);
    }, THINK_MS);
    return () => clearTimeout(id);
  }, [pending, thinkIdx]);

  // Progressive typewriter animation
  useEffect(() => {
    if (!reveal) return;
    const id = setTimeout(() => {
      setReveal((r) => {
        if (!r) return r;
        const full = messages[r.i]?.content ?? "";
        return r.n >= full.length ? null : { i: r.i, n: r.n + TYPE_STEP };
      });
    }, TYPE_MS);
    return () => clearTimeout(id);
  }, [reveal, messages]);

  // Auto-grow textarea height
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.overflowY = "hidden";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    if (el.scrollHeight > 120) el.style.overflowY = "auto";
  }, [draft]);

  function visibleText(msg: Message, idx: number): string {
    if (reveal && reveal.i === idx) return msg.content.slice(0, reveal.n);
    return msg.content;
  }

  async function askQuestion(content: string) {
    const text = content.trim();
    if (!text || pending || pendingRef.current || text.length > 1200) return;
    pendingRef.current = true;
    setPending(true);
    setThinkIdx(0);
    setNotice("");

    const userMessage: Message = { role: "user", content: text };
    const next = [...messages, userMessage].slice(-12);
    setMessages(next);
    setDraft("");

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.reply !== "string") {
        throw new Error(result.error ?? "copilot_unavailable");
      }
      const answer: Message = { role: "assistant", content: result.reply, source: result.source };
      const updatedMessages = [...next, answer].slice(-12);
      setMessages(updatedMessages);
      // Initiate progressive typewriter reveal
      setReveal({ i: updatedMessages.length - 1, n: TYPE_STEP });
    } catch {
      setNotice("The pilot explainer is reconnecting. Please try again in a moment.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askQuestion(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void askQuestion(draft);
    }
  }

  function resetChat() {
    setReveal(null);
    setMessages([]);
    setNotice("");
    setDraft("");
  }

  function copyMessage(text: string, idx: number) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(text).then(
      () => {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx((curr) => (curr === idx ? null : curr)), 1800);
      },
      () => undefined
    );
  }

  return (
    <PageShell>
      <header className="proof-page-head scrit-reveal" style={{ maxWidth: 880, marginBottom: 32 }}>
        <p className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={13} color="var(--signal)" /> sCRIT PROTOCOL · PILOT RESEARCH COPILOT
        </p>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(34px, 4.5vw, 56px)",
            fontWeight: 450,
            letterSpacing: "-0.035em",
            margin: "14px 0 16px",
            lineHeight: 1.08,
            color: "var(--ink)",
          }}
        >
          Documented facts,<br /><em>and transparent boundaries.</em>
        </h1>
        <p style={{ color: "#5a6158", fontSize: 15, lineHeight: 1.65, margin: 0, maxWidth: 740 }}>
          This protocol intelligence copilot presents objective architectural and contract facts. Answers are derived from verified tokenomics, 9-commodity reserve targets, EIP-712 custody records, and Uniswap V4 Hook mechanics. Does not provide investment, legal, or tax advice.
        </p>
      </header>

      {/* Suggested Questions Grid */}
      <section className="scrit-reveal" aria-label="Suggested Prompt Chips" style={{ maxWidth: 960, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Compass size={14} color="var(--moss)" />
          <span className="mono-sm" style={{ fontWeight: 600, color: "#6c7368", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Popular Research Topics:
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={pending}
              onClick={() => void askQuestion(p.query)}
              className="launch-chip-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                fontSize: 12,
                borderRadius: 4,
                border: "1px solid rgba(24, 26, 24, 0.16)",
                background: "#ffffff",
                color: "#252b24",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--signal)";
                e.currentTarget.style.background = "#fdfbf5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(24, 26, 24, 0.16)";
                e.currentTarget.style.background = "#ffffff";
              }}
            >
              <span>{p.label}</span>
              <ArrowUpRight size={12} color="#8c6418" />
            </button>
          ))}
        </div>
      </section>

      {/* Main Chat Panel */}
      <section
        className="panel scrit-reveal"
        aria-label="sCRIT pilot explainer console"
        style={{
          maxWidth: 960,
          padding: 0,
          overflow: "hidden",
          background: "#ffffff",
          border: "1px solid var(--line-ink)",
          borderRadius: 4,
          boxShadow: "0 12px 36px rgba(24, 26, 24, 0.05)",
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            background: "#f9f8f4",
            borderBottom: "1px solid rgba(24, 26, 24, 0.1)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#2e7d32",
                boxShadow: "0 0 8px rgba(46, 125, 50, 0.5)",
              }}
            />
            <div>
              <b style={{ display: "block", fontSize: 13.5, color: "var(--ink)", fontWeight: 650 }}>
                Pilot Knowledge Engine Active
              </b>
              <span className="mono-sm" style={{ fontSize: 11, color: "#6e756b" }}>
                9 Critical Commodities · EIP-712 Proof · Uniswap V4 Hook
              </span>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={resetChat}
              className="btn btn-ghost"
              style={{
                minHeight: 32,
                padding: "4px 12px",
                fontSize: 11.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 3,
                borderColor: "rgba(24,26,24,0.18)",
              }}
            >
              <RotateCcw size={12} />
              Reset Conversation
            </button>
          )}
        </div>

        {/* Message Transcript */}
        <div
          ref={transcript}
          aria-live="polite"
          style={{
            minHeight: 340,
            maxHeight: "min(62vh, 640px)",
            overflowY: "auto",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            background: "#faf9f5",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                margin: "30px auto",
                maxWidth: 580,
                textAlign: "center",
                padding: "36px 24px",
                background: "#ffffff",
                border: "1px dashed rgba(24, 26, 24, 0.2)",
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#f4f1e6",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <Bot size={24} color="#8c6418" />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  fontWeight: 500,
                  margin: "0 0 8px",
                  color: "var(--ink)",
                }}
              >
                Explore sCRIT Protocol Parameters
              </h3>
              <p style={{ fontSize: 13, color: "#61685e", lineHeight: 1.6, margin: "0 0 20px" }}>
                Select a topic above or ask specific questions regarding the 9-commodity allocation, NAV pricing formulas, vault proofs, or Uniswap V4 swap fee distribution.
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "#798075",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <ShieldCheck size={14} color="#536753" /> Answers verified against official smart contract specifications
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <article
              key={`${index}-${message.role}`}
              style={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: message.role === "user" ? "min(82%, 620px)" : "min(92%, 760px)",
                padding: message.role === "user" ? "14px 18px" : "18px 22px",
                borderRadius: 4,
                background: message.role === "user" ? "#fbf3de" : "#ffffff",
                border:
                  message.role === "user"
                    ? "1px solid rgba(184, 134, 11, 0.3)"
                    : "1px solid rgba(24, 26, 24, 0.12)",
                boxShadow:
                  message.role === "user"
                    ? "0 2px 8px rgba(184, 134, 11, 0.08)"
                    : "0 4px 14px rgba(24, 26, 24, 0.04)",
                color: "var(--ink)",
                lineHeight: 1.65,
                fontSize: 13.5,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  borderBottom: "1px solid",
                  borderColor:
                    message.role === "user"
                      ? "rgba(184, 134, 11, 0.15)"
                      : "rgba(24, 26, 24, 0.07)",
                  paddingBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {message.role === "user" ? (
                    <>
                      <User size={12} color="#785208" />
                      <span className="mono-sm" style={{ fontWeight: 700, color: "#785208", fontSize: 10 }}>
                        USER
                      </span>
                    </>
                  ) : (
                    <>
                      <Bot size={13} color="var(--moss)" />
                      <span className="mono-sm" style={{ fontWeight: 700, color: "var(--moss)", fontSize: 10 }}>
                        sCRIT RESEARCH COPILOT
                      </span>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {message.role === "assistant" && (
                    <>
                      <span className="mono-sm" style={{ fontSize: 9.5, color: "#8b9286" }}>
                        {message.source === "remote" ? "Verified AI Engine" : "Verified Institutional Rules"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyMessage(message.content, index)}
                        title="Copy message to clipboard"
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(24,26,24,0.12)",
                          borderRadius: 3,
                          padding: "2px 6px",
                          fontSize: 10,
                          fontFamily: "var(--font-mono)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: copiedIdx === index ? "#2e7d32" : "#6c7368",
                        }}
                      >
                        {copiedIdx === index ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedIdx === index ? "Copied" : "Copy"}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {message.role === "assistant" ? (
                <div className="md-body">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {visibleText(message, index)}
                  </Markdown>
                </div>
              ) : (
                <p style={{ margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {message.content}
                </p>
              )}
            </article>
          ))}

          {/* Thinking animation state with bouncing gold dots */}
          {pending && (
            <div
              style={{
                alignSelf: "flex-start",
                padding: "12px 18px",
                borderRadius: 4,
                background: "#ffffff",
                border: "1px solid rgba(24, 26, 24, 0.12)",
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 4px 16px rgba(24, 26, 24, 0.04)",
              }}
              role="status"
              aria-label={`Copilot is thinking: ${THINK_STEPS[thinkIdx]}`}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#b8860b",
                      animation: "bounceDot 1s infinite ease-in-out",
                      animationDelay: `${d * 0.18}s`,
                    }}
                  />
                ))}
              </span>
              <span key={thinkIdx} className="mono-sm" style={{ fontSize: 12, fontWeight: 600, color: "#536753" }}>
                {THINK_STEPS[thinkIdx]}
              </span>
            </div>
          )}

          {notice && (
            <div
              role="status"
              style={{
                padding: "12px 16px",
                borderRadius: 4,
                background: "#fdf2f2",
                border: "1px solid rgba(220, 38, 38, 0.25)",
                color: "#991b1b",
                fontSize: 12.5,
              }}
            >
              {notice}
            </div>
          )}
        </div>

        {/* Input Bar Form with Auto-grow Textarea */}
        <form
          onSubmit={handleFormSubmit}
          style={{
            display: "flex",
            gap: 12,
            padding: "16px 24px",
            background: "#ffffff",
            borderTop: "1px solid rgba(24, 26, 24, 0.1)",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "#ffffff",
              border: "1.5px solid rgba(24, 26, 24, 0.2)",
              borderRadius: 3,
              padding: "4px 12px",
              minHeight: 46,
              transition: "border-color 0.18s ease",
            }}
          >
            <textarea
              ref={areaRef}
              rows={1}
              maxLength={1200}
              value={draft}
              placeholder="Ask about 9-commodity parameters, peg, V4 fee, or EIP-712… (Enter to send, Shift+Enter for newline)"
              aria-label="Ask about the sCRIT pilot"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={pending}
              style={{
                width: "100%",
                resize: "none",
                border: "none",
                background: "transparent",
                outline: "none",
                padding: "8px 0",
                fontSize: 13.5,
                color: "var(--ink)",
                lineHeight: 1.5,
                fontFamily: "inherit",
              }}
            />
          </div>
          <button
            className="btn btn-gold"
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label="Send question"
            style={{
              height: 46,
              padding: "0 22px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 3,
              fontWeight: 650,
              cursor: pending || !draft.trim() ? "not-allowed" : "pointer",
            }}
          >
            <span>Send</span>
            <Send size={14} />
          </button>
        </form>
      </section>

      {/* Navigation Footnotes */}
      <footer
        style={{
          maxWidth: 960,
          marginTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <p className="mono-sm" style={{ margin: 0, color: "#6b7267", fontSize: 11.5 }}>
          <a
            href="/proof"
            style={{
              display: "inline-flex",
              gap: 5,
              alignItems: "center",
              color: "var(--ink)",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            Open Pilot Evidence Ledger <ArrowUpRight size={13} />
          </a>{" "}
          · Check underlying on-chain records and custodian signatures directly.
        </p>
        <div style={{ display: "inline-flex", gap: 14, fontSize: 11.5 }}>
          <a href="/launch" style={{ color: "#785208", fontWeight: 600, textDecoration: "none" }}>
            Launchpad Rail A →
          </a>
          <a href="/lots" style={{ color: "var(--moss)", fontWeight: 600, textDecoration: "none" }}>
            Orderbook Rail B →
          </a>
        </div>
      </footer>
    </PageShell>
  );
}
