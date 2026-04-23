"use client";

import { TaskRow } from "@/components/tasks/task-row";
import type { TaskView } from "@convex/tasks";

type ScheduleAction = "add" | "remove";

const urgencyGroups: Array<{
  title: string;
  urgency: TaskView["urgency"];
}> = [
  { title: "Must today", urgency: "must_today" },
  { title: "Should today", urgency: "should_today" },
  { title: "Can wait", urgency: "can_wait" },
];

type TaskGroupBlock = {
  key: string;
  title?: string;
  tasks: TaskView[];
};

export function GroupedTaskList({
  tasks,
  scheduleAction,
}: {
  tasks: TaskView[];
  scheduleAction: ScheduleAction;
}) {
  return (
    <div className="grid gap-4">
      {urgencyGroups.map((group) => {
        const urgencyTasks = tasks.filter(
          (task) => task.urgency === group.urgency,
        );

        if (urgencyTasks.length === 0) {
          return null;
        }

        return (
          <section key={group.urgency} className="grid gap-2">
            <h3 className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
              {group.title}
            </h3>
            <div className="grid gap-3">
              {groupTasksByTitle(urgencyTasks).map((taskGroup) =>
                taskGroup.title ? (
                  <section
                    key={taskGroup.key}
                    className="grid gap-2 rounded-lg bg-muted/35 p-2 ring-1 ring-border/70"
                  >
                    <div className="flex items-center justify-between gap-3 px-1">
                      <h4 className="truncate text-sm font-semibold">
                        {taskGroup.title}
                      </h4>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {taskGroup.tasks.length}{" "}
                        {taskGroup.tasks.length === 1 ? "action" : "actions"}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {taskGroup.tasks.map((task) => (
                        <TaskRow
                          key={task._id}
                          task={task}
                          scheduleAction={scheduleAction}
                          showGroupTitle={false}
                        />
                      ))}
                    </div>
                  </section>
                ) : (
                  taskGroup.tasks.map((task) => (
                    <TaskRow
                      key={task._id}
                      task={task}
                      scheduleAction={scheduleAction}
                    />
                  ))
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function groupTasksByTitle(tasks: TaskView[]) {
  const groups = new Map<string, TaskGroupBlock>();
  const ungroupedTaskBlocks: TaskGroupBlock[] = [];

  for (const task of tasks) {
    if (!task.taskGroupTitle) {
      ungroupedTaskBlocks.push({
        key: task._id,
        tasks: [task],
      });
      continue;
    }

    const key = task.taskGroupTitle.trim().toLowerCase();
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.tasks.push(task);
      continue;
    }

    groups.set(key, {
      key,
      title: task.taskGroupTitle,
      tasks: [task],
    });
  }

  return [...Array.from(groups.values()), ...ungroupedTaskBlocks];
}
