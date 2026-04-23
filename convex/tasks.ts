import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

const urgencyValidator = v.union(
  v.literal("must_today"),
  v.literal("should_today"),
  v.literal("can_wait"),
);

const estimatedMinutesValidator = v.union(
  v.literal(5),
  v.literal(10),
  v.literal(15),
  v.literal(30),
);

type Urgency = "must_today" | "should_today" | "can_wait";
type EstimatedMinutes = 5 | 10 | 15 | 30;

export type TaskView = {
  _id: Id<"tasks">;
  title: string;
  status: "todo" | "done";
  urgency: Urgency;
  estimatedMinutes: EstimatedMinutes;
  dueDate?: number;
  scheduledForToday: boolean;
  projectId?: Id<"projects">;
  projectTitle?: string;
  taskGroupId?: Id<"taskGroups">;
  taskGroupTitle?: string;
  tags: string[];
  createdAt: number;
  completedAt?: number;
};

export type CompletedTaskGroupView = {
  groupId?: Id<"taskGroups">;
  title: string;
  tasks: TaskView[];
  completedAt: number;
};

const urgencyRank: Record<Urgency, number> = {
  must_today: 0,
  should_today: 1,
  can_wait: 2,
};

const legacyPriorityUrgency: Record<
  NonNullable<Doc<"tasks">["priority"]>,
  Urgency
> = {
  high: "must_today",
  medium: "should_today",
  low: "can_wait",
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

function normalizeTask(
  task: Doc<"tasks">,
  project?: Doc<"projects"> | null,
  taskGroup?: Doc<"taskGroups"> | null,
): TaskView {
  return {
    _id: task._id,
    title: task.title,
    status: task.status,
    urgency:
      task.urgency ??
      (task.priority ? legacyPriorityUrgency[task.priority] : "should_today"),
    estimatedMinutes: task.estimatedMinutes ?? 10,
    dueDate: task.dueDate,
    scheduledForToday: task.scheduledForToday ?? Boolean(task.dueDate),
    projectId: task.projectId,
    projectTitle: project?.title,
    taskGroupId: task.taskGroupId,
    taskGroupTitle: taskGroup?.title,
    tags: task.tags ?? [],
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  };
}

async function normalizeTasks(
  ctx: QueryCtx,
  tasks: Doc<"tasks">[],
): Promise<TaskView[]> {
  const projectIds = Array.from(
    new Set(tasks.flatMap((task) => (task.projectId ? [task.projectId] : []))),
  );
  const taskGroupIds = Array.from(
    new Set(
      tasks.flatMap((task) => (task.taskGroupId ? [task.taskGroupId] : [])),
    ),
  );
  const projectsById = new Map<Id<"projects">, Doc<"projects">>();
  const taskGroupsById = new Map<Id<"taskGroups">, Doc<"taskGroups">>();

  await Promise.all([
    ...projectIds.map(async (projectId) => {
      const project = await ctx.db.get(projectId);

      if (project) {
        projectsById.set(projectId, project);
      }
    }),
    ...taskGroupIds.map(async (taskGroupId) => {
      const taskGroup = await ctx.db.get(taskGroupId);

      if (taskGroup) {
        taskGroupsById.set(taskGroupId, taskGroup);
      }
    }),
  ]);

  return tasks.map((task) =>
    normalizeTask(
      task,
      task.projectId ? projectsById.get(task.projectId) : undefined,
      task.taskGroupId ? taskGroupsById.get(task.taskGroupId) : undefined,
    ),
  );
}

function sortTasks(tasks: TaskView[]) {
  return tasks.sort((a, b) => {
    const urgencyDelta = urgencyRank[a.urgency] - urgencyRank[b.urgency];

    if (urgencyDelta !== 0) {
      return urgencyDelta;
    }

    if (a.dueDate !== undefined && b.dueDate !== undefined) {
      return a.dueDate - b.dueDate;
    }

    if (a.dueDate !== undefined) {
      return -1;
    }

    if (b.dueDate !== undefined) {
      return 1;
    }

    return a.createdAt - b.createdAt;
  });
}

async function requireOwnedProject(
  ctx: MutationCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
) {
  const project = await ctx.db.get(projectId);

  if (!project || project.userId !== userId || project.status === "archived") {
    throw new Error("Project not found.");
  }
}

async function requireOwnedTaskGroup(
  ctx: MutationCtx,
  userId: Id<"users">,
  taskGroupId: Id<"taskGroups">,
) {
  const taskGroup = await ctx.db.get(taskGroupId);

  if (
    !taskGroup ||
    taskGroup.userId !== userId ||
    taskGroup.status === "archived"
  ) {
    throw new Error("Task group not found.");
  }
}

function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  const normalizedTags: string[] = [];

  for (const tag of tags) {
    const normalizedTag = tag.trim().replace(/^#+/, "").toLowerCase();

    if (
      !normalizedTag ||
      seen.has(normalizedTag) ||
      normalizedTag.length > 32
    ) {
      continue;
    }

    seen.add(normalizedTag);
    normalizedTags.push(normalizedTag);

    if (normalizedTags.length === 8) {
      break;
    }
  }

  return normalizedTags;
}

export const createTask = mutation({
  args: {
    title: v.string(),
    urgency: urgencyValidator,
    estimatedMinutes: estimatedMinutesValidator,
    dueDate: v.optional(v.union(v.number(), v.null())),
    scheduledForToday: v.optional(v.boolean()),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
    taskGroupId: v.optional(v.union(v.id("taskGroups"), v.null())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();

    if (!title) {
      throw new Error("Task title is required.");
    }

    const user = await getOrCreateCurrentUser(ctx);

    if (args.projectId) {
      await requireOwnedProject(ctx, user._id, args.projectId);
    }

    if (args.taskGroupId) {
      await requireOwnedTaskGroup(ctx, user._id, args.taskGroupId);
    }

    const now = Date.now();
    const tags = normalizeTags(args.tags ?? []);

    return await ctx.db.insert("tasks", {
      userId: user._id,
      title,
      status: "todo",
      urgency: args.urgency,
      estimatedMinutes: args.estimatedMinutes,
      dueDate: args.dueDate ?? undefined,
      scheduledForToday: args.scheduledForToday ?? true,
      projectId: args.projectId ?? undefined,
      taskGroupId: args.taskGroupId ?? undefined,
      tags,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    urgency: v.optional(urgencyValidator),
    estimatedMinutes: v.optional(estimatedMinutesValidator),
    dueDate: v.optional(v.union(v.number(), v.null())),
    scheduledForToday: v.optional(v.boolean()),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
    taskGroupId: v.optional(v.union(v.id("taskGroups"), v.null())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found.");
    }

    if (args.projectId) {
      await requireOwnedProject(ctx, user._id, args.projectId);
    }

    if (args.taskGroupId) {
      await requireOwnedTaskGroup(ctx, user._id, args.taskGroupId);
    }

    const patch: Partial<Doc<"tasks">> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      const title = args.title.trim();

      if (!title) {
        throw new Error("Task title is required.");
      }

      patch.title = title;
    }

    if (args.urgency !== undefined) {
      patch.urgency = args.urgency;
    }

    if (args.estimatedMinutes !== undefined) {
      patch.estimatedMinutes = args.estimatedMinutes;
    }

    if (args.dueDate !== undefined) {
      patch.dueDate = args.dueDate ?? undefined;
    }

    if (args.scheduledForToday !== undefined) {
      patch.scheduledForToday = args.scheduledForToday;
    }

    if (args.projectId !== undefined) {
      patch.projectId = args.projectId ?? undefined;
    }

    if (args.taskGroupId !== undefined) {
      patch.taskGroupId = args.taskGroupId ?? undefined;
    }

    if (args.tags !== undefined) {
      patch.tags = normalizeTags(args.tags);
    }

    await ctx.db.patch(args.taskId, patch);

    return task._id;
  },
});

export const completeTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found.");
    }

    if (task.status === "done") {
      return task._id;
    }

    const now = Date.now();

    await ctx.db.patch(args.taskId, {
      status: "done",
      completedAt: now,
      updatedAt: now,
    });

    return task._id;
  },
});

