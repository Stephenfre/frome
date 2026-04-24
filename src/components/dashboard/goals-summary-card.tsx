"use client";

import { useQuery } from "convex/react";
import { AlertCircle, ArrowRight, Goal } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@convex/_generated/api";

export function GoalsSummaryCard() {
  const summary = useQuery(api.goals.getGoalDashboardSummary);

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Goals</CardTitle>
          <CardDescription>Keep long-horizon work actionable.</CardDescription>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Goal className="size-4 text-muted-foreground" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="grid gap-4">
        {summary === undefined ? (
          <GoalsSummaryLoadingState />
        ) : summary.activeGoalCount === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
            <h3 className="text-sm font-medium">No active goals yet.</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with 1-3 concrete goals.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm leading-6 text-foreground/90">
              {summary.summary}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge>{summary.activeGoalCount} active goals</Badge>
              {summary.needsClarityCount > 0 ? (
                <Badge>{summary.needsClarityCount} need clarity</Badge>
              ) : null}
              {summary.onTrackCount > 0 ? (
                <Badge>{summary.onTrackCount} on track</Badge>
              ) : null}
            </div>

            <div className="grid gap-2">
              {summary.goals.slice(0, 3).map((goal) => (
                <div
                  key={goal._id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{goal.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {goal.progressState} • {goal.projectCount} projects
                    </p>
                  </div>
                  {goal.projectsMissingNextActions > 0 ? (
                    <AlertCircle
                      className="size-4 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/goals">
              Open goals
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalsSummaryLoadingState() {
  return (
    <div className="grid gap-2">
      <div className="h-4 w-full rounded-md bg-muted" />
      <div className="h-4 w-5/6 rounded-md bg-muted" />
      <div className="h-12 rounded-lg border bg-muted/20" />
      <div className="h-12 rounded-lg border bg-muted/15" />
    </div>
  );
}
