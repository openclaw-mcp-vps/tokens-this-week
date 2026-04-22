import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE_NAME, verifyAccessCookieValue } from "@/lib/access-cookie";
import { decryptSecret, encryptSecret, maskApiKey } from "@/lib/crypto";
import { getSupabaseAdminClient, getTeamById, isPaidSubscription } from "@/lib/supabase";

export const runtime = "nodejs";

const providerSchema = z.enum(["openai", "anthropic"]);

const createApiKeySchema = z.object({
  provider: providerSchema,
  apiKey: z.string().min(12),
  keyName: z.string().min(2).max(80).default("Primary key"),
});

const deleteApiKeySchema = z.object({
  provider: providerSchema,
});

async function requireTeam(request: NextRequest) {
  const cookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const session = await verifyAccessCookieValue(cookie);

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const team = await getTeamById(session.teamId);
  if (!team || !isPaidSubscription(team.subscription_status)) {
    return { error: NextResponse.json({ error: "Active subscription required." }, { status: 403 }) };
  }

  return { team };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTeam(request);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("api_keys")
      .select("id,provider,key_name,encrypted_key,updated_at")
      .eq("team_id", auth.team.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const keys = (data ?? []).map((key) => {
      let masked = "••••";
      try {
        masked = maskApiKey(decryptSecret(String(key.encrypted_key)));
      } catch {
        masked = "Stored key";
      }

      return {
        id: key.id,
        provider: key.provider,
        keyName: key.key_name,
        masked,
        updatedAt: key.updated_at,
      };
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("Failed to read API keys", error);
    return NextResponse.json({ error: "Could not load API keys." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTeam(request);
    if (auth.error) return auth.error;

    const payload = createApiKeySchema.parse(await request.json());

    const encrypted = encryptSecret(payload.apiKey.trim());
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("api_keys").upsert(
      {
        team_id: auth.team.id,
        provider: payload.provider,
        key_name: payload.keyName,
        encrypted_key: encrypted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,provider" },
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid API key payload.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("Failed to save API key", error);
    return NextResponse.json({ error: "Could not save API key." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireTeam(request);
    if (auth.error) return auth.error;

    const payload = deleteApiKeySchema.parse(await request.json());
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("team_id", auth.team.id)
      .eq("provider", payload.provider);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
    }

    console.error("Failed to delete API key", error);
    return NextResponse.json({ error: "Could not delete API key." }, { status: 500 });
  }
}
