"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
  SquareCheckBig,
  Trash2,
} from "lucide-react";
import { useState } from "react";

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
import type { GoalProjectView } from "@convex/goalProjects";

export function ProjectCard({ project }: { project: GoalProjectView }) {
  const completeProject = useMutation(api.goalProjects.completeProject);
  const completeNextAction = useMutation(api.projectNextActions.completeNextAction);
  const deleteNextAction = useMutation(api.projectNextActions.deleteNextAction);
  const nextActions = useQuery(api.projectNextActions.listProjectNextActions, {
    projectId: project._id,
  });
  const [isProjectFormVisible, setIsProjectFormVisible] = useState(false);
  const [isNextActionFormVisible, setIsNextActionFormVisible] = useState(false);
  const [editingNextActionId, setEditingNextActionId] =
    useState<Id<"projectNextActions"> | null>(null);
  const [isCompletingProject, setIsCompletingProject] = useState(false);
  const [isCompletingNextAction, setIsCompletingNextAction] = useState(false);
  const [deletingNextActionId, setDeletingNextActionId] =
    useState<Id<"projectNextActions"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCompleteProject() {
    if (isCompletingProject) {
      return;
    }

    setError(null);
    setIsCompletingProject(true);

    try {
      await completeProject({ projectId: project._id });
    } catch {
      setError("Could not complete the project. Try again.");
    } finally {
      setIsCompletingProject(false);
    }
  }

  async function handleCompleteNextAction(
    nextActionId: Id<"projectNextActions">,
  ) {
    if (isCompletingNextAction) {
      return;
    }

    setError(null);
    setIsCompletingNextAction(true);

    try {
      await completeNextAction({ nextActionId });
    } catch {
      setError("Could not complete the next action. Try again.");
    } finally {
      setIsCompletingNextAction(false);
    }
  }

  async function handleDeleteNextAction(
    nextActionId: Id<"projectNextActions">,
  ) {
    if (deletingNextActionId) {
      return;
    }

    setError(null);
    setDeletingNextActionId(nextActionId);

    try {
      await deleteNextAction({ nextActionId });

      if (editingNextActionId === nextActionId) {
        setEditingNextActionId(null);
      }
    } catch {
      setError("Could not delete the step. Try again.");
    } finally {
      setDeletingNextActionId(null);
    }
  }

  const editingNextAction =
    nextActions?.find((nextAction) => nextAction._id === editingNextActionId) ??
    undefined;

  return (
    <div className="grid gap-4 rounded-xl border bg-background p-4">
      {isProjectFormVisible ? (
        <ProjectForm
          goalId={project.goalId}
          initialProject={project}
          onCancel={() => setIsProjectFormVisible(false)}
          onSuccess={() => setIsProjectFormVisible(false)}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
                    project.status === "completed"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : project.status === "archived"
                        ? "border-slate-200 bg-slate-50 text-slate-600"
                        : "border-sky-200 bg-sky-50 text-sky-700",
                  )}
                >
                  {project.status}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold">{project.title}</h3>
              {project.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {project.description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsProjectFormVisible(true)}
                aria-label={`Edit ${project.title}`}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </Button>
              {project.status !== "completed" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCompleteProject}
                  disabled={isCompletingProject}
                >
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Complete
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border bg-muted/15 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Current Next Action
                </p>
                {project.currentNextAction ? (
                  <>
                    <p className="mt-2 text-sm font-medium">
                      {project.currentNextAction.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {project.currentNextAction.estimatedMinutes} min
                      {project.currentNextAction.notes
                        ? ` • ${project.currentNextAction.notes}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-medium text-amber-800">
                      No next action set
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add one small visible step to keep this moving.
                    </p>
                  </>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {project.currentNextAction ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setEditingNextActionId(project.currentNextAction?._id ?? null)
                      }
                      aria-label={`Edit ${project.currentNextAction.title}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        project.currentNextAction &&
                        handleCompleteNextAction(project.currentNextAction._id)
                      }
                      disabled={isCompletingNextAction}
                    >
                      <SquareCheckBig className="size-3.5" aria-hidden="true" />
                      Done
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={
                            deletingNextActionId === project.currentNextAction._id
                          }
                          aria-label={`Delete ${project.currentNextAction.title}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete step?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete &quot;{project.currentNextAction.title}&quot;?
                            This can&apos;t be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleDeleteNextAction(project.currentNextAction!._id)
                            }
                            disabled={
                              deletingNextActionId === project.currentNextAction._id
                            }
                          >
                            {deletingNextActionId === project.currentNextAction._id
                              ? "Deleting..."
                              : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNextActionFormVisible((value) => !value)}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  {project.currentNextAction ? "Another step" : "Add step"}
                </Button>
              </div>
            </div>

            {project.missingNextAction ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  Example: &quot;Open resume doc&quot; instead of &quot;Work on
                  resume&quot;.
                </p>
              </div>
            ) : null}
          </div>

          {isNextActionFormVisible ? (
            <NextActionForm
              projectId={project._id}
              onCancel={() => setIsNextActionFormVisible(false)}
              onSuccess={() => setIsNextActionFormVisible(false)}
            />
          ) : null}

          {editingNextAction ? (
            <NextActionForm
              projectId={project._id}
              initialNextAction={editingNextAction}
              onCancel={() => setEditingNextActionId(null)}
              onSuccess={() => setEditingNextActionId(null)}
            />
          ) : null}

          {nextActions && nextActions.length > 1 ? (
            <div className="grid gap-2">
              <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Step history
              </p>
              <div className="grid gap-2">
                {nextActions.slice(0, 4).map((nextAction) => (
                  <div
                    key={nextAction._id}
                    className="rounded-lg border bg-background px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
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
                        <span className="text-xs text-muted-foreground">
                          {nextAction.status}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingNextActionId(nextAction._id)}
                          aria-label={`Edit ${nextAction.title}`}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={deletingNextActionId === nextAction._id}
                              aria-label={`Delete ${nextAction.title}`}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete step?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete &quot;{nextAction.title}&quot;? This
                                can&apos;t be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteNextAction(nextAction._id)
                                }
                                disabled={deletingNextActionId === nextAction._id}
                              >
                                {deletingNextActionId === nextAction._id
                                  ? "Deleting..."
                                  : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </>
      )}
    </div>
  );
}
