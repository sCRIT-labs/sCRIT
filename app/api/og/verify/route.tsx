import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { lookupAddress, getCanonicalAddress } from "@/lib/addresses";
import { decodeHookPermissions } from "@/lib/verify/hook-decoder";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tx = searchParams.get("tx")?.trim();
  const addr = searchParams.get("addr")?.trim();

  let headerTag = "THE VERIFIER";
  let title = "Don't trust the site. Verify the chain.";
  let verdict = "READY TO VERIFY";
  let detail = "Paste a transaction, an address, or a custodian attestation to verify against Robinhood Chain.";
  let badgeColor = "#8c6418";
  let borderColor = "rgba(140, 100, 24, 0.4)";
  let bgTag = "rgba(140, 100, 24, 0.1)";

  if (tx) {
    headerTag = "TRANSACTION VERIFICATION";
    title = `${tx.slice(0, 10)}...${tx.slice(-8)}`;
    // Real observed burn: 615,672 $CRIT to Dead, block 83022505.
    if (tx.toLowerCase() === "0xac25ded31ecaebc08a576783a66f3fa1e49cf3b1d9e44a553db5937d8a632708".toLowerCase()) {
      verdict = "VERIFIED BURN · 615,672 $CRIT";
      detail = "615,672 $CRIT sent to canonical 0x...dEaD burn sink in block 83022505. Irretrievable forever.";
      badgeColor = "#3dd68c";
      borderColor = "rgba(61, 214, 140, 0.5)";
      bgTag = "rgba(61, 214, 140, 0.15)";
    } else {
      // Look the tx up before claiming anything — never badge an unseen hash.
      let found: boolean | null = null;
      try {
        const r = await fetch("https://rpc.mainnet.chain.robinhood.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getTransactionReceipt",
            params: [tx],
          }),
        });
        const j = (await r.json()) as { result?: { status?: string } | null };
        found = !!j.result;
        if (found) {
          verdict = j.result?.status === "0x1" ? "TRANSACTION ON-CHAIN ✓" : "TRANSACTION FAILED ON-CHAIN";
          detail =
            j.result?.status === "0x1"
              ? "Transaction receipt exists on Robinhood Chain mainnet (Chain ID 4663)."
              : "Transaction exists but reverted on-chain.";
          badgeColor = j.result?.status === "0x1" ? "#3dd68c" : "#ff4b4b";
          borderColor = j.result?.status === "0x1" ? "rgba(61, 214, 140, 0.5)" : "rgba(255, 75, 75, 0.5)";
          bgTag = j.result?.status === "0x1" ? "rgba(61, 214, 140, 0.15)" : "rgba(255, 75, 75, 0.15)";
        } else {
          verdict = "TRANSACTION NOT FOUND";
          detail = "No receipt for this hash on Robinhood Chain mainnet.";
          badgeColor = "#ff4b4b";
          borderColor = "rgba(255, 75, 75, 0.5)";
          bgTag = "rgba(255, 75, 75, 0.15)";
        }
      } catch {
        found = null;
      }
      if (found === null) {
        verdict = "UNVERIFIED (RPC UNREACHABLE)";
        detail = "Could not reach the chain to check this hash. Never assume — retry on /verify.";
        badgeColor = "#9e9e9e";
        borderColor = "rgba(158, 158, 158, 0.4)";
        bgTag = "rgba(158, 158, 158, 0.1)";
      }
    }
  } else if (addr) {
    headerTag = "ADDRESS VERIFICATION";
    title = `${addr.slice(0, 10)}...${addr.slice(-8)}`;
    const lookup = lookupAddress(addr);
    const hook = decodeHookPermissions(addr);

    if (lookup.type === "canonical") {
      const info = lookup.info as { name?: string; description?: string };
      verdict = `CANONICAL · ${info?.name ?? "CORE CONTRACT"}`;
      detail = info?.description ?? "Canonical immutable contract deployed on Robinhood Chain.";
      badgeColor = "#3dd68c";
      borderColor = "rgba(61, 214, 140, 0.5)";
      bgTag = "rgba(61, 214, 140, 0.15)";
    } else if (lookup.type === "deprecated") {
      verdict = "DEPRECATED · NOT $CRIT";
      detail =
        (lookup.info as { reason?: string })?.reason ??
        "Deprecated pre-Pons contract. Do not trade or pair.";
      badgeColor = "#ff4b4b";
      borderColor = "rgba(255, 75, 75, 0.5)";
      bgTag = "rgba(255, 75, 75, 0.15)";
    } else if (hook.hexFlags === "0x2044") {
      verdict = "VERIFIED HOOK · 0x2044";
      detail = "Uniswap V4 TradingTaxHook flags 0x2044 (beforeInitialize, afterSwap, afterSwapReturnDelta).";
      badgeColor = "#3dd68c";
      borderColor = "rgba(61, 214, 140, 0.5)";
      bgTag = "rgba(61, 214, 140, 0.15)";
    } else {
      verdict = "EXTERNAL ADDRESS";
      detail = "Not a recognized canonical sCRIT protocol contract.";
      badgeColor = "#9e9e9e";
      borderColor = "rgba(158, 158, 158, 0.4)";
      bgTag = "rgba(158, 158, 158, 0.1)";
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 70px",
          backgroundColor: "#121512",
          backgroundImage: "radial-gradient(circle at 10% 20%, rgba(26, 38, 26, 0.6) 0%, transparent 60%)",
          color: "#ffffff",
          fontFamily: "monospace",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "2px",
                backgroundColor: "#3dd68c",
              }}
            />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#e6b43b",
                textTransform: "uppercase",
              }}
            >
              sCRIT // ROBINHOOD CHAIN
            </span>
          </div>

          <div
            style={{
              padding: "6px 14px",
              borderRadius: "4px",
              border: `1px solid ${borderColor}`,
              backgroundColor: bgTag,
              color: badgeColor,
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            {headerTag}
          </div>
        </div>

        {/* Center content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", margin: "20px 0" }}>
          <div
            style={{
              fontSize: "44px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            <div
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                backgroundColor: bgTag,
                border: `1px solid ${borderColor}`,
                color: badgeColor,
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              {verdict}
            </div>
          </div>

          <p
            style={{
              fontSize: "18px",
              color: "#a4aca4",
              lineHeight: 1.5,
              maxWidth: "850px",
              margin: "6px 0 0",
            }}
          >
            {detail}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "24px",
            fontSize: "13px",
            color: "#6b756b",
          }}
        >
          <span>Theme: Don&apos;t trust the site. Verify the chain.</span>
          <span>scritindex.tech/verify</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
