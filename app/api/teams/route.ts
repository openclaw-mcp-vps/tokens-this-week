import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_TTL_SECONDS,
  createAccessCookieValue,
  verifyAccessCookieValue,
} from "@/lib/access-cookie";
import {
  getLatestWeeklySummary,
  getSupabaseAdminClient,
  getTeamByEmail,
  getTeamById,
  isPaidSubscription,
} from "@/lib/supabase";

export const runtime = "nodejs";

const registerSchema = z.object({
  mode: z.literal("register"),
  teamName: z.string().min(2).max(120),
  email: z.string().email(),
  teamSize: z.number().int().min(1).max(50).default(8),
});

const unlockSchema = z.object({
  mode: z.literal("unlock"),
  email: z.string().email(),
});

const logoutSchema = z.object({
  mode: z.literal("logout"),
});

const payloadSchema = z.union([registerSchema, unlockSchema, logoutSchema]);

async function parsePayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return payloadSchema.parse(await request.json());
  }

  const formData = await request.formData();
  const mode = String(formData.get("mode") ?? "");

  if (mode === "register") {
    return registerSchema.parse({
      mode,
      teamName: String(formData.get("teamName") ?? ""),
      email: String(formData.get("email") ?? ""),
      teamSize: Number(formData.get("teamSize") ?? 8),
    });
  }

  if (mode === "unlock") {
    return unlockSchema.parse({
      mode,
      email: String(formData.get("email") ?? ""),
    });
  }

  return logoutSchema.parse({ mode: "logout" });
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const session = await verifyAccessCookieValue(cookie);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const team = await getTeamById(session.teamId);
    if (!team) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const summary = await getLatestWeeklySummary(team.id);

    return NextResponse.json({
      authenticated: true,
      team,
      latestSummary: summary,
    });
  } catch (error) {
    console.error("Failed to resolve team session", error);
    return NextResponse.json(
      { error: "Failed to resolve team session." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parsePayload(request);

    if (payload.mode === "logout") {
      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: ACCESS_COOKIE_NAME,
        value: "",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    const supabase = getSupabaseAdminClient();

    if (payload.mode === "register") {
      const normalizedEmail = payload.email.toLowerCase();

      const { data, error } = await supabase
        .from("teams")
        .upsert(
          {
            name: payload.teamName,
            email: normalizedEmail,
            team_size: payload.teamSize,
            subscription_status: "pending_checkout",
          },
          { onConflict: "email" },
        )
        .select("id,name,email,team_size,subscription_status")
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        team: data,
        nextStep:
          "Complete checkout with the same email. After payment, return here and click Unlock Dashboard.",
      });
    }

    const team = await getTeamByEmail(payload.email.toLowerCase());

    if (!team || !isPaidSubscription(team.subscription_status)) {
      return NextResponse.json(
        {
          error:
            "No paid subscription was found for this email yet. Complete checkout first, then retry unlock.",
        },
        { status: 403 },
      );
    }

    const token = await createAccessCookieValue(team.id, team.email);
    const response = NextResponse.json({ success: true, team });

    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_COOKIE_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("/api/teams failed", error);
    return NextResponse.json(
      { error: "Failed to process team request." },
      { status: 500 },
    );
  }
}