export const uncompleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found.");
    }

    if (task.status === "todo") {
      return task._id;
    }

    await ctx.db.patch(args.taskId, {
      status: "todo",
      completedAt: undefined,
      updatedAt: Date.now(),
    });

    return task._id;
  },
});

export const toggleScheduledForToday = mutation({
  args: {
    taskId: v.id("tasks"),
    scheduledForToday: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found.");
    }

    await ctx.db.patch(args.taskId, {
      scheduledForToday: args.scheduledForToday,
      updatedAt: Date.now(),
    });

    return task._id;
  },
});

export const listTodayTasks = query({
  args: {},
  handler: async (ctx): Promise<TaskView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_scheduled_for_today_and_status", (q) =>
        q
          .eq("userId", user._id)
          .eq("scheduledForToday", true)
          .eq("status", "todo"),
      )
      .take(100);

    return sortTasks(await normalizeTasks(ctx, tasks));
  },
});

export const listBacklogTasks = query({
  args: {},
  handler: async (ctx): Promise<TaskView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "todo"),
      )
      .take(200);

    const backlogTasks = tasks.filter(
      (task) => (task.scheduledForToday ?? Boolean(task.dueDate)) === false,
    );

    return sortTasks(await normalizeTasks(ctx, backlogTasks));
  },
});

export const listCompletedTaskGroups = query({
  args: {},
  handler: async (ctx): Promise<CompletedTaskGroupView[]> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "done"),
      )
      .take(200);

    const completedTasks = (await normalizeTasks(ctx, tasks)).sort((a, b) => {
      return (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt);
    });

    const groups = new Map<string, CompletedTaskGroupView>();

    for (const task of completedTasks) {
      const key = task.taskGroupTitle?.trim().toLowerCase() ?? "ungrouped";
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.tasks.push(task);
        existingGroup.completedAt = Math.max(
          existingGroup.completedAt,
          task.completedAt ?? task.createdAt,
        );
        continue;
      }

      groups.set(key, {
        groupId: task.taskGroupId,
        title: task.taskGroupTitle ?? "Completed actions",
        tasks: [task],
        completedAt: task.completedAt ?? task.createdAt,
      });
    }

    return Array.from(groups.values()).sort(
      (a, b) => b.completedAt - a.completedAt,
    );
  },
});

export type TaskId = Id<"tasks">;
