"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getTimestampFromLocalDateInput } from "@/lib/date";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  estimateOptions,
  getVagueTitleWarning,
  parseTags,
  urgencies,
  type EstimatedMinutes,
  type TaskUrgency,
} from "@/components/tasks/task-form-utils";

type AddTaskFormProps = {
  defaultScheduledForToday?: boolean;
};

export function AddTaskForm({
  defaultScheduledForToday = true,
}: AddTaskFormProps) {
  const createTask = useMutation(api.tasks.createTask);
  const createTaskGroup = useMutation(api.taskGroups.createTaskGroup);
  const projects = useQuery(api.projects.listProjects);
  const taskGroups = useQuery(api.taskGroups.listTaskGroups);
  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<TaskUrgency>("should_today");
  const [estimatedMinutes, setEstimatedMinutes] =
    useState<EstimatedMinutes>(10);
  const [dueDate, setDueDate] = useState("");
  const [scheduledForToday, setScheduledForToday] = useState(
    defaultScheduledForToday,
  );
  const [projectId, setProjectId] = useState<"" | Id<"projects">>("");
  const [taskGroupId, setTaskGroupId] = useState<"" | Id<"taskGroups">>("");
  const [newTaskGroupTitle, setNewTaskGroupTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vagueTitleWarning = useMemo(() => getVagueTitleWarning(title), [title]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

      await createTask({
        title: trimmedTitle,
        urgency,
        estimatedMinutes,
        dueDate: dueDateTimestamp ?? undefined,
        scheduledForToday,
        projectId: projectId || undefined,
        taskGroupId: selectedTaskGroupId || undefined,
        tags: parseTags(tagsInput),
      });
      setTitle("");
      setUrgency("should_today");
      setEstimatedMinutes(10);
      setDueDate("");
      setScheduledForToday(defaultScheduledForToday);
      setProjectId("");
      setTaskGroupId("");
      setNewTaskGroupTitle("");
      setTagsInput("");
    } catch {
      setError("Could not add the task. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Next action
          </label>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Write the next visible action. Make it small enough to start in 5-15
            minutes. Example: &quot;Open tax folder&quot; instead of &quot;Do
            taxes&quot;.
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
                setTaskGroupId(event.target.value as "" | Id<"taskGroups">);
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
        <span className="text-xs font-medium text-muted-foreground">Tags</span>
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
            onChange={(event) => setScheduledForToday(event.target.checked)}
            disabled={isSubmitting}
            className="size-4 rounded border"
          />
          Add to Today
        </label>

        <Button type="submit" disabled={isSubmitting || !title.trim()}>
          <Plus className="size-4" aria-hidden="true" />
          {isSubmitting ? "Adding..." : "Add action"}
        </Button>
      </div>

      <p className="min-h-5 text-xs text-destructive">{error}</p>
    </form>
  );
}
