import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { consumeApRateLimit } from "@/lib/db";

const MAX_BODY = 16 * 1024;
const SYSTEM = `You are the sCRIT Institutional Copilot: Pilot Explainer and Issuance Form Drafting Assistant for Rail A Launchpad.

Your capabilities:
1. PROTOCOL KNOWLEDGE: Answer architectural facts about the 9-commodity starter basket, EIP-712 custody proofs, Uniswap V4 hook mechanics (2.5% tax, 75% reserve / 25% ops), and transparency limits.
2. ISSUANCE FORM ASSISTANT: Guide issuers in formulating token draft parameters for Rail A Launchpad (Token Name, Symbol, Total Supply, Initial Pooled Tokens, Initial sCRIT deposit, and Thesis).

CRITICAL RULE:
All issuance parameter proposals must land in a human-reviewed draft state, never auto-submit.

When drafting or suggesting token parameters, you MUST include a JSON draft block formatted exactly like this:
\`\`\`json:issuance_draft
{
  "name": "Token Name",
  "ticker": "SYMBOL",
  "supply": "1000000000",
  "pooled": "200000000",
  "scritAmt": "1000",
  "description": "Project thesis description",
  "commodityTier": "Rare",
  "scarcityThreshold": "1,000 - 10,000 t/yr",
  "rationale": "Architectural rationale"
}
\`\`\`

Scarcity Tiers:
- Standard: >= 10,000 t annual world production
- Rare: 1,000 - 10,000 t annual world production (e.g. Gold, Lithium battery minerals)
- Ultra Rare: < 1,000 t annual world production (e.g. Platinum, Palladium, Dysprosium, Scandium)

Tax Disclosure:
Every project pool on Robinhood mainnet charges a 2.5% swap tax (75% reserve treasury, 25% protocol operations).

Established software facts:
- This is experimental pilot software. sCRIT has no peg and no physical redemption in the pilot.
- Starter basket target is Au 30%, Ag 5%, Pt 12%, Pd 8%, Nd 8%, Dy 12%, Tb 8%, Sc 7%, and Li 10%.
- Diamonds are Rail B only. Uranium is excluded from MVP scope.
- Do not give legal, tax, or investment advice. Do not use any emojis in your response.`;

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
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "mimo-v2.5",
          messages: [{ role: "system", content: SYSTEM }, ...messages],
          temperature: 0.2,
          max_tokens: 1200,
        }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (response.ok) {
        const result: unknown = await response.json();
        const content = typeof result === "object" && result !== null && Array.isArray((result as { choices?: unknown }).choices)
          ? (result as { choices: { message?: { content?: unknown } }[] }).choices[0]?.message?.content
          : null;
        if (typeof content === "string" && content.trim().length > 0) {
          return NextResponse.json({ reply: content.slice(0, 8000), source: "remote" });
        }
      }
    } catch {
      // Fall through to authoritative local engine
    }
  }

  // Authoritative Institutional Knowledge Engine Fallback
  const reply = generateInstitutionalKnowledge(lastUserMsg.content);
  return NextResponse.json({ reply, source: "institutional_engine" });
}

