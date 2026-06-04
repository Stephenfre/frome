import { v } from "convex/values";

import { api } from "./_generated/api";
import { query } from "./_generated/server";
import type { EventView } from "./events";
import type { GoalView } from "./goals";
import type { TaskView } from "./tasks";

export type DashboardSnapshot = {
  tasks: TaskView[];
  events: EventView[];
  goals: GoalView[];
  counts: {
    activeGoalCount: number;
    openTaskCount: number;
    eventCount: number;
    isEmpty: boolean;
  };
};

export const getDashboardSnapshot = query({
  args: {
    dateKey: v.string(),
    startOfDay: v.string(),
    endOfDay: v.string(),
    weekday: v.number(),
  },
  handler: async (ctx, args): Promise<DashboardSnapshot> => {
    const tasks: TaskView[] = await ctx.runQuery(api.tasks.listTodayTasks, {});
    const events: EventView[] = await ctx.runQuery(api.events.listTodayEvents, {
      dateKey: args.dateKey,
      startOfDay: args.startOfDay,
      endOfDay: args.endOfDay,
      weekday: args.weekday,
    });
    const goals: GoalView[] = await ctx.runQuery(api.goals.listActiveGoals, {});

    const openTaskCount = tasks.length;
    const eventCount = events.length;
    const activeGoalCount = goals.length;
    const isEmpty =
      openTaskCount === 0 && eventCount === 0 && activeGoalCount === 0;

    return {
      tasks,
      events,
      goals,
      counts: {
        activeGoalCount,
        openTaskCount,
        eventCount,
        isEmpty,
      },
    };
  },
});
