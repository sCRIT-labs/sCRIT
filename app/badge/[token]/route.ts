import { NextRequest, NextResponse } from "next/server";
import { getCanonicalAddress } from "@/lib/addresses";
import { publicClientFor } from "@/lib/scrit-evm";
import {
  INITIALIZE_EVENT,
  TAX_EVENT,
} from "@/lib/pairs/discovery";

interface BadgeCache {
  at: number;
  verified: Map<string, { fed: bigint; block: bigint }>;
}

const cache: BadgeCache = { at: 0, verified: new Map() };
const CACHE_MS = 5 * 60 * 1000;
const HOOK_DEPLOY_BLOCK = 82941964n;
const LOG_CHUNK = 10_000n;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const tokenAddress = token.replace(/\.svg$/, "").toLowerCase();
  const canonicalHook = getCanonicalAddress("TradingTaxHook");
  const canonicalCrit = getCanonicalAddress("CRIT").toLowerCase();
  const shortHook = `${canonicalHook.slice(0, 6)}...2044`;

  let isVerified = false;
  let fedAmountStr = "0 $CRIT";
  let blockNumberStr = "PENDING";

  try {
    const client = publicClientFor(4663);
    const block = await client.getBlock({ blockTag: "latest" });
    blockNumberStr = block.number.toString();

    if (/^0x[a-f0-9]{40}$/.test(tokenAddress)) {
      const code = await client.getBytecode({ address: tokenAddress as `0x${string}` });
      if (code && code !== "0x") {
        const now = Date.now();
        // Fresh on-chain check (cached 5 min): a pool initialized with the
        // canonical hook pairing this token against $CRIT.
        if (now - cache.at > CACHE_MS) {
          cache.at = now;
          cache.verified.clear();
        }
        const tokenPad = tokenAddress as `0x${string}`;
        const [as0, as1] = await Promise.all([
          client
            .getLogs({
              address: getCanonicalAddress("PoolManager") as `0x${string}`,
              event: INITIALIZE_EVENT,
              args: { currency0: tokenPad },
              fromBlock: HOOK_DEPLOY_BLOCK,
              toBlock: block.number,
            })
            .catch(() => []),
          client
            .getLogs({
              address: getCanonicalAddress("PoolManager") as `0x${string}`,
              event: INITIALIZE_EVENT,
              args: { currency1: tokenPad },
              fromBlock: HOOK_DEPLOY_BLOCK,
              toBlock: block.number,
            })
            .catch(() => []),
        ]);
        for (const l of [...as0, ...as1]) {
          const a = l.args as {
            id: `0x${string}`;
            currency0: `0x${string}`;
            currency1: `0x${string}`;
            fee: number;
            hooks: `0x${string}`;
          };
          const poolId = a.id.toLowerCase();
          const c0 = a.currency0.toLowerCase();
          const c1 = a.currency1.toLowerCase();
          if (c0 !== canonicalCrit && c1 !== canonicalCrit) continue;
          if (a.hooks.toLowerCase() !== canonicalHook.toLowerCase()) continue;
          // Exact fee accounting from hook TaxCollected events for this pool.
          let fed = 0n;
          for (let s = l.blockNumber; s <= block.number; s += LOG_CHUNK) {
            const to = s + LOG_CHUNK - 1n > block.number ? block.number : s + LOG_CHUNK - 1n;
            const taxes = await client
              .getLogs({
                address: canonicalHook as `0x${string}`,
                event: TAX_EVENT,
                args: { poolId: a.id },
                fromBlock: s,
                toBlock: to,
              })
              .catch(() => []);
            for (const t of taxes) {
              const ta = t.args as { currency: string; reserveAmount: bigint };
              if (String(ta.currency).toLowerCase() !== canonicalCrit) continue;
              fed += BigInt(ta.reserveAmount);
            }
          }
          cache.verified.set(tokenAddress, { fed, block: block.number });
          break;
        }
        const hit = cache.verified.get(tokenAddress);
        if (hit) {
          isVerified = true;
          const fedNum = Number(hit.fed) / 1e18;
          fedAmountStr = `${fedNum.toLocaleString("en-US", { maximumFractionDigits: 2 })} $CRIT`;
          blockNumberStr = hit.block.toString();
        }
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
      Hook ${shortHook} &#183; block #${blockNumberStr}
    </text>
  </g>
</svg>
`.trim()
    : `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Not stockpile-paired">
  <rect width="${width}" height="${height}" rx="8" fill="#181313" stroke="#ff4b4b" stroke-width="1.5" />
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <text x="20" y="32" font-size="13" font-weight="700" fill="#ff4b4b" letter-spacing="1">
      NOT STOCKPILE-PAIRED &#x2717;
    </text>
    <text x="20" y="56" font-size="12" fill="#d0d4d0">
      Unverified Hook or Unpaired Token
    </text>
    <text x="20" y="74" font-size="10" fill="#889288">
      Required: Hook 0x...2044 vs $CRIT &#183; block #${blockNumberStr}
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
