import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type GoalCategory =
  | "career"
  | "finance"
  | "health"
  | "fitness"
  | "relationships"
  | "personal"
  | "learning"
  | "other";

export type GoalStatus = "active" | "paused" | "completed" | "archived";
export type GoalHorizon = "weekly" | "monthly" | "quarterly";
export type GoalProjectStatus = "active" | "completed" | "archived";
export type ProjectNextActionStatus = "todo" | "done";
export type GoalProgressState =
  | "On Track"
  | "Needs Clarity"
  | "Stalled"
  | "Completed";
export type ProjectNextActionEstimate = 2 | 5 | 10 | 15 | 30;

export type ProjectNextActionView = {
  _id: Id<"projectNextActions">;
  projectId: Id<"goalProjects">;
  title: string;
  status: ProjectNextActionStatus;
  estimatedMinutes: ProjectNextActionEstimate;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

export type GoalProjectView = {
  _id: Id<"goalProjects">;
  goalId: Id<"goals">;
  title: string;
  description?: string;
  status: GoalProjectStatus;
  order: number;
  createdAt: number;
  updatedAt: number;
  currentNextAction?: ProjectNextActionView;
  nextActionCount: number;
  completedNextActionCount: number;
  missingNextAction: boolean;
  lastActivityAt: number;
};

export type GoalView = {
  _id: Id<"goals">;
  title: string;
  description?: string;
  category: GoalCategory;
  status: GoalStatus;
  horizon: GoalHorizon;
  startDate?: number;
  targetDate?: number;
  createdAt: number;
  updatedAt: number;
  progressState: GoalProgressState;
  projectCount: number;
  activeProjectCount: number;
  completedProjectCount: number;
  projectsMissingNextActions: number;
  completedNextActionCount: number;
};

export type GoalDetailView = GoalView & {
  projects: GoalProjectView[];
};

export type GoalDashboardSummary = {
  activeGoalCount: number;
  needsClarityCount: number;
  onTrackCount: number;
  stalledCount: number;
  goals: GoalView[];
  summary: string;
};

export async function getCurrentUser(
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

export async function getOrCreateCurrentUser(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
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

export function trimOptionalString(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

export async function requireOwnedGoal(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
  goalId: Id<"goals">,
) {
  const goal = await ctx.db.get(goalId);

  if (!goal || goal.userId !== userId) {
    throw new Error("Goal not found.");
  }

  return goal;
}

export async function requireOwnedProject(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
  projectId: Id<"goalProjects">,
) {
  const project = await ctx.db.get(projectId);

  if (!project || project.userId !== userId) {
    throw new Error("Project not found.");
  }

  return project;
}

function normalizeNextAction(
  nextAction: Doc<"projectNextActions">,
): ProjectNextActionView {
  return {
    _id: nextAction._id,
    projectId: nextAction.projectId,
    title: nextAction.title,
    status: nextAction.status,
    estimatedMinutes: nextAction.estimatedMinutes,
    notes: nextAction.notes,
    createdAt: nextAction.createdAt,
    updatedAt: nextAction.updatedAt,
    completedAt: nextAction.completedAt,
  };
}

function sortNextActions(actions: Doc<"projectNextActions">[]) {
  return [...actions].sort((firstAction, secondAction) => {
    if (firstAction.status !== secondAction.status) {
      return firstAction.status === "todo" ? -1 : 1;
    }

    if (firstAction.status === "done") {
      return (
        (secondAction.completedAt ?? secondAction.updatedAt) -
        (firstAction.completedAt ?? firstAction.updatedAt)
      );
    }

    return firstAction.createdAt - secondAction.createdAt;
  });
}

function normalizeProject(
  project: Doc<"goalProjects">,
  nextActions: Doc<"projectNextActions">[],
): GoalProjectView {
  const sortedActions = sortNextActions(nextActions);
  const currentNextAction = sortedActions.find(
    (nextAction) => nextAction.status === "todo",
  );
  const completedNextActionCount = sortedActions.filter(
    (nextAction) => nextAction.status === "done",
  ).length;
  const lastActivityAt =
    sortedActions[0]?.completedAt ??
    sortedActions[0]?.updatedAt ??
    project.updatedAt;

  return {
    _id: project._id,
    goalId: project.goalId,
    title: project.title,
    description: project.description,
    status: project.status,
    order: project.order,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    currentNextAction: currentNextAction
      ? normalizeNextAction(currentNextAction)
      : undefined,
    nextActionCount: sortedActions.length,
    completedNextActionCount,
    missingNextAction:
      project.status === "active" && currentNextAction === undefined,
    lastActivityAt,
  };
}

export async function listProjectsForGoal(
  ctx: QueryCtx,
  userId: Id<"users">,
  goalId: Id<"goals">,
) {
  const projects = await ctx.db
    .query("goalProjects")
    .withIndex("by_goal", (q) => q.eq("goalId", goalId))
    .collect();

  const ownedProjects = projects.filter((project) => project.userId === userId);
  const nextActionsByProjectId = new Map<
    Id<"goalProjects">,
    Doc<"projectNextActions">[]
  >();

  await Promise.all(
    ownedProjects.map(async (project) => {
      const nextActions = await ctx.db
        .query("projectNextActions")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();

      nextActionsByProjectId.set(project._id, nextActions);
    }),
  );

  return [...ownedProjects]
    .sort((firstProject, secondProject) => {
      if (firstProject.order !== secondProject.order) {
        return firstProject.order - secondProject.order;
      }

      return firstProject.createdAt - secondProject.createdAt;
    })
    .map((project) =>
      normalizeProject(project, nextActionsByProjectId.get(project._id) ?? []),
    );
}

export async function listNextActionsForProject(
  ctx: QueryCtx,
  userId: Id<"users">,
  projectId: Id<"goalProjects">,
) {
  const nextActions = await ctx.db
    .query("projectNextActions")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  return sortNextActions(
    nextActions.filter((nextAction) => nextAction.userId === userId),
  ).map(normalizeNextAction);
}

function getGoalProgressState(
  goal: Doc<"goals">,
  projects: GoalProjectView[],
): GoalProgressState {
  if (goal.status === "completed") {
    return "Completed";
  }

  const activeProjects = projects.filter((project) => project.status === "active");

  if (activeProjects.length === 0) {
    return "Needs Clarity";
  }

  if (activeProjects.some((project) => project.missingNextAction)) {
    return "Needs Clarity";
  }

  const staleThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const hasRecentMovement = activeProjects.some((project) => {
    return project.lastActivityAt >= staleThreshold;
  });

  return hasRecentMovement ? "On Track" : "Stalled";
}

export async function buildGoalView(
  ctx: QueryCtx,
  userId: Id<"users">,
  goal: Doc<"goals">,
): Promise<GoalView> {
  const projects = await listProjectsForGoal(ctx, userId, goal._id);
  const activeProjects = projects.filter((project) => project.status === "active");
  const completedProjects = projects.filter(
    (project) => project.status === "completed",
  );

  return {
    _id: goal._id,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    status: goal.status,
    horizon: goal.horizon,
    startDate: goal.startDate,
    targetDate: goal.targetDate,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    progressState: getGoalProgressState(goal, projects),
    projectCount: projects.length,
    activeProjectCount: activeProjects.length,
    completedProjectCount: completedProjects.length,
    projectsMissingNextActions: activeProjects.filter(
      (project) => project.missingNextAction,
    ).length,
    completedNextActionCount: projects.reduce(
      (count, project) => count + project.completedNextActionCount,
      0,
    ),
  };
}

export async function buildGoalDetailView(
  ctx: QueryCtx,
  userId: Id<"users">,
  goal: Doc<"goals">,
): Promise<GoalDetailView> {
  const projects = await listProjectsForGoal(ctx, userId, goal._id);
  const activeProjects = projects.filter((project) => project.status === "active");
  const completedProjects = projects.filter(
    (project) => project.status === "completed",
  );

  return {
    _id: goal._id,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    status: goal.status,
    horizon: goal.horizon,
    startDate: goal.startDate,
    targetDate: goal.targetDate,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    progressState: getGoalProgressState(goal, projects),
    projectCount: projects.length,
    activeProjectCount: activeProjects.length,
    completedProjectCount: completedProjects.length,
    projectsMissingNextActions: activeProjects.filter(
      (project) => project.missingNextAction,
    ).length,
    completedNextActionCount: projects.reduce(
      (count, project) => count + project.completedNextActionCount,
      0,
    ),
    projects,
  };
}
