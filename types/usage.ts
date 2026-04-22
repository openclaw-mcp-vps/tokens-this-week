export type ProviderName = "openai" | "anthropic";

export interface UsageEvent {
  id: string;
  provider: ProviderName;
  model: string;
  promptLabel: string;
  developer: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  occurredAt: string;
}

export interface DailyUsagePoint {
  date: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
}

export interface ProviderUsageSnapshot {
  provider: ProviderName;
  totals: {
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    requests: number;
  };
  daily: DailyUsagePoint[];
  events: UsageEvent[];
}

export interface WastePattern {
  id: string;
  title: string;
  description: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
  estimatedWasteUsd: number;
}

export interface PromptOptimizationCandidate {
  promptLabel: string;
  provider: ProviderName;
  model: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  optimizationHint: string;
}

export interface DeveloperCostBreakdown {
  developer: string;
  requestCount: number;
  estimatedCostUsd: number;
  sharePercent: number;
  attribution: "exact" | "estimated";
}

export interface ProviderBreakdown {
  provider: ProviderName;
  estimatedCostUsd: number;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface WeeklyUsageSummary {
  summaryVersion: number;
  teamId: string;
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  totalEstimatedCostUsd: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedWasteUsd: number;
  providerBreakdown: ProviderBreakdown[];
  dailySpend: DailyUsagePoint[];
  topExpensivePrompts: PromptOptimizationCandidate[];
  wastePatterns: WastePattern[];
  costPerDeveloper: DeveloperCostBreakdown[];
  recommendedActions: string[];
}

export interface TeamRecord {
  id: string;
  name: string;
  email: string;
  team_size: number | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

export interface ApiKeyRecord {
  id: string;
  team_id: string;
  provider: ProviderName;
  key_name: string;
  encrypted_key: string;
  updated_at: string;
}
