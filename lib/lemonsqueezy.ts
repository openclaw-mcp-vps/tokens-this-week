export function maybeInitializeLemonSqueezy() {
  if (!process.env.LEMONSQUEEZY_API_KEY) return;
  // Placeholder compatibility hook. Billing in this project is Stripe Payment Link based.
}

export function getStripePaymentLink() {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";
}

export function sanitizeSubscriptionStatus(status: string | null | undefined) {
  if (!status) return "inactive";
  if (["active", "trialing", "past_due", "paid"].includes(status)) return status;
  return "inactive";
}
