import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { EventView } from "./events";
import type { GoalView } from "./goals";
import type { TaskView } from "./tasks";
import type {
  EmailTriageItemCategory,
  EmailTriagePriority,
  EmailTriageResult,
} from "../src/types/email";

export type DailyBriefView = {
  date: string;
  summary: string;
  topPriorities: string[];
  warning?: string;
  suggestion?: string;
  emailSummary?: EmailTriageResult | null;
  generatedAt: number;
  model?: string;
};

export type DailyBriefContext = {
  date: string;
  timezone?: string;
  events: Array<{
    title: string;
    startAt?: string;
    endAt?: string;
    type?: string;
  }>;
  tasks: Array<{
    title: string;
    urgency?: string;
    estimatedMinutes?: number;
  }>;
  goals: Array<{
    title: string;
    status?: string;
    progressState?: string;
  }>;
  finance: {
    summary?: string;
    alerts?: string[];
  } | null;
  emailSummary?: EmailTriageResult | null;
};

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
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

function normalizeDailyBrief(record: Doc<"dailyBriefs">): DailyBriefView {
  return {
    date: record.date,
    summary:
      record.summary ??
      "Your day is open. Choose one concrete priority and protect time for it early.",
    topPriorities:
      record.topPriorities ??
      record.highlights?.map((highlight) => highlight.title).slice(0, 3) ??
      [],
    warning: record.warning,
    suggestion: record.suggestion,
    emailSummary: record.emailSummary
      ? {
          summary: record.emailSummary.summary,
          importantCount: record.emailSummary.importantCount,
          ignoreCount: record.emailSummary.ignoreCount,
          items: record.emailSummary.items.map((item) => ({
            id: item.id,
            subject: item.subject,
            from: item.from,
            reason: item.reason,
            category: normalizeEmailCategory(item.category),
            priority: normalizeEmailPriority(item.priority),
            ...(item.suggestedAction ? { suggestedAction: item.suggestedAction } : {}),
          })),
        }
      : null,
    generatedAt: record.generatedAt ?? record.updatedAt,
    model: record.model,
  };
}

function normalizeEmailCategory(value: string): EmailTriageItemCategory {
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

function normalizeEmailPriority(value: string): EmailTriagePriority {
  switch (value) {
    case "high":
    case "medium":
      return value;
    default:
      return "low";
  }
}

function normalizeEmailSummaryForSave(
  value?: {
    summary: string;
    importantCount: number;
    ignoreCount: number;
    items: Array<{
      id: string;
      subject: string;
      from: string;
      reason: string;
      category: string;
      priority: string;
      suggestedAction?: string;
    }>;
  },
): EmailTriageResult | undefined {
  if (!value) {
    return undefined;
  }

  return {
    summary: value.summary,
    importantCount: value.importantCount,
    ignoreCount: value.ignoreCount,
    items: value.items.map((item) => ({
      id: item.id,
      subject: item.subject,
      from: item.from,
      reason: item.reason,
      category: normalizeEmailCategory(item.category),
      priority: normalizeEmailPriority(item.priority),
      ...(item.suggestedAction ? { suggestedAction: item.suggestedAction } : {}),
    })),
  };
}

async function upsertDailyBrief(
  ctx: MutationCtx,
  userId: Doc<"users">["_id"],
  args: {
    date: string;
    summary: string;
    topPriorities: string[];
    warning?: string;
    suggestion?: string;
    emailSummary?: EmailTriageResult | null;
    generatedAt: number;
    model: string;
  },
): Promise<DailyBriefView> {
  const existingBrief = await ctx.db
    .query("dailyBriefs")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", userId).eq("date", args.date),
    )
    .unique();

  const now = Date.now();
  const highlights = args.topPriorities.map((priority) => ({
    title: priority,
    body: "Priority",
  }));
  const optionalFields = {
    ...(args.warning ? { warning: args.warning } : {}),
    ...(args.suggestion ? { suggestion: args.suggestion } : {}),
    ...(args.emailSummary ? { emailSummary: args.emailSummary } : {}),
  };

  if (existingBrief) {
    await ctx.db.replace(existingBrief._id, {
      userId: existingBrief.userId,
      date: existingBrief.date,
      summary: args.summary,
      topPriorities: args.topPriorities,
      highlights,
      generatedAt: args.generatedAt,
      model: args.model,
      createdAt: existingBrief.createdAt,
      updatedAt: now,
      ...optionalFields,
    });

    const updatedBrief = await ctx.db.get(existingBrief._id);

    if (!updatedBrief) {
      throw new Error("Could not load the saved daily brief.");
    }

    return normalizeDailyBrief(updatedBrief);
  }

  const briefId = await ctx.db.insert("dailyBriefs", {
    userId,
    date: args.date,
    summary: args.summary,
    topPriorities: args.topPriorities,
    highlights,
    generatedAt: args.generatedAt,
    model: args.model,
    createdAt: now,
    updatedAt: now,
    ...optionalFields,
  });
  const brief = await ctx.db.get(briefId);

  if (!brief) {
    throw new Error("Could not save the daily brief.");
  }

  return normalizeDailyBrief(brief);
}

