"use client";

import { useQuery } from "convex/react";
import { CheckCircle2, Plus, X } from "lucide-react";
import { useState } from "react";

import { AddTaskForm } from "@/components/tasks/add-task-form";
import { GroupedTaskList } from "@/components/tasks/grouped-task-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@convex/_generated/api";

export function TasksCard() {
  const tasks = useQuery(api.tasks.listTodayTasks);
  const openCount = tasks?.length ?? 0;
  const [isFormVisible, setIsFormVisible] = useState(false);

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Today&apos;s Next Actions</CardTitle>
          <CardDescription>
            {tasks === undefined
              ? "Loading next actions"
              : `${openCount} planned ${openCount === 1 ? "action" : "actions"}`}
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant={isFormVisible ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsFormVisible((value) => !value)}
            aria-expanded={isFormVisible}
            aria-controls="today-task-form"
          >
            {isFormVisible ? (
              <X className="size-3.5" aria-hidden="true" />
            ) : (
              <Plus className="size-3.5" aria-hidden="true" />
            )}
            {isFormVisible ? "Hide form" : "Add action"}
          </Button>
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <CheckCircle2
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </span>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        {isFormVisible ? (
          <div id="today-task-form">
            <AddTaskForm defaultScheduledForToday />
          </div>
        ) : null}

        {openCount > 5 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Your Today list is getting full. Consider moving some items to Can
            wait.
          </p>
        ) : null}

        <div className="grid gap-3">
          {tasks === undefined ? (
            <TasksLoadingState />
          ) : tasks.length === 0 ? (
            <TasksEmptyState />
          ) : (
            <GroupedTaskList tasks={tasks} scheduleAction="remove" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TasksLoadingState() {
  return (
    <div className="grid gap-2">
      <div className="h-14 rounded-lg border bg-muted/40" />
      <div className="h-14 rounded-lg border bg-muted/30" />
      <div className="h-14 rounded-lg border bg-muted/20" />
    </div>
  );
}

function TasksEmptyState() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-background">
        <CheckCircle2 className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-3 text-sm font-medium">No tasks for today.</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Add a small next action to get started.
      </p>
    </div>
  );
}
