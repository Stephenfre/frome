"use client";

import { useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  CheckSquare,
  ChevronRight,
  FolderKanban,
  Goal,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { GoalForm } from "@/components/goals/goal-form";
import { NextActionForm } from "@/components/goals/next-action-form";
import { ProjectForm } from "@/components/goals/project-form";
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
import type { Id } from "@convex/_generated/dataModel";

type GoalCreationStep = "goal" | "project" | "actions" | "schedule";

const creationSteps: Array<{
  key: GoalCreationStep;
  label: string;
  description: string;
  icon: typeof Goal;
}> = [
  {
    key: "goal",
    label: "Create goal",
    description: "Choose a concrete outcome.",
    icon: Goal,
  },
  {
    key: "project",
    label: "Create project",
    description: "Turn it into weekly work.",
    icon: FolderKanban,
  },
  {
    key: "actions",
    label: "Add actions",
    description: "Make the next step visible.",
    icon: CheckSquare,
  },
  {
    key: "schedule",
    label: "Schedule",
    description: "Protect what needs time.",
    icon: CalendarDays,
  },
];

export function GoalCreationFlow({
  onCancel,
  onComplete,
}: {
  onCancel?: () => void;
  onComplete?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState<GoalCreationStep>("goal");
  const [goalId, setGoalId] = useState<Id<"goals"> | null>(null);
  const [projectId, setProjectId] = useState<Id<"goalProjects"> | null>(null);
  const [editingNextActionId, setEditingNextActionId] =
    useState<Id<"projectNextActions"> | null>(null);

  const goal = useQuery(
    api.goals.getGoalById,
    goalId ? { goalId } : "skip",
  );
  const nextActions = useQuery(
    api.projectNextActions.listProjectNextActions,
    projectId ? { projectId } : "skip",
  );

  const visibleNextActions = nextActions ?? [];
  const canContinueToSchedule = visibleNextActions.length > 0;
  const currentStepIndex = creationSteps.findIndex(
    (step) => step.key === currentStep,
  );
  const editingNextAction =
    visibleNextActions.find((nextAction) => nextAction._id === editingNextActionId) ??
    undefined;

  const currentProject = useMemo(() => {
    if (!goal || !projectId) {
      return null;
    }

    return goal.projects.find((project) => project._id === projectId) ?? null;
  }, [goal, projectId]);

  function resetFlow() {
    setCurrentStep("goal");
    setGoalId(null);
    setProjectId(null);
    setEditingNextActionId(null);
  }

  function handleCancel() {
    resetFlow();
    onCancel?.();
  }

  function handleFinish() {
    resetFlow();
    onComplete?.();
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Guided Setup
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            Don&apos;t stop at the goal.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Move from outcome to project to next action before the plan gets
            fuzzy.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          {creationSteps.map((step, index) => {
            const isActive = step.key === currentStep;
            const isComplete = index < currentStepIndex;

            return (
              <div
                key={step.key}
                className={cn(
                  "grid gap-1 rounded-lg border px-3 py-3 transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "bg-background text-muted-foreground",
                )}
              >
                <div className="flex items-center gap-2">
                  <step.icon className="size-4" aria-hidden="true" />
                  <p className="text-sm font-medium">{step.label}</p>
                </div>
                <p
                  className={cn(
                    "text-xs",
                    isActive ? "text-background/80" : "text-muted-foreground",
                  )}
                >
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {currentStep === "goal" ? (
        <div className="grid gap-3">
          <div className="rounded-lg border border-dashed bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            Start with one concrete goal. Don&apos;t plan the whole quarter here.
          </div>
          <GoalForm
            hideStatusField
            onCancel={handleCancel}
            onSuccess={(createdGoalId) => {
              if (!createdGoalId) {
                return;
              }

              setGoalId(createdGoalId);
              setCurrentStep("project");
            }}
          />
        </div>
      ) : null}

      {currentStep === "project" && goalId ? (
        <div className="grid gap-3">
          <div className="rounded-lg border border-dashed bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            Add the first project that explains what this goal means this week.
          </div>
          <ProjectForm
            goalId={goalId}
            onCancel={handleCancel}
            onSuccess={(createdProjectId) => {
              if (!createdProjectId) {
                return;
              }

              setProjectId(createdProjectId);
              setCurrentStep("actions");
            }}
          />
        </div>
      ) : null}

      {currentStep === "actions" && projectId ? (
        <div className="grid gap-4">
          <div className="rounded-lg border border-dashed bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            Add at least one visible next action. Make it small enough to start
            in 2-10 minutes.
          </div>

          <div className="grid gap-3 rounded-lg border bg-background p-4">
            <div>
              <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Current setup
              </p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Goal:</span>{" "}
                {goal?.title ?? "Loading..."}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium">Project:</span>{" "}
                {currentProject?.title ?? "Loading..."}
              </p>
            </div>

            {visibleNextActions.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Added actions
                </p>
                {visibleNextActions.map((nextAction) => (
                  <div
                    key={nextAction._id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {nextAction.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {nextAction.estimatedMinutes} min
                        {nextAction.notes ? ` • ${nextAction.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingNextActionId(nextAction._id)}
                        aria-label={`Edit ${nextAction.title}`}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <DeleteNextActionButton
                        nextActionId={nextAction._id}
                        title={nextAction.title}
                        onDelete={() => {
                          if (editingNextActionId === nextAction._id) {
                            setEditingNextActionId(null);
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <NextActionForm
            projectId={projectId}
            onCancel={handleCancel}
            onSuccess={() => setEditingNextActionId(null)}
          />

          {editingNextAction ? (
            <div className="grid gap-3 rounded-lg border bg-background p-4">
              <div>
                <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Edit step
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tighten the wording until the action is obvious and easy to
                  start.
                </p>
              </div>
              <NextActionForm
                projectId={projectId}
                initialNextAction={editingNextAction}
                onCancel={() => setEditingNextActionId(null)}
                onSuccess={() => setEditingNextActionId(null)}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Stop here
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentStep("schedule")}
              disabled={!canContinueToSchedule}
            >
              Continue to schedule
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {currentStep === "schedule" ? (
        <div className="grid gap-4">
          <div className="rounded-xl border bg-muted/15 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
              <h4 className="text-sm font-semibold">Ready to protect with time</h4>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              The plan is no longer vague. You have a goal, a project, and a
              visible next step. Now give the important step a time block.
            </p>
          </div>

          <div className="grid gap-3 rounded-lg border bg-background p-4">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Created
            </p>
            <p className="text-sm">
              <span className="font-medium">Goal:</span> {goal?.title ?? "—"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Project:</span>{" "}
              {currentProject?.title ?? "—"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Next action:</span>{" "}
              {visibleNextActions[0]?.title ?? "—"}
            </p>
          </div>

          <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
            Calendar integration comes next. For now, use the calendar to create
            a block for the first action that needs real protection.
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep("actions")}
            >
              Back to actions
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/events">
                Open calendar
                <CalendarDays className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button type="button" onClick={handleFinish}>
              Finish setup
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DeleteNextActionButton({
  nextActionId,
  onDelete,
  title,
}: {
  nextActionId: Id<"projectNextActions">;
  onDelete?: () => void;
  title: string;
}) {
  const deleteNextAction = useMutation(api.projectNextActions.deleteNextAction);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteNextAction({ nextActionId });
      onDelete?.();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isDeleting}
          aria-label={`Delete ${title}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete step?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &quot;{title}&quot;? This can&apos;t be undone.
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
  );
}
