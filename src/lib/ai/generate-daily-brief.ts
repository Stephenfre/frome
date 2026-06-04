import type { DailyBrief, DailyBriefContext } from "@/types/daily-brief";
import type {
  EmailTriageItemCategory,
  EmailTriagePriority,
  EmailTriageResult,
} from "@/types/email";

const fallbackSummary =
  "Your day is open. Choose one concrete priority and protect time for it early.";

export const dailyBriefJsonSchema = {
  additionalProperties: false,
  properties: {
    summary: {
      minLength: 12,
      type: "string",
    },
    suggestion: {
      type: ["string", "null"],
    },
    topPriorities: {
      items: {
        minLength: 2,
        type: "string",
      },
      maxItems: 3,
      type: "array",
    },
    warning: {
      type: ["string", "null"],
    },
    emailSummary: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        importantCount: { type: "number" },
        ignoreCount: { type: "number" },
        items: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              subject: { type: "string" },
              from: { type: "string" },
              reason: { type: "string" },
              category: { type: "string" },
              priority: { type: "string" },
              suggestedAction: { type: ["string", "null"] },
            },
            required: [
              "id",
              "subject",
              "from",
              "reason",
              "category",
              "priority",
              "suggestedAction",
            ],
          },
        },
      },
      required: ["summary", "importantCount", "ignoreCount", "items"],
    },
  },
  required: ["summary", "topPriorities", "warning", "suggestion", "emailSummary"],
  type: "object",
} as const;

export function buildDailyBriefPrompt(context: DailyBriefContext) {
  const promptPayload = {
    date: context.date,
    timezone: context.timezone,
    events: context.events ?? [],
    tasks: context.tasks ?? [],
    goals: context.goals ?? [],
    finance: context.finance ?? null,
    emailSummary: context.emailSummary ?? null,
  };

  return [
    "Create a short, practical daily brief for a dashboard card.",
    "Use only the provided context.",
    "If some sections are empty, omit them from the brief rather than inventing details.",
    "Keep the summary concise, calm, and useful for the start of the day.",
    "Top priorities should be direct and actionable.",
    "Return warning as null when nothing stands out.",
    "Return suggestion as null when no practical suggestion is needed.",
    "Use email triage only as a supporting signal, not the main summary.",
    "",
    "Dashboard context JSON:",
    JSON.stringify(promptPayload, null, 2),
  ].join("\n");
}

export function normalizeGeneratedDailyBrief(
  payload: unknown,
  context: DailyBriefContext,
): DailyBrief {
  if (!payload || typeof payload !== "object") {
    throw new Error("The AI response was empty.");
  }

  const candidate = payload as Record<string, unknown>;
  const summary = normalizeOptionalString(candidate.summary) ?? buildFallbackSummary(context);
  const topPriorities = normalizePriorityList(candidate.topPriorities);
  const warning = normalizeOptionalString(candidate.warning) ?? null;
  const suggestion =
    normalizeOptionalString(candidate.suggestion) ?? buildFallbackSuggestion(context);
  const emailSummary = normalizeEmailSummary(
    candidate.emailSummary,
    context.emailSummary ?? null,
  );

  return {
    summary,
    topPriorities,
    warning,
    suggestion,
    emailSummary,
  };
}

export function buildFallbackSummary(context: DailyBriefContext) {
  const eventCount = context.events?.length ?? 0;
  const taskCount = context.tasks?.length ?? 0;
  const goalCount = context.goals?.length ?? 0;
  const importantEmailCount = context.emailSummary?.importantCount ?? 0;

  if (eventCount === 0 && taskCount === 0 && goalCount === 0 && importantEmailCount === 0) {
    return fallbackSummary;
  }

  const parts: string[] = [];

  if (eventCount > 0) {
    parts.push(`${eventCount} ${eventCount === 1 ? "event" : "events"}`);
  }

  if (taskCount > 0) {
    parts.push(`${taskCount} ${taskCount === 1 ? "task" : "tasks"}`);
  }

  if (goalCount > 0) {
    parts.push(`${goalCount} active ${goalCount === 1 ? "goal" : "goals"}`);
  }

  if (importantEmailCount > 0) {
    parts.push(
      `${importantEmailCount} email${importantEmailCount === 1 ? "" : "s"} needing attention`,
    );
  }

  return `Today includes ${parts.join(", ")}. Start with the clearest important action before the day gets noisy.`;
}

function buildFallbackSuggestion(context: DailyBriefContext) {
  if ((context.events?.length ?? 0) >= 3) {
    return "Leave a short reset block between your heavier commitments.";
  }

  if (context.emailSummary?.items[0]?.suggestedAction) {
    return context.emailSummary.items[0].suggestedAction;
  }

  if ((context.tasks?.length ?? 0) > 0) {
    return "Choose one task to finish first before switching contexts.";
  }

  return null;
}

function normalizePriorityList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const priorities: string[] = [];

  for (const item of value) {
    const normalized = normalizeOptionalString(item);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    priorities.push(normalized);

    if (priorities.length === 3) {
      break;
    }
  }

  return priorities;
}

function normalizeEmailSummary(
  value: unknown,
  fallback: EmailTriageResult | null,
): EmailTriageResult | null {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Record<string, unknown>;
  const items = Array.isArray(candidate.items)
    ? candidate.items
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          id: normalizeOptionalString(item.id) ?? "",
          subject: normalizeOptionalString(item.subject) ?? "(No subject)",
          from: normalizeOptionalString(item.from) ?? "Unknown sender",
          reason:
            normalizeOptionalString(item.reason) ?? "This email may need attention.",
          category: normalizeEmailCategory(item.category),
          priority: normalizeEmailPriority(item.priority),
          ...(normalizeOptionalString(item.suggestedAction)
            ? { suggestedAction: normalizeOptionalString(item.suggestedAction)! }
            : {}),
        }))
        .filter((item) => item.id.length > 0)
        .slice(0, 3)
    : fallback?.items ?? [];

  if (items.length === 0) {
    return fallback?.importantCount ? fallback : null;
  }

  return {
    summary:
      normalizeOptionalString(candidate.summary) ??
      fallback?.summary ??
      `You have ${items.length} email${items.length === 1 ? "" : "s"} that likely need attention today.`,
    importantCount:
      typeof candidate.importantCount === "number"
        ? Math.max(items.length, Math.floor(candidate.importantCount))
        : fallback?.importantCount ?? items.length,
    ignoreCount:
      typeof candidate.ignoreCount === "number"
        ? Math.max(0, Math.floor(candidate.ignoreCount))
        : fallback?.ignoreCount ?? 0,
    items,
  };
}

function normalizeEmailCategory(value: unknown): EmailTriageItemCategory {
  switch (value) {
    case "schedule":
    case "money":
    case "work":
    case "personal":
      return value;
    default:
      return "other";
  }
}

function normalizeEmailPriority(value: unknown): EmailTriagePriority {
  switch (value) {
    case "high":
    case "medium":
      return value;
    default:
      return "low";
  }
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}
