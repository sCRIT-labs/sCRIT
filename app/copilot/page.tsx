"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bot, Send } from "lucide-react";
import { PageShell } from "@/components/PageShell";

type Message = { role: "user" | "assistant"; content: string };

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const transcript = useRef<HTMLDivElement>(null);

  useEffect(() => { transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "smooth" }); }, [messages, pending]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending || content.length > 1200) return;
    const userMessage: Message = { role: "user", content };
    const next = [...messages, userMessage].slice(-12);
    setMessages(next);
    setDraft("");
    setPending(true);
    setNotice("");
    try {
      const response = await fetch("/api/copilot", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.reply !== "string") throw new Error(result.error ?? "copilot_unavailable");
      const answer: Message = { role: "assistant", content: result.reply };
      setMessages([...next, answer].slice(-12));
    } catch (error) {
      setNotice(error instanceof Error && error.message === "copilot_unavailable"
        ? "Copilot is offline. Its server-side LLM connection is not configured."
        : "The pilot explainer could not respond. Please try again later.");
      setMessages(next.slice(0, -1));
    } finally { setPending(false); }
  }

  return (
    <PageShell>
      <header className="scrit-reveal" style={{ maxWidth: 820, marginBottom: 28 }}>
        <p className="eyebrow">sCRIT · Pilot explainer</p>
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(34px, 4.5vw, 56px)", fontWeight: 600, letterSpacing: "-0.02em", margin: "12px 0 16px", lineHeight: 1.1 }}>
          Ask what the pilot<br /><em>does and does not do.</em>
        </h1>
        <p style={{ color: "var(--parchment-dim)", fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          Answers are generated from the documented pilot design. Questions are sent to the configured model provider and are not stored by this app. Do not enter personal details, wallet secrets, or seed phrases. The explainer is not trading, investment, tax, or legal advice.
        </p>
      </header>

      <section className="panel scrit-reveal" aria-label="sCRIT pilot explainer" style={{ maxWidth: 920, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <Bot size={18} color="var(--gold-bright)" />
          <div><b style={{ display: "block" }}>Pilot knowledge only</b><span className="mono-sm">No market feed · no wallet access · no transaction signing</span></div>
        </div>
        <div ref={transcript} aria-live="polite" style={{ minHeight: 280, maxHeight: "min(58vh, 620px)", overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.length === 0 && <div className="proof-empty" style={{ margin: 0 }}><Bot /><div><b>Start with a question</b><span>For example: “Does an attestation prove there is metal in a vault?”</span></div></div>}
          {messages.map((message, index) => <article key={`${index}-${message.role}`} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "min(88%, 700px)", padding: "13px 16px", borderRadius: 12, background: message.role === "user" ? "rgba(217,169,46,.14)" : "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.1)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{message.content}</article>)}
          {pending && <p className="mono-sm" style={{ margin: 0 }}>Checking the documented pilot facts…</p>}
          {notice && <p role="status" style={{ color: "#fca5a5", margin: 0 }}>{notice}</p>}
        </div>
        <form onSubmit={send} style={{ display: "flex", gap: 10, padding: 18, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <input className="field" aria-label="Ask about the sCRIT pilot" placeholder="Ask about the pilot…" value={draft} maxLength={1200} onChange={(e) => setDraft(e.target.value)} disabled={pending} />
          <button className="btn btn-gold" type="submit" disabled={pending || !draft.trim()} aria-label="Send question"><Send size={15} /></button>
        </form>
      </section>
      <p className="mono-sm" style={{ maxWidth: 920, marginTop: 12 }}><a href="/proof" style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>Open the pilot evidence ledger <ArrowUpRight size={13} /></a> · Check the underlying record and its source directly.</p>
    </PageShell>
  );
}
