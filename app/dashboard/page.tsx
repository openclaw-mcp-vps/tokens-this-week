import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiKeyForm } from "@/components/ApiKeyForm";
import { UsageDashboard } from "@/components/UsageDashboard";
import { ACCESS_COOKIE_NAME, verifyAccessCookieValue } from "@/lib/access-cookie";
import { decryptSecret, maskApiKey } from "@/lib/crypto";
import { getLatestWeeklySummary, getSupabaseAdminClient, getTeamById } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard | Tokens This Week",
  description: "Weekly AI spend, waste detection, and prompt optimization recommendations.",
};

type StoredKey = {
  id: string;
  provider: "openai" | "anthropic";
  keyName: string;
  masked: string;
  updatedAt: string;
};

async function loadDashboardData() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const session = await verifyAccessCookieValue(token);

  if (!session) {
    redirect("/");
  }

  const team = await getTeamById(session.teamId);
  if (!team) {
    redirect("/");
  }

  const summary = await getLatestWeeklySummary(team.id);

  const supabase = getSupabaseAdminClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id,provider,key_name,encrypted_key,updated_at")
    .eq("team_id", team.id)
    .order("updated_at", { ascending: false });

  const normalizedKeys: StoredKey[] = (keys ?? []).map((key) => {
    let masked = "Stored key";
    try {
      masked = maskApiKey(decryptSecret(String(key.encrypted_key)));
    } catch {
      masked = "Encrypted key";
    }

    return {
      id: String(key.id),
      provider: key.provider as "openai" | "anthropic",
      keyName: String(key.key_name),
      masked,
      updatedAt: String(key.updated_at ?? ""),
    };
  });

  return { team, summary, normalizedKeys };
}

export default async function DashboardPage() {
  const { team, summary, normalizedKeys } = await loadDashboardData();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-cyan-300">Tokens This Week</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">{team.name} dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Weekly spend intelligence for {team.email}.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to landing
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <ApiKeyForm initialKeys={normalizedKeys} />
        <UsageDashboard summary={summary} />
      </div>
    </main>
  );
}
