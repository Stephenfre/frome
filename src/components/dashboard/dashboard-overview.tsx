"use client";

import { SignInButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { CircleDollarSign, Goal } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DailyBriefCard } from "@/components/dashboard/daily-brief-card";
import { TasksCard } from "@/components/dashboard/tasks-card";
import { TodayPlanCard } from "@/components/dashboard/today-plan-card";
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
    <div className="mx-auto grid w-full max-w-7xl gap-8">
      <section className="grid gap-2">
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">
          Daily command center
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          See today&apos;s priorities, calendar pressure, and next moves in one
          place before the day gets noisy.
        </p>
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-2">
        <DailyBriefCard />
        <TasksCard />
        <TodayPlanCard />
        <DashboardCard
          title="Money"
          description="Financial snapshot"
          icon={CircleDollarSign}
          contentClassName="pt-0"
        >
          <PlaceholderState
            title="No money data yet."
            description="Account connections and cash snapshots can land here once financial sources are added."
          />
        </DashboardCard>

        <DashboardCard
          title="Goals"
          description="Weekly focus"
          icon={Goal}
          contentClassName="pt-0"
        >
          <PlaceholderState
            title="No weekly goals yet."
            description="Track larger outcomes here once goal planning is connected."
          />
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
        <div className="h-64 rounded-lg border bg-background lg:col-span-2" />
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

function PlaceholderState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
