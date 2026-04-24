"use client";

import { useMutation } from "convex/react";
import { FolderPlus } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { GoalProjectView } from "@convex/goalProjects";

export function ProjectForm({
  goalId,
  initialProject,
  onCancel,
  onSuccess,
}: {
  goalId: Id<"goals">;
  initialProject?: GoalProjectView;
  onCancel?: () => void;
  onSuccess?: (projectId?: GoalProjectView["_id"]) => void;
}) {
  const createProject = useMutation(api.goalProjects.createProject);
  const updateProject = useMutation(api.goalProjects.updateProject);
  const [title, setTitle] = useState(initialProject?.title ?? "");
  const [description, setDescription] = useState(initialProject?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Add a project title.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      let projectId: GoalProjectView["_id"] | undefined;

      if (initialProject) {
        await updateProject({
          projectId: initialProject._id,
          title: title.trim(),
          description: description || null,
        });
        projectId = initialProject._id;
      } else {
        projectId = await createProject({
          goalId,
          title: title.trim(),
          description: description || null,
        });
        setTitle("");
        setDescription("");
      }
      onSuccess?.(projectId);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create the project. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Project title
        </span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Resume refresh"
          disabled={isSubmitting}
          className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Description
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="What does this project need to cover?"
          disabled={isSubmitting}
          className="rounded-lg border bg-background px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <p className="min-h-5 text-xs text-destructive">{error}</p>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
            <FolderPlus className="size-4" aria-hidden="true" />
            {isSubmitting
              ? initialProject
                ? "Saving..."
                : "Creating..."
              : initialProject
                ? "Save project"
                : "Add project"}
          </Button>
        </div>
      </div>
    </form>
  );
}