function generateInstitutionalKnowledge(query: string): string {
  const q = query.toLowerCase();

  // 1. ISSUANCE DRAFTING INTENTS
  const isDraftingIntent =
    q.includes("draft") ||
    q.includes("issuan") ||
    q.includes("launch") ||
    q.includes("create") ||
    q.includes("token") ||
    q.includes("form") ||
    q.includes("bikin") ||
    q.includes("buat") ||
    q.includes("parameter") ||
    q.includes("proposal") ||
    q.includes("baterai") ||
    q.includes("battery") ||
    q.includes("cathode") ||
    q.includes("lithium") ||
    q.includes("nikel") ||
    q.includes("nickel") ||
    q.includes("dysprosium") ||
    q.includes("scandium") ||
    q.includes("platinum") ||
    q.includes("rare earth") ||
    q.includes("syndicate");

  if (isDraftingIntent) {
    if (q.includes("lithium") || q.includes("baterai") || q.includes("battery") || q.includes("cathode") || q.includes("lcat") || q.includes("nikel") || q.includes("nickel")) {
      return `Issuance Parameter Formulation for Battery Cathode Mineral Syndicate:

Based on the protocol tier specification and issuance parameters, this proposal targets high-purity lithium and nickel refining reserves supporting electric vehicle energy storage.

Architecture Parameters:
- **Scarcity Tier:** Rare (Annual global production 1,000 - 10,000 t for battery-grade refined precursor salts).
- **Liquidity Ratio:** 20% initial pool reserve paired against sCRIT base reserve.
- **Hook Fee:** 2.5% swap tax routed 75% to sCRIT Reserve Treasury and 25% to protocol operations.
- **Human Review Notice:** This draft is ready for review. Output will populate the Launchpad form in draft state without executing on-chain.

\`\`\`json:issuance_draft
{
  "name": "Lithium Cathode Consortium",
  "ticker": "LCAT",
  "supply": "1000000000",
  "pooled": "200000000",
  "scritAmt": "1000",
  "description": "Reserve-paired mineral syndicate tokenizing battery-grade lithium and cathode precursors. Paired continuously with sCRIT liquidity pool.",
  "commodityTier": "Rare",
  "scarcityThreshold": "1,000 - 10,000 t/yr",
  "rationale": "High-demand EV transition metal with verifiable processing assay certificates."
}
\`\`\`

Click "Apply to Launch Form" below to populate these parameters into your launchpad workspace. All values remain fully editable.`;
    }

    if (q.includes("dysprosium") || q.includes("magnet") || q.includes("rare earth") || q.includes("dysp") || q.includes("neodymium")) {
      return `Issuance Parameter Formulation for Heavy Rare Earth Magnet Alloy:

Dysprosium (Dy) is one of the most critical elements in the sCRIT starter basket (12% target weight), vital for thermal resilience in EV traction motor permanent magnets.

Architecture Parameters:
- **Scarcity Tier:** Ultra Rare (< 1,000 t annual world production; extremely tight global refining supply).
- **Liquidity Ratio:** 15% initial pool allocation paired against 1,500 sCRIT.
- **Hook Fee:** 2.5% swap tax with 75% reinvestment into critical mineral treasury.
- **Review Requirement:** Parameters are prepared in compliant draft format.

\`\`\`json:issuance_draft
{
  "name": "Dysprosium Magnet Alloy",
  "ticker": "DYSP",
  "supply": "500000000",
  "pooled": "75000000",
  "scritAmt": "1500",
  "description": "Heavy rare earth syndicate backing high-temperature dysprosium-neodymium permanent magnet alloys.",
  "commodityTier": "Ultra Rare",
  "scarcityThreshold": "< 1,000 t/yr",
  "rationale": "Critical component for EV traction motors and wind turbine direct-drive generators."
}
\`\`\`

Review the parameters in the draft card below. You can apply them directly to the Launchpad form.`;
    }

    if (q.includes("scandium") || q.includes("aerospace") || q.includes("scnd") || q.includes("alloy")) {
      return `Issuance Parameter Formulation for Aerospace Scandium Syndicate:

Scandium (Sc) represents 7% of the sCRIT reserve index, prized for lightweight high-strength scandium-aluminium weldable alloys in aerospace engineering.

Architecture Parameters:
- **Scarcity Tier:** Ultra Rare (Global supply under 20 tonnes per year).
- **Liquidity Ratio:** 25% initial pool reserve paired against 2,000 sCRIT.
- **Hook Fee:** 2.5% Uniswap V4 swap tax ensuring perpetual commodity treasury accumulation.

\`\`\`json:issuance_draft
{
  "name": "Scandium Aerospace Alloy",
  "ticker": "SCND",
  "supply": "250000000",
  "pooled": "62500000",
  "scritAmt": "2000",
  "description": "Ultra-lightweight aerospace alloy syndicate holding certified scandium oxide reserves.",
  "commodityTier": "Ultra Rare",
  "scarcityThreshold": "< 1,000 t/yr",
  "rationale": "High-performance aluminium-scandium alloy token with verified assay documentation."
}
\`\`\`

The draft card is ready below. Select "Apply to Launch Form" to pre-fill your Rail A issuance draft.`;
    }

    if (q.includes("platinum") || q.includes("catalyst") || q.includes("hydrogen") || q.includes("ptcl") || q.includes("palladium")) {
      return `Issuance Parameter Formulation for Platinum Clean Hydrogen Syndicate:

Platinum (Pt, 12% basket weight) and Palladium (Pd, 8% basket weight) are key PGMs critical for green hydrogen electrolyzers and industrial emission catalysts.

Architecture Parameters:
- **Scarcity Tier:** Ultra Rare (< 200 t annual world production).
- **Liquidity Allocation:** 20% pool paired against 1,000 sCRIT.
- **Hook Distribution:** 2.5% swap fee (75% reserve treasury / 25% operations).

\`\`\`json:issuance_draft
{
  "name": "Platinum Hydrogen Syndicate",
  "ticker": "PTCL",
  "supply": "1000000000",
  "pooled": "200000000",
  "scritAmt": "1000",
  "description": "Green hydrogen and PGM catalyst reserve syndicate paired continuously with sCRIT liquidity.",
  "commodityTier": "Ultra Rare",
  "scarcityThreshold": "< 1,000 t/yr",
  "rationale": "Essential catalytic element for hydrogen fuel cells and clean energy infrastructure."
}
\`\`\`

Click "Apply to Launch Form" to load this draft into the Launchpad wizard.`;
    }

    // Generic Commodity Token Drafting Formulator
    return `Issuance Parameter Formulation for Custom Commodity Reserve Token:

This assistant helps draft structured issuance parameters for Rail A Launchpad. All outputs are strictly generated in a human-reviewed draft state and never auto-submit.

Recommended Baseline Parameters:
- **Total Supply:** 1,000,000,000 units (Standard institutional fixed supply).
- **Initial Pooled:** 200,000,000 units (20% liquidity allocation).
- **Initial Deposit:** 1,000 sCRIT.
- **Implied Price:** 0.000005 sCRIT per project token.
- **Pool Tax:** 2.5% Uniswap V4 hook fee (75% reserve treasury, 25% protocol operations).

\`\`\`json:issuance_draft
{
  "name": "Critical Mineral Reserve",
  "ticker": "CMIN",
  "supply": "1000000000",
  "pooled": "200000000",
  "scritAmt": "1000",
  "description": "Tokenized industrial commodity syndicate backing physical processing reserves with continuous sCRIT liquidity pairing.",
  "commodityTier": "Rare",
  "scarcityThreshold": "1,000 - 10,000 t/yr",
  "rationale": "Physical commodity asset token paired with sCRIT critical reserve basket."
}
\`\`\`

You can customize any parameter or click "Apply to Launch Form" to load this directly into your Rail A Launchpad workspace.`;
  }

  // 2. KNOWLEDGE BASE & PROTOCOL EXPLORATIONS
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

Architecture Disclosures:
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

  return `sCRIT Copilot: Protocol Architecture & Issuance Assistant.

Core Software Capabilities:
1. **Issuance Form Assistant:** Propose token parameters (Name, Ticker, Supply, Paired sCRIT) in human-reviewed draft state for Rail A Launchpad.
2. **9 Starter Commodities:** Au (30%), Ag (5%), Pt (12%), Pd (8%), Nd (8%), Dy (12%), Tb (8%), Sc (7%), Li (10%).
3. **Uniswap V4 Hook:** 2.5% swap tax on project pools (75% reserve treasury / 25% operations).
4. **Reserve Ledger:** EIP-712 signed attestations with anti-replay protection.

You can ask to draft token parameters for your commodity syndicate, or query specific protocol mechanisms.`;
}
