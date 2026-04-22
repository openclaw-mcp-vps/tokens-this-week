import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type StripeEventPayload = {
  id: string;
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

function parseStripeSignature(header: string | null) {
  if (!header) return null;

  const segments = header.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split("=");
    if (!key || !value) return acc;
    acc[key] = acc[key] ? [...acc[key], value] : [value];
    return acc;
  }, {});

  const timestamp = segments.t?.[0];
  const signatures = segments.v1 ?? [];

  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const parsed = parseStripeSignature(signatureHeader);
  if (!parsed) return false;

  const ageSeconds = Math.floor(Date.now() / 1000) - Number(parsed.timestamp);
  if (Number.isFinite(ageSeconds) && Math.abs(ageSeconds) > 5 * 60) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");

  return parsed.signatures.some((candidate) => {
    try {
      return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

function eventEmail(object: Record<string, unknown>) {
  const customerDetails = object.customer_details as Record<string, unknown> | undefined;
  const customerEmail = typeof object.customer_email === "string" ? object.customer_email : null;
  const detailsEmail = customerDetails && typeof customerDetails.email === "string" ? customerDetails.email : null;
  return (detailsEmail || customerEmail || "").toLowerCase();
}

function toIsoFromUnix(value: unknown) {
  const timestamp = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp * 1000).toISOString();
}

function defaultTeamNameFromEmail(email: string) {
  const local = email.split("@")[0] || "team";
  const pretty = local.replace(/[._-]+/g, " ").trim();
  return `${pretty.charAt(0).toUpperCase()}${pretty.slice(1)} Team`;
}

async function upsertTeamFromCheckout(event: StripeEventPayload) {
  const object = event.data?.object;
  if (!object) return;

  const email = eventEmail(object);
  if (!email) return;

  const teamName =
    typeof object.client_reference_id === "string" && object.client_reference_id.trim()
      ? object.client_reference_id
      : defaultTeamNameFromEmail(email);

  const customerId = typeof object.customer === "string" ? object.customer : null;
  const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("teams").upsert(
    {
      email,
      name: teamName,
      subscription_status: "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_end: toIsoFromUnix(object.current_period_end),
      team_size: 8,
    },
    { onConflict: "email" },
  );

  if (error) throw error;
}

async function updateSubscriptionStatus(event: StripeEventPayload) {
  const object = event.data?.object;
  if (!object) return;

  const status = typeof object.status === "string" ? object.status : "inactive";
  const customerId = typeof object.customer === "string" ? object.customer : null;
  const subscriptionId = typeof object.id === "string" ? object.id : null;

  const supabase = getSupabaseAdminClient();

  if (subscriptionId) {
    const { error } = await supabase
      .from("teams")
      .update({
        subscription_status: status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        current_period_end: toIsoFromUnix(object.current_period_end),
      })
      .eq("stripe_subscription_id", subscriptionId);

    if (!error) return;
  }

  if (customerId) {
    const { error } = await supabase
      .from("teams")
      .update({
        subscription_status: status,
        stripe_customer_id: customerId,
        current_period_end: toIsoFromUnix(object.current_period_end),
      })
      .eq("stripe_customer_id", customerId);

    if (error) throw error;
  }
}

async function markSubscriptionCanceled(event: StripeEventPayload) {
  const object = event.data?.object;
  if (!object) return;

  const subscriptionId = typeof object.id === "string" ? object.id : null;
  const customerId = typeof object.customer === "string" ? object.customer : null;
  const supabase = getSupabaseAdminClient();

  if (subscriptionId) {
    const { error } = await supabase
      .from("teams")
      .update({ subscription_status: "canceled" })
      .eq("stripe_subscription_id", subscriptionId);

    if (error) throw error;
    return;
  }

  if (customerId) {
    const { error } = await supabase
      .from("teams")
      .update({ subscription_status: "canceled" })
      .eq("stripe_customer_id", customerId);

    if (error) throw error;
  }
}

export async function POST(request: NextRequest) {
  const rawPayload = await request.text();

  if (!verifyStripeSignature(rawPayload, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: StripeEventPayload;

  try {
    payload = JSON.parse(rawPayload) as StripeEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    switch (payload.type) {
      case "checkout.session.completed":
      case "invoice.paid":
        await upsertTeamFromCheckout(payload);
        break;
      case "customer.subscription.updated":
        await updateSubscriptionStatus(payload);
        break;
      case "customer.subscription.deleted":
      case "invoice.payment_failed":
        await markSubscriptionCanceled(payload);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
