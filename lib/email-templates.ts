import { format } from "date-fns";
import type { WeeklyUsageSummary } from "@/types/usage";

function money(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function createWeeklyEmailSummary(teamName: string, summary: WeeklyUsageSummary) {
  const weekLabel = `${format(new Date(summary.weekStart), "MMM d")} - ${format(new Date(summary.weekEnd), "MMM d")}`;
  const subject = `Tokens This Week: ${money(summary.totalEstimatedCostUsd)} spent, ${money(summary.estimatedWasteUsd)} recoverable`;

  const topPromptsRows = summary.topExpensivePrompts
    .map(
      (prompt, index) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #22303c;color:#c9d1d9;">${index + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #22303c;color:#c9d1d9;">${prompt.promptLabel}</td>
        <td style="padding:8px;border-bottom:1px solid #22303c;color:#c9d1d9;">${prompt.model}</td>
        <td style="padding:8px;border-bottom:1px solid #22303c;color:#c9d1d9;">${money(prompt.estimatedCostUsd)}</td>
      </tr>`,
    )
    .join("");

  const wasteItems = summary.wastePatterns
    .map(
      (pattern) => `
      <li style="margin-bottom:14px;">
        <strong style="color:#f0b429;">${pattern.title}</strong><br/>
        <span style="color:#8b949e;">${pattern.description}</span><br/>
        <span style="color:#58a6ff;">Fix: ${pattern.recommendation}</span>
      </li>`,
    )
    .join("");

  const providerRows = summary.providerBreakdown
    .map(
      (provider) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #22303c;color:#c9d1d9;text-transform:capitalize;">${provider.provider}</td>
        <td style="padding:8px;border-bottom:1px solid #22303c;color:#c9d1d9;">${money(provider.estimatedCostUsd)}</td>
        <td style="padding:8px;border-bottom:1px solid #22303c;color:#c9d1d9;">${number(provider.requestCount)}</td>
      </tr>`,
    )
    .join("");

  const html = `
  <div style="background:#0d1117;padding:24px;font-family:Inter,Arial,sans-serif;color:#c9d1d9;">
    <div style="max-width:680px;margin:0 auto;background:#111827;border:1px solid #22303c;border-radius:16px;padding:24px;">
      <h1 style="margin-top:0;color:#f0f6fc;">Tokens This Week</h1>
      <p style="color:#8b949e;margin-bottom:24px;">${teamName} · ${weekLabel}</p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="background:#0b1220;border:1px solid #22303c;border-radius:12px;padding:12px;min-width:180px;">
          <p style="margin:0;color:#8b949e;font-size:12px;">Total spend</p>
          <p style="margin:8px 0 0;font-size:24px;color:#f0f6fc;">${money(summary.totalEstimatedCostUsd)}</p>
        </div>
        <div style="background:#0b1220;border:1px solid #22303c;border-radius:12px;padding:12px;min-width:180px;">
          <p style="margin:0;color:#8b949e;font-size:12px;">Recoverable waste</p>
          <p style="margin:8px 0 0;font-size:24px;color:#f0b429;">${money(summary.estimatedWasteUsd)}</p>
        </div>
        <div style="background:#0b1220;border:1px solid #22303c;border-radius:12px;padding:12px;min-width:180px;">
          <p style="margin:0;color:#8b949e;font-size:12px;">API requests</p>
          <p style="margin:8px 0 0;font-size:24px;color:#f0f6fc;">${number(summary.totalRequests)}</p>
        </div>
      </div>

      <h2 style="color:#f0f6fc;font-size:18px;">Waste patterns detected</h2>
      <ul style="padding-left:18px;">${wasteItems || "<li>No major waste pattern detected this week.</li>"}</ul>

      <h2 style="color:#f0f6fc;font-size:18px;">Top 5 expensive prompt flows</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #22303c;border-radius:12px;overflow:hidden;">
        <thead>
          <tr>
            <th style="padding:8px;background:#161b22;color:#8b949e;text-align:left;">#</th>
            <th style="padding:8px;background:#161b22;color:#8b949e;text-align:left;">Prompt flow</th>
            <th style="padding:8px;background:#161b22;color:#8b949e;text-align:left;">Model</th>
            <th style="padding:8px;background:#161b22;color:#8b949e;text-align:left;">Cost</th>
          </tr>
        </thead>
        <tbody>
          ${topPromptsRows || '<tr><td colspan="4" style="padding:12px;color:#8b949e;">No prompt-level records available for this period.</td></tr>'}
        </tbody>
      </table>

      <h2 style="color:#f0f6fc;font-size:18px;margin-top:24px;">Provider breakdown</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #22303c;border-radius:12px;overflow:hidden;">
        <thead>
          <tr>
            <th style="padding:8px;background:#161b22;color:#8b949e;text-align:left;">Provider</th>
            <th style="padding:8px;background:#161b22;color:#8b949e;text-align:left;">Cost</th>
            <th style="padding:8px;background:#161b22;color:#8b949e;text-align:left;">Requests</th>
          </tr>
        </thead>
        <tbody>${providerRows}</tbody>
      </table>
    </div>
  </div>
  `;

  const text = [
    `Tokens This Week · ${teamName}`,
    `Week: ${weekLabel}`,
    `Total spend: ${money(summary.totalEstimatedCostUsd)}`,
    `Recoverable waste: ${money(summary.estimatedWasteUsd)}`,
    `Total requests: ${number(summary.totalRequests)}`,
    "",
    "Top expensive prompts:",
    ...summary.topExpensivePrompts.map(
      (prompt, index) => `${index + 1}. ${prompt.promptLabel} (${prompt.model}) - ${money(prompt.estimatedCostUsd)}`,
    ),
  ].join("\n");

  return { subject, html, text };
}
