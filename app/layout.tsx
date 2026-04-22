import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tokens-this-week.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tokens This Week",
    template: "%s | Tokens This Week",
  },
  description:
    "Weekly AI spend visibility for engineering teams: total cost, waste patterns, expensive prompts, and cost-per-developer breakdown.",
  keywords: [
    "OpenAI cost tracking",
    "Anthropic usage analytics",
    "AI engineering manager dashboard",
    "prompt cost optimization",
    "weekly AI spend report",
  ],
  openGraph: {
    title: "Tokens This Week",
    description:
      "See weekly OpenAI + Anthropic spend, detect waste, and prioritize prompt optimization by impact.",
    url: siteUrl,
    siteName: "Tokens This Week",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tokens This Week",
    description:
      "Weekly summary of your team AI spend + waste detection.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen bg-[#0d1117] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
