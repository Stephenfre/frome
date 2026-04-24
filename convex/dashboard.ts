import { v } from "convex/values";

import { api } from "./_generated/api";
import { query } from "./_generated/server";
import type { EventView } from "./events";
import type { TaskView } from "./tasks";

export type DashboardSnapshot = {
  tasks: TaskView[];
  events: EventView[];
  brief: {
    openTaskCount: number;
    eventCount: number;
    summary: string;
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

    const openTaskCount = tasks.length;
    const eventCount = events.length;
    const isEmpty = openTaskCount === 0 && eventCount === 0;

    let summary =
      `You have ${eventCount} ${eventCount === 1 ? "event" : "events"} and ` +
      `${openTaskCount} open ${openTaskCount === 1 ? "task" : "tasks"} today. ` +
      "Focus on your highest priority task before noon.";

    if (isEmpty) {
      summary =
        "Your day is open. Add one task or event to shape the day before it fills itself.";
    } else if (openTaskCount === 0 && eventCount > 0) {
      summary =
        `You have ${eventCount} ${eventCount === 1 ? "event" : "events"} and no open tasks today. Protect a little buffer time between commitments.`;
    } else if (openTaskCount > 0 && eventCount === 0) {
      summary =
        `You have ${openTaskCount} open ${openTaskCount === 1 ? "task" : "tasks"} and no events today. Use the open space to finish your highest priority task early.`;
    }

    return {
      tasks,
      events,
      brief: {
        openTaskCount,
        eventCount,
        summary,
        isEmpty,
      },
    };
  },
});
