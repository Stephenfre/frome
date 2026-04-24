"use client";

export type TaskUrgency = "must_today" | "should_today" | "can_wait";
export type EstimatedMinutes = 5 | 10 | 15 | 30;

export const urgencies: Array<{ label: string; value: TaskUrgency }> = [
  { label: "Must today", value: "must_today" },
  { label: "Should today", value: "should_today" },
  { label: "Can wait", value: "can_wait" },
];

export const estimateOptions: EstimatedMinutes[] = [5, 10, 15, 30];

const vagueTitles = new Set([
  "clean kitchen",
  "taxes",
  "portfolio",
  "budget",
  "fix finances",
  "work on portfolio",
]);

const actionVerbs = [
  "add",
  "book",
  "call",
  "check",
  "clear",
  "download",
  "email",
  "file",
  "find",
  "open",
  "pay",
  "pick",
  "put",
  "read",
  "reply",
  "schedule",
  "send",
  "sort",
  "text",
  "wipe",
  "write",
];

export function getVagueTitleWarning(title: string) {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");

  if (!normalizedTitle) {
    return null;
  }

  const firstWord = normalizedTitle.split(" ")[0];

  if (vagueTitles.has(normalizedTitle) || !actionVerbs.includes(firstWord)) {
    return "Try making this a visible next step, like 'Open tax folder'.";
  }

  return null;
}

export function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().replace(/^#+/, "").toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 8);
}
