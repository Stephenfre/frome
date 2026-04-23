"use client";

import { SignInButton } from "@clerk/nextjs";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { Archive, CheckCircle2, Inbox, Plus, X } from "lucide-react";
import { useState } from "react";

import { AddTaskForm } from "@/components/tasks/add-task-form";
import { GroupedTaskList } from "@/components/tasks/grouped-task-list";
import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@convex/_generated/api";
import type { CompletedTaskGroupView, TaskView } from "@convex/tasks";

export default function TasksPage() {
  return (
    <>
      <Authenticated>
        <AuthenticatedTasksPage />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedTasksState />
      </Unauthenticated>
      <AuthLoading>
        <TasksLoadingState />
      </AuthLoading>
    </>
  );
}

function AuthenticatedTasksPage() {
  const todayTasks = useQuery(api.tasks.listTodayTasks);
  const backlogTasks = useQuery(api.tasks.listBacklogTasks);
  const completedTaskGroups = useQuery(api.tasks.listCompletedTaskGroups);
  const todayCount = todayTasks?.length ?? 0;
  const [isAddTaskFormVisible, setIsAddTaskFormVisible] = useState(false);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Master list and Today list
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            Next actions
          </h1>
        </div>
        {todayCount > 5 ? (
          <p className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Your Today list is getting full. Consider moving some items to Can
            wait.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="rounded-lg shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Add a Next Action</CardTitle>
              <CardDescription>
                Capture one visible, startable step.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant={isAddTaskFormVisible ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsAddTaskFormVisible((value) => !value)}
              aria-expanded={isAddTaskFormVisible}
              aria-controls="tasks-page-add-form"
            >
              {isAddTaskFormVisible ? (
                <X className="size-3.5" aria-hidden="true" />
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
              {isAddTaskFormVisible ? "Hide form" : "Add action"}
            </Button>
          </CardHeader>
          {isAddTaskFormVisible ? (
            <CardContent id="tasks-page-add-form">
              <AddTaskForm defaultScheduledForToday />
            </CardContent>
          ) : null}
        </Card>

        <TaskListPanel
          title="Today"
          description="Only actions intentionally scheduled for today."
          icon="today"
          tasks={todayTasks}
          emptyTitle="No tasks for today."
          emptyDescription="Add a small next action to get started."
          scheduleAction="remove"
        />
      </section>

      <TaskListPanel
        title="Backlog"
        description="Actions not scheduled for today."
        icon="backlog"
        tasks={backlogTasks}
        emptyTitle="Backlog is clear."
        emptyDescription="New actions can wait here until they are worth promoting."
        scheduleAction="add"
      />

      <CompletedGroupsPanel groups={completedTaskGroups} />
    </div>
  );
}

function TaskListPanel({
  title,
  description,
  icon,
  tasks,
  emptyTitle,
  emptyDescription,
  scheduleAction,
}: {
  title: string;
  description: string;
  icon: "today" | "backlog";
  tasks: TaskView[] | undefined;
  emptyTitle: string;
  emptyDescription: string;
  scheduleAction: "add" | "remove";
}) {
  const Icon = icon === "today" ? CheckCircle2 : Inbox;

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        {tasks === undefined ? (
          <PanelLoadingState />
        ) : tasks.length === 0 ? (
          <PanelEmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <GroupedTaskList tasks={tasks} scheduleAction={scheduleAction} />
        )}
      </CardContent>
    </Card>
  );
}

function PanelLoadingState() {
  return (
    <div className="grid gap-2">
      <div className="h-14 rounded-lg border bg-muted/40" />
      <div className="h-14 rounded-lg border bg-muted/30" />
      <div className="h-14 rounded-lg border bg-muted/20" />
    </div>
  );
}

function PanelEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CompletedGroupsPanel({
  groups,
}: {
  groups: CompletedTaskGroupView[] | undefined;
}) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Completed Groups</CardTitle>
          <CardDescription>
            Finished actions grouped by their shared title.
          </CardDescription>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Archive
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
      </CardHeader>
      <CardContent>
        {groups === undefined ? (
          <PanelLoadingState />
        ) : groups.length === 0 ? (
          <PanelEmptyState
            title="No completed groups yet."
            description="Complete grouped actions to see them collected here."
          />
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <section
                key={group.groupId ?? "ungrouped"}
                className="grid gap-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{group.title}</h3>
                  <span className="text-xs text-muted-foreground">
                    {group.tasks.length}{" "}
                    {group.tasks.length === 1 ? "action" : "actions"}
                  </span>
                </div>
                <div className="grid gap-2">
                  {group.tasks.map((task) => (
                    <TaskRow key={task._id} task={task} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TasksLoadingState() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <section>
        <div className="h-4 w-40 rounded-md bg-muted" />
        <div className="mt-3 h-9 w-64 rounded-md bg-muted" />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 rounded-lg border bg-background" />
        <div className="h-80 rounded-lg border bg-background" />
      </section>
      <div className="h-80 rounded-lg border bg-background" />
      <div className="h-80 rounded-lg border bg-background" />
    </div>
  );
}

function UnauthenticatedTasksState() {
  return (
    <div className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col items-center justify-center rounded-lg border bg-background p-8 text-center">
      <h1 className="text-2xl font-semibold">Sign in to manage tasks</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Your next actions are only loaded after Convex validates your Clerk
        session.
      </p>
      <SignInButton mode="redirect">
        <Button className="mt-6">Sign in</Button>
      </SignInButton>
    </div>
  );
}
