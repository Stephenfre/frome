"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Archive,
  CheckCircle2,
  CirclePause,
  FolderPlus,
  Pencil,
  Target,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoalForm } from "@/components/goals/goal-form";
import { ProjectCard } from "@/components/goals/project-card";
import { ProjectForm } from "@/components/goals/project-form";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export function GoalDetail({ goalId }: { goalId: Id<"goals"> }) {
  const router = useRouter();
  const goal = useQuery(api.goals.getGoalById, { goalId });
  const pauseGoal = useMutation(api.goals.pauseGoal);
  const completeGoal = useMutation(api.goals.completeGoal);
  const archiveGoal = useMutation(api.goals.archiveGoal);
  const deleteGoal = useMutation(api.goals.deleteGoal);
  const [isGoalFormVisible, setIsGoalFormVisible] = useState(false);
  const [isProjectFormVisible, setIsProjectFormVisible] = useState(false);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(action: "pause" | "complete" | "archive") {
    if (isUpdatingStatus) {
      return;
    }

    setError(null);
    setIsUpdatingStatus(true);

    try {
      if (action === "pause") {
        await pauseGoal({ goalId });
      } else if (action === "complete") {
        await completeGoal({ goalId });
      } else {
        await archiveGoal({ goalId });
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update the goal. Try again.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleDeleteGoal() {
    if (isDeletingGoal) {
      return;
    }

    setError(null);
    setIsDeletingGoal(true);

    try {
      await deleteGoal({ goalId });
      router.push("/dashboard/goals");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete the goal. Try again.",
      );
      setIsDeletingGoal(false);
    }
  }

  if (goal === undefined) {
    return <GoalDetailLoadingState />;
  }

  if (goal === null) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-12 text-center">
        <h1 className="text-lg font-semibold">Goal not found.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This goal may have been removed or you may not have access to it.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/goals">Back to goals</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Goal detail</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            {goal.title}
          </h1>
          {goal.description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {goal.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsGoalFormVisible((value) => !value)}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            {isGoalFormVisible ? "Close editor" : "Edit goal"}
          </Button>
          {goal.status === "active" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("pause")}
              disabled={isUpdatingStatus}
            >
              <CirclePause className="size-3.5" aria-hidden="true" />
              Pause
            </Button>
          ) : null}
          {goal.status !== "completed" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("complete")}
              disabled={isUpdatingStatus}
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Complete
            </Button>
          ) : null}
          {goal.status !== "archived" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("archive")}
              disabled={isUpdatingStatus}
            >
              <Archive className="size-3.5" aria-hidden="true" />
              Archive
            </Button>
          ) : null}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeletingGoal}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete
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
                <AlertDialogAction
                  onClick={handleDeleteGoal}
                  disabled={isDeletingGoal}
                >
                  {isDeletingGoal ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      {isGoalFormVisible ? (
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Edit Goal</CardTitle>
            <CardDescription>
              Keep the outcome specific and easy to review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoalForm
              initialGoal={goal}
              onCancel={() => setIsGoalFormVisible(false)}
              onSuccess={() => setIsGoalFormVisible(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Goal Summary</CardTitle>
            <CardDescription>
              Goals work best when they stay concrete and broken down.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
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
              <span className="inline-flex h-6 items-center rounded-md border bg-muted/15 px-2 text-xs font-medium text-muted-foreground">
                {formatGoalCategory(goal.category)}
              </span>
              <span className="inline-flex h-6 items-center rounded-md border bg-muted/15 px-2 text-xs font-medium text-muted-foreground">
                {formatGoalHorizon(goal.horizon)}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryMetric label="Projects" value={String(goal.projectCount)} />
              <SummaryMetric
                label="Need next action"
                value={String(goal.projectsMissingNextActions)}
              />
              <SummaryMetric
                label="Completed steps"
                value={String(goal.completedNextActionCount)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Review Horizon</CardTitle>
            <CardDescription>
              Keep this visible at daily and weekly checkpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ReviewPrompt
              title="Daily review"
              body="Can you see the next visible step for each active project?"
            />
            <ReviewPrompt
              title="Weekly review"
              body="Does this goal still fit the week, or should it be narrowed, paused, or completed?"
            />
            <ReviewPrompt
              title="Clarity check"
              body="Projects turn goals into something you can work on. If the goal feels vague, break it down again."
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Projects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Projects are the weekly containers that make the goal actionable.
            </p>
          </div>
          <Button
            type="button"
            variant={isProjectFormVisible ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsProjectFormVisible((value) => !value)}
          >
            <FolderPlus className="size-3.5" aria-hidden="true" />
            {isProjectFormVisible ? "Hide form" : "Add project"}
          </Button>
        </div>

        {isProjectFormVisible ? (
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardTitle>Add Project</CardTitle>
              <CardDescription>
                Break the goal into a container you can work on this week.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectForm
                goalId={goal._id}
                onCancel={() => setIsProjectFormVisible(false)}
                onSuccess={() => setIsProjectFormVisible(false)}
              />
            </CardContent>
          </Card>
        ) : null}

        {goal.projects.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center">
            <Target className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-medium">
              Break this goal into a project.
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Projects turn goals into something you can work on.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {goal.projects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </section>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/15 px-3 py-3">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ReviewPrompt({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-muted/15 px-3 py-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function GoalDetailLoadingState() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <div className="h-20 rounded-lg border bg-background" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-lg border bg-background" />
        <div className="h-48 rounded-lg border bg-background" />
      </div>
      <div className="h-96 rounded-lg border bg-background" />
    </div>
  );
}
