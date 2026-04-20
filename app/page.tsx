export default function Home() {
  const checkoutUrl = process.env.NEXT_PUBLIC_LS_CHECKOUT_URL || "#";
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-block bg-[#161b22] border border-[#30363d] rounded-full px-4 py-1 text-sm text-[#58a6ff] mb-6">
          For engineering managers at AI-heavy teams
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
          Stop guessing what your{" "}
          <span className="text-[#58a6ff]">AI spend</span>{" "}
          is actually doing
        </h1>
        <p className="text-lg text-[#8b949e] mb-8 max-w-xl mx-auto">
          Tokens This Week connects to your OpenAI and Anthropic accounts and sends your team a weekly email: total spend, waste patterns, top 5 prompts to optimize, and cost per developer.
        </p>
        <a
          href={checkoutUrl}
          className="inline-block bg-[#58a6ff] hover:bg-[#79b8ff] text-[#0d1117] font-semibold px-8 py-3 rounded-lg text-lg transition-colors"
        >
          Start for $19/mo
        </a>
        <p className="mt-4 text-sm text-[#8b949e]">One team. Unlimited developers. Cancel anytime.</p>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { icon: "📊", title: "Weekly Spend Summary", desc: "Total tokens and dollars across OpenAI and Anthropic, delivered every Monday morning." },
            { icon: "🔍", title: "Waste Detection", desc: "Automatically flags repeated failed prompts, oversized contexts, and redundant calls." },
            { icon: "👤", title: "Per-Developer Breakdown", desc: "See exactly who is spending what so you can coach and optimize effectively." }
          ].map((f) => (
            <div key={f.title} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-[#8b949e]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-md mx-auto px-6 pb-16">
        <div className="bg-[#161b22] border border-[#58a6ff] rounded-2xl p-8 text-center">
          <div className="text-sm text-[#58a6ff] font-medium mb-2 uppercase tracking-wide">Team Plan</div>
          <div className="text-5xl font-bold text-white mb-1">$19</div>
          <div className="text-[#8b949e] mb-6">per team / month</div>
          <ul className="text-left space-y-3 mb-8">
            {[
              "Connect OpenAI + Anthropic (read-only)",
              "Weekly email digest every Monday",
              "Waste pattern detection",
              "Top 5 prompts to optimize",
              "Cost-per-developer breakdown",
              "5–50 developers supported"
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <span className="text-[#58a6ff] mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <a
            href={checkoutUrl}
            className="block w-full bg-[#58a6ff] hover:bg-[#79b8ff] text-[#0d1117] font-semibold py-3 rounded-lg text-center transition-colors"
          >
            Get Started
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: "Is my API key safe?",
              a: "Yes. We only request read-only usage data — we never touch your billing settings or make API calls on your behalf. Keys are encrypted at rest."
            },
            {
              q: "Which APIs do you support?",
              a: "OpenAI and Anthropic today. We are adding Google Gemini and Mistral based on demand."
            },
            {
              q: "What counts as waste?",
              a: "We flag patterns like repeated identical prompts, extremely long contexts with low output, and high error-rate calls that burn tokens without results."
            }
          ].map((faq) => (
            <div key={faq.q} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-sm text-[#8b949e]">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#30363d] text-center py-8 text-sm text-[#8b949e]">
        © {new Date().getFullYear()} Tokens This Week. Built for engineering managers who care about AI ROI.
      </footer>
    </main>
  );
}
