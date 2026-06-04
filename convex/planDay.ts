"use node";

import { v } from "convex/values";

import { action } from "./_generated/server";
import { aiPlanDayModel, getOpenAIClient } from "../src/lib/openai";

type EventType = "anchor" | "fixed" | "reset";
type PreferredWindow =
  | "early_morning"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening";

type PlanningItem = {
  afterItemId: string | null;
  beforeItemId: string | null;
  durationMinutes: number;
  id: string;
  type: EventType;
  notes: string | null;
  preferredStartTime: string | null;
  preferredWindow: PreferredWindow | null;
  startTime: string | null;
  title: string;
};

type ParsedDayPlan = {
  dateKey: string | null;
  dateLabel: string;
  items: PlanningItem[];
  summary: string | null;
};

type ScheduledPlanItem = PlanningItem & {
  proposedEnd: string;
  proposedStart: string;
};

type ProposedDayPlan = {
  dateKey: string;
  dateLabel: string;
  items: ScheduledPlanItem[];
  notes: string[];
  summary: string | null;
};

const planDayInstructions = [
  "You are a calm planning assistant for ForMe.",
  "Extract structured planning items from the user's natural language.",
  "Extract only what the user actually said.",
  "Do not invent extra obligations.",
  "Infer reasonable durations only when needed.",
  "Classify each item using the app's event types: fixed, anchor, or reset.",
  "Use fixed for hard times, anchor for rough preferred times, and reset for flexible open blocks.",
  "Identify simple after and before ordering constraints.",
  "Do not schedule the final day. Only extract structure.",
  "Use 24-hour HH:MM strings for startTime and preferredStartTime.",
  "Return valid structured JSON only.",
].join(" ");

const parsedDayPlanJsonSchema = {
  additionalProperties: false,
  properties: {
    dateKey: {
      type: ["string", "null"],
    },
    dateLabel: {
      type: "string",
    },
    summary: {
      type: ["string", "null"],
    },
    items: {
      maxItems: 12,
      type: "array",
      items: {
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
          },
          title: {
            type: "string",
          },
          type: {
            enum: ["fixed", "anchor", "reset"],
            type: "string",
          },
          durationMinutes: {
            maximum: 240,
            minimum: 5,
            type: "number",
          },
          startTime: {
            type: ["string", "null"],
          },
          preferredStartTime: {
            type: ["string", "null"],
          },
          preferredWindow: {
            enum: [
              "early_morning",
              "morning",
              "midday",
              "afternoon",
              "evening",
              null,
            ],
          },
          afterItemId: {
            type: ["string", "null"],
          },
          beforeItemId: {
            type: ["string", "null"],
          },
          notes: {
            type: ["string", "null"],
          },
        },
        required: [
          "id",
          "title",
          "type",
          "durationMinutes",
          "startTime",
          "preferredStartTime",
          "preferredWindow",
          "afterItemId",
          "beforeItemId",
          "notes",
        ],
        type: "object",
      },
    },
  },
  required: ["dateKey", "dateLabel", "summary", "items"],
  type: "object",
} as const;

