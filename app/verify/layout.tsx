import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Verifier — sCRIT",
  description: "Don't trust the site. Verify the chain. Paste any tx, address or custodian attestation to verify against Robinhood Chain.",
  openGraph: {
    title: "The Verifier — sCRIT",
    description: "Don't trust the site. Verify the chain.",
    url: "https://scritindex.tech/verify",
    siteName: "sCRIT",
    images: [
      {
        url: "https://scritindex.tech/api/og/verify",
        width: 1200,
        height: 630,
        alt: "The Verifier — sCRIT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Verifier — sCRIT",
    description: "Don't trust the site. Verify the chain.",
    images: ["https://scritindex.tech/api/og/verify"],
  },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
