import { Activity, ArrowRight, BadgeDollarSign, Mail, Radar, Wrench } from "lucide-react";
import { PricingSection } from "@/components/PricingSection";
import { UnlockDashboardForm } from "@/components/UnlockDashboardForm";

const faqs = [
  {
    question: "Which APIs are supported?",
    answer:
      "Today we support OpenAI and Anthropic via read-only API keys. You can connect one or both providers, and the weekly report combines them into a single spend view.",
  },
  {
    question: "How does waste detection work?",
    answer:
      "We analyze usage events for expensive patterns like oversized context windows, unbounded output verbosity, and premium-model overuse on lightweight jobs. Each finding includes a concrete fix recommendation.",
  },
  {
    question: "Do you store model prompts?",
    answer:
      "We optimize for minimal retention: encrypted provider keys and derived spend analytics. If your provider usage feed does not expose prompt text, we report anonymized prompt flow fingerprints instead.",
  },
  {
    question: "How quickly do we get value?",
    answer:
      "Most teams get an actionable first report in under one week: top expensive prompt flows, estimated waste, and a prioritized optimization queue.",
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.15),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.14),transparent_35%),radial-gradient(circle_at_60%_75%,rgba(56,189,248,0.08),transparent_38%)]" />
        <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-16 sm:px-8 sm:pt-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-4 py-1 text-xs font-medium text-cyan-200">
            <Radar className="h-3.5 w-3.5" />
            Weekly summary of your team AI spend + waste detection
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-slate-50 sm:text-6xl">
            Visibility first. Optimization second.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            Tokens This Week gives engineering managers a weekly cost intelligence report across OpenAI
            and Anthropic: total spend, waste patterns, top expensive prompt flows, and cost-per-developer
            breakdown. You cannot optimize what you do not measure.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-[#0b1320] transition hover:bg-cyan-200"
            >
              View pricing
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              See how it works
            </a>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-[#101828] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Who pays</p>
              <p className="mt-2 text-sm text-slate-100">Engineering managers at AI-heavy orgs, 5-50 devs</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#101828] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Niche</p>
              <p className="mt-2 text-sm text-slate-100">AI cost tools built for software teams</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#101828] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Cadence</p>
              <p className="mt-2 text-sm text-slate-100">Automated weekly email every Monday morning</p>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-[#101a2c] p-6">
            <BadgeDollarSign className="h-5 w-5 text-cyan-300" />
            <h2 className="mt-4 text-xl font-semibold text-slate-100">Problem</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Teams burn budget in the background with no weekly visibility. By the time finance flags AI
              spend, optimization is already late.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#101a2c] p-6">
            <Activity className="h-5 w-5 text-emerald-300" />
            <h2 className="mt-4 text-xl font-semibold text-slate-100">Solution</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Connect provider keys once, then get a manager-ready weekly brief: spend totals, anomalies,
              waste insights, and highest-impact prompt fixes.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#101a2c] p-6">
            <Wrench className="h-5 w-5 text-violet-300" />
            <h2 className="mt-4 text-xl font-semibold text-slate-100">Why now</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              caveman + prompt-shrinker can optimize prompts, but teams need baseline visibility first.
              Tokens This Week closes that gap.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8">
        <div className="rounded-3xl border border-white/10 bg-[#0f1726] p-8 sm:p-10">
          <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">What you get every week</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#0b1320] p-4 text-sm text-slate-200">
              Total spend across OpenAI + Anthropic with trendline
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0b1320] p-4 text-sm text-slate-200">
              Waste patterns detected with estimated dollars to recover
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0b1320] p-4 text-sm text-slate-200">
              Top 5 expensive prompt flows to optimize first
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0b1320] p-4 text-sm text-slate-200">
              Cost-per-developer breakdown for accountability
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-cyan-200/15 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            <Mail className="mt-0.5 h-4 w-4" />
            <p>
              Reports are email-native, so managers can forward a concise weekly snapshot directly into
              standups or sprint planning.
            </p>
          </div>
        </div>
      </section>

      <PricingSection />

      <UnlockDashboardForm />

      <section id="faq" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8">
        <h2 className="text-3xl font-semibold text-slate-100">FAQ</h2>
        <div className="mt-8 grid gap-4">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-2xl border border-white/10 bg-[#0f1726] p-5">
              <h3 className="text-base font-semibold text-slate-100">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
