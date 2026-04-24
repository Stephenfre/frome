import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  buildGoalDetailView,
  buildGoalView,
  getCurrentUser,
  getOrCreateCurrentUser,
  type GoalCategory,
  type GoalDashboardSummary,
  type GoalDetailView,
  type GoalHorizon,
  type GoalProgressState,
  type GoalStatus,
  type GoalView,
  requireOwnedGoal,
  trimOptionalString,
} from "./goalsHelpers";

const goalCategoryValidator = v.union(
  v.literal("career"),
  v.literal("finance"),
  v.literal("health"),
  v.literal("fitness"),
  v.literal("relationships"),
  v.literal("personal"),
  v.literal("learning"),
  v.literal("other"),
);

const goalStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("archived"),
);

const goalHorizonValidator = v.union(
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("quarterly"),
);

const estimatedMinutesValidator = v.union(
  v.literal(2),
  v.literal(5),
  v.literal(10),
  v.literal(15),
  v.literal(30),
);

export type {
  GoalCategory,
  GoalDashboardSummary,
  GoalDetailView,
  GoalHorizon,
  GoalProgressState,
  GoalStatus,
  GoalView,
} from "./goalsHelpers";

async function fetchGoals(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);

  if (!user) {
    return null;
  }

  const goals = await ctx.db
    .query("goals")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();

  return { goals, userId: user._id };
}

async function countActiveGoalsForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  excludingGoalId?: Id<"goals">,
) {
  const activeGoals = await ctx.db
    .query("goals")
    .withIndex("by_user_and_status", (q) =>
      q.eq("userId", userId).eq("status", "active"),
    )
    .collect();

  return activeGoals.filter((goal) => goal._id !== excludingGoalId).length;
}

function normalizeGoalTitle(title: string) {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error("Goal title is required.");
  }

  return trimmedTitle;
}

function normalizeGoalStatus(status?: GoalStatus | null) {
  return status ?? "active";
}

function normalizeDateValue(value?: number | null) {
  return value ?? undefined;
}

function deriveGoalHorizon(targetDate?: number | null): GoalHorizon {
  if (!targetDate) {
    return "monthly";
  }

  const daysUntilTarget = Math.ceil(
    (targetDate - Date.now()) / (24 * 60 * 60 * 1000),
  );

  if (daysUntilTarget <= 14) {
    return "weekly";
  }

  if (daysUntilTarget <= 90) {
    return "monthly";
  }

  return "quarterly";
}

export const listGoals = query({
  args: {},
  handler: async (ctx): Promise<GoalView[]> => {
    const result = await fetchGoals(ctx);

    if (!result) {
      return [];
    }

    const { goals, userId } = result;
    const goalViews = await Promise.all(
      goals.map((goal) => buildGoalView(ctx, userId, goal)),
    );

    return goalViews.sort((firstGoal, secondGoal) => {
      const statusOrder: Record<GoalStatus, number> = {
        active: 0,
        paused: 1,
        completed: 2,
        archived: 3,
      };

      if (statusOrder[firstGoal.status] !== statusOrder[secondGoal.status]) {
        return statusOrder[firstGoal.status] - statusOrder[secondGoal.status];
      }

      return secondGoal.updatedAt - firstGoal.updatedAt;
    });
  },
});

export const listActiveGoals = query({
  args: {},
  handler: async (ctx): Promise<GoalView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .collect();

    const goalViews = await Promise.all(
      goals.map((goal) => buildGoalView(ctx, user._id, goal)),
    );

    return goalViews.sort((firstGoal, secondGoal) => {
      if (firstGoal.progressState !== secondGoal.progressState) {
        const progressOrder = {
          "Needs Clarity": 0,
          Stalled: 1,
          "On Track": 2,
          Completed: 3,
        } as const;

        return (
          progressOrder[firstGoal.progressState] -
          progressOrder[secondGoal.progressState]
        );
      }

      return secondGoal.updatedAt - firstGoal.updatedAt;
    });
  },
});

export const getGoalById = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args): Promise<GoalDetailView | null> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    const goal = await ctx.db.get(args.goalId);

    if (!goal || goal.userId !== user._id) {
      return null;
    }

    return await buildGoalDetailView(ctx, user._id, goal);
  },
});

export const getGoalDashboardSummary = query({
  args: {},
  handler: async (ctx): Promise<GoalDashboardSummary> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return {
        activeGoalCount: 0,
        needsClarityCount: 0,
        onTrackCount: 0,
        stalledCount: 0,
        goals: [],
        summary: "No active goals yet. Start with 1-3 concrete goals.",
      };
    }

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .collect();
    const activeGoals = await Promise.all(
      goals.map((goal) => buildGoalView(ctx, user._id, goal)),
    );
    const needsClarityCount = activeGoals.filter(
      (goal) => goal.progressState === "Needs Clarity",
    ).length;
    const stalledCount = activeGoals.filter(
      (goal) => goal.progressState === "Stalled",
    ).length;
    const onTrackCount = activeGoals.filter(
      (goal) => goal.progressState === "On Track",
    ).length;

    let summary = "No active goals yet. Start with 1-3 concrete goals.";

    if (activeGoals.length > 0) {
      summary =
        `${activeGoals.length} active ${activeGoals.length === 1 ? "goal" : "goals"}. ` +
        (needsClarityCount > 0
          ? `${needsClarityCount} ${needsClarityCount === 1 ? "goal needs" : "goals need"} a next action.`
          : "Your active goals have a visible next step.");
    }

    return {
      activeGoalCount: activeGoals.length,
      needsClarityCount,
      onTrackCount,
      stalledCount,
      goals: activeGoals,
      summary,
    };
  },
});

