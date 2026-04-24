"use client";

import { useQuery } from "convex/react";
import { CalendarDays, CheckCircle2, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { getDayContext } from "@/components/calendar/calendar-utils";
import { Badge } from "@/components/shared/badge";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { api } from "@convex/_generated/api";

export function DailyBriefCard() {
  const dayContext = useMemo(() => getDayContext(new Date()), []);
  const snapshot = useQuery(api.dashboard.getDashboardSnapshot, dayContext);

  if (snapshot === undefined) {
    return (
      <DashboardCard
        title="Daily Brief"
        description="Morning context"
        icon={Sparkles}
        className="lg:col-span-2"
        contentClassName="grid gap-4"
      >
        <BriefLoadingState />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Daily Brief"
      description="Morning context"
      icon={Sparkles}
      className="lg:col-span-2"
      contentClassName="grid gap-5"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-start">
        <div className="grid gap-4">
          <p className="max-w-3xl text-sm leading-6 text-foreground/90">
            {snapshot.brief.summary}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>{snapshot.brief.eventCount} events</Badge>
            <Badge>{snapshot.brief.openTaskCount} open tasks</Badge>
            {snapshot.events.length > 0 ? <Badge>Calendar active</Badge> : null}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">Today snapshot</p>
          </div>

          {snapshot.brief.isEmpty ? (
            <div className="rounded-lg border border-dashed bg-background px-4 py-6 text-center">
              <p className="text-sm font-medium">Nothing scheduled yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add one meaningful task or event to give the day shape.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              <SnapshotRow
                icon={CheckCircle2}
                label="Top task"
                value={snapshot.tasks[0]?.title ?? "No tasks planned yet"}
              />
              <SnapshotRow
                icon={CalendarDays}
                label="Next event"
                value={snapshot.events[0]?.title ?? "No events scheduled yet"}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}

function SnapshotRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function BriefLoadingState() {
  return (
    <>
      <div className="h-16 rounded-xl border bg-muted/30" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <div className="grid gap-2">
          <div className="h-4 w-full rounded-md bg-muted" />
          <div className="h-4 w-11/12 rounded-md bg-muted" />
          <div className="h-4 w-3/4 rounded-md bg-muted" />
        </div>
        <div className="grid gap-2 rounded-xl border bg-muted/20 p-4">
          <div className="h-12 rounded-lg bg-muted/40" />
          <div className="h-12 rounded-lg bg-muted/30" />
        </div>
      </div>
    </>
  );
}
