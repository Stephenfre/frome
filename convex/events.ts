import { v } from "convex/values";
import { rrulestr } from "rrule";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

export type EventType = "fixed" | "anchor" | "reset";
export type DayLoadLevel = "Light" | "Balanced" | "Heavy" | "Overpacked";
export type RecurrencePreset =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "custom";

export type EventView = {
  _id: Id<"events">;
  title: string;
  type: EventType;
  startAt: string;
  endAt?: string;
  color?: string;
  notes?: string;
  location?: string;
  locationName?: string;
  locationAddress?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  reminderMinutesBefore?: number;
  isRecurring: boolean;
  recurrenceRule?: string;
  createdAt: number;
  updatedAt: number;
};

export type DayLoadSummary = {
  level: DayLoadLevel;
  message?: string;
  totalBlocks: number;
  totalMinutes: number;
  fixedCount: number;
  anchorCount: number;
  resetCount: number;
  tightTransitions: number;
};

type EventInput = {
  title: string;
  type: EventType;
  startAt: string;
  endAt?: string | null;
  color?: string;
  notes?: string;
  location?: string;
  locationName?: string;
  locationAddress?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  reminderMinutesBefore?: number;
  isRecurring?: boolean;
  recurrenceRule?: string;
};

type DayArgs = {
  dateKey: string;
  startOfDay: string;
  endOfDay: string;
  weekday: number;
};

const eventTypeValidator = v.union(
  v.literal("fixed"),
  v.literal("anchor"),
  v.literal("reset"),
);

async function getCurrentUser(
  ctx: MutationCtx | QueryCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new Error("Not authenticated");
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) =>
      q.eq("clerkUserId", identity.tokenIdentifier),
    )
    .unique();
}

async function getOrCreateCurrentUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new Error("Not authenticated");
  }

  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) =>
      q.eq("clerkUserId", identity.tokenIdentifier),
    )
    .unique();

  if (existingUser) {
    return existingUser;
  }

  const now = Date.now();
  const userId = await ctx.db.insert("users", {
    clerkUserId: identity.tokenIdentifier,
    email: identity.email,
    name: identity.name,
    imageUrl: identity.pictureUrl,
    createdAt: now,
    updatedAt: now,
  });

  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("Could not create current user.");
  }

  return user;
}

function parseWeekdayFromRecurrenceRule(recurrenceRule?: string) {
  if (!recurrenceRule?.startsWith("weekly:")) {
    return null;
  }

  const weekday = Number.parseInt(recurrenceRule.slice("weekly:".length), 10);

  return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6
    ? weekday
    : null;
}

function normalizeStandardRecurrenceRule(recurrenceRule: string) {
  return recurrenceRule.startsWith("RRULE:")
    ? recurrenceRule.slice("RRULE:".length)
    : recurrenceRule;
}

function getRecurringRuleForWeekday(weekday: number) {
  const weekdayCodes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
  return `FREQ=WEEKLY;BYDAY=${weekdayCodes[weekday]}`;
}

function validateRecurringRule(recurrenceRule: string, startAt: string) {
  const startDate = new Date(startAt);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Choose a valid start time before setting recurrence.");
  }

  try {
    rrulestr(recurrenceRule, { dtstart: startDate });
  } catch {
    throw new Error("Choose a valid recurrence rule.");
  }
}

function normalizeRecurringRule(
  isRecurring: boolean,
  startAt: string,
  recurrenceRule?: string,
) {
  if (!isRecurring) {
    return undefined;
  }

  if (recurrenceRule === "daily" || recurrenceRule === "weekdays") {
    return recurrenceRule === "daily"
      ? "FREQ=DAILY"
      : "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
  }

  const weeklyWeekday = parseWeekdayFromRecurrenceRule(recurrenceRule);

  if (weeklyWeekday !== null) {
    return getRecurringRuleForWeekday(weeklyWeekday);
  }

  const normalizedRule = normalizeStandardRecurrenceRule(
    recurrenceRule?.trim() ?? "",
  );

  if (!normalizedRule) {
    throw new Error("Choose a valid recurrence rule.");
  }

  validateRecurringRule(normalizedRule, startAt);
  return normalizedRule;
}

function normalizeEventColor(color?: string) {
  if (!color) {
    return undefined;
  }

  const trimmedColor = color.trim();

  if (!trimmedColor) {
    return undefined;
  }

  if (!/^#([0-9a-fA-F]{6})$/.test(trimmedColor)) {
    throw new Error("Choose a valid event color.");
  }

  return trimmedColor.toLowerCase();
}

