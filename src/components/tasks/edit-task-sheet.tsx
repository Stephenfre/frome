"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Pencil } from "lucide-react";
import { useMemo, useState } from "react";

import {
  estimateOptions,
  getVagueTitleWarning,
  parseTags,
  urgencies,
  type EstimatedMinutes,
  type TaskUrgency,
} from "@/components/tasks/task-form-utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getLocalDateInputValue,
  getTimestampFromLocalDateInput,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { TaskView } from "@convex/tasks";

function getInitialValues(task: TaskView) {
  return {
    title: task.title,
    urgency: task.urgency,
    estimatedMinutes: task.estimatedMinutes,
    dueDate: task.dueDate
      ? getLocalDateInputValue(new Date(task.dueDate))
      : "",
    scheduledForToday: task.scheduledForToday,
    projectId: (task.projectId ?? "") as "" | Id<"projects">,
    taskGroupId: (task.taskGroupId ?? "") as "" | Id<"taskGroups">,
    newTaskGroupTitle: "",
    tagsInput: task.tags.join(", "),
  };
}

export function EditTaskSheet({ task }: { task: TaskView }) {
  const updateTask = useMutation(api.tasks.updateTask);
  const createTaskGroup = useMutation(api.taskGroups.createTaskGroup);
  const projects = useQuery(api.projects.listProjects);
  const taskGroups = useQuery(api.taskGroups.listTaskGroups);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [urgency, setUrgency] = useState<TaskUrgency>(task.urgency);
  const [estimatedMinutes, setEstimatedMinutes] =
    useState<EstimatedMinutes>(task.estimatedMinutes);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? getLocalDateInputValue(new Date(task.dueDate)) : "",
  );
  const [scheduledForToday, setScheduledForToday] = useState(
    task.scheduledForToday,
  );
  const [projectId, setProjectId] = useState<"" | Id<"projects">>(
    task.projectId ?? "",
  );
  const [taskGroupId, setTaskGroupId] = useState<"" | Id<"taskGroups">>(
    task.taskGroupId ?? "",
  );
  const [newTaskGroupTitle, setNewTaskGroupTitle] = useState("");
  const [tagsInput, setTagsInput] = useState(task.tags.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vagueTitleWarning = useMemo(() => getVagueTitleWarning(title), [title]);

  function resetForm() {
    const initialValues = getInitialValues(task);
    setTitle(initialValues.title);
    setUrgency(initialValues.urgency);
    setEstimatedMinutes(initialValues.estimatedMinutes);
    setDueDate(initialValues.dueDate);
    setScheduledForToday(initialValues.scheduledForToday);
    setProjectId(initialValues.projectId);
    setTaskGroupId(initialValues.taskGroupId);
    setNewTaskGroupTitle(initialValues.newTaskGroupTitle);
    setTagsInput(initialValues.tagsInput);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetForm();
    }

    setIsOpen(nextOpen);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const dueDateTimestamp = dueDate
      ? getTimestampFromLocalDateInput(dueDate)
      : null;

    if (!trimmedTitle) {
      setError("Add a next action.");
      return;
    }

    if (dueDate && dueDateTimestamp === null) {
      setError("Choose a valid due date.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const createdTaskGroupId = newTaskGroupTitle.trim()
        ? await createTaskGroup({ title: newTaskGroupTitle.trim() })
        : null;
      const selectedTaskGroupId = createdTaskGroupId ?? taskGroupId;

      await updateTask({
        taskId: task._id,
        title: trimmedTitle,
        urgency,
        estimatedMinutes,
        dueDate: dueDateTimestamp,
        scheduledForToday,
        projectId: projectId || null,
        taskGroupId: selectedTaskGroupId || null,
        tags: parseTags(tagsInput),
      });
      setIsOpen(false);
    } catch {
      setError("Could not update the task. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => handleOpenChange(true)}
        aria-label={`Edit ${task.title}`}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </Button>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Task</SheetTitle>
            <SheetDescription>
              Refine the next action so it stays clear, small, and realistic.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 px-6 pb-6">
            <div className="grid gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Next action
                </label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Keep it visible and startable. Aim for the next real step, not
                  the whole project.
                </p>
              </div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Open the document..."
                className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
                disabled={isSubmitting}
              />
              {vagueTitleWarning ? (
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {vagueTitleWarning}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Urgency
              </span>
              <div className="flex rounded-lg border bg-muted/30 p-1">
                {urgencies.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setUrgency(item.value)}
                    disabled={isSubmitting}
                    className={cn(
                      "h-7 flex-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
                      urgency === item.value &&
                        "bg-background text-foreground shadow-sm",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Estimate
                </span>
                <select
                  value={estimatedMinutes}
                  onChange={(event) =>
                    setEstimatedMinutes(
                      Number(event.target.value) as EstimatedMinutes,
                    )
                  }
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                >
                  {estimateOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} min
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Due date
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                />
              </label>
            </div>

            {projects && projects.length > 0 ? (
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Project
                </span>
                <select
                  value={projectId}
                  onChange={(event) =>
                    setProjectId(event.target.value as "" | Id<"projects">)
                  }
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
              {taskGroups && taskGroups.length > 0 ? (
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Group
                  </span>
                  <select
                    value={taskGroupId}
                    onChange={(event) => {
                      setTaskGroupId(
                        event.target.value as "" | Id<"taskGroups">,
                      );
                      setNewTaskGroupTitle("");
                    }}
                    disabled={isSubmitting}
                    className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                  >
                    <option value="">No group</option>
                    {taskGroups.map((taskGroup) => (
                      <option key={taskGroup._id} value={taskGroup._id}>
                        {taskGroup.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  New group title
                </span>
                <input
                  value={newTaskGroupTitle}
                  onChange={(event) => {
                    setNewTaskGroupTitle(event.target.value);
                    setTaskGroupId("");
                  }}
                  placeholder="Clean room"
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
                />
              </label>
            </div>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Tags
              </span>
              <input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="home, cleaning"
                disabled={isSubmitting}
                className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={scheduledForToday}
                  onChange={(event) =>
                    setScheduledForToday(event.target.checked)
                  }
                  disabled={isSubmitting}
                  className="size-4 rounded border"
                />
                Add to Today
              </label>

              <Button type="submit" disabled={isSubmitting || !title.trim()}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </div>

            <p className="min-h-5 text-xs text-destructive">{error}</p>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
