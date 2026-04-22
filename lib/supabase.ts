import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ApiKeyRecord, TeamRecord, WeeklyUsageSummary } from "@/types/usage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedAdminClient: SupabaseClient | null = null;

function assertSupabaseConfig() {
  if (!supabaseUrl) {
    throw new Error("Supabase URL is missing. Set NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Supabase service role key is missing. Set SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}

export function getSupabaseAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  assertSupabaseConfig();

  cachedAdminClient = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedAdminClient;
}

export async function getTeamById(teamId: string): Promise<TeamRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id,name,email,team_size,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end",
    )
    .eq("id", teamId)
    .maybeSingle();

  if (error) throw error;
  return (data as TeamRecord | null) ?? null;
}

export async function getTeamByEmail(email: string): Promise<TeamRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id,name,email,team_size,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end",
    )
    .ilike("email", email)
    .maybeSingle();

  if (error) throw error;
  return (data as TeamRecord | null) ?? null;
}

export async function getTeamApiKeys(teamId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id,team_id,provider,key_name,encrypted_key,updated_at")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ApiKeyRecord[];
}

export async function getLatestWeeklySummary(teamId: string): Promise<WeeklyUsageSummary | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("summary")
    .eq("team_id", teamId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.summary as WeeklyUsageSummary | undefined) ?? null;
}

export function isPaidSubscription(status: string | null | undefined) {
  return ["active", "trialing", "paid", "past_due"].includes(status ?? "");
}
