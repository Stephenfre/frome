"use client";

import { useMutation } from "convex/react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AIGoalBreakdownForm } from "@/components/goals/ai-goal-breakdown-form";
import { AIGoalBreakdownReview } from "@/components/goals/ai-goal-breakdown-review";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  createBreakdownDraft,
  type AIGoalBreakdown,
  type AIGoalBreakdownDraft,
  type AIGoalBreakdownInput,
  type AIGoalBreakdownSaveInput,
  normalizeEstimatedMinutes,
  type ProjectNextActionEstimate,
} from "@/lib/ai-goal-breakdown";
import { getTimestampFromLocalDateInput } from "@/lib/date";
import { api } from "@convex/_generated/api";
import inspirationalQuotes from "@/data/inspirational-quotes.json";

type AIBreakdownPhase = "form" | "loading" | "review";

const defaultFormValue: AIGoalBreakdownInput = {
  goalTitle: "",
  preferences: [],
};

export function AIBreakdownButton({
  className,
  label = "Break down a goal with AI",
  size = "sm",
  variant = "outline",
}: {
  className?: string;
  label?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const saveBreakdown = useMutation(api.goals.createGoalFromBreakdown);
  const [draft, setDraft] = useState<AIGoalBreakdownDraft | null>(null);
  const [formValue, setFormValue] = useState<AIGoalBreakdownInput>(defaultFormValue);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phase, setPhase] = useState<AIBreakdownPhase>("form");
  const abortControllerRef = useRef<AbortController | null>(null);

  function resetState() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setDraft(null);
    setError(null);
    setFormValue(defaultFormValue);
    setIsGenerating(false);
    setIsSaving(false);
    setPhase("form");
  }

  async function handleGenerate() {
    if (!formValue.goalTitle.trim()) {
      setError("Add a goal title first.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setPhase("loading");
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/ai/goal-breakdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValue),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        breakdown?: AIGoalBreakdown;
        error?: string;
      };

      if (!response.ok || !payload.breakdown) {
        throw new Error(
          payload.error ?? "Could not break down that goal right now. Try again.",
        );
      }

      setDraft(createBreakdownDraft(payload.breakdown));
      setPhase("review");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        setPhase("form");
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not break down that goal right now. Try again.",
      );
      setPhase("form");
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }

  function handleAbortGenerate() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
    setPhase("form");
  }

  async function handleSave(mode: "all" | "selected") {
    if (!draft) {
      return;
    }

    setError(null);

    const payload = buildSaveInput(draft, formValue, mode);

    if (!payload.goalTitle.trim()) {
      setError("Give the goal a title before saving.");
      return;
    }

    if (payload.projects.length === 0) {
      setError("Keep at least one project before saving.");
      return;
    }

    setIsSaving(true);

    try {
      await saveBreakdown(payload);
      setIsOpen(false);
      resetState();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save this breakdown. Try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetState();
        }
      }}
    >
      <SheetTrigger asChild>
        <Button type="button" variant={variant} size={size} className={className}>
          <Sparkles className="size-3.5" aria-hidden="true" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent className="max-w-4xl">
        <SheetHeader>
          <SheetTitle>Break Down a Goal with AI</SheetTitle>
          <SheetDescription>
            Generate a structured goal, practical projects, and low-friction next
            actions. Review everything before it is saved.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-6 pb-6">
          {phase === "form" ? (
            <AIGoalBreakdownForm
              value={formValue}
              onChange={(patch) =>
                setFormValue((currentValue) => ({
                  ...currentValue,
                  ...patch,
                }))
              }
              onSubmit={handleGenerate}
              isSubmitting={isGenerating}
              error={error}
            />
          ) : null}

          {phase === "loading" ? (
            <BreakdownLoadingState onAbort={handleAbortGenerate} />
          ) : null}

          {phase === "review" && draft ? (
            <AIGoalBreakdownReview
              draft={draft}
              formValue={formValue}
              error={error}
              isRegenerating={isGenerating}
              isSaving={isSaving}
              onEditPrompt={() => {
                setError(null);
                setPhase("form");
              }}
              onRegenerate={handleGenerate}
              onSaveAll={() => handleSave("all")}
              onSaveSelected={() => handleSave("selected")}
              onChangeGoalTitle={(goalTitle) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        goalTitle,
                      }
                    : currentValue,
                )
              }
              onChangeCategory={(goalCategory) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        goalCategory,
                      }
                    : currentValue,
                )
              }
              onChangeSummary={(summary) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        summary,
                      }
                    : currentValue,
                )
              }
              onChangeTargetDate={(targetDate) =>
                setFormValue((currentValue) => ({
                  ...currentValue,
                  targetDate,
                }))
              }
              onChangeProjectTitle={(projectId, value) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        projects: currentValue.projects.map((project) =>
                          project.id === projectId ? { ...project, title: value } : project,
                        ),
                      }
                    : currentValue,
                )
              }
              onChangeProjectSelected={(projectId, selected) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        projects: currentValue.projects.map((project) =>
                          project.id === projectId
                            ? {
                                ...project,
                                selected,
                                nextActions: project.nextActions.map((nextAction) => ({
                                  ...nextAction,
                                  selected,
                                })),
                              }
                            : project,
                        ),
                      }
                    : currentValue,
                )
              }
              onAddProject={() =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        projects: [
                          ...currentValue.projects,
                          {
                            id: crypto.randomUUID(),
                            nextActions: [
                              {
                                estimatedMinutes: 5,
                                id: crypto.randomUUID(),
                                selected: true,
                                title: "Add first visible step",
                              },
                            ],
                            selected: true,
                            title: "New project",
                          },
                        ],
                      }
                    : currentValue,
                )
              }
              onRemoveProject={(projectId) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        projects: currentValue.projects.filter(
                          (project) => project.id !== projectId,
                        ),
                      }
                    : currentValue,
                )
              }
              onAddStep={(projectId) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        projects: currentValue.projects.map((project) =>
                          project.id === projectId
                            ? {
                                ...project,
                                nextActions: [
                                  ...project.nextActions,
                                  {
                                    estimatedMinutes: 5,
                                    id: crypto.randomUUID(),
                                    selected: true,
                                    title: "Add next visible step",
                                  },
                                ],
                              }
                            : project,
                        ),
                      }
                    : currentValue,
                )
              }
              onChangeStepTitle={(projectId, stepId, value) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        projects: currentValue.projects.map((project) =>
                          project.id === projectId
                            ? {
                                ...project,
                                nextActions: project.nextActions.map((nextAction) =>
                                  nextAction.id === stepId
                                    ? { ...nextAction, title: value }
                                    : nextAction,
                                ),
                              }
                            : project,
                        ),
                      }
                    : currentValue,
                )
              }
              onChangeStepSelected={(projectId, stepId, selected) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        projects: currentValue.projects.map((project) =>
                          project.id === projectId
                            ? {
                                ...project,
                                nextActions: project.nextActions.map((nextAction) =>
                                  nextAction.id === stepId
                                    ? { ...nextAction, selected }
                                    : nextAction,
                                ),
                              }
                            : project,
                        ),
                      }
                    : currentValue,
                )
              }
              onChangeStepEstimatedMinutes={(projectId, stepId, estimatedMinutes) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        projects: currentValue.projects.map((project) =>
                          project.id === projectId
                            ? {
                                ...project,
                                nextActions: project.nextActions.map((nextAction) =>
                                  nextAction.id === stepId
                                    ? { ...nextAction, estimatedMinutes }
                                    : nextAction,
                                ),
                              }
                            : project,
                        ),
                      }
                    : currentValue,
                )
              }
              onRemoveStep={(projectId, stepId) =>
                setDraft((currentValue) =>
                  currentValue
                    ? {
                        ...currentValue,
                        projects: currentValue.projects.map((project) =>
                          project.id === projectId
                            ? {
                                ...project,
                                nextActions: project.nextActions.filter(
                                  (nextAction) => nextAction.id !== stepId,
                                ),
                              }
                            : project,
                        ),
                      }
                    : currentValue,
                )
              }
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BreakdownLoadingState({ onAbort }: { onAbort: () => void }) {
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * inspirationalQuotes.length),
  );

  useEffect(() => {
    if (inspirationalQuotes.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setQuoteIndex((currentIndex) => {
        let nextIndex = currentIndex;

        while (nextIndex === currentIndex) {
          nextIndex = Math.floor(Math.random() * inspirationalQuotes.length);
        }

        return nextIndex;
      });
    }, 3500);

    return () => window.clearInterval(interval);
  }, []);

  const currentQuote = inspirationalQuotes[quoteIndex];

  return (
    <div className="relative flex min-h-[32rem] items-center justify-center bg-background px-6 text-center">
      <div className="grid max-w-2xl justify-items-center gap-4">
        <LoaderCircle
          className="size-6 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-lg leading-8 font-medium text-foreground/90 sm:text-xl sm:leading-9">
          “{currentQuote.quote}”
        </p>
        <p className="text-sm text-muted-foreground">- {currentQuote.author}</p>
      </div>
      <div className="absolute right-6 bottom-6">
        <Button type="button" variant="outline" onClick={onAbort}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function buildSaveInput(
  draft: AIGoalBreakdownDraft,
  formValue: AIGoalBreakdownInput,
  mode: "all" | "selected",
): AIGoalBreakdownSaveInput {
  const includeEverything = mode === "all";

  return {
    goalCategory: draft.goalCategory,
    goalTitle: draft.goalTitle.trim(),
    projects: draft.projects
      .filter((project) => includeEverything || project.selected)
      .map((project) => ({
        title: project.title.trim(),
        nextActions: project.nextActions
          .filter((nextAction) => includeEverything || nextAction.selected)
          .map((nextAction) => ({
            estimatedMinutes: normalizeEstimatedMinutes(nextAction.estimatedMinutes),
            title: nextAction.title.trim(),
          }))
          .filter((nextAction) => nextAction.title.length > 0),
      }))
      .filter((project) => project.title.length > 0),
    summary: draft.summary.trim() || null,
    targetDate: formValue.targetDate
      ? getTimestampFromLocalDateInput(formValue.targetDate)
      : null,
  };
}
