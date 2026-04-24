"use client";

import type {
  GoalCategory,
  GoalHorizon,
  GoalProgressState,
  GoalStatus,
} from "@convex/goals";
import type { ProjectNextActionEstimate } from "@convex/projectNextActions";

export const goalCategoryOptions: Array<{
  label: string;
  value: GoalCategory;
}> = [
  { label: "Career", value: "career" },
  { label: "Finance", value: "finance" },
  { label: "Health", value: "health" },
  { label: "Fitness", value: "fitness" },
  { label: "Relationships", value: "relationships" },
  { label: "Personal", value: "personal" },
  { label: "Learning", value: "learning" },
  { label: "Other", value: "other" },
];

export const goalHorizonOptions: Array<{
  label: string;
  value: GoalHorizon;
}> = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
];

export const nextActionEstimateOptions: ProjectNextActionEstimate[] = [
  2, 5, 10, 15, 30,
];

const vagueGoalTitles = new Set([
  "get healthy",
  "fix finances",
  "be organized",
  "organize life",
  "do better",
]);

const vagueActionTitles = new Set([
  "resume",
  "applications",
  "job search",
  "budget",
  "work on resume",
]);

const actionVerbs = [
  "add",
  "book",
  "call",
  "check",
  "clear",
  "draft",
  "email",
  "find",
  "open",
  "outline",
  "pay",
  "pick",
  "prepare",
  "read",
  "reply",
  "review",
  "rewrite",
  "schedule",
  "send",
  "submit",
  "text",
  "update",
  "write",
];

export function formatGoalCategory(category: GoalCategory) {
  return goalCategoryOptions.find((option) => option.value === category)?.label;
}

export function formatGoalHorizon(horizon: GoalHorizon) {
  return goalHorizonOptions.find((option) => option.value === horizon)?.label;
}

export function getGoalStatusClassName(status: GoalStatus) {
  switch (status) {
    case "active":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "paused":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "archived":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function getGoalProgressClassName(progressState: GoalProgressState) {
  switch (progressState) {
    case "On Track":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Needs Clarity":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Stalled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "Completed":
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

export function getGoalTitleWarning(title: string) {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");

  if (!normalizedTitle) {
    return null;
  }

  if (vagueGoalTitles.has(normalizedTitle)) {
    return "Try making this more concrete, like 'Pay all bills on time this month'.";
  }

  if (normalizedTitle.split(" ").length < 3) {
    return "Concrete goals are easier to follow. Add the real outcome and timeframe.";
  }

  return null;
}

export function getNextActionWarning(title: string) {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");

  if (!normalizedTitle) {
    return null;
  }

  const firstWord = normalizedTitle.split(" ")[0];

  if (vagueActionTitles.has(normalizedTitle) || !actionVerbs.includes(firstWord)) {
    return "Write the next visible step. Make it small enough to start in 2-10 minutes.";
  }

  return null;
}
