import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  getOrCreateCurrentUser,
  GoalProjectView,
  listProjectsForGoal,
  requireOwnedGoal,
  requireOwnedProject,
  trimOptionalString,
} from "./goalsHelpers";

const goalProjectStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived"),
);

export type { GoalProjectView } from "./goalsHelpers";

export const listGoalProjects = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args): Promise<GoalProjectView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    await requireOwnedGoal(ctx, user._id, args.goalId);
    return await listProjectsForGoal(ctx, user._id, args.goalId);
  },
});

export const createProject = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    await requireOwnedGoal(ctx, user._id, args.goalId);

    const title = args.title.trim();

    if (!title) {
      throw new Error("Project title is required.");
    }

    const existingProjects = await ctx.db
      .query("goalProjects")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    const now = Date.now();

    return await ctx.db.insert("goalProjects", {
      userId: user._id,
      goalId: args.goalId,
      title,
      description: trimOptionalString(args.description),
      status: "active",
      order: existingProjects.length,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProject = mutation({
  args: {
    projectId: v.id("goalProjects"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    status: v.optional(goalProjectStatusValidator),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const project = await requireOwnedProject(ctx, user._id, args.projectId);
    const patch: Partial<typeof project> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      const title = args.title.trim();

      if (!title) {
        throw new Error("Project title is required.");
      }

      patch.title = title;
    }

    if (args.description !== undefined) {
      patch.description = trimOptionalString(args.description);
    }

    if (args.status !== undefined) {
      patch.status = args.status;
    }

    if (args.order !== undefined) {
      patch.order = args.order;
    }

    await ctx.db.patch(project._id, patch);
    return project._id;
  },
});

export const completeProject = mutation({
  args: {
    projectId: v.id("goalProjects"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const project = await requireOwnedProject(ctx, user._id, args.projectId);

    await ctx.db.patch(project._id, {
      status: "completed",
      updatedAt: Date.now(),
    });

    return project._id;
  },
});
