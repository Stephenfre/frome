import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  projects: defineTable({
    userId: v.id("users"),
    title: v.string(),
    category: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  taskGroups: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: v.union(v.literal("todo"), v.literal("done")),
    urgency: v.optional(
      v.union(
        v.literal("must_today"),
        v.literal("should_today"),
        v.literal("can_wait"),
      ),
    ),
    estimatedMinutes: v.optional(
      v.union(v.literal(5), v.literal(10), v.literal(15), v.literal(30)),
    ),
    dueDate: v.optional(v.number()),
    scheduledForToday: v.optional(v.boolean()),
    projectId: v.optional(v.id("projects")),
    taskGroupId: v.optional(v.id("taskGroups")),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),

    // Deprecated fields kept optional during the next-action migration.
    notes: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_scheduled_for_today_and_status", [
      "userId",
      "scheduledForToday",
      "status",
    ])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_task_group", ["userId", "taskGroupId"]),

  events: defineTable({
    userId: v.id("users"),
    title: v.string(),
    startsAt: v.string(),
    endsAt: v.optional(v.string()),
    location: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    placeId: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_starts_at", ["userId", "startsAt"]),

  dailyBriefs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    summary: v.optional(v.string()),
    highlights: v.array(
      v.object({
        title: v.string(),
        body: v.string(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),
});
