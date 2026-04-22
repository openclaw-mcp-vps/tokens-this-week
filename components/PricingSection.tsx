import { CheckCircle2 } from "lucide-react";

const features = [
  "Weekly spend digest across OpenAI + Anthropic",
  "Waste pattern detection with fix recommendations",
  "Top 5 expensive prompt flows to optimize first",
  "Cost-per-developer visibility for engineering managers",
  "Automated email report every Monday morning",
];

export function PricingSection() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8">
      <div className="rounded-3xl border border-white/10 bg-[#0f1625] p-8 shadow-[0_0_0_1px_rgba(148,163,184,0.08)] sm:p-12">
        <p className="text-sm uppercase tracking-[0.18em] text-cyan-300">Pricing</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-100 sm:text-4xl">
          One plan. Clear accountability.
        </h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Tokens This Week is built for engineering managers running AI-heavy teams who need a weekly
          spend signal before rolling out optimization work.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-5xl font-semibold text-slate-50">$19</p>
            <p className="mt-2 text-slate-300">per team, per month</p>
            <ul className="mt-6 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/15 bg-[#0b1320] p-6 lg:w-[320px]">
            <p className="text-sm text-slate-300">
              Checkout is hosted by Stripe. Use the same work email for payment and dashboard unlock.
            </p>
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-[#0b1320] transition hover:bg-cyan-200"
            >
              Start for $19/month
            </a>
            {!paymentLink && (
              <p className="mt-3 text-xs text-amber-300">
                Missing `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`. Add it in environment settings.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
