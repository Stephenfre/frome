"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import type { FormEvent } from "react";

import {
  aiGoalBreakdownPreferenceOptions,
  type AIGoalBreakdownInput,
} from "@/lib/ai-goal-breakdown";
import { goalCategoryOptions } from "@/components/goals/goals-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AIGoalBreakdownForm({
  error,
  isSubmitting,
  onChange,
  onSubmit,
  value,
}: {
  error?: string | null;
  isSubmitting?: boolean;
  onChange: (patch: Partial<AIGoalBreakdownInput>) => void;
  onSubmit: () => void;
  value: AIGoalBreakdownInput;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function togglePreference(preference: AIGoalBreakdownInput["preferences"][number]) {
    const nextPreferences = value.preferences.includes(preference)
      ? value.preferences.filter((item) => item !== preference)
      : [...value.preferences, preference];

    onChange({ preferences: nextPreferences });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            AI Planning Assistant
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            Turn a vague goal into a clearer plan
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The AI will rewrite the goal if needed, suggest a few projects, and
            generate small next actions you can review before anything is saved.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          Goal
        </label>
        <input
          value={value.goalTitle}
          onChange={(event) => onChange({ goalTitle: event.target.value })}
          placeholder="Get healthier"
          disabled={isSubmitting}
          className="h-10 rounded-xl border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
        <p className="text-xs text-muted-foreground">
          Start with the messy version. The review step is where you tighten it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Category
          </span>
          <select
            value={value.goalCategory ?? ""}
            onChange={(event) =>
              onChange({
                goalCategory: event.target.value
                  ? (event.target.value as AIGoalBreakdownInput["goalCategory"])
                  : undefined,
              })
            }
            disabled={isSubmitting}
            className="h-10 rounded-xl border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
          >
            <option value="">Infer if helpful</option>
            {goalCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Target date
          </span>
          <input
            type="date"
            value={value.targetDate ?? ""}
            onChange={(event) => onChange({ targetDate: event.target.value || undefined })}
            disabled={isSubmitting}
            className="h-10 rounded-xl border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
          />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Context notes
        </span>
        <textarea
          value={value.contextNotes ?? ""}
          onChange={(event) => onChange({ contextNotes: event.target.value || undefined })}
          rows={4}
          disabled={isSubmitting}
          placeholder="Anything that matters here: energy limits, deadlines, what keeps getting stuck, or what good enough looks like."
          className="rounded-xl border bg-background px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
      </label>

      <div className="grid gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Planning preferences
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick the constraints you want the AI to respect.
          </p>
        </div>
        <div className="grid gap-2">
          {aiGoalBreakdownPreferenceOptions.map((option) => {
            const isSelected = value.preferences.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => togglePreference(option.value)}
                disabled={isSubmitting}
                className={cn(
                  "grid gap-1 rounded-xl border px-3 py-3 text-left transition-colors",
                  isSelected
                    ? "border-foreground/15 bg-foreground/[0.04]"
                    : "bg-background hover:bg-muted/40",
                )}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-sm text-muted-foreground">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Button type="submit" size="lg" disabled={isSubmitting || !value.goalTitle.trim()}>
          <Sparkles className="size-4" aria-hidden="true" />
          {isSubmitting ? "Breaking it down..." : "Break down a goal with AI"}
        </Button>
      </div>
    </form>
  );
}