export const createGoal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    category: goalCategoryValidator,
    horizon: goalHorizonValidator,
    status: v.optional(goalStatusValidator),
    startDate: v.optional(v.union(v.number(), v.null())),
    targetDate: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const status = normalizeGoalStatus(args.status);

    if ((status === "active") && (await countActiveGoalsForUser(ctx, user._id)) >= 3) {
      throw new Error("Keep active goals to 1-3. Pause or archive one before adding another.");
    }

    const now = Date.now();

    return await ctx.db.insert("goals", {
      userId: user._id,
      title: normalizeGoalTitle(args.title),
      description: trimOptionalString(args.description),
      category: args.category,
      status,
      horizon: args.horizon,
      startDate: normalizeDateValue(args.startDate),
      targetDate: normalizeDateValue(args.targetDate),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateGoal = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    category: v.optional(goalCategoryValidator),
    horizon: v.optional(goalHorizonValidator),
    status: v.optional(goalStatusValidator),
    startDate: v.optional(v.union(v.number(), v.null())),
    targetDate: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const goal = await requireOwnedGoal(ctx, user._id, args.goalId);

    if (
      args.status === "active" &&
      goal.status !== "active" &&
      (await countActiveGoalsForUser(ctx, user._id, goal._id)) >= 3
    ) {
      throw new Error("Keep active goals to 1-3. Pause or archive one before activating another.");
    }

    const patch: Partial<typeof goal> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      patch.title = normalizeGoalTitle(args.title);
    }

    if (args.description !== undefined) {
      patch.description = trimOptionalString(args.description);
    }

    if (args.category !== undefined) {
      patch.category = args.category;
    }

    if (args.horizon !== undefined) {
      patch.horizon = args.horizon;
    }

    if (args.status !== undefined) {
      patch.status = args.status;
    }

    if (args.startDate !== undefined) {
      patch.startDate = normalizeDateValue(args.startDate);
    }

    if (args.targetDate !== undefined) {
      patch.targetDate = normalizeDateValue(args.targetDate);
    }

    await ctx.db.patch(goal._id, patch);
    return goal._id;
  },
});

export const createGoalFromBreakdown = mutation({
  args: {
    goalTitle: v.string(),
    goalCategory: goalCategoryValidator,
    projects: v.array(
      v.object({
        title: v.string(),
        nextActions: v.array(
          v.object({
            estimatedMinutes: estimatedMinutesValidator,
            title: v.string(),
          }),
        ),
      }),
    ),
    summary: v.optional(v.union(v.string(), v.null())),
    targetDate: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);

    if ((await countActiveGoalsForUser(ctx, user._id)) >= 3) {
      throw new Error("Keep active goals to 1-3. Pause or archive one before adding another.");
    }

    const goalTitle = normalizeGoalTitle(args.goalTitle);
    const projects = args.projects
      .map((project) => ({
        nextActions: project.nextActions
          .map((nextAction) => ({
            estimatedMinutes: nextAction.estimatedMinutes,
            title: nextAction.title.trim(),
          }))
          .filter((nextAction) => nextAction.title.length > 0)
          .slice(0, 3),
        title: project.title.trim(),
      }))
      .filter((project) => project.title.length > 0)
      .slice(0, 5);

    if (projects.length === 0) {
      throw new Error("Keep at least one project before saving.");
    }

    const now = Date.now();
    const targetDate = normalizeDateValue(args.targetDate);
    const goalId = await ctx.db.insert("goals", {
      userId: user._id,
      title: goalTitle,
      description: trimOptionalString(args.summary),
      category: args.goalCategory,
      status: "active",
      horizon: deriveGoalHorizon(targetDate),
      startDate: undefined,
      targetDate,
      createdAt: now,
      updatedAt: now,
    });

    for (const [projectIndex, project] of projects.entries()) {
      const projectId = await ctx.db.insert("goalProjects", {
        userId: user._id,
        goalId,
        title: project.title,
        description: undefined,
        status: "active",
        order: projectIndex,
        createdAt: now,
        updatedAt: now,
      });

      for (const nextAction of project.nextActions) {
        await ctx.db.insert("projectNextActions", {
          userId: user._id,
          projectId,
          title: nextAction.title,
          status: "todo",
          estimatedMinutes: nextAction.estimatedMinutes,
          notes: undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return goalId;
  },
});

export const archiveGoal = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const goal = await requireOwnedGoal(ctx, user._id, args.goalId);

    await ctx.db.patch(goal._id, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return goal._id;
  },
});

export const pauseGoal = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const goal = await requireOwnedGoal(ctx, user._id, args.goalId);

    await ctx.db.patch(goal._id, {
      status: "paused",
      updatedAt: Date.now(),
    });

    return goal._id;
  },
});

export const completeGoal = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const goal = await requireOwnedGoal(ctx, user._id, args.goalId);

    await ctx.db.patch(goal._id, {
      status: "completed",
      updatedAt: Date.now(),
    });

    return goal._id;
  },
});

export const deleteGoal = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const goal = await requireOwnedGoal(ctx, user._id, args.goalId);

    const projects = await ctx.db
      .query("goalProjects")
      .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
      .collect();
    const ownedProjects = projects.filter((project) => project.userId === user._id);

    for (const project of ownedProjects) {
      const nextActions = await ctx.db
        .query("projectNextActions")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();

      for (const nextAction of nextActions) {
        if (nextAction.userId === user._id) {
          await ctx.db.delete(nextAction._id);
        }
      }

      await ctx.db.delete(project._id);
    }

    const reviews = await ctx.db
      .query("goalReviews")
      .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
      .collect();

    for (const review of reviews) {
      if (review.userId === user._id) {
        await ctx.db.delete(review._id);
      }
    }

    await ctx.db.delete(goal._id);

    return goal._id;
  },
});