export const getDailyBriefForDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args): Promise<DailyBriefView | null> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    const record = await ctx.db
      .query("dailyBriefs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date),
      )
      .unique();

    return record ? normalizeDailyBrief(record) : null;
  },
});

export const getDailyBriefForDateInternal = internalQuery({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args): Promise<DailyBriefView | null> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    const record = await ctx.db
      .query("dailyBriefs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date),
      )
      .unique();

    return record ? normalizeDailyBrief(record) : null;
  },
});

export const getDailyBriefGenerationContext = internalQuery({
  args: {
    date: v.string(),
    dateKey: v.string(),
    startOfDay: v.string(),
    endOfDay: v.string(),
    weekday: v.number(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DailyBriefContext> => {
    const tasks: TaskView[] = await ctx.runQuery(api.tasks.listTodayTasks, {});
    const events: EventView[] = await ctx.runQuery(api.events.listTodayEvents, {
      dateKey: args.dateKey,
      startOfDay: args.startOfDay,
      endOfDay: args.endOfDay,
      weekday: args.weekday,
    });
    const goals: GoalView[] = await ctx.runQuery(api.goals.listActiveGoals, {});

    return {
      date: args.date,
      timezone: args.timezone,
      events: events.slice(0, 6).map((event) => ({
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        type: event.type,
      })),
      tasks: tasks.slice(0, 6).map((task) => ({
        title: task.title,
        urgency: task.urgency,
        estimatedMinutes: task.estimatedMinutes,
      })),
      goals: goals.slice(0, 4).map((goal) => ({
        title: goal.title,
        status: goal.status,
        progressState: goal.progressState,
      })),
      finance: null,
    };
  },
});

export const saveDailyBrief = internalMutation({
  args: {
    date: v.string(),
    summary: v.string(),
    topPriorities: v.array(v.string()),
    warning: v.optional(v.string()),
    suggestion: v.optional(v.string()),
    generatedAt: v.number(),
    model: v.string(),
    emailSummary: v.optional(
      v.object({
        summary: v.string(),
        importantCount: v.number(),
        ignoreCount: v.number(),
        items: v.array(
          v.object({
            id: v.string(),
            subject: v.string(),
            from: v.string(),
            reason: v.string(),
            category: v.string(),
            priority: v.string(),
            suggestedAction: v.optional(v.string()),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args): Promise<DailyBriefView> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }
    return await upsertDailyBrief(ctx, user._id, {
      ...args,
      emailSummary: normalizeEmailSummaryForSave(args.emailSummary),
    });
  },
});

export const saveDailyBriefFromClient = mutation({
  args: {
    date: v.string(),
    summary: v.string(),
    topPriorities: v.array(v.string()),
    warning: v.optional(v.string()),
    suggestion: v.optional(v.string()),
    generatedAt: v.number(),
    model: v.string(),
    emailSummary: v.optional(
      v.object({
        summary: v.string(),
        importantCount: v.number(),
        ignoreCount: v.number(),
        items: v.array(
          v.object({
            id: v.string(),
            subject: v.string(),
            from: v.string(),
            reason: v.string(),
            category: v.string(),
            priority: v.string(),
            suggestedAction: v.optional(v.string()),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args): Promise<DailyBriefView> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    return await upsertDailyBrief(ctx, user._id, {
      ...args,
      emailSummary: normalizeEmailSummaryForSave(args.emailSummary),
    });
  },
});

export const clearDailyBriefForDate = mutation({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const brief = await ctx.db
      .query("dailyBriefs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date),
      )
      .unique();

    if (!brief) {
      return null;
    }

    await ctx.db.delete(brief._id);
    return args.date;
  },
});
