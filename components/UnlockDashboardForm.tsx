"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type ApiMessage = {
  error?: string;
  nextStep?: string;
};

export function UnlockDashboardForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [registerState, setRegisterState] = useState<ApiMessage | null>(null);
  const [unlockState, setUnlockState] = useState<ApiMessage | null>(null);

  const [teamName, setTeamName] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [teamSize, setTeamSize] = useState<number>(8);
  const [unlockEmail, setUnlockEmail] = useState("");

  async function registerTeam() {
    setRegisterState(null);

    const response = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "register",
        teamName,
        email: teamEmail,
        teamSize,
      }),
    });

    const data = (await response.json()) as ApiMessage;

    if (!response.ok) {
      setRegisterState({ error: data.error || "Failed to save team details." });
      return;
    }

    setRegisterState({ nextStep: data.nextStep || "Team registered." });
  }

  async function unlockDashboard() {
    setUnlockState(null);

    const response = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "unlock", email: unlockEmail }),
    });

    const data = (await response.json()) as ApiMessage;

    if (!response.ok) {
      setUnlockState({ error: data.error || "Unable to unlock dashboard." });
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function run(action: "register" | "unlock") {
    startTransition(async () => {
      if (action === "register") {
        await registerTeam();
      } else {
        await unlockDashboard();
      }
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8">
      <div className="grid gap-6 rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0c1422] p-6">
          <h3 className="text-xl font-semibold text-slate-100">1) Register team details</h3>
          <p className="mt-2 text-sm text-slate-300">
            Save your team profile so we know who to activate after Stripe checkout.
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Team name"
              className="w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300/60 placeholder:text-slate-500 focus:ring-2"
            />
            <input
              type="email"
              value={teamEmail}
              onChange={(event) => setTeamEmail(event.target.value)}
              placeholder="manager@company.com"
              className="w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300/60 placeholder:text-slate-500 focus:ring-2"
            />
            <input
              type="number"
              min={1}
              max={50}
              value={teamSize}
              onChange={(event) => setTeamSize(Number(event.target.value || "8"))}
              placeholder="Team size"
              className="w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300/60 placeholder:text-slate-500 focus:ring-2"
            />
          </div>
          <button
            type="button"
            onClick={() => run("register")}
            disabled={isPending || !teamName || !teamEmail}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-[#0d1117] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save team profile
          </button>
          {registerState?.error && <p className="mt-3 text-sm text-rose-300">{registerState.error}</p>}
          {registerState?.nextStep && <p className="mt-3 text-sm text-emerald-300">{registerState.nextStep}</p>}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1422] p-6">
          <h3 className="text-xl font-semibold text-slate-100">2) Unlock paid dashboard</h3>
          <p className="mt-2 text-sm text-slate-300">
            After checkout, enter the same billing email to activate your cookie-based access.
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="email"
              value={unlockEmail}
              onChange={(event) => setUnlockEmail(event.target.value)}
              placeholder="manager@company.com"
              className="w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300/60 placeholder:text-slate-500 focus:ring-2"
            />
          </div>
          <button
            type="button"
            onClick={() => run("unlock")}
            disabled={isPending || !unlockEmail}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-[#0b1320] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Unlock dashboard
          </button>
          {unlockState?.error && <p className="mt-3 text-sm text-rose-300">{unlockState.error}</p>}
        </div>
      </div>
    </section>
  );
}
