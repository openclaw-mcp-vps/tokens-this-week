import { formatISO } from "date-fns";
import type { DailyUsagePoint, ProviderUsageSnapshot, UsageEvent } from "@/types/usage";

const ANTHROPIC_USAGE_API = "https://api.anthropic.com/v1/organizations/usage_report/messages";

type UnknownRecord = Record<string, unknown>;

const MODEL_RATES_PER_MILLION: Array<{ pattern: RegExp; input: number; output: number }> = [
  { pattern: /claude-3-7|claude-opus-4|claude-opus/i, input: 15, output: 75 },
  { pattern: /claude-sonnet-4|claude-3-5-sonnet/i, input: 3, output: 15 },
  { pattern: /claude-haiku/i, input: 0.8, output: 4 },
];

function asNumber(value: unknown) {
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : 0;
}

function estimateAnthropicCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const pricing = MODEL_RATES_PER_MILLION.find((entry) => entry.pattern.test(model));
  const fallback = { input: 3, output: 15 };
  const rate = pricing ?? fallback;

  return (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
}

async function fetchUsageReport(apiKey: string, startDate: Date, endDate: Date) {
  const response = await fetch(ANTHROPIC_USAGE_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      starting_at: startDate.toISOString(),
      ending_at: endDate.toISOString(),
      granularity: "day",
      limit: 500,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Anthropic usage API call failed (${response.status}): ${errorBody.slice(0, 300)}`,
    );
  }

  return (await response.json()) as UnknownRecord;
}

function normalizePromptLabel(record: UnknownRecord) {
  const workspace = String(record.workspace_id ?? "").trim();
  const source = String(record.source ?? "").trim();

  if (workspace) return `Workspace ${workspace}`;
  if (source) return `Source ${source}`;
  return "Unlabeled Claude usage";
}

function parseAnthropicRecords(response: UnknownRecord): UsageEvent[] {
  const records = Array.isArray(response.data)
    ? (response.data as UnknownRecord[])
    : Array.isArray(response.results)
      ? (response.results as UnknownRecord[])
      : [];

  return records.map((record, index) => {
    const model = String(record.model ?? "claude-unknown");
    const inputTokens = asNumber(record.input_tokens);
    const outputTokens = asNumber(record.output_tokens);
    const occurredAt = String(record.starting_at ?? record.timestamp ?? new Date().toISOString());

    return {
      id: `anthropic-${record.id ?? index}`,
      provider: "anthropic",
      model,
      promptLabel: normalizePromptLabel(record),
      developer: record.user_id ? String(record.user_id) : null,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateAnthropicCostUsd(model, inputTokens, outputTokens),
      occurredAt,
    } satisfies UsageEvent;
  });
}

function buildDailyFromEvents(events: UsageEvent[]): DailyUsagePoint[] {
  const map = new Map<string, DailyUsagePoint>();

  for (const event of events) {
    const date = formatISO(new Date(event.occurredAt), { representation: "date" });
    const existing = map.get(date) ?? {
      date,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      requests: 0,
    };

    existing.costUsd += event.estimatedCostUsd;
    existing.inputTokens += event.inputTokens;
    existing.outputTokens += event.outputTokens;
    existing.requests += 1;

    map.set(date, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      ...item,
      costUsd: Number(item.costUsd.toFixed(6)),
    }));
}

export async function fetchAnthropicUsageSnapshot(
  apiKey: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<ProviderUsageSnapshot> {
  const raw = await fetchUsageReport(apiKey, weekStart, weekEnd);
  const events = parseAnthropicRecords(raw);
  const daily = buildDailyFromEvents(events);

  return {
    provider: "anthropic",
    totals: {
      costUsd: Number(daily.reduce((sum, point) => sum + point.costUsd, 0).toFixed(6)),
      inputTokens: events.reduce((sum, event) => sum + event.inputTokens, 0),
      outputTokens: events.reduce((sum, event) => sum + event.outputTokens, 0),
      requests: events.length,
    },
    daily,
    events,
  };
}
