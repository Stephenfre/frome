"use client";

import { useMutation } from "convex/react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  formatGoalCategory,
  formatGoalHorizon,
  getGoalProgressClassName,
  getGoalStatusClassName,
} from "@/components/goals/goals-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { GoalView } from "@convex/goals";

export function GoalCard({ goal }: { goal: GoalView }) {
  const deleteGoal = useMutation(api.goals.deleteGoal);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteGoal({ goalId: goal._id });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid gap-4 rounded-xl border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
                getGoalStatusClassName(goal.status),
              )}
            >
              {goal.status}
            </span>
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
                getGoalProgressClassName(goal.progressState),
              )}
            >
              {goal.progressState}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold">{goal.title}</h3>
          {goal.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {goal.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center rounded-md border bg-muted/20 px-2 py-1">
          {formatGoalCategory(goal.category)}
        </span>
        <span className="inline-flex items-center rounded-md border bg-muted/20 px-2 py-1">
          {formatGoalHorizon(goal.horizon)}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border bg-muted/15 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            <FolderKanban className="size-3.5" aria-hidden="true" />
            Projects
          </div>
          <p className="mt-2 text-lg font-semibold">{goal.projectCount}</p>
          <p className="text-xs text-muted-foreground">
            {goal.projectsMissingNextActions} missing a next action
          </p>
        </div>

        <div className="rounded-lg border bg-muted/15 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Completions
          </div>
          <p className="mt-2 text-lg font-semibold">
            {goal.completedNextActionCount}
          </p>
          <p className="text-xs text-muted-foreground">
            Completed next actions
          </p>
        </div>
      </div>

      {goal.projectsMissingNextActions > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            One or more projects need a visible next action to keep this goal
            moving.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isDeleting}
              aria-label={`Delete ${goal.title}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete goal?</AlertDialogTitle>
              <AlertDialogDescription>
                Delete &quot;{goal.title}&quot; and all of its projects and next
                actions? This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/goals/${goal._id}`}>
            View goal
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
