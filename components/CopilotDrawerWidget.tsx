"use client";

import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRight,
  Bot,
  Compass,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { IssuanceDraft, IssuanceDraftCard } from "./IssuanceDraftCard";

interface CopilotDrawerWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle?: () => void;
  onApplyDraft?: (draft: IssuanceDraft) => void;
  initialPrompt?: string;
  showLauncher?: boolean;
}

type Message = { role: "user" | "assistant"; content: string; source?: string };

const QUICK_DRAFTS = [
  {
    label: "Lithium Cathode ($LCAT)",
    prompt: "Draft Rail A issuance parameters for an EV Lithium Cathode Consortium with 1B supply.",
  },
  {
    label: "Dysprosium Magnet ($DYSP)",
    prompt: "Formulate issuance draft for Dysprosium rare earth magnet alloy with ultra-rare tier.",
  },
  {
    label: "Aerospace Scandium ($SCND)",
    prompt: "Draft parameters for Aerospace Scandium Alloy Syndicate paired with 2,000 sCRIT.",
  },
  {
    label: "Platinum Hydrogen ($PTCL)",
    prompt: "Draft issuance form for Platinum Clean Hydrogen Syndicate with 2.5% hook tax.",
  },
];

const THINK_STEPS = [
  "Analyzing mineral thesis...",
  "Evaluating reserve scarcity tier...",
  "Calculating 20% pool liquidity ratio...",
  "Synthesizing draft parameters...",
];

