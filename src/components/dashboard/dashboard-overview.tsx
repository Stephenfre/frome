"use client";

import { SignInButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { CircleDollarSign, Goal, Sparkles } from "lucide-react";

import { AgendaCard } from "@/components/dashboard/agenda-card";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { TasksCard } from "@/components/dashboard/tasks-card";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/ui/button";

export function DashboardOverview() {
  return (
    <>
      <Authenticated>
        <AuthenticatedDashboardOverview />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedDashboardState />
      </Unauthenticated>
      <AuthLoading>
        <DashboardLoadingState />
      </AuthLoading>
    </>
  );
}

function AuthenticatedDashboardOverview() {
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <section>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">
          Daily command center
        </h1>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-2">
        <DashboardCard
          title="Daily Brief"
          description="Morning context"
          icon={Sparkles}
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Your personalized brief will summarize calendar pressure, task
              focus, money signals, and goals once those sources are connected.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge>Calendar-ready</Badge>
              <Badge>Tasks-ready</Badge>
              <Badge>AI later</Badge>
            </div>
          </div>
        </DashboardCard>

        <TasksCard />

        <AgendaCard />

        <DashboardCard
          title="Money"
          description="Financial snapshot"
          icon={CircleDollarSign}
        >
          <p className="text-sm text-muted-foreground">
            Placeholder only. Plaid and account aggregation are not part of this
            starter.
          </p>
        </DashboardCard>

        <DashboardCard title="Goals" description="Weekly focus" icon={Goal}>
          <p className="text-sm text-muted-foreground">
            Track larger personal outcomes here when goal data is added.
          </p>
        </DashboardCard>
      </section>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <section>
        <div className="h-4 w-28 rounded-md bg-muted" />
        <div className="mt-3 h-9 w-80 max-w-full rounded-md bg-muted" />
      </section>
      <section className="grid items-start gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-lg border bg-background" />
        <div className="h-64 rounded-lg border bg-background" />
        <div className="h-96 rounded-lg border bg-background" />
        <div className="h-40 rounded-lg border bg-background" />
        <div className="h-40 rounded-lg border bg-background" />
      </section>
    </div>
  );
}

function UnauthenticatedDashboardState() {
  return (
    <div className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col items-center justify-center rounded-lg border bg-background p-8 text-center">
      <h1 className="text-2xl font-semibold">Sign in to open ForMe</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Your dashboard data is only loaded after Convex has validated your Clerk
        session.
      </p>
      <SignInButton mode="redirect">
        <Button className="mt-6">Sign in</Button>
      </SignInButton>
    </div>
  );
}
