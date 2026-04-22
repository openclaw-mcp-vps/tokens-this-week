import { eachDayOfInterval, formatISO } from "date-fns";
import type {
  DailyUsagePoint,
  DeveloperCostBreakdown,
  PromptOptimizationCandidate,
  ProviderBreakdown,
  ProviderUsageSnapshot,
  UsageEvent,
  WastePattern,
  WeeklyUsageSummary,
} from "@/types/usage";

type AnalyzeInput = {
  teamId: string;
  teamSize: number;
  weekStart: Date;
  weekEnd: Date;
  snapshots: ProviderUsageSnapshot[];
};

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

function mergeDailySpend(
  weekStart: Date,
  weekEnd: Date,
  snapshots: ProviderUsageSnapshot[],
): DailyUsagePoint[] {
  const dailyMap = new Map<string, DailyUsagePoint>();

  for (const date of eachDayOfInterval({ start: weekStart, end: weekEnd })) {
    const iso = formatISO(date, { representation: "date" });
    dailyMap.set(iso, {
      date: iso,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      requests: 0,
    });
  }

  for (const snapshot of snapshots) {
    for (const point of snapshot.daily) {
      const existing = dailyMap.get(point.date);
      if (!existing) continue;
      existing.costUsd += point.costUsd;
      existing.inputTokens += point.inputTokens;
      existing.outputTokens += point.outputTokens;
      existing.requests += point.requests;
    }
  }

  return Array.from(dailyMap.values()).map((point) => ({
    ...point,
    costUsd: Number(point.costUsd.toFixed(6)),
  }));
}

