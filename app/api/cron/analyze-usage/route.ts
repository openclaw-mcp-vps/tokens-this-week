import { NextResponse, type NextRequest } from "next/server";
import { addDays, endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { Resend } from "resend";
import { fetchAnthropicUsageSnapshot } from "@/lib/anthropic-client";
import { decryptSecret } from "@/lib/crypto";
import { createWeeklyEmailSummary } from "@/lib/email-templates";
import { fetchOpenAIUsageSnapshot } from "@/lib/openai-client";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { analyzeWeeklyUsage } from "@/lib/usage-analyzer";
import type { ProviderUsageSnapshot } from "@/types/usage";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  return authHeader === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized cron call." }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabase = getSupabaseAdminClient();

  const weekReference = subWeeks(new Date(), 1);
  const weekStart = startOfWeek(weekReference, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekReference, { weekStartsOn: 1 });

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id,name,email,team_size,subscription_status")
    .in("subscription_status", ["active", "trialing", "past_due", "paid"]);

  if (teamsError) {
    console.error("Failed to load teams for cron", teamsError);
    return NextResponse.json({ error: "Unable to load teams." }, { status: 500 });
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const fromEmail = process.env.SUMMARY_FROM_EMAIL;

  const results: Array<{ teamId: string; status: string; detail?: string }> = [];

  for (const team of teams ?? []) {
    try {
      const { data: keyRows, error: keyError } = await supabase
        .from("api_keys")
        .select("provider,encrypted_key")
        .eq("team_id", team.id);

      if (keyError) throw keyError;

      const providerSnapshots: ProviderUsageSnapshot[] = [];
      const providerErrors: string[] = [];

      for (const keyRow of keyRows ?? []) {
        try {
          const rawKey = decryptSecret(String(keyRow.encrypted_key));

          if (keyRow.provider === "openai") {
            providerSnapshots.push(
              await fetchOpenAIUsageSnapshot(rawKey, weekStart, addDays(weekEnd, 1)),
            );
          }

          if (keyRow.provider === "anthropic") {
            providerSnapshots.push(
              await fetchAnthropicUsageSnapshot(rawKey, weekStart, addDays(weekEnd, 1)),
            );
          }
        } catch (providerError) {
          const message = providerError instanceof Error ? providerError.message : "Unknown provider error";
          providerErrors.push(`${keyRow.provider}: ${message}`);
        }
      }

      if (providerSnapshots.length === 0) {
        results.push({
          teamId: team.id,
          status: "skipped",
          detail:
            providerErrors[0] ??
            "No valid API keys found for this team. Add at least one provider key in dashboard.",
        });
        continue;
      }

      const summary = analyzeWeeklyUsage({
        teamId: team.id,
        teamSize: Math.min(Math.max(Number(team.team_size ?? 8), 1), 50),
        weekStart,
        weekEnd,
        snapshots: providerSnapshots,
      });

      const { error: upsertError } = await supabase.from("weekly_reports").upsert(
        {
          team_id: team.id,
          week_start: weekStart.toISOString(),
          week_end: weekEnd.toISOString(),
          generated_at: new Date().toISOString(),
          summary,
        },
        { onConflict: "team_id,week_start" },
      );

      if (upsertError) throw upsertError;

      if (resend && fromEmail && team.email) {
        const email = createWeeklyEmailSummary(team.name || "Your Team", summary);

        await resend.emails.send({
          from: fromEmail,
          to: team.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      }

      results.push({
        teamId: team.id,
        status: providerErrors.length ? "completed_with_provider_errors" : "completed",
        detail: providerErrors.join(" | "),
      });
    } catch (error) {
      console.error(`Usage analysis failed for team ${team.id}`, error);
      results.push({
        teamId: team.id,
        status: "failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    processedTeams: results.length,
    durationMs: Date.now() - startedAt,
    results,
  });
}
