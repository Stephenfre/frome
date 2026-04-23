import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Goal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import {
  LandingHeroActions,
  LandingNavActions,
} from "@/components/marketing/landing-auth-actions";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,oklch(0.93_0.05_206),transparent_32rem),linear-gradient(180deg,oklch(0.99_0_0),oklch(0.96_0.01_240))]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 md:px-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold">ForMe</span>
          </Link>
          <LandingNavActions />
        </nav>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium text-muted-foreground uppercase">
              Mac-first personal hub
            </p>
            <h1 className="text-5xl font-semibold tracking-normal text-balance md:text-7xl">
              ForMe
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              A clean command center for the day ahead: brief, calendar, tasks,
              money, and goals in one quiet workspace.
            </p>
            <LandingHeroActions />
          </div>

          <div className="rounded-xl border bg-background/80 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <h2 className="text-2xl font-semibold">Morning overview</h2>
                </div>
                <div className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-red-400" />
                  <span className="size-3 rounded-full bg-yellow-400" />
                  <span className="size-3 rounded-full bg-green-400" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Daily Brief",
                    value: "3 priorities",
                    icon: Sparkles,
                  },
                  {
                    label: "Tasks",
                    value: "5 planned",
                    icon: CheckCircle2,
                  },
                  {
                    label: "Events",
                    value: "2 meetings",
                    icon: CalendarDays,
                  },
                  {
                    label: "Money",
                    value: "Snapshot ready",
                    icon: CircleDollarSign,
                  },
                  {
                    label: "Goals",
                    value: "Weekly focus",
                    icon: Goal,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border bg-muted/30 p-4"
                  >
                    <item.icon className="mb-4 size-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
