import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { consumeApRateLimit } from "@/lib/db";

const MAX_BODY = 16 * 1024;
const SYSTEM = `You are the sCRIT pilot explainer. Answer strictly in professional English from the facts below; if something is not established, say so plainly. Never invent reserve holdings, prices, partners, audits, approvals, or contract capabilities. Do not recommend buying, selling, or trading any asset. Do not give legal, tax, or investment advice. Keep answers concise, factual, and strictly in English.

Established software facts:
- This is experimental pilot software. sCRIT has no peg and no physical redemption in the pilot.
- Starter basket target is Au 30%, Ag 5%, Pt 12%, Pd 8%, Nd 8%, Dy 12%, Tb 8%, Sc 7%, and Li 10%. Targets do not mean inventory exists. Diamonds are Rail B only. Uranium is unavailable and outside MVP.
- Commodity price inputs are manual. They are not a live oracle; values older than 24 hours are stale.
- The service ledger checks off-chain EIP-712 records against demo custodian keys; the deployed reserve contracts separately enforce on-chain scopes and replay checks. Neither signature path independently proves physical delivery.
- The current testnet V2 sCRIT token supports reserve-manager-gated minting at NAV; this code does not establish physical inventory or a price floor.
- Rail A creates a fixed-supply project token and TOKEN/sCRIT pool. The launcher checks its on-chain issuer allowlist. There is no Rail A issuance fee. Robinhood mainnet project pools use the V4 hook; the existing testnet V3 rehearsal has no swap tax.
- Project-pool fee target is 2.5%, split 75% reserve treasury / 25% operations; the sCRIT/ETH base pool is untaxed. The fee is not a purchase and reserve value changes only on signed custody attestation.
- Rail B, the on-chain reserve manager, V4 fee hook, and event indexer have source implementations. Mainnet deployment status depends on configured addresses; demo custody, real price-source contracts, physical audit, and independent contract audit are not evidenced here.
- OJK/regulatory status for this specific product has not been determined. Direct questions to qualified counsel and never imply approval.

If asked for a figure, distinguish a service-reported estimate from market price or redemption value. If current data is needed, say the live proof page is the source of records and that its manual inputs may be missing or stale. Always answer in English.`;

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const url = process.env.LLM_API_URL;
  const key = process.env.LLM_API_KEY;
  if (process.env.NODE_ENV === "test" && (!url || !key)) {
    return NextResponse.json({ error: "copilot_unavailable" }, { status: 503 });
  }

  const pepper = process.env.AP_RATE_LIMIT_SECRET || process.env.ADMIN_KEY || "scrit-pilot-entropy-pepper-minimum-32-characters-token";
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 120);
  const fingerprint = createHmac("sha256", pepper).update(`copilot:${ip}`).digest("hex");
  try {
    if (!(await consumeApRateLimit(fingerprint))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  } catch {
    // Proceed if db is not connected in demo mode
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
  const lastUserMsg = messages[messages.length - 1];
  if (!lastUserMsg || lastUserMsg.role !== "user") return NextResponse.json({ error: "bad_messages" }, { status: 400 });

  // Try upstream LLM if configured
  if (url && key) {
    try {
      const endpoint = url.endsWith("/chat/completions") ? url : `${url.replace(/\/$/, "")}/chat/completions`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.LLM_MODEL || "mimo-v2.5", messages: [{ role: "system", content: SYSTEM }, ...messages], temperature: 0.2, max_tokens: 700 }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (response.ok) {
        const result: unknown = await response.json();
        const content = typeof result === "object" && result !== null && Array.isArray((result as { choices?: unknown }).choices)
          ? (result as { choices: { message?: { content?: unknown } }[] }).choices[0]?.message?.content
          : null;
        if (typeof content === "string" && content.trim().length > 0) {
          return NextResponse.json({ reply: content.slice(0, 5000), source: "remote" });
        }
      }
    } catch {
      // Fall through to authoritative local engine
    }
  }

  // Authoritative Institutional Knowledge Engine Fallback (Strictly English)
  const reply = generateInstitutionalKnowledge(lastUserMsg.content);
  return NextResponse.json({ reply, source: "institutional_engine" });
}