export function CopilotDrawerWidget({
  isOpen,
  onClose,
  onToggle,
  onApplyDraft,
  initialPrompt,
  showLauncher = true,
}: CopilotDrawerWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draftInput, setDraftInput] = useState("");
  const [pending, setPending] = useState(false);
  const [thinkIdx, setThinkIdx] = useState(0);
  const [notice, setNotice] = useState("");

  const transcriptRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Graceful mounting and unmounting lifecycle for spring exit animation
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  // Rotate thinking indicator
  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => {
      setThinkIdx((prev) => (prev + 1) % THINK_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [pending]);

  // Initial prompt trigger if provided when opening
  useEffect(() => {
    if (isOpen && initialPrompt && messages.length === 0) {
      void sendPrompt(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  async function sendPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setThinkIdx(0);
    setNotice("");

    const userMsg: Message = { role: "user", content: trimmed };
    const next = [...messages, userMsg].slice(-10);
    setMessages(next);
    setDraftInput("");

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.reply !== "string") {
        throw new Error(data.error || "Failed to contact copilot");
      }
      setMessages([...next, { role: "assistant", content: data.reply, source: data.source }]);
    } catch {
      setNotice("Copilot assistant is reconnecting. Please retry in a moment.");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendPrompt(draftInput);
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void sendPrompt(draftInput);
    }
  }

  // Parse markdown content and extract JSON issuance draft blocks
  function renderAssistantMessage(content: string) {
    const draftMatch = content.match(/```json:issuance_draft\s*([\s\S]*?)\s*```/);
    let parsedDraft: IssuanceDraft | null = null;
    let cleanText = content;

    if (draftMatch && draftMatch[1]) {
      try {
        parsedDraft = JSON.parse(draftMatch[1]) as IssuanceDraft;
        cleanText = content.replace(/```json:issuance_draft[\s\S]*?```/, "").trim();
      } catch {
        // ignore parse error and render raw
      }
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cleanText && (
          <div className="md-body" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            <Markdown remarkPlugins={[remarkGfm]}>{cleanText}</Markdown>
          </div>
        )}
        {parsedDraft && (
          <IssuanceDraftCard
            draft={parsedDraft}
            onApply={onApplyDraft}
            isInlineWidget={true}
          />
        )}
      </div>
    );
  }

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleLauncherClick = () => {
    if (onToggle) {
      onToggle();
    } else if (isOpen) {
      handleClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Floating Chat Window (Reference: aoksokqwosow.jpg) */}
      {isRendered && (
        <div
          className={`copilot-chat-window ${isClosing ? "is-closing" : "is-opening"}`}
          role="dialog"
          aria-modal="false"
          aria-label="sCRIT Support Chat & Issuance Assistant"
        >
          {/* Header Bar matching aoksokqwosow.jpg */}
          <div
            className="copilot-header"
            style={{
              padding: "12px 16px",
              background: "#fbfaf6",
              borderBottom: "1px solid rgba(24, 26, 24, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            {/* Left: Avatar + Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #f5d688 0%, #d4a737 50%, #b8860b 100%)",
                  color: "#111411",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: "0 2px 8px rgba(184, 134, 11, 0.28)",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={16} strokeWidth={2.4} color="#111411" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#181a18",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>sCRIT Copilot</span>
                </div>
                <div
                  className="mono-sm"
                  style={{ fontSize: 10, color: "#6e756b" }}
                >
                  AI Issuance Copilot · Real-Time Assistant
                </div>
              </div>
            </div>

            {/* Right: Reset + Close Button */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  title="Reset conversation"
                  aria-label="Reset conversation"
                  style={{
                    background: "rgba(24, 26, 24, 0.05)",
                    border: "1px solid rgba(24, 26, 24, 0.14)",
                    borderRadius: 6,
                    cursor: "pointer",
                    padding: "5px 7px",
                    color: "#181a18",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(24, 26, 24, 0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(24, 26, 24, 0.05)")}
                >
                  <RotateCcw size={13} color="#181a18" strokeWidth={2.2} />
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close Chat"
                style={{
                  background: "rgba(24, 26, 24, 0.05)",
                  border: "1px solid rgba(24, 26, 24, 0.14)",
                  borderRadius: 6,
                  cursor: "pointer",
                  padding: "5px 7px",
                  color: "#181a18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(24, 26, 24, 0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(24, 26, 24, 0.05)")}
              >
                <X size={15} strokeWidth={2.4} color="#181a18" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div
            className="copilot-quick-chips"
            style={{
              padding: "8px 12px",
              background: "#f8f6f0",
              borderBottom: "1px solid rgba(24, 26, 24, 0.06)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              overflowX: "auto",
              scrollbarWidth: "none",
              flexShrink: 0,
            }}
          >
            <Compass size={12} color="#8c6418" style={{ flexShrink: 0 }} />
            {QUICK_DRAFTS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={pending}
                onClick={() => void sendPrompt(q.prompt)}
                style={{
                  flexShrink: 0,
                  fontSize: 10.5,
                  fontFamily: "var(--font-mono)",
                  padding: "3px 8px",
                  borderRadius: 3,
                  border: "1px solid rgba(184, 134, 11, 0.25)",
                  background: "#ffffff",
                  color: "#252b24",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--signal)";
                  e.currentTarget.style.background = "#fdfbf6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(184, 134, 11, 0.25)";
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Chat Transcript Body */}
          <div
            ref={transcriptRef}
            className="copilot-transcript"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "#faf9f5",
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  margin: "auto",
                  maxWidth: 320,
                  textAlign: "center",
                  padding: "20px 14px",
                  background: "#ffffff",
                  border: "1px dashed rgba(24, 26, 24, 0.16)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#f4f1e6",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Bot size={18} color="#8c6418" />
                </div>
                <h4
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 16,
                    margin: "0 0 6px",
                    color: "#181a18",
                  }}
                >
                  How can Copilot assist you?
                </h4>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "#5b6257",
                    lineHeight: 1.5,
                    margin: "0 0 10px",
                  }}
                >
                  Ask to draft token parameters for your commodity reserve or query 9-commodity protocols.
                </p>
                <div
                  className="mono-sm"
                  style={{
                    fontSize: 9.5,
                    color: "#7a8274",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Zap size={11} color="#8c6418" /> All proposals land in draft state
                </div>
              </div>
            )}

            {messages.map((m, idx) =>
              m.role === "user" ? (
                <div
                  key={idx}
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "85%",
                    padding: "9px 13px",
                    borderRadius: "14px 14px 2px 14px",
                    background: "#181a18",
                    color: "#f5f2eb",
                    border: "1px solid rgba(24, 26, 24, 0.4)",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ) : (
                <div
                  key={idx}
                  style={{
                    alignSelf: "flex-start",
                    width: "100%",
                    borderRadius: 10,
                    background: "#ffffff",
                    border: "1px solid rgba(24, 26, 24, 0.1)",
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
                    padding: "12px 14px",
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {/* Assistant Identity Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid rgba(24, 26, 24, 0.06)",
                      paddingBottom: 7,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #f5d688 0%, #d4a737 50%, #b8860b 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Sparkles size={11} strokeWidth={2.4} color="#111411" />
                      </div>
                      <span
                        className="mono-sm"
                        style={{ fontSize: 11, fontWeight: 700, color: "#181a18" }}
                      >
                        sCRIT Copilot
                      </span>
                    </div>
                    <span
                      className="mono-sm"
                      style={{ fontSize: 9.5, color: "#7a8274" }}
                    >
                      Institutional Proposal
                    </span>
                  </div>

                  {renderAssistantMessage(m.content)}
                </div>
              )
            )}

            {pending && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "8px 12px",
                  borderRadius: "14px 14px 14px 2px",
                  background: "#ffffff",
                  border: "1px solid rgba(24, 26, 24, 0.12)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 4.5,
                        height: 4.5,
                        borderRadius: "50%",
                        background: "#b8860b",
                        animation: "bounceDot 1s infinite ease-in-out",
                        animationDelay: `${i * 0.16}s`,
                      }}
                    />
                  ))}
                </span>
                <span
                  className="mono-sm"
                  style={{ fontSize: 10.5, color: "#5b6257", fontWeight: 600 }}
                >
                  {THINK_STEPS[thinkIdx]}
                </span>
              </div>
            )}

            {notice && (
              <div
                style={{
                  padding: "8px 10px",
                  background: "#fef2f2",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  borderRadius: 4,
                  color: "#991b1b",
                  fontSize: 11.5,
                }}
              >
                {notice}
              </div>
            )}
          </div>

          {/* Footer Input Bar matching aoksokqwosow.jpg */}
          <form
            onSubmit={handleSubmit}
            className="copilot-footer"
            style={{
              padding: "10px 14px",
              background: "#ffffff",
              borderTop: "1px solid rgba(24, 26, 24, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={draftInput}
              onChange={(e) => setDraftInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: "8px 10px",
                fontSize: 12.5,
                borderRadius: 6,
                border: "1px solid rgba(24, 26, 24, 0.14)",
                background: "#faf9f5",
                color: "#181a18",
                outline: "none",
              }}
            />

            <button
              type="submit"
              disabled={!draftInput.trim() || pending}
              className="copilot-send-btn"
              aria-label="Send message"
            >
              <Send size={14} strokeWidth={2.4} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Pill Button matching Screenshot 2026-09-29 100657.png */}
      {showLauncher && (
        <button
          type="button"
          className={`copilot-floating-pill ${isOpen ? "is-open" : ""}`}
          onClick={handleLauncherClick}
          aria-label={isOpen ? "Close Copilot Chat" : "Open Copilot Chat"}
        >
          {isOpen ? (
            <X size={17} strokeWidth={2.6} />
          ) : (
            <MessageSquare size={17} strokeWidth={2.3} />
          )}
          <span className="copilot-floating-pill-text">
            {isOpen ? "Close Chat" : "Chat with Copilot"}
          </span>
        </button>
      )}
    </>,
    document.body
  );
}
