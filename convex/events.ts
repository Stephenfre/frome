import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

export type EventView = {
  _id: Id<"events">;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  locationName?: string;
  locationAddress?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
};

type EventFields = {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string;
  locationName?: string;
  locationAddress?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
};

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

function normalizeEvent(event: Doc<"events">): EventView {
  return {
    _id: event._id,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    placeId: event.placeId,
    latitude: event.latitude,
    longitude: event.longitude,
    notes: event.notes,
  };
}

function validateEventFields(args: EventFields) {
  const title = args.title.trim();
  const startsAtTime = Date.parse(args.startsAt);
  const endsAtTime = args.endsAt ? Date.parse(args.endsAt) : null;

  if (!title) {
    throw new Error("Event title is required.");
  }

  if (Number.isNaN(startsAtTime)) {
    throw new Error("Choose a valid start time.");
  }

  if (endsAtTime !== null) {
    if (Number.isNaN(endsAtTime)) {
      throw new Error("Choose a valid end time.");
    }

    if (endsAtTime <= startsAtTime) {
      throw new Error("End time must be after start time.");
    }
  }

  return {
    title,
    startsAt: new Date(startsAtTime).toISOString(),
    endsAt: endsAtTime ? new Date(endsAtTime).toISOString() : undefined,
    location: args.location?.trim() || undefined,
    locationName: args.locationName?.trim() || undefined,
    locationAddress: args.locationAddress?.trim() || undefined,
    placeId: args.placeId?.trim() || undefined,
    latitude: args.latitude,
    longitude: args.longitude,
    notes: args.notes?.trim() || undefined,
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

  return { event, user };
}

export const createEvent = mutation({
  args: {
    title: v.string(),
    startsAt: v.string(),
    endsAt: v.optional(v.union(v.string(), v.null())),
    location: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    placeId: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventFields = validateEventFields(args);
    const user = await getOrCreateCurrentUser(ctx);
    const now = Date.now();

    return await ctx.db.insert("events", {
      userId: user._id,
      ...eventFields,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    startsAt: v.string(),
    endsAt: v.optional(v.union(v.string(), v.null())),
    location: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    placeId: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { event } = await getOwnedEvent(ctx, args.eventId);
    const eventFields = validateEventFields(args);

    await ctx.db.patch(event._id, {
      ...eventFields,
      updatedAt: Date.now(),
    });
  },
});

export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { event } = await getOwnedEvent(ctx, args.eventId);
    await ctx.db.delete(event._id);
  },
});

export const listTodayEvents = query({
  args: {
    startOfDay: v.string(),
    endOfDay: v.string(),
  },
  handler: async (ctx, args): Promise<EventView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_user_starts_at", (q) =>
        q
          .eq("userId", user._id)
          .gte("startsAt", args.startOfDay)
          .lt("startsAt", args.endOfDay),
      )
      .take(100);

    return events
      .map(normalizeEvent)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
});

export const listEventsInRange = query({
  args: {
    startsAtOrAfter: v.string(),
    startsBefore: v.string(),
  },
  handler: async (ctx, args): Promise<EventView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_user_starts_at", (q) =>
        q
          .eq("userId", user._id)
          .gte("startsAt", args.startsAtOrAfter)
          .lt("startsAt", args.startsBefore),
      )
      .take(200);

    return events
      .map(normalizeEvent)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
});

export const listUpcoming = query({
  args: {
    startsAfter: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EventView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_user_starts_at", (q) =>
        q.eq("userId", user._id).gte("startsAt", args.startsAfter),
      )
      .take(args.limit ?? 10);

    return events.map(normalizeEvent);
  },
});
