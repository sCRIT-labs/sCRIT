"use client";

const SRC = {
  hood: "/chains/hood.ico",
} as const;

export type ChainLogoKind = keyof typeof SRC;

/** Official Robinhood chain mark served from /public. */
export default function ChainLogo({ kind, size = 18 }: { kind: ChainLogoKind; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- official chain mark served from /public
    <img src={SRC[kind]} width={size} height={size} alt="" aria-hidden="true" style={{ borderRadius: size / 2 }} />
  );
}
