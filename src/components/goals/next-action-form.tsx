"use client";

import { useMutation } from "convex/react";
import { AlertCircle, CheckSquare } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import {
  getNextActionWarning,
  nextActionEstimateOptions,
} from "@/components/goals/goals-utils";
import { Button } from "@/components/ui/button";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { ProjectNextActionView } from "@convex/projectNextActions";

export function NextActionForm({
  projectId,
  initialNextAction,
  onCancel,
  onSuccess,
}: {
  projectId: Id<"goalProjects">;
  initialNextAction?: ProjectNextActionView;
  onCancel?: () => void;
  onSuccess?: (nextActionId?: ProjectNextActionView["_id"]) => void;
}) {
  const createNextAction = useMutation(api.projectNextActions.createNextAction);
  const updateNextAction = useMutation(api.projectNextActions.updateNextAction);
  const [title, setTitle] = useState(initialNextAction?.title ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    initialNextAction?.estimatedMinutes ?? 5,
  );
  const [notes, setNotes] = useState(initialNextAction?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const actionWarning = useMemo(() => getNextActionWarning(title), [title]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Add the next visible step.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      let nextActionId: ProjectNextActionView["_id"] | undefined;

      if (initialNextAction) {
        await updateNextAction({
          nextActionId: initialNextAction._id,
          title: title.trim(),
          estimatedMinutes,
          notes: notes || null,
        });
        nextActionId = initialNextAction._id;
      } else {
        nextActionId = await createNextAction({
          projectId,
          title: title.trim(),
          estimatedMinutes,
          notes: notes || null,
        });
        setTitle("");
        setEstimatedMinutes(5);
        setNotes("");
      }

      onSuccess?.(nextActionId);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save the next action. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Next action
          </label>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Write the next visible step. Make it small enough to start in 2-10
            minutes.
          </p>
        </div>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Open resume doc"
          disabled={isSubmitting}
          className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
        {actionWarning ? (
          <p className="flex items-center gap-1.5 text-xs text-amber-700">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {actionWarning}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Estimate
          </span>
          <select
            value={estimatedMinutes}
            onChange={(event) =>
              setEstimatedMinutes(Number(event.target.value) as typeof estimatedMinutes)
            }
            disabled={isSubmitting}
            className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
          >
            {nextActionEstimateOptions.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Notes
          </span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything that lowers friction before you start."
            disabled={isSubmitting}
            className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="min-h-5 text-xs text-destructive">{error}</p>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
            <CheckSquare className="size-4" aria-hidden="true" />
            {isSubmitting
              ? initialNextAction
                ? "Saving..."
                : "Creating..."
              : initialNextAction
                ? "Save step"
                : "Add next action"}
          </Button>
        </div>
      </div>
    </form>
  );
}
