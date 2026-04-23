import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

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

export const createProject = mutation({
  args: {
    title: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();

    if (!title) {
      throw new Error("Project title is required.");
    }

    const user = await getOrCreateCurrentUser(ctx);
    const now = Date.now();

    return await ctx.db.insert("projects", {
      userId: user._id,
      title,
      category: args.category?.trim() || undefined,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listProjects = query({
  args: {},
  handler: async (ctx): Promise<Doc<"projects">[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(100);

    return projects
      .filter((project) => project.status !== "archived")
      .sort((a, b) => a.title.localeCompare(b.title));
  },
});