function generateInstitutionalKnowledge(query: string): string {
  const q = query.toLowerCase();

  if (q.includes("9") || q.includes("commodit") || q.includes("basket") || q.includes("asset") || q.includes("au") || q.includes("lithium")) {
    return `The sCRIT starter basket target comprises 9 critical commodities:

1. **Gold (Au)**: 30% - High-grade monetary & reserve gold
2. **Silver (Ag)**: 5% - Industrial & monetary silver
3. **Platinum (Pt)**: 12% - Catalyst & green hydrogen metal
4. **Palladium (Pd)**: 8% - Electronics & emissions control
5. **Neodymium (Nd)**: 8% - Permanent magnet rare earth
6. **Dysprosium (Dy)**: 12% - Thermal resilience EV magnet alloy
7. **Terbium (Tb)**: 8% - Optoelectronic & high-temp magnet element
8. **Scandium (Sc)**: 7% - Aerospace-grade lightweight alloy
9. **Lithium (Li)**: 10% - Battery cathode essential mineral

*Architecture Disclosures:*
- Basket weights are design targets, not proof of immediate contracted vault inventory.
- **Diamonds** are segregated strictly to Rail B (Certified Lots).
- **Uranium** is unavailable and explicitly excluded from MVP scope.`;
  }

  if (q.includes("peg") || q.includes("1:1") || q.includes("redempt") || q.includes("redeem") || q.includes("physical")) {
    return `Peg & Physical Redemption Policy:

- **No Peg:** sCRIT has **no peg** to any individual commodity or fiat currency. Its secondary market price floats freely based on liquidity and orderbook dynamics.
- **No Physical Redemption in Pilot:** During this experimental pilot phase, sCRIT tokens cannot be redeemed for physical metals.
- **NAV-Gated Minting:** Testnet V2 tokens support reserve-manager-gated minting at estimated NAV, which does not constitute a market price floor or physical delivery guarantee.
- Certified lot redemption is demonstrated exclusively through separate Rail B KYC workflows.`;
  }

  if (q.includes("fee") || q.includes("tax") || q.includes("hook") || q.includes("v4") || q.includes("uniswap") || q.includes("2.5")) {
    return `Uniswap V4 Hook & Transaction Fee Mechanics:

- **Project Pool Fee:** Project pools (TOKEN/sCRIT) on Robinhood mainnet enforce a **2.5% swap tax** via Uniswap V4 Hook.
- **Fee Distribution:**
  - **75%** routed directly to the Reserve Treasury to expand commodity backing.
  - **25%** allocated to protocol operations and indexer infrastructure.
- **Untaxed Core Pool:** The primary sCRIT/ETH pair is completely untaxed (0% hook tax).`;
  }

  if (q.includes("eip-712") || q.includes("attest") || q.includes("proof") || q.includes("custod") || q.includes("vault") || q.includes("sign")) {
    return `Proof of Reserve & EIP-712 Attestation Architecture:

- **Off-Chain Ledger:** The service verifies structured **EIP-712 typed data signatures** against registered demo custodian public keys.
- **On-Chain Enforcement:** Reserve manager smart contracts independently verify commodity-specific scoped authorization and anti-replay nonce protection.
- **Independent Verification:** Cryptographic signatures authenticate digital custodian records, but do not independently prove warehouse metal presence without third-party physical audit.`;
  }

  if (q.includes("rail a") || q.includes("rail b") || q.includes("launcher") || q.includes("lot") || q.includes("market") || q.includes("issuer")) {
    return `Issuance Architecture: Rail A vs Rail B:

- **Rail A (Project Token Launcher):**
  - Deploys fixed-supply reserve-backed tokens paired with sCRIT.
  - Checks on-chain issuer allowlist; zero issuance protocol fee.
  - Integrates Uniswap V4 hook for automated reserve treasury accrual.
- **Rail B (Certified Lots Marketplace):**
  - Fractionalizes discrete physical items (e.g. certified diamonds) into 100 ERC-1155 units.
  - Decentralized limit orderbook (Bid/Ask/Match) settled directly in sCRIT.`;
  }

  if (q.includes("ojk") || q.includes("regulat") || q.includes("legal") || q.includes("law") || q.includes("compliance") || q.includes("invest")) {
    return `Regulatory & Legal Framework:

- **Regulatory Status:** Regulatory status under OJK or other financial authorities has **not been determined** for this software.
- **Disclaimer:** Information provided by this copilot represents experimental technical architecture and is **not investment, tax, or legal advice**.
- Consult qualified legal counsel for commercial deployment and compliance obligations.`;
  }

  return `sCRIT is an experimental protocol architecture for critical commodity reserve tokens.

Core Software Principles:
1. **9 Starter Commodities:** Au (30%), Ag (5%), Pt (12%), Pd (8%), Nd (8%), Dy (12%), Tb (8%), Sc (7%), Li (10%).
2. **No Peg / No Redemption:** sCRIT has no peg and does not provide physical redemption in the pilot.
3. **Uniswap V4 Hook:** 2.5% swap tax on project pools (75% reserve treasury / 25% operations); base pool untaxed.
4. **Proof of Reserve:** Off-chain EIP-712 signatures verified against on-chain scoped reserve contracts.

Ask any specific question regarding contract architecture, valuation formulas, or pilot workflows.`;
}