function getTopPromptCandidates(events: UsageEvent[]) {
  const grouped = new Map<string, PromptOptimizationCandidate>();

  for (const event of events) {
    const key = `${event.provider}::${event.model}::${event.promptLabel}`;
    const existing = grouped.get(key) ?? {
      promptLabel: event.promptLabel,
      provider: event.provider,
      model: event.model,
      requestCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      optimizationHint: "",
    };

    existing.requestCount += 1;
    existing.inputTokens += event.inputTokens;
    existing.outputTokens += event.outputTokens;
    existing.estimatedCostUsd += event.estimatedCostUsd;

    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
    .slice(0, 5)
    .map((candidate) => {
      const tokenRatio = candidate.outputTokens > 0 ? candidate.outputTokens / Math.max(1, candidate.inputTokens) : 0;
      const heavyModel = /gpt-4|o1|o3|claude-opus|claude-3-7|sonnet-4/i.test(candidate.model);

      let optimizationHint = "Trim context payload and add strict output format constraints.";
      if (tokenRatio > 2) {
        optimizationHint = "Cap output verbosity with explicit token limits and bullet-only responses.";
      } else if (heavyModel && candidate.inputTokens < 3000) {
        optimizationHint = "Test a cheaper model tier for this prompt flow before production use.";
      } else if (candidate.requestCount > 20) {
        optimizationHint = "Cache deterministic sections and avoid repeated full prompt regeneration.";
      }

      return {
        ...candidate,
        estimatedCostUsd: toMoney(candidate.estimatedCostUsd),
        optimizationHint,
      };
    });
}

function detectWastePatterns(events: UsageEvent[]) {
  const patterns: WastePattern[] = [];

  const oversizedContext = events.filter((event) => event.inputTokens > 12_000);
  const oversizedCost = oversizedContext.reduce((sum, event) => sum + event.estimatedCostUsd, 0);
  if (oversizedCost > 0.5) {
    patterns.push({
      id: "oversized-context",
      title: "Oversized context windows",
      description: `${oversizedContext.length} requests exceeded 12k input tokens and likely include redundant context blocks.`,
      recommendation: "Chunk retrieval results and cap appended history to only task-relevant context.",
      confidence: oversizedContext.length > 8 ? "high" : "medium",
      estimatedWasteUsd: toMoney(oversizedCost * 0.35),
    });
  }

  const verboseResponses = events.filter(
    (event) => event.outputTokens > 0 && event.outputTokens / Math.max(1, event.inputTokens) > 3,
  );
  const verboseCost = verboseResponses.reduce((sum, event) => sum + event.estimatedCostUsd, 0);
  if (verboseCost > 0.4) {
    patterns.push({
      id: "verbose-output",
      title: "Unbounded output verbosity",
      description: `${verboseResponses.length} requests generated over 3x more output than input tokens.`,
      recommendation:
        "Define concise output schemas and set max output token caps for analysis and codegen prompts.",
      confidence: verboseResponses.length > 10 ? "high" : "medium",
      estimatedWasteUsd: toMoney(verboseCost * 0.45),
    });
  }

  const expensiveForSmallJobs = events.filter(
    (event) =>
      /gpt-4|o1|o3|claude-opus|claude-3-7|sonnet-4/i.test(event.model) && event.inputTokens < 500,
  );
  const expensiveSmallJobsCost = expensiveForSmallJobs.reduce(
    (sum, event) => sum + event.estimatedCostUsd,
    0,
  );

  if (expensiveSmallJobsCost > 0.4) {
    patterns.push({
      id: "overpowered-model",
      title: "Overpowered model for lightweight tasks",
      description: `${expensiveForSmallJobs.length} low-context requests were routed to premium models.`,
      recommendation: "Route classification, linting, and short transforms to a mini or haiku-tier model.",
      confidence: expensiveForSmallJobs.length > 10 ? "high" : "medium",
      estimatedWasteUsd: toMoney(expensiveSmallJobsCost * 0.5),
    });
  }

  const frequentPromptGroups = new Map<string, UsageEvent[]>();
  for (const event of events) {
    const bucket = frequentPromptGroups.get(event.promptLabel) ?? [];
    bucket.push(event);
    frequentPromptGroups.set(event.promptLabel, bucket);
  }

  const repetitivePrompts = Array.from(frequentPromptGroups.values()).filter((group) => group.length >= 20);
  const repetitiveCost = repetitivePrompts
    .flat()
    .reduce((sum, event) => sum + event.estimatedCostUsd, 0);

  if (repetitiveCost > 0.5) {
    patterns.push({
      id: "repetitive-workflow",
      title: "Repetitive prompt loops",
      description: `${repetitivePrompts.length} prompt flows repeated 20+ times this week without caching.`,
      recommendation:
        "Add deterministic cache keys and short-circuit unchanged prompt inputs before calling the API.",
      confidence: repetitivePrompts.length >= 3 ? "high" : "low",
      estimatedWasteUsd: toMoney(repetitiveCost * 0.3),
    });
  }

  return patterns
    .sort((a, b) => b.estimatedWasteUsd - a.estimatedWasteUsd)
    .slice(0, 4);
}

function buildDeveloperCostBreakdown(events: UsageEvent[], teamSize: number, totalCost: number) {
  const withDeveloper = events.filter((event) => Boolean(event.developer));

  if (withDeveloper.length >= Math.max(3, teamSize / 2)) {
    const grouped = new Map<string, DeveloperCostBreakdown>();

    for (const event of withDeveloper) {
      const dev = event.developer as string;
      const existing = grouped.get(dev) ?? {
        developer: dev,
        requestCount: 0,
        estimatedCostUsd: 0,
        sharePercent: 0,
        attribution: "exact",
      };

      existing.requestCount += 1;
      existing.estimatedCostUsd += event.estimatedCostUsd;
      grouped.set(dev, existing);
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
      .slice(0, 12)
      .map((entry) => ({
        ...entry,
        estimatedCostUsd: toMoney(entry.estimatedCostUsd),
        sharePercent: totalCost > 0 ? Number(((entry.estimatedCostUsd / totalCost) * 100).toFixed(1)) : 0,
      }));
  }

  const normalizedTeamSize = Math.min(Math.max(teamSize, 1), 50);
  const estimatedPerDev = normalizedTeamSize > 0 ? totalCost / normalizedTeamSize : totalCost;

  return Array.from({ length: normalizedTeamSize }).map((_, index) => ({
    developer: `Developer ${index + 1}`,
    requestCount: Math.round(events.length / normalizedTeamSize),
    estimatedCostUsd: toMoney(estimatedPerDev),
    sharePercent: Number((100 / normalizedTeamSize).toFixed(1)),
    attribution: "estimated" as const,
  }));
}

function buildProviderBreakdown(snapshots: ProviderUsageSnapshot[]) {
  return snapshots
    .map((snapshot) => ({
      provider: snapshot.provider,
      estimatedCostUsd: toMoney(snapshot.totals.costUsd),
      requestCount: snapshot.totals.requests,
      inputTokens: snapshot.totals.inputTokens,
      outputTokens: snapshot.totals.outputTokens,
    }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd) as ProviderBreakdown[];
}

export function analyzeWeeklyUsage(input: AnalyzeInput): WeeklyUsageSummary {
  const events = input.snapshots.flatMap((snapshot) => snapshot.events);
  const providerBreakdown = buildProviderBreakdown(input.snapshots);

  const totals = events.reduce(
    (acc, event) => {
      acc.totalEstimatedCostUsd += event.estimatedCostUsd;
      acc.totalInputTokens += event.inputTokens;
      acc.totalOutputTokens += event.outputTokens;
      return acc;
    },
    {
      totalEstimatedCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    },
  );

  const topExpensivePrompts = getTopPromptCandidates(events);
  const wastePatterns = detectWastePatterns(events);
  const estimatedWasteUsd = wastePatterns.reduce((sum, pattern) => sum + pattern.estimatedWasteUsd, 0);

  const dailySpend = mergeDailySpend(input.weekStart, input.weekEnd, input.snapshots);

  const totalCost = toMoney(
    providerBreakdown.reduce((sum, provider) => sum + provider.estimatedCostUsd, 0) ||
      totals.totalEstimatedCostUsd,
  );

  const costPerDeveloper = buildDeveloperCostBreakdown(events, input.teamSize, totalCost);

  const recommendedActions = [
    "Set strict max output tokens for verbose flows and require bullet-only responses where possible.",
    "Downshift low-context tasks to a mini/haiku model tier and reserve premium models for complex reasoning.",
    "Add prompt cache keys for repeated workflows to eliminate duplicate spend.",
  ];

  if (wastePatterns.length === 0) {
    recommendedActions.unshift(
      "No major waste signals detected this week; keep tracking and expand prompt-level metadata for deeper attribution.",
    );
  }

  return {
    summaryVersion: 1,
    teamId: input.teamId,
    generatedAt: new Date().toISOString(),
    weekStart: input.weekStart.toISOString(),
    weekEnd: input.weekEnd.toISOString(),
    totalEstimatedCostUsd: totalCost,
    totalRequests: events.length,
    totalInputTokens: totals.totalInputTokens,
    totalOutputTokens: totals.totalOutputTokens,
    estimatedWasteUsd: toMoney(estimatedWasteUsd),
    providerBreakdown,
    dailySpend,
    topExpensivePrompts,
    wastePatterns,
    costPerDeveloper,
    recommendedActions,
  };
}
