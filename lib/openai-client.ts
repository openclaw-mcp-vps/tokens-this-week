import { formatISO, fromUnixTime } from "date-fns";
import type { DailyUsagePoint, ProviderUsageSnapshot, UsageEvent } from "@/types/usage";

const OPENAI_COST_API = "https://api.openai.com/v1/organization/costs";
const OPENAI_USAGE_API = "https://api.openai.com/v1/organization/usage/completions";

type UnknownRecord = Record<string, unknown>;

const MODEL_RATES_PER_MILLION: Array<{ pattern: RegExp; input: number; output: number }> = [
  { pattern: /gpt-4\.1|gpt-4o|o1|o3/i, input: 10, output: 30 },
  { pattern: /gpt-4\.1-mini|gpt-4o-mini|o4-mini/i, input: 0.6, output: 2.4 },
  { pattern: /gpt-3\.5|gpt-4\.1-nano/i, input: 0.2, output: 0.8 },
];

function asNumber(value: unknown) {
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : 0;
}

function estimateOpenAICostUsd(model: string, inputTokens: number, outputTokens: number) {
  const pricing = MODEL_RATES_PER_MILLION.find((entry) => entry.pattern.test(model));
  const fallback = { input: 1.25, output: 5 };
  const rate = pricing ?? fallback;

  return (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
}

async function fetchOpenAIEndpoint<T>(
  apiKey: string,
  url: string,
  body: UnknownRecord,
): Promise<T | null> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API call failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

function normalizePromptLabel(record: UnknownRecord) {
  const project = String(record.project_id ?? "").trim();
  const apiKeyId = String(record.api_key_id ?? "").trim();
  const user = String(record.user_id ?? "").trim();

  if (project) return `Project ${project}`;
  if (apiKeyId) return `API key ${apiKeyId}`;
  if (user) return `User ${user}`;
  return "Unlabeled prompt flow";
}

function parseCostDailyBuckets(costResponse: UnknownRecord | null): DailyUsagePoint[] {
  const rawBuckets = Array.isArray(costResponse?.data) ? (costResponse.data as UnknownRecord[]) : [];

  return rawBuckets.map((bucket) => {
    const startSeconds = asNumber(bucket.start_time);
    const date = startSeconds > 0 ? formatISO(fromUnixTime(startSeconds), { representation: "date" }) : "";

    const rows = Array.isArray(bucket.results) ? (bucket.results as UnknownRecord[]) : [];
    const costUsd = rows.reduce((sum, row) => {
      const amount = row.amount as UnknownRecord | undefined;
      return sum + asNumber(amount?.value);
    }, 0);

    return {
      date,
      costUsd,
      inputTokens: 0,
      outputTokens: 0,
      requests: 0,
    };
  });
}

function parseUsageRecords(usageResponse: UnknownRecord | null): UsageEvent[] {
  const records = Array.isArray(usageResponse?.data) ? (usageResponse.data as UnknownRecord[]) : [];

  return records.map((record, index) => {
    const model = String(record.model ?? "unknown-model");
    const inputTokens = asNumber(record.input_tokens);
    const outputTokens = asNumber(record.output_tokens);
    const timestamp = asNumber(record.start_time);

    return {
      id: `openai-${record.id ?? index}`,
      provider: "openai",
      model,
      promptLabel: normalizePromptLabel(record),
      developer: record.user_id ? String(record.user_id) : null,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateOpenAICostUsd(model, inputTokens, outputTokens),
      occurredAt:
        timestamp > 0
          ? fromUnixTime(timestamp).toISOString()
          : new Date().toISOString(),
    } satisfies UsageEvent;
  });
}

function distributeCosts(events: UsageEvent[], totalCost: number) {
  const estimated = events.reduce((sum, event) => sum + event.estimatedCostUsd, 0);
  if (totalCost <= 0 || estimated <= 0) return events;

  const ratio = totalCost / estimated;
  return events.map((event) => ({
    ...event,
    estimatedCostUsd: Number((event.estimatedCostUsd * ratio).toFixed(6)),
  }));
}

function mergeDailyData(events: UsageEvent[], costBuckets: DailyUsagePoint[]) {
  const map = new Map<string, DailyUsagePoint>();

  for (const bucket of costBuckets) {
    map.set(bucket.date, { ...bucket });
  }

  for (const event of events) {
    const date = formatISO(new Date(event.occurredAt), { representation: "date" });
    const existing = map.get(date) ?? {
      date,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      requests: 0,
    };

    existing.inputTokens += event.inputTokens;
    existing.outputTokens += event.outputTokens;
    existing.requests += 1;

    if (!map.has(date)) map.set(date, existing);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchOpenAIUsageSnapshot(
  apiKey: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<ProviderUsageSnapshot> {
  const startTime = Math.floor(weekStart.getTime() / 1000);
  const endTime = Math.floor(weekEnd.getTime() / 1000);

  const [costResponse, usageResponse] = await Promise.all([
    fetchOpenAIEndpoint<UnknownRecord>(apiKey, OPENAI_COST_API, {
      start_time: startTime,
      end_time: endTime,
      bucket_width: "1d",
    }),
    fetchOpenAIEndpoint<UnknownRecord>(apiKey, OPENAI_USAGE_API, {
      start_time: startTime,
      end_time: endTime,
      bucket_width: "1d",
      group_by: ["model", "project_id", "api_key_id", "user_id"],
      limit: 500,
    }),
  ]);

  const costDailyBuckets = parseCostDailyBuckets(costResponse);
  const totalCostFromCostsApi = costDailyBuckets.reduce((sum, point) => sum + point.costUsd, 0);

  const parsedEvents = parseUsageRecords(usageResponse);
  const events = distributeCosts(parsedEvents, totalCostFromCostsApi);

  const daily = mergeDailyData(events, costDailyBuckets);
  for (const day of daily) {
    if (day.costUsd <= 0) {
      day.costUsd = events
        .filter((event) => formatISO(new Date(event.occurredAt), { representation: "date" }) === day.date)
        .reduce((sum, event) => sum + event.estimatedCostUsd, 0);
    }
    day.costUsd = Number(day.costUsd.toFixed(6));
  }

  const totals = {
    costUsd: Number(daily.reduce((sum, item) => sum + item.costUsd, 0).toFixed(6)),
    inputTokens: events.reduce((sum, event) => sum + event.inputTokens, 0),
    outputTokens: events.reduce((sum, event) => sum + event.outputTokens, 0),
    requests: events.length,
  };

  return {
    provider: "openai",
    totals,
    daily,
    events,
  };
}
