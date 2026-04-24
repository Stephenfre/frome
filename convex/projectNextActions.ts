import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  getOrCreateCurrentUser,
  listNextActionsForProject,
  ProjectNextActionEstimate,
  ProjectNextActionView,
  requireOwnedProject,
  trimOptionalString,
} from "./goalsHelpers";

const estimatedMinutesValidator = v.union(
  v.literal(2),
  v.literal(5),
  v.literal(10),
  v.literal(15),
  v.literal(30),
);

const nextActionStatusValidator = v.union(v.literal("todo"), v.literal("done"));

export type {
  ProjectNextActionEstimate,
  ProjectNextActionView,
} from "./goalsHelpers";

export const listProjectNextActions = query({
  args: {
    projectId: v.id("goalProjects"),
  },
  handler: async (ctx, args): Promise<ProjectNextActionView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    await requireOwnedProject(ctx, user._id, args.projectId);
    return await listNextActionsForProject(ctx, user._id, args.projectId);
  },
});

export const createNextAction = mutation({
  args: {
    projectId: v.id("goalProjects"),
    title: v.string(),
    estimatedMinutes: estimatedMinutesValidator,
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const project = await requireOwnedProject(ctx, user._id, args.projectId);
    const title = args.title.trim();

    if (!title) {
      throw new Error("Next action title is required.");
    }

    const now = Date.now();
    const nextActionId = await ctx.db.insert("projectNextActions", {
      userId: user._id,
      projectId: project._id,
      title,
      status: "todo",
      estimatedMinutes: args.estimatedMinutes,
      notes: trimOptionalString(args.notes),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(project._id, {
      updatedAt: now,
    });

    return nextActionId;
  },
});

export const updateNextAction = mutation({
  args: {
    nextActionId: v.id("projectNextActions"),
    title: v.optional(v.string()),
    status: v.optional(nextActionStatusValidator),
    estimatedMinutes: v.optional(estimatedMinutesValidator),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const nextAction = await ctx.db.get(args.nextActionId);

    if (!nextAction || nextAction.userId !== user._id) {
      throw new Error("Next action not found.");
    }

    await requireOwnedProject(ctx, user._id, nextAction.projectId);

    const patch: Partial<typeof nextAction> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      const title = args.title.trim();

      if (!title) {
        throw new Error("Next action title is required.");
      }

      patch.title = title;
    }

    if (args.status !== undefined) {
      patch.status = args.status;
      patch.completedAt = args.status === "done" ? Date.now() : undefined;
    }

    if (args.estimatedMinutes !== undefined) {
      patch.estimatedMinutes = args.estimatedMinutes;
    }

    if (args.notes !== undefined) {
      patch.notes = trimOptionalString(args.notes);
    }

    await ctx.db.patch(nextAction._id, patch);
    await ctx.db.patch(nextAction.projectId, {
      updatedAt: Date.now(),
    });

    return nextAction._id;
  },
});

export const completeNextAction = mutation({
  args: {
    nextActionId: v.id("projectNextActions"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const nextAction = await ctx.db.get(args.nextActionId);

    if (!nextAction || nextAction.userId !== user._id) {
      throw new Error("Next action not found.");
    }

    const now = Date.now();

    await ctx.db.patch(nextAction._id, {
      status: "done",
      completedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(nextAction.projectId, {
      updatedAt: now,
    });

    return nextAction._id;
  },
});

export const deleteNextAction = mutation({
  args: {
    nextActionId: v.id("projectNextActions"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const nextAction = await ctx.db.get(args.nextActionId);

    if (!nextAction || nextAction.userId !== user._id) {
      throw new Error("Next action not found.");
    }

    await requireOwnedProject(ctx, user._id, nextAction.projectId);

    const now = Date.now();

    await ctx.db.delete(nextAction._id);
    await ctx.db.patch(nextAction.projectId, {
      updatedAt: now,
    });

    return args.nextActionId;
  },
});
