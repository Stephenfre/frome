"use client";

import { useMutation } from "convex/react";
import {
  CalendarMinus,
  CalendarPlus,
  Check,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { EditTaskSheet } from "@/components/tasks/edit-task-sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatTaskDueDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { TaskView } from "@convex/tasks";

type ScheduleAction = "add" | "remove";

const urgencyLabel: Record<TaskView["urgency"], string> = {
  must_today: "Must today",
  should_today: "Should today",
  can_wait: "Can wait",
};

const urgencyClassName: Record<TaskView["urgency"], string> = {
  must_today: "border-red-200 bg-red-50 text-red-700",
  should_today: "border-amber-200 bg-amber-50 text-amber-700",
  can_wait: "border-slate-200 bg-slate-50 text-slate-600",
};

export function TaskRow({
  task,
  scheduleAction,
  showGroupTitle = true,
}: {
  task: TaskView;
  scheduleAction?: ScheduleAction;
  showGroupTitle?: boolean;
}) {
  const completeTask = useMutation(api.tasks.completeTask);
  const uncompleteTask = useMutation(api.tasks.uncompleteTask);
  const toggleScheduledForToday = useMutation(
    api.tasks.toggleScheduledForToday,
  );
  const deleteTask = useMutation(api.tasks.deleteTask);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDone = task.status === "done";

  async function handleStatusChange() {
    if (isUpdatingStatus) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      if (isDone) {
        await uncompleteTask({ taskId: task._id });
      } else {
        await completeTask({ taskId: task._id });
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleScheduleChange() {
    if (!scheduleAction || isScheduling) {
      return;
    }

    setIsScheduling(true);

    try {
      await toggleScheduledForToday({
        taskId: task._id,
        scheduledForToday: scheduleAction === "add",
      });
    } finally {
      setIsScheduling(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteTask({ taskId: task._id });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg border bg-background px-3 py-2.5 transition-colors sm:grid-cols-[auto_1fr_auto]",
        isDone && "bg-muted/20",
      )}
    >
      <Button
        type="button"
        size="icon-xs"
        variant={isDone ? "secondary" : "outline"}
        aria-label={isDone ? "Mark task incomplete" : "Complete task"}
        disabled={isUpdatingStatus}
        onClick={handleStatusChange}
        className={cn(
          "rounded-full",
          isDone && "bg-emerald-100 text-emerald-700",
        )}
      >
        {isDone ? (
          <RotateCcw className="size-3" aria-hidden="true" />
        ) : (
          <Check className="size-3" aria-hidden="true" />
        )}
      </Button>

      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-medium",
            isDone && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-md border px-1.5 text-[0.7rem] font-medium",
              urgencyClassName[task.urgency],
            )}
          >
            {urgencyLabel[task.urgency]}
          </span>
          <span className="inline-flex h-5 items-center rounded-md border bg-muted/40 px-1.5 text-[0.7rem] font-medium text-muted-foreground">
            {task.estimatedMinutes} min
          </span>
          {task.dueDate ? (
            <span className="inline-flex h-5 items-center rounded-md border bg-background px-1.5 text-[0.7rem] font-medium text-muted-foreground">
              Due {formatTaskDueDate(task.dueDate)}
            </span>
          ) : null}
          {task.projectTitle ? (
            <span className="truncate text-xs text-muted-foreground">
              {task.projectTitle}
            </span>
          ) : null}
          {showGroupTitle && task.taskGroupTitle ? (
            <span className="inline-flex h-5 items-center rounded-md border bg-background px-1.5 text-[0.7rem] font-medium text-muted-foreground">
              {task.taskGroupTitle}
            </span>
          ) : null}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-5 items-center rounded-md border bg-muted/30 px-1.5 text-[0.7rem] font-medium text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="col-span-2 flex flex-wrap items-center justify-self-end sm:col-span-1">
        {scheduleAction ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleScheduleChange}
            disabled={isScheduling}
          >
            {scheduleAction === "add" ? (
              <CalendarPlus className="size-3.5" aria-hidden="true" />
            ) : (
              <CalendarMinus className="size-3.5" aria-hidden="true" />
            )}
            {scheduleAction === "add" ? "Today" : "Backlog"}
          </Button>
        ) : null}
        <EditTaskSheet task={task} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isDeleting}
              aria-label={`Delete ${task.title}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete task?</AlertDialogTitle>
              <AlertDialogDescription>
                Delete &quot;{task.title}&quot;? This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