export const generatePlan = action({
  args: {
    dateKey: v.string(),
    prompt: v.string(),
    startOfDay: v.string(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ProposedDayPlan> => {
    const trimmedPrompt = args.prompt.trim();

    if (!trimmedPrompt) {
      throw new Error("Tell ForMe what you already know about the day.");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Plan My Day AI is not configured yet.");
    }

    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    try {
      const client = getOpenAIClient();
      const response = await client.responses.parse({
        model: aiPlanDayModel,
        reasoning: { effort: "medium" },
        instructions: planDayInstructions,
        input: buildExtractionPrompt({
          dateKey: args.dateKey,
          prompt: trimmedPrompt,
          timezone: args.timezone,
        }),
        max_output_tokens: 1400,
        safety_identifier: getOpenAISafetyIdentifier(identity),
        text: {
          format: {
            type: "json_schema",
            name: "parsed_day_plan",
            strict: true,
            schema: parsedDayPlanJsonSchema,
          },
        },
      });
      const parsed = normalizeParsedPlan(response.output_parsed, args.dateKey);

      return scheduleParsedPlan(parsed, {
        dateKey: args.dateKey,
        startOfDay: args.startOfDay,
      });
    } catch (error) {
      console.error("Plan My Day generation failed", error);

      const apiError = error as {
        code?: string | null;
        status?: number;
        type?: string | null;
        message?: string;
      };

      if (
        apiError.code === "insufficient_quota" ||
        apiError.type === "insufficient_quota"
      ) {
        throw new Error(
          "Your OpenAI API key is valid, but this project has no available quota.",
        );
      }

      if (apiError.status === 429) {
        throw new Error("OpenAI rate limited Plan My Day. Try again shortly.");
      }

      if (apiError.status === 401) {
        throw new Error("OpenAI rejected the API key. Check OPENAI_API_KEY.");
      }

      if (apiError.message) {
        throw new Error(apiError.message);
      }

      throw new Error("Could not plan the day right now.");
    }
  },
});

function buildExtractionPrompt({
  dateKey,
  prompt,
  timezone,
}: {
  dateKey: string;
  prompt: string;
  timezone?: string;
}) {
  return [
    "Extract planning items from this request.",
    "Use the supplied target date as the default when the user says tomorrow or does not specify a date.",
    "If a title mentions breakfast, default duration can be 25 minutes.",
    "If a title mentions gym or workout, default duration can be 60 minutes.",
    "Otherwise infer a simple practical duration.",
    "Keep IDs stable, lowercase, and short, such as walk_ace, breakfast, meeting, gym.",
    "Use afterItemId and beforeItemId only when the user states ordering.",
    "",
    `Target date key: ${dateKey}`,
    timezone ? `Timezone: ${timezone}` : "Timezone: unknown",
    "",
    "User request:",
    prompt,
  ].join("\n");
}

function getOpenAISafetyIdentifier(identity: {
  subject?: string | null;
  tokenIdentifier?: string | null;
}) {
  const identifier =
    identity.subject?.trim() || identity.tokenIdentifier?.trim() || "unknown";

  return identifier.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function normalizeParsedPlan(payload: unknown, fallbackDateKey: string): ParsedDayPlan {
  if (!payload || typeof payload !== "object") {
    throw new Error("The plan response was empty.");
  }

  const candidate = payload as ParsedDayPlan;
  const items = Array.isArray(candidate.items)
    ? candidate.items
        .map(normalizePlanningItem)
        .filter((item): item is PlanningItem => item !== null)
    : [];

  if (items.length === 0) {
    throw new Error("ForMe could not find any schedulable items.");
  }

  return {
    dateKey: isDateKey(candidate.dateKey) ? candidate.dateKey : fallbackDateKey,
    dateLabel:
      typeof candidate.dateLabel === "string" && candidate.dateLabel.trim()
        ? candidate.dateLabel.trim()
        : "Planned day",
    items,
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim()
        ? candidate.summary.trim()
        : null,
  };
}

function normalizePlanningItem(item: PlanningItem & { kind?: unknown }): PlanningItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const title = typeof item.title === "string" ? item.title.trim() : "";

  if (!title) {
    return null;
  }

  const id =
    typeof item.id === "string" && item.id.trim()
      ? item.id.trim()
      : makeItemId(title);
  const type = normalizeEventType(item.type ?? item.kind);
  const durationMinutes = normalizeDuration(title, item.durationMinutes);

  return {
    afterItemId: normalizeOptionalId(item.afterItemId),
    beforeItemId: normalizeOptionalId(item.beforeItemId),
    durationMinutes,
    id,
    notes: normalizeOptionalString(item.notes),
    preferredStartTime: normalizeTimeString(item.preferredStartTime),
    preferredWindow: normalizePreferredWindow(item.preferredWindow),
    startTime: normalizeTimeString(item.startTime),
    title,
    type,
  };
}

function scheduleParsedPlan(
  parsed: ParsedDayPlan,
  context: { dateKey: string; startOfDay: string },
): ProposedDayPlan {
  const notes: string[] = [];
  const scheduled: Array<ScheduledPlanItem & { startMinute: number; endMinute: number }> =
    [];
  const itemsById = new Map(parsed.items.map((item) => [item.id, item]));
  const sortedItems = [...parsed.items].sort((first, second) => {
    const rank = eventTypeRank(first.type) - eventTypeRank(second.type);

    if (rank !== 0) {
      return rank;
    }

    return preferredMinute(first) - preferredMinute(second);
  });

  for (const item of sortedItems) {
    const placement = placeItem(item, scheduled, itemsById);

    if (!placement) {
      notes.push(`Could not place ${item.title} without overlap.`);
      continue;
    }

    scheduled.push({
      ...item,
      proposedEnd: toIsoAtMinute(context.startOfDay, placement.endMinute),
      proposedStart: toIsoAtMinute(context.startOfDay, placement.startMinute),
      startMinute: placement.startMinute,
      endMinute: placement.endMinute,
    });
    scheduled.sort((first, second) => first.startMinute - second.startMinute);
  }

  return {
    dateKey: parsed.dateKey ?? context.dateKey,
    dateLabel: parsed.dateLabel,
    items: scheduled.map(({ endMinute, startMinute, ...item }) => item),
    notes,
    summary:
      parsed.summary ??
      `Proposed ${scheduled.length} block${scheduled.length === 1 ? "" : "s"}.`,
  };
}

function placeItem(
  item: PlanningItem,
  scheduled: Array<{ id: string; startMinute: number; endMinute: number }>,
  itemsById: Map<string, PlanningItem>,
) {
  const duration = item.durationMinutes;
  const earliest = getEarliestMinute(item, scheduled);
  const latest = getLatestMinute(item, scheduled, itemsById);

  if (item.type === "fixed" && item.startTime) {
    const fixedStart = parseTimeToMinute(item.startTime);

    if (
      fixedStart !== null &&
      fixedStart >= earliest &&
      fixedStart + duration <= latest &&
      isOpen(fixedStart, fixedStart + duration, scheduled)
    ) {
      return { startMinute: fixedStart, endMinute: fixedStart + duration };
    }
  }

  const candidates = buildCandidateStarts(item, earliest, latest);

  for (const startMinute of candidates) {
    const endMinute = startMinute + duration;

    if (startMinute >= earliest && endMinute <= latest && isOpen(startMinute, endMinute, scheduled)) {
      return { startMinute, endMinute };
    }
  }

  return null;
}

function getEarliestMinute(
  item: PlanningItem,
  scheduled: Array<{ id: string; endMinute: number }>,
) {
  const dayStart = 5 * 60;
  const after = item.afterItemId
    ? scheduled.find((scheduledItem) => scheduledItem.id === item.afterItemId)
    : null;

  return after ? after.endMinute + 10 : dayStart;
}

function getLatestMinute(
  item: PlanningItem,
  scheduled: Array<{ id: string; startMinute: number }>,
  itemsById: Map<string, PlanningItem>,
) {
  const dayEnd = 22 * 60;
  const before = item.beforeItemId
    ? scheduled.find((scheduledItem) => scheduledItem.id === item.beforeItemId)
    : null;

  if (before) {
    return before.startMinute - 10;
  }

  const unscheduledBefore = item.beforeItemId
    ? itemsById.get(item.beforeItemId)
    : null;
  const preferredBefore = unscheduledBefore ? preferredMinute(unscheduledBefore) : null;

  return preferredBefore && preferredBefore > 0 ? preferredBefore - 10 : dayEnd;
}

function buildCandidateStarts(item: PlanningItem, earliest: number, latest: number) {
  const duration = item.durationMinutes;
  const target = preferredMinute(item);
  const starts: number[] = [];
  const minStart = Math.max(earliest, 5 * 60);
  const maxStart = Math.min(latest - duration, 22 * 60 - duration);

  if (maxStart < minStart) {
    return [];
  }

  for (let offset = 0; offset <= 6 * 60; offset += 10) {
    for (const candidate of [target - offset, target + offset]) {
      if (candidate >= minStart && candidate <= maxStart && !starts.includes(candidate)) {
        starts.push(candidate);
      }
    }
  }

  for (let candidate = minStart; candidate <= maxStart; candidate += 15) {
    if (!starts.includes(candidate)) {
      starts.push(candidate);
    }
  }

  return starts;
}

function isOpen(
  startMinute: number,
  endMinute: number,
  scheduled: Array<{ startMinute: number; endMinute: number }>,
) {
  const buffer = 10;

  return scheduled.every(
    (item) =>
      endMinute + buffer <= item.startMinute ||
      startMinute >= item.endMinute + buffer,
  );
}

function eventTypeRank(type: EventType) {
  if (type === "fixed") return 0;
  if (type === "anchor") return 1;
  return 2;
}

function preferredMinute(item: PlanningItem) {
  const exact =
    item.startTime ? parseTimeToMinute(item.startTime) : parseTimeToMinute(item.preferredStartTime);

  if (exact !== null) {
    return exact;
  }

  switch (item.preferredWindow) {
    case "early_morning":
      return 6 * 60;
    case "morning":
      return 9 * 60;
    case "midday":
      return 12 * 60;
    case "afternoon":
      return 15 * 60;
    case "evening":
      return 18 * 60;
    default:
      return item.type === "reset" ? 13 * 60 : 9 * 60;
  }
}

function toIsoAtMinute(startOfDay: string, minute: number) {
  const date = new Date(startOfDay);
  date.setMinutes(date.getMinutes() + minute);
  return date.toISOString();
}

function parseTimeToMinute(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeEventType(value: unknown): EventType {
  if (value === "fixed" || value === "anchor" || value === "reset") {
    return value;
  }

  if (value === "anchored") {
    return "anchor";
  }

  return "reset";
}

function normalizeDuration(title: string, value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(5, Math.min(240, Math.round(value)));
  }

  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("breakfast")) {
    return 25;
  }

  if (normalizedTitle.includes("gym") || normalizedTitle.includes("workout")) {
    return 60;
  }

  return 30;
}

function normalizePreferredWindow(value: unknown): PreferredWindow | null {
  if (
    value === "early_morning" ||
    value === "morning" ||
    value === "midday" ||
    value === "afternoon" ||
    value === "evening"
  ) {
    return value;
  }

  return null;
}

function normalizeTimeString(value: unknown) {
  return typeof value === "string" && parseTimeToMinute(value) !== null
    ? value
    : null;
}

function normalizeOptionalId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isDateKey(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function makeItemId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}
