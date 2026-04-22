"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, DollarSign, Sparkles, Users } from "lucide-react";
import type { WeeklyUsageSummary } from "@/types/usage";

type UsageDashboardProps = {
  summary: WeeklyUsageSummary | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function shortNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function UsageDashboard({ summary }: UsageDashboardProps) {
  if (!summary) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#0f1726] p-6">
        <h2 className="text-xl font-semibold text-slate-100">Weekly usage dashboard</h2>
        <p className="mt-2 text-sm text-slate-300">
          No weekly report exists yet. Add API keys and wait for the weekly cron, or run
          `/api/cron/analyze-usage` with your cron bearer token.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-[#0f1726] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total spend</p>
            <DollarSign className="h-4 w-4 text-cyan-300" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-50">{money(summary.totalEstimatedCostUsd)}</p>
          <p className="mt-1 text-xs text-slate-400">{shortNumber(summary.totalRequests)} requests this week</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0f1726] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-400">Waste detected</p>
            <AlertTriangle className="h-4 w-4 text-amber-300" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-amber-200">{money(summary.estimatedWasteUsd)}</p>
          <p className="mt-1 text-xs text-slate-400">{summary.wastePatterns.length} active waste signals</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0f1726] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-400">Input tokens</p>
            <Sparkles className="h-4 w-4 text-violet-300" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-50">{shortNumber(summary.totalInputTokens)}</p>
          <p className="mt-1 text-xs text-slate-400">Output: {shortNumber(summary.totalOutputTokens)}</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0f1726] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-400">Cost per developer</p>
            <Users className="h-4 w-4 text-emerald-300" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-50">
            {summary.costPerDeveloper[0] ? money(summary.costPerDeveloper[0].estimatedCostUsd) : money(0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {summary.costPerDeveloper[0]?.attribution === "estimated" ? "Estimated allocation" : "Exact attribution"}
          </p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#0f1726] p-5">
          <h3 className="text-sm font-semibold text-slate-100">Daily spend trend</h3>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.dailySpend} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#67e8f9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={{ fill: "#93a4b8", fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fill: "#93a4b8", fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0b1320",
                    border: "1px solid #1f2937",
                    color: "#e2e8f0",
                    borderRadius: 12,
                  }}
                  formatter={(value) => money(Number(value ?? 0))}
                />
                <Area type="monotone" dataKey="costUsd" stroke="#67e8f9" fill="url(#spendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0f1726] p-5">
          <h3 className="text-sm font-semibold text-slate-100">Provider cost split</h3>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.providerBreakdown} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="provider" tick={{ fill: "#93a4b8", fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fill: "#93a4b8", fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0b1320",
                    border: "1px solid #1f2937",
                    color: "#e2e8f0",
                    borderRadius: 12,
                  }}
                  formatter={(value) => money(Number(value ?? 0))}
                />
                <Bar dataKey="estimatedCostUsd" fill="#34d399" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#0f1726] p-5">
          <h3 className="text-sm font-semibold text-slate-100">Top expensive prompt flows</h3>
          <ul className="mt-4 space-y-3">
            {summary.topExpensivePrompts.map((prompt) => (
              <li key={`${prompt.provider}-${prompt.model}-${prompt.promptLabel}`} className="rounded-xl border border-white/10 bg-[#0b1320] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-100">{prompt.promptLabel}</p>
                  <p className="text-sm font-semibold text-cyan-300">{money(prompt.estimatedCostUsd)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {prompt.provider} · {prompt.model} · {shortNumber(prompt.requestCount)} calls
                </p>
                <p className="mt-2 text-xs text-slate-300">{prompt.optimizationHint}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0f1726] p-5">
          <h3 className="text-sm font-semibold text-slate-100">Waste patterns detected</h3>
          <ul className="mt-4 space-y-3">
            {summary.wastePatterns.length === 0 ? (
              <li className="rounded-xl border border-white/10 bg-[#0b1320] p-4 text-sm text-slate-300">
                No major waste pattern this week. Keep tracking to improve confidence.
              </li>
            ) : (
              summary.wastePatterns.map((pattern) => (
                <li key={pattern.id} className="rounded-xl border border-white/10 bg-[#0b1320] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-100">{pattern.title}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                      {pattern.confidence}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">{pattern.description}</p>
                  <p className="mt-2 text-xs text-cyan-200">Fix: {pattern.recommendation}</p>
                  <p className="mt-2 text-xs text-amber-200">Potential recovery: {money(pattern.estimatedWasteUsd)}</p>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}
