import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { consumeApRateLimit } from "@/lib/db";

const MAX_BODY = 16 * 1024;
const SYSTEM = `You are the sCRIT pilot explainer. Answer from the facts below; if something is not established, say so plainly. Never invent reserve holdings, prices, partners, audits, approvals, or contract capabilities. Do not recommend buying, selling, or trading any asset. Do not give legal, tax, or investment advice. Keep answers concise and reply in the user's language.

Established software facts:
- This is experimental pilot software. sCRIT has no peg and no physical redemption in the pilot.
- Basket is a design target only: Au 60%, Ag 25%, Pt 15%; lithium and other classes are excluded.
- Commodity price inputs are manual. They are not a live oracle; values older than 24 hours are stale.
- Attestation records are EIP-712 signed and checked by an off-chain service against a registered key and scope. They do not independently prove physical delivery and are not on-chain reserve accounting.
- Current sCRIT token supply is fixed in its deployed token contract. It is not minted by reserve attestations.
- Rail A creates a fixed-supply project token and TOKEN/sCRIT pool. The launcher checks its on-chain issuer allowlist. There is no Rail A issuance fee and project-pool swap tax is 0% in the pilot.
- A proposed 2.5% swap tax and 75/25 split are inactive. No fee automatically purchases metal.
- Rail B, redemption, an on-chain reserve manager, a pool tax hook, an event indexer, contracted custody, physical audit, and independent contract audit are not established by this repository.
- OJK/regulatory status for this specific product has not been determined. Direct questions to qualified counsel and never imply approval.

If asked for a figure, distinguish a service-reported estimate from market price or redemption value. If current data is needed, say the live proof page is the source of records and that its manual inputs may be missing or stale.`;

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const url = process.env.LLM_API_URL;
  const key = process.env.LLM_API_KEY;
  if (!url || !key) return NextResponse.json({ error: "copilot_unavailable" }, { status: 503 });
  const pepper = process.env.AP_RATE_LIMIT_SECRET || process.env.ADMIN_KEY;
  if (!pepper || pepper.length < 32) return NextResponse.json({ error: "rate_limit_unconfigured" }, { status: 503 });
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 120);
  const fingerprint = createHmac("sha256", pepper).update(`copilot:${ip}`).digest("hex");
  try {
    if (!(await consumeApRateLimit(fingerprint))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
  const length = Number(req.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  let raw = "";
  try { raw = await req.text(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  if (!raw || raw.length > MAX_BODY) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  let body: unknown;
  try { body = JSON.parse(raw) as unknown; } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const rawMessages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0 || rawMessages.length > 12) return NextResponse.json({ error: "bad_messages" }, { status: 400 });
  const messages: Message[] = [];
  for (const item of rawMessages) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return NextResponse.json({ error: "bad_messages" }, { status: 400 });
    const message = item as Record<string, unknown>;
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string" ||
        message.content.trim().length === 0 || message.content.length > 1200) return NextResponse.json({ error: "bad_messages" }, { status: 400 });
    messages.push({ role: message.role, content: message.content.trim() });
  }
  if (messages[messages.length - 1]?.role !== "user") return NextResponse.json({ error: "bad_messages" }, { status: 400 });
  const endpoint = url.endsWith("/chat/completions") ? url : `${url.replace(/\/$/, "")}/chat/completions`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.LLM_MODEL || "mimo-v2.5", messages: [{ role: "system", content: SYSTEM }, ...messages], temperature: 0.2, max_tokens: 700 }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "copilot_upstream_unavailable" }, { status: 502 });
    const result: unknown = await response.json();
    const content = typeof result === "object" && result !== null && Array.isArray((result as { choices?: unknown }).choices)
      ? (result as { choices: { message?: { content?: unknown } }[] }).choices[0]?.message?.content
      : null;
    if (typeof content !== "string" || content.trim().length === 0) return NextResponse.json({ error: "copilot_empty_response" }, { status: 502 });
    return NextResponse.json({ reply: content.slice(0, 5000) });
  } catch {
    return NextResponse.json({ error: "copilot_upstream_unavailable" }, { status: 502 });
  }
}
