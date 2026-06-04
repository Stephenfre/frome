import type { DailyBriefContext } from "@/types/daily-brief";
import type {
  EmailCandidate,
  EmailTriageItemCategory,
  EmailTriagePriority,
  EmailTriageResult,
} from "@/types/email";

const fallbackSummary = "No emails need attention right now.";

export const emailTriageJsonSchema = {
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    importantCount: { type: "number" },
    ignoreCount: { type: "number" },
    items: {
      type: "array",
      maxItems: 5,
      items: {
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          subject: { type: "string" },
          from: { type: "string" },
          reason: { type: "string" },
          category: {
            type: "string",
            enum: ["schedule", "money", "work", "personal", "other"],
          },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          suggestedAction: {
            type: ["string", "null"],
          },
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
  type: "object",
} as const;

export function buildEmailTriagePrompt({
  candidates,
  context,
}: {
  candidates: EmailCandidate[];
  context: Pick<DailyBriefContext, "date" | "timezone" | "events" | "tasks" | "goals">;
}) {
  return [
    "Identify only the email messages that likely matter today.",
    "Infer only from the provided metadata and snippets.",
    "Ignore low-signal promotional content, newsletters, and obvious noise.",
    "Do not summarize the entire inbox.",
    "Do not invent urgency or facts that are not present.",
    "Suggested actions must be practical and concrete.",
    "",
    "Dashboard context JSON:",
    JSON.stringify(
      {
        date: context.date,
        timezone: context.timezone,
        events: context.events ?? [],
        tasks: context.tasks ?? [],
        goals: context.goals ?? [],
        emailCandidates: candidates,
      },
      null,
      2,
    ),
  ].join("\n");
}

export function normalizeEmailTriageResult(
  payload: unknown,
  candidates: EmailCandidate[],
  ignoredCount: number,
): EmailTriageResult {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  if (!payload || typeof payload !== "object") {
    return {
      summary: fallbackSummary,
      importantCount: 0,
      ignoreCount: ignoredCount,
      items: [],
    };
  }

  const candidate = payload as Record<string, unknown>;
  const items = Array.isArray(candidate.items)
    ? candidate.items
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => {
          const id = typeof item.id === "string" ? item.id : null;
          const source = id ? candidateMap.get(id) : undefined;

          if (!id || !source) {
            return null;
          }

          return {
            id,
            subject:
              typeof item.subject === "string" && item.subject.trim().length > 0
                ? item.subject.trim()
                : source.subject,
            from:
              typeof item.from === "string" && item.from.trim().length > 0
                ? item.from.trim()
                : source.from,
            reason:
              typeof item.reason === "string" && item.reason.trim().length > 0
                ? item.reason.trim()
                : "This message may need attention today.",
            category: normalizeCategory(item.category),
            priority: normalizePriority(item.priority),
            ...(
              typeof item.suggestedAction === "string" &&
              item.suggestedAction.trim().length > 0
                ? { suggestedAction: item.suggestedAction.trim() }
                : {}
            ),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 3)
    : [];

  return {
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim().length > 0
        ? candidate.summary.trim()
        : items.length > 0
          ? `You have ${items.length} email${items.length === 1 ? "" : "s"} that likely need attention today.`
          : fallbackSummary,
    importantCount: items.length,
    ignoreCount:
      typeof candidate.ignoreCount === "number"
        ? Math.max(ignoredCount, Math.floor(candidate.ignoreCount))
        : ignoredCount,
    items,
  };
}

function normalizeCategory(value: unknown): EmailTriageItemCategory {
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

function normalizePriority(value: unknown): EmailTriagePriority {
  switch (value) {
    case "high":
    case "medium":
      return value;
    default:
      return "low";
  }
}
