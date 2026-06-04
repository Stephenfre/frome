"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDayContext } from "@/components/calendar/calendar-utils";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/ui/button";
import { api } from "@convex/_generated/api";

export function DailyBriefCard() {
  const dayContext = useMemo(() => getDayContext(new Date()), []);
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const snapshot = useQuery(api.dashboard.getDashboardSnapshot, dayContext);
  const brief = useQuery(api.dailyBriefs.getDailyBriefForDate, {
    date: dayContext.dateKey,
  });
  const saveBrief = useMutation(api.dailyBriefs.saveDailyBriefFromClient);
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestedDate, setRequestedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(force = false) {
    if (isGenerating || snapshot === undefined) {
      return;
    }

    setError(null);
    setIsGenerating(true);
    setRequestedDate(dayContext.dateKey);

    try {
      const response = await fetch("/api/daily-brief", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          date: dayContext.dateKey,
          ...dayContext,
          timezone,
          force,
        }),
      });

      const payload = (await response.json()) as {
        brief?: {
          summary: string;
          topPriorities: string[];
          warning?: string | null;
          suggestion?: string | null;
          emailSummary?: {
            summary: string;
            importantCount: number;
            ignoreCount: number;
            items: Array<{
              id: string;
              subject: string;
              from: string;
              reason: string;
              category: string;
              priority: string;
              suggestedAction?: string;
            }>;
          } | null;
          generatedAt: number;
          model: string;
        };
        error?: string;
      };

      if (!response.ok || !payload.brief) {
        throw new Error(payload.error ?? "Could not generate the daily brief right now.");
      }

      await saveBrief({
        date: dayContext.dateKey,
        summary: payload.brief.summary,
        topPriorities: payload.brief.topPriorities,
        warning: payload.brief.warning ?? undefined,
        suggestion: payload.brief.suggestion ?? undefined,
        emailSummary: payload.brief.emailSummary ?? undefined,
        generatedAt: payload.brief.generatedAt,
        model: payload.brief.model,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not generate the daily brief right now.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    setRequestedDate(null);
    setError(null);
  }, [dayContext.dateKey]);

  useEffect(() => {
    if (
      snapshot === undefined ||
      brief === undefined ||
      brief !== null ||
      requestedDate === dayContext.dateKey
    ) {
      return;
    }

    void handleGenerate();
  }, [brief, dayContext.dateKey, requestedDate, snapshot]);

  if (snapshot === undefined || brief === undefined || (isGenerating && !brief)) {
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
      headerAction={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleGenerate(true)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden="true" />
          )}
          Regenerate
        </Button>
      }
    >
      {brief ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-start">
          <div className="grid gap-4">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <p className="max-w-3xl text-sm leading-6 text-foreground/90">
              {brief.summary}
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge>{snapshot.counts.eventCount} events</Badge>
              <Badge>{snapshot.counts.openTaskCount} open tasks</Badge>
              {snapshot.counts.activeGoalCount > 0 ? (
                <Badge>{snapshot.counts.activeGoalCount} active goals</Badge>
              ) : null}
            </div>

            {brief.topPriorities.length > 0 ? (
              <div className="grid gap-3 rounded-xl border bg-background p-4">
                <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Top priorities
                </p>
                <ul className="grid gap-2">
                  {brief.topPriorities.map((priority) => (
                    <li
                      key={priority}
                      className="flex items-start gap-2 text-sm leading-6"
                    >
                      <span className="mt-2 size-1.5 rounded-full bg-foreground/60" />
                      <span>{priority}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {brief.warning ? (
              <Callout
                icon={AlertTriangle}
                label="Watch for"
                tone="warning"
                value={brief.warning}
              />
            ) : null}

            {brief.suggestion ? (
              <Callout
                icon={Sparkles}
                label="Suggestion"
                tone="neutral"
                value={brief.suggestion}
              />
            ) : null}

            {brief.emailSummary ? (
              <div className="grid gap-3 rounded-xl border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Inbox attention
                  </p>
                  <Badge>{brief.emailSummary.importantCount} important</Badge>
                </div>
                <p className="text-sm text-foreground/90">
                  {brief.emailSummary.summary}
                </p>
                <div className="grid gap-2">
                  {brief.emailSummary.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-lg border bg-muted/15 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.subject}</p>
                        <Badge>{item.category}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                      {item.suggestedAction ? (
                        <p className="mt-2 text-sm text-foreground/90">
                          {item.suggestedAction}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium">Today snapshot</p>
            </div>

            {snapshot.counts.isEmpty ? (
              <div className="rounded-lg border border-dashed bg-background px-4 py-6 text-center">
                <p className="text-sm font-medium">Nothing scheduled yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add one meaningful task, goal, or event to give the day shape.
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
                <SnapshotRow
                  icon={Target}
                  label="Active goal"
                  value={snapshot.goals[0]?.title ?? "No active goals right now"}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyBriefState
          error={error}
          isGenerating={isGenerating}
          onGenerate={() => void handleGenerate(true)}
        />
      )}
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

function Callout({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  tone: "neutral" | "warning";
}) {
  return (
    <div
      className={
        tone === "warning"
          ? "grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
          : "grid gap-2 rounded-xl border bg-muted/20 p-4"
      }
    >
      <div className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] uppercase">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="text-sm leading-6">{value}</p>
    </div>
  );
}

function EmptyBriefState({
  error,
  isGenerating,
  onGenerate,
}: {
  error: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-8 text-center">
      <p className="text-sm font-medium">No daily brief yet.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate a short planning summary from today&apos;s events, tasks, and
        goals.
      </p>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={onGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="size-4" aria-hidden="true" />
        )}
        Generate brief
      </Button>
    </div>
  );
}

function BriefLoadingState() {
  return (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Building your morning brief
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <div className="grid gap-3">
          <div className="h-4 w-full rounded-md bg-muted" />
          <div className="h-4 w-11/12 rounded-md bg-muted" />
          <div className="h-4 w-3/4 rounded-md bg-muted" />
          <div className="h-24 rounded-xl border bg-muted/20" />
          <div className="h-20 rounded-xl border bg-muted/20" />
        </div>
        <div className="grid gap-2 rounded-xl border bg-muted/20 p-4">
          <div className="h-12 rounded-lg bg-muted/40" />
          <div className="h-12 rounded-lg bg-muted/30" />
          <div className="h-12 rounded-lg bg-muted/20" />
        </div>
      </div>
    </>
  );
}
