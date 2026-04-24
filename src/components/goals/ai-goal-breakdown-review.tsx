"use client";

import {
  AlertCircle,
  FolderKanban,
  Goal,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";

import { goalCategoryOptions, nextActionEstimateOptions } from "@/components/goals/goals-utils";
import {
  type AIGoalBreakdownDraft,
  type AIGoalBreakdownInput,
  type ProjectNextActionEstimate,
} from "@/lib/ai-goal-breakdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AIGoalBreakdownReview({
  draft,
  error,
  formValue,
  isRegenerating,
  isSaving,
  onAddProject,
  onAddStep,
  onChangeCategory,
  onChangeGoalTitle,
  onChangeProjectSelected,
  onChangeProjectTitle,
  onChangeStepEstimatedMinutes,
  onChangeStepSelected,
  onChangeStepTitle,
  onChangeSummary,
  onChangeTargetDate,
  onEditPrompt,
  onRegenerate,
  onRemoveProject,
  onRemoveStep,
  onSaveAll,
  onSaveSelected,
}: {
  draft: AIGoalBreakdownDraft;
  error?: string | null;
  formValue: AIGoalBreakdownInput;
  isRegenerating?: boolean;
  isSaving?: boolean;
  onAddProject: () => void;
  onAddStep: (projectId: string) => void;
  onChangeCategory: (value: AIGoalBreakdownDraft["goalCategory"]) => void;
  onChangeGoalTitle: (value: string) => void;
  onChangeProjectSelected: (projectId: string, selected: boolean) => void;
  onChangeProjectTitle: (projectId: string, value: string) => void;
  onChangeStepEstimatedMinutes: (
    projectId: string,
    stepId: string,
    estimatedMinutes: ProjectNextActionEstimate,
  ) => void;
  onChangeStepSelected: (
    projectId: string,
    stepId: string,
    selected: boolean,
  ) => void;
  onChangeStepTitle: (
    projectId: string,
    stepId: string,
    value: string,
  ) => void;
  onChangeSummary: (value: string) => void;
  onChangeTargetDate: (value: string | undefined) => void;
  onEditPrompt: () => void;
  onRegenerate: () => void;
  onRemoveProject: (projectId: string) => void;
  onRemoveStep: (projectId: string, stepId: string) => void;
  onSaveAll: () => void;
  onSaveSelected: () => void;
}) {
  const selectedProjectCount = draft.projects.filter((project) => project.selected).length;
  const selectedStepCount = draft.projects.reduce((count, project) => {
    return count + project.nextActions.filter((nextAction) => nextAction.selected).length;
  }, 0);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-2xl border bg-muted/10 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full border bg-background px-2.5 text-[0.7rem] font-medium tracking-[0.08em] uppercase">
            Review before saving
          </span>
          <span className="inline-flex h-6 items-center rounded-full border bg-background px-2.5 text-[0.7rem] font-medium text-muted-foreground">
            {selectedProjectCount} projects selected
          </span>
          <span className="inline-flex h-6 items-center rounded-full border bg-background px-2.5 text-[0.7rem] font-medium text-muted-foreground">
            {selectedStepCount} steps selected
          </span>
        </div>
        <div className="grid gap-1.5">
          <h3 className="text-lg font-semibold">Edit the plan until it feels easy to follow</h3>
          <p className="text-sm text-muted-foreground">
            Nothing is saved yet. Tighten titles, remove noise, and keep the first
            week small.
          </p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3 rounded-2xl border bg-background p-4 shadow-sm shadow-black/[0.02]">
          <div className="flex items-center gap-2">
            <Goal className="size-4 text-muted-foreground" aria-hidden="true" />
            <h4 className="text-sm font-semibold">Goal</h4>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Goal title
              </span>
              <input
                value={draft.goalTitle}
                onChange={(event) => onChangeGoalTitle(event.target.value)}
                className="h-10 rounded-xl border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Category
                </span>
                <select
                  value={draft.goalCategory}
                  onChange={(event) =>
                    onChangeCategory(
                      event.target.value as AIGoalBreakdownDraft["goalCategory"],
                    )
                  }
                  className="h-10 rounded-xl border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                >
                  {goalCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Target date
                </span>
                <input
                  type="date"
                  value={formValue.targetDate ?? ""}
                  onChange={(event) =>
                    onChangeTargetDate(event.target.value || undefined)
                  }
                  className="h-10 rounded-xl border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border bg-background p-4 shadow-sm shadow-black/[0.02]">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
            <h4 className="text-sm font-semibold">Focus summary</h4>
          </div>
          <textarea
            value={draft.summary}
            onChange={(event) => onChangeSummary(event.target.value)}
            rows={5}
            className="rounded-xl border bg-background px-3 py-2.5 text-sm leading-6 transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
          />
          <p className="text-xs text-muted-foreground">
            This is saved into the goal description so the first week stays clear.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {draft.projects.map((project, projectIndex) => (
          <div
            key={project.id}
            className={cn(
              "grid gap-4 rounded-2xl border bg-background p-4 shadow-sm shadow-black/[0.02]",
              !project.selected && "opacity-70",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <input
                  type="checkbox"
                  checked={project.selected}
                  onChange={(event) =>
                    onChangeProjectSelected(project.id, event.target.checked)
                  }
                  className="mt-1 size-4 rounded border-border text-foreground focus:ring-ring/50"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FolderKanban
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      Project {projectIndex + 1}
                    </p>
                  </div>
                  <input
                    value={project.title}
                    onChange={(event) =>
                      onChangeProjectTitle(project.id, event.target.value)
                    }
                    className="mt-2 h-10 w-full rounded-xl border bg-background px-3 text-sm font-medium transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemoveProject(project.id)}
                aria-label={`Remove ${project.title}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-2">
              {project.nextActions.map((nextAction) => (
                <div
                  key={nextAction.id}
                  className="grid gap-3 rounded-xl border bg-muted/10 p-3 sm:grid-cols-[auto_1fr_110px_auto]"
                >
                  <input
                    type="checkbox"
                    checked={nextAction.selected}
                    onChange={(event) =>
                      onChangeStepSelected(
                        project.id,
                        nextAction.id,
                        event.target.checked,
                      )
                    }
                    className="mt-2 size-4 rounded border-border text-foreground focus:ring-ring/50"
                  />
                  <input
                    value={nextAction.title}
                    onChange={(event) =>
                      onChangeStepTitle(project.id, nextAction.id, event.target.value)
                    }
                    className="h-10 rounded-xl border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                  />
                  <select
                    value={nextAction.estimatedMinutes}
                    onChange={(event) =>
                      onChangeStepEstimatedMinutes(
                        project.id,
                        nextAction.id,
                        Number(event.target.value) as ProjectNextActionEstimate,
                      )
                    }
                    className="h-10 rounded-xl border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                  >
                    {nextActionEstimateOptions.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} min
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemoveStep(project.id, nextAction.id)}
                    aria-label={`Remove ${nextAction.title}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddStep(project.id)}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add step
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-start">
        <Button type="button" variant="outline" onClick={onAddProject}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add project
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/10 p-4">
        <p className="text-sm text-muted-foreground">
          Save all keeps everything. Save selected only saves the projects and
          steps you kept checked.
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onEditPrompt}>
            Edit prompt
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating || isSaving}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveSelected}
            disabled={isSaving || isRegenerating}
          >
            Save selected
          </Button>
          <Button
            type="button"
            onClick={onSaveAll}
            disabled={isSaving || isRegenerating}
          >
            {isSaving ? "Saving..." : "Save all"}
          </Button>
        </div>
      </div>
    </div>
  );
}