function normalizeEventInput(input: EventInput) {
  const type = input.type;
  const trimmedTitle = input.title.trim();
  const title =
    trimmedTitle || (type === "reset" ? "Reset Block" : trimmedTitle);
  const startAtTime = Date.parse(input.startAt);
  const endAtTime = input.endAt ? Date.parse(input.endAt) : null;
  const color = normalizeEventColor(input.color);
  const isRecurring = Boolean(input.isRecurring);
  const recurrenceRule = normalizeRecurringRule(
    isRecurring,
    input.startAt,
    input.recurrenceRule,
  );

  if (!title) {
    throw new Error("Event title is required.");
  }

  if (Number.isNaN(startAtTime)) {
    throw new Error("Choose a valid start time.");
  }

  if (endAtTime !== null) {
    if (Number.isNaN(endAtTime)) {
      throw new Error("Choose a valid end time.");
    }

    if (endAtTime <= startAtTime) {
      throw new Error("End time must be after start time.");
    }
  }

  if (
    input.reminderMinutesBefore !== undefined &&
    input.reminderMinutesBefore !== null &&
    input.reminderMinutesBefore < 0
  ) {
    throw new Error("Reminder must be zero or greater.");
  }

  return {
    title,
    type,
    startAt: new Date(startAtTime).toISOString(),
    ...(endAtTime !== null ? { endAt: new Date(endAtTime).toISOString() } : {}),
    ...(color ? { color } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    ...(input.location?.trim() ? { location: input.location.trim() } : {}),
    ...(input.locationName?.trim()
      ? { locationName: input.locationName.trim() }
      : {}),
    ...(input.locationAddress?.trim()
      ? { locationAddress: input.locationAddress.trim() }
      : {}),
    ...(input.placeId?.trim() ? { placeId: input.placeId.trim() } : {}),
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
    ...(input.reminderMinutesBefore !== undefined
      ? { reminderMinutesBefore: input.reminderMinutesBefore }
      : {}),
    isRecurring,
    ...(recurrenceRule ? { recurrenceRule } : {}),
  };
}

function normalizeStoredEvent(event: Doc<"events">): EventView | null {
  const startAt = event.startAt ?? event.startsAt;

  if (!startAt) {
    return null;
  }

  return {
    _id: event._id,
    title: event.title,
    type: event.type ?? "fixed",
    startAt,
    endAt: event.endAt ?? event.endsAt,
    color: event.color,
    notes: event.notes,
    location: event.location ?? event.locationName ?? event.locationAddress,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    placeId: event.placeId,
    latitude: event.latitude,
    longitude: event.longitude,
    reminderMinutesBefore: event.reminderMinutesBefore,
    isRecurring: event.isRecurring ?? false,
    recurrenceRule: event.recurrenceRule,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function occursOnDate(event: EventView, args: DayArgs) {
  if (!event.isRecurring || !event.recurrenceRule) {
    return false;
  }

  return getOccurrencesForDate(event, args).length > 0;
}

function getOccurrencesForDate(event: EventView, args: DayArgs) {
  if (!event.recurrenceRule) {
    return [];
  }

  const startOfDay = new Date(args.startOfDay);
  const endOfDay = new Date(args.endOfDay);

  if (
    Number.isNaN(startOfDay.getTime()) ||
    Number.isNaN(endOfDay.getTime()) ||
    Number.isNaN(Date.parse(event.startAt))
  ) {
    return [];
  }

  try {
    const rule = rrulestr(event.recurrenceRule, {
      dtstart: new Date(event.startAt),
    });

    return rule.between(startOfDay, endOfDay, true);
  } catch {
    return [];
  }
}

function materializeRecurringEvent(
  event: EventView,
  occurrenceStart: Date,
): EventView {
  let materializedEnd: string | undefined;

  if (event.endAt) {
    const durationMs = Date.parse(event.endAt) - Date.parse(event.startAt);

    if (!Number.isNaN(durationMs) && durationMs > 0) {
      materializedEnd = new Date(occurrenceStart.getTime() + durationMs)
        .toISOString();
    }
  }

  return {
    ...event,
    startAt: occurrenceStart.toISOString(),
    endAt: materializedEnd,
  };
}

function listConcreteEventsForDate(events: Doc<"events">[], args: DayArgs) {
  const startOfDayTime = Date.parse(args.startOfDay);
  const endOfDayTime = Date.parse(args.endOfDay);
  const visibleEvents: EventView[] = [];

  for (const event of events) {
    const normalizedEvent = normalizeStoredEvent(event);

    if (!normalizedEvent) {
      continue;
    }

    if (normalizedEvent.isRecurring) {
      const occurrences = getOccurrencesForDate(normalizedEvent, args);

      for (const occurrence of occurrences) {
        visibleEvents.push(materializeRecurringEvent(normalizedEvent, occurrence));
      }

      continue;
    }

    const eventStartTime = Date.parse(normalizedEvent.startAt);

    if (
      Number.isNaN(eventStartTime) ||
      eventStartTime < startOfDayTime ||
      eventStartTime >= endOfDayTime
    ) {
      continue;
    }

    visibleEvents.push(normalizedEvent);
  }

  return visibleEvents.sort((firstEvent, secondEvent) =>
    firstEvent.startAt.localeCompare(secondEvent.startAt),
  );
}

function buildDayLoadSummary(events: EventView[]): DayLoadSummary {
  const totalBlocks = events.length;
  const totalMinutes = events.reduce((minutes, event) => {
    const eventStartTime = Date.parse(event.startAt);
    const eventEndTime = Date.parse(event.endAt ?? event.startAt);

    if (
      Number.isNaN(eventStartTime) ||
      Number.isNaN(eventEndTime) ||
      eventEndTime <= eventStartTime
    ) {
      return minutes + 30;
    }

    return minutes + Math.round((eventEndTime - eventStartTime) / 60000);
  }, 0);
  const sortedEvents = [...events].sort((firstEvent, secondEvent) =>
    firstEvent.startAt.localeCompare(secondEvent.startAt),
  );
  let tightTransitions = 0;

  for (let index = 1; index < sortedEvents.length; index += 1) {
    const previousEvent = sortedEvents[index - 1];
    const currentEvent = sortedEvents[index];
    const previousEndTime = Date.parse(
      previousEvent.endAt ?? previousEvent.startAt,
    );
    const currentStartTime = Date.parse(currentEvent.startAt);

    if (
      Number.isNaN(previousEndTime) ||
      Number.isNaN(currentStartTime) ||
      currentStartTime - previousEndTime >= 15 * 60 * 1000
    ) {
      continue;
    }

    tightTransitions += 1;
  }

  const fixedCount = events.filter((event) => event.type === "fixed").length;
  const anchorCount = events.filter((event) => event.type === "anchor").length;
  const resetCount = events.filter((event) => event.type === "reset").length;

  let level: DayLoadLevel = "Light";

  if (
    totalBlocks >= 8 ||
    totalMinutes >= 540 ||
    tightTransitions >= 3 ||
    (totalBlocks >= 6 && resetCount === 0)
  ) {
    level = "Overpacked";
  } else if (totalBlocks >= 6 || totalMinutes >= 420 || tightTransitions >= 2) {
    level = "Heavy";
  } else if (totalBlocks >= 3 || totalMinutes >= 180) {
    level = "Balanced";
  }

  let message: string | undefined;

  if (level === "Overpacked") {
    message =
      "Your day looks tightly packed. Consider leaving more buffer time.";
  } else if (level === "Heavy" && resetCount === 0) {
    message =
      "You have a full day. A reset block could make it easier to follow.";
  }

  return {
    level,
    message,
    totalBlocks,
    totalMinutes,
    fixedCount,
    anchorCount,
    resetCount,
    tightTransitions,
  };
}

async function getOwnedEvent(ctx: MutationCtx, eventId: Id<"events">) {
  const user = await getCurrentUser(ctx);

  if (!user) {
    throw new Error("User not found.");
  }

  const event = await ctx.db.get(eventId);

  if (!event || event.userId !== user._id) {
    throw new Error("Event not found.");
  }

  return event;
}

async function getUserEvents(ctx: QueryCtx, args: DayArgs) {
  const user = await getCurrentUser(ctx);

  if (!user) {
    return [];
  }

  const events = await ctx.db
    .query("events")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .take(500);

  return listConcreteEventsForDate(events, args);
}

export const createEvent = mutation({
  args: {
    title: v.string(),
    type: eventTypeValidator,
    startAt: v.string(),
    endAt: v.optional(v.union(v.string(), v.null())),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
    location: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    placeId: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    reminderMinutesBefore: v.optional(v.number()),
    isRecurring: v.optional(v.boolean()),
    recurrenceRule: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEvent = normalizeEventInput(args);
    const user = await getOrCreateCurrentUser(ctx);
    const now = Date.now();

    return await ctx.db.insert("events", {
      userId: user._id,
      ...normalizedEvent,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    type: eventTypeValidator,
    startAt: v.string(),
    endAt: v.optional(v.union(v.string(), v.null())),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
    location: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    placeId: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    reminderMinutesBefore: v.optional(v.number()),
    isRecurring: v.optional(v.boolean()),
    recurrenceRule: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await getOwnedEvent(ctx, args.eventId);
    const normalizedEvent = normalizeEventInput(args);

    await ctx.db.replace(event._id, {
      userId: event.userId,
      ...normalizedEvent,
      createdAt: event.createdAt,
      updatedAt: Date.now(),
    });
  },
});

export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await getOwnedEvent(ctx, args.eventId);
    await ctx.db.delete(event._id);
  },
});

export const listRecurringAnchorsForDate = query({
  args: {
    dateKey: v.string(),
    startOfDay: v.string(),
    endOfDay: v.string(),
    weekday: v.number(),
  },
  handler: async (ctx, args): Promise<EventView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const recurringAnchors = await ctx.db
      .query("events")
      .withIndex("by_user_and_type_and_is_recurring", (q) =>
        q.eq("userId", user._id).eq("type", "anchor").eq("isRecurring", true),
      )
      .take(200);

    return recurringAnchors
      .map(normalizeStoredEvent)
      .filter((event): event is EventView => event !== null)
      .filter((event) => occursOnDate(event, args))
      .flatMap((event) =>
        getOccurrencesForDate(event, args).map((occurrence) =>
          materializeRecurringEvent(event, occurrence),
        ),
      )
      .sort((firstEvent, secondEvent) =>
        firstEvent.startAt.localeCompare(secondEvent.startAt),
      );
  },
});

export const listEventsByDate = query({
  args: {
    dateKey: v.string(),
    startOfDay: v.string(),
    endOfDay: v.string(),
    weekday: v.number(),
  },
  handler: async (ctx, args): Promise<EventView[]> => {
    return await getUserEvents(ctx, args);
  },
});

export const listEventsInRange = query({
  args: {
    startOfRange: v.string(),
    endOfRange: v.string(),
  },
  handler: async (ctx, args): Promise<EventView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const rangeStartTime = Date.parse(args.startOfRange);
    const rangeEndTime = Date.parse(args.endOfRange);

    if (Number.isNaN(rangeStartTime) || Number.isNaN(rangeEndTime)) {
      throw new Error("Choose a valid date range.");
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(500);

    const visibleEvents: EventView[] = [];

    for (
      let cursor = new Date(args.startOfRange);
      cursor < new Date(args.endOfRange);
      cursor.setDate(cursor.getDate() + 1)
    ) {
      visibleEvents.push(
        ...listConcreteEventsForDate(events, {
          dateKey: "",
          startOfDay: new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate(),
            0,
            0,
            0,
            0,
          ).toISOString(),
          endOfDay: new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate() + 1,
            0,
            0,
            0,
            0,
          ).toISOString(),
          weekday: cursor.getDay(),
        }),
      );
    }

    return visibleEvents.filter((event) => {
      const eventStartTime = Date.parse(event.startAt);

      return (
        !Number.isNaN(eventStartTime) &&
        eventStartTime >= rangeStartTime &&
        eventStartTime < rangeEndTime
      );
    });
  },
});

export const listTodayEvents = query({
  args: {
    dateKey: v.string(),
    startOfDay: v.string(),
    endOfDay: v.string(),
    weekday: v.number(),
  },
  handler: async (ctx, args): Promise<EventView[]> => {
    return await getUserEvents(ctx, args);
  },
});

export const getDayLoadSummary = query({
  args: {
    dateKey: v.string(),
    startOfDay: v.string(),
    endOfDay: v.string(),
    weekday: v.number(),
  },
  handler: async (ctx, args): Promise<DayLoadSummary> => {
    const events = await getUserEvents(ctx, args);
    return buildDayLoadSummary(events);
  },
});
