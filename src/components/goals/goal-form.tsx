"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Flag, Info } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import {
  getGoalTitleWarning,
  goalCategoryOptions,
  goalHorizonOptions,
} from "@/components/goals/goals-utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLocalDateInputValue, getTimestampFromLocalDateInput } from "@/lib/date";
import { api } from "@convex/_generated/api";
import type { GoalDetailView, GoalStatus } from "@convex/goals";

export function GoalForm({
  initialGoal,
  onCancel,
  onSuccess,
  hideStatusField = false,
}: {
  initialGoal?: GoalDetailView;
  onCancel?: () => void;
  onSuccess?: (goalId?: GoalDetailView["_id"]) => void;
  hideStatusField?: boolean;
}) {
  const createGoal = useMutation(api.goals.createGoal);
  const updateGoal = useMutation(api.goals.updateGoal);
  const activeGoals = useQuery(api.goals.listActiveGoals);
  const [title, setTitle] = useState(initialGoal?.title ?? "");
  const [description, setDescription] = useState(initialGoal?.description ?? "");
  const [category, setCategory] = useState(initialGoal?.category ?? "personal");
  const [horizon, setHorizon] = useState(initialGoal?.horizon ?? "monthly");
  const [status, setStatus] = useState<GoalStatus>(initialGoal?.status ?? "active");
  const [startDate, setStartDate] = useState(
    initialGoal?.startDate ? getLocalDateInputValue(new Date(initialGoal.startDate)) : "",
  );
  const [targetDate, setTargetDate] = useState(
    initialGoal?.targetDate ? getLocalDateInputValue(new Date(initialGoal.targetDate)) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeGoalCount = activeGoals?.length ?? 0;
  const nextActiveGoalCount = Math.max(
    0,
    status === "active"
      ? activeGoalCount + (initialGoal?.status === "active" ? 0 : 1)
      : activeGoalCount - (initialGoal?.status === "active" ? 1 : 0),
  );
  const titleWarning = useMemo(() => getGoalTitleWarning(title), [title]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const startDateTimestamp = startDate
      ? getTimestampFromLocalDateInput(startDate)
      : null;
    const targetDateTimestamp = targetDate
      ? getTimestampFromLocalDateInput(targetDate)
      : null;

    if (!trimmedTitle) {
      setError("Add a concrete goal title.");
      return;
    }

    if (startDate && startDateTimestamp === null) {
      setError("Choose a valid start date.");
      return;
    }

    if (targetDate && targetDateTimestamp === null) {
      setError("Choose a valid target date.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      let goalId: GoalDetailView["_id"] | undefined;

      if (initialGoal) {
        await updateGoal({
          goalId: initialGoal._id,
          title: trimmedTitle,
          description: description || null,
          category,
          horizon,
          status,
          startDate: startDateTimestamp,
          targetDate: targetDateTimestamp,
        });
        goalId = initialGoal._id;
      } else {
        goalId = await createGoal({
          title: trimmedTitle,
          description: description || null,
          category,
          horizon,
          status,
          startDate: startDateTimestamp,
          targetDate: targetDateTimestamp,
        });
        setTitle("");
        setDescription("");
        setCategory("personal");
        setHorizon("monthly");
        setStatus("active");
        setStartDate("");
        setTargetDate("");
      }

      onSuccess?.(goalId);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save the goal. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Goal
            </label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Keep it concrete and short-horizon. Think outcome, not aspiration.
            </p>
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Submit 5 job applications this week"
            disabled={isSubmitting}
            className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
          />
          {titleWarning ? (
            <p className="flex items-center gap-1.5 text-xs text-amber-700">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              {titleWarning}
            </p>
          ) : null}
          {status === "active" && nextActiveGoalCount > 3 ? (
            <p className="flex items-center gap-1.5 text-xs text-amber-700">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              Keep active goals to 1-3. Pause or archive one before adding another.
            </p>
          ) : null}
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Description
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            disabled={isSubmitting}
            placeholder="What will success look like?"
            className="rounded-lg border bg-background px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Category
            </span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as typeof category)
              }
              disabled={isSubmitting}
              className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            >
              {goalCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Horizon
            </span>
            <select
              value={horizon}
              onChange={(event) =>
                setHorizon(event.target.value as typeof horizon)
              }
              disabled={isSubmitting}
              className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            >
              {goalHorizonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {!hideStatusField ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Status
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as GoalStatus)}
                disabled={isSubmitting}
                className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              New goals start active so they stay visible while you break them
              down.
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Start date
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              Target date
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    aria-label="Explain target date"
                  >
                    <Info className="size-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-72">
                  This is the date you want the goal meaningfully done by. It keeps
                  the goal concrete without making every step feel urgent today.
                </TooltipContent>
              </Tooltip>
            </span>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
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
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || nextActiveGoalCount > 3}
            >
              <Flag className="size-4" aria-hidden="true" />
              {isSubmitting
                ? initialGoal
                  ? "Saving..."
                  : "Creating..."
                : initialGoal
                  ? "Save goal"
                  : "Create goal"}
            </Button>
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}
