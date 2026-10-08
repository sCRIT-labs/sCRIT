import { NextRequest, NextResponse } from "next/server";
import { getCanonicalAddress } from "@/lib/addresses";
import { publicClientFor } from "@/lib/scrit-evm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const tokenAddress = token.replace(/\.svg$/, "").toLowerCase();

  let isVerified = false;
  let fedAmountStr = "0 $CRIT";
  let blockNumberStr = "PENDING";
  const canonicalHook = getCanonicalAddress("TradingTaxHook");
  const shortHook = `${canonicalHook.slice(0, 6)}...2044`;

  try {
    const client = publicClientFor(4663);
    const block = await client.getBlock({ blockTag: "latest" });
    blockNumberStr = block.number.toString();

    // Check if token address is a valid hex address
    if (/^0x[a-f0-9]{40}$/.test(tokenAddress)) {
      // For testing & verification: check if code exists at token
      const code = await client.getBytecode({ address: tokenAddress as `0x${string}` });
      if (code && code !== "0x") {
        // If contract exists, query or default status
        // In full flow, inspect pool initialization. If canonical, mark true.
        isVerified = false; // By default without active registered pool
      }
    }
  } catch (err) {
    console.warn("Badge generation RPC read error:", err);
  }

  // Generate SVG string
  const width = 360;
  const height = 90;

  const svg = isVerified
    ? `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="8" fill="#121512" stroke="#3dd68c" stroke-width="1.5" />
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <text x="20" y="30" font-size="13" font-weight="700" fill="#3dd68c" letter-spacing="1">
      STOCKPILE-PAIRED &#x2713;
    </text>
    <text x="20" y="54" font-size="12" fill="#ffffff">
      Fed to stockpile: <tspan fill="#e6b43b" font-weight="700">${fedAmountStr}</tspan>
    </text>
    <text x="20" y="74" font-size="10" fill="#889288">
      Hook ${shortHook} &middot; block #${blockNumberStr}
    </text>
  </g>
</svg>
`.trim()
    : `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="8" fill="#181313" stroke="#ff4b4b" stroke-width="1.5" />
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <text x="20" y="32" font-size="13" font-weight="700" fill="#ff4b4b" letter-spacing="1">
      NOT STOCKPILE-PAIRED &#x2717;
    </text>
    <text x="20" y="56" font-size="12" fill="#d0d4d0">
      Unverified Hook or Unpaired Token
    </text>
    <text x="20" y="74" font-size="10" fill="#889288">
      Required: Hook 0x...2044 vs $CRIT &middot; block #${blockNumberStr}
    </text>
  </g>
</svg>
`.trim();

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
