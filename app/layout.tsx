import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tokens This Week — AI Spend Summary for Engineering Teams",
  description: "Weekly summary of your team AI spend and waste detection. Connect OpenAI + Anthropic keys, get cost-per-developer breakdowns and optimization tips every Monday."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script defer src="https://umami.microtool.dev/script.js" data-website-id="740ca45e-b535-4e1b-9391-7d21d87dcdad"></script>
      </head>
      <body style={{ backgroundColor: "#0d1117", color: "#c9d1d9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
