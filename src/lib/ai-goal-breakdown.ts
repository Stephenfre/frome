import type { GoalCategory } from "@convex/goals";
import type { ProjectNextActionEstimate } from "@convex/projectNextActions";

export type { ProjectNextActionEstimate } from "@convex/projectNextActions";

export const goalCategoryValues = [
  "career",
  "finance",
  "health",
  "fitness",
  "relationships",
  "personal",
  "learning",
  "other",
] as const satisfies GoalCategory[];

export const nextActionEstimateValues = [2, 5, 10, 15, 30] as const satisfies
  ProjectNextActionEstimate[];

export const aiGoalBreakdownPreferenceOptions = [
  {
    description: "Prefer very small and easy starts",
    label: "Make this very small and easy to start",
    value: "very_small",
  },
  {
    description: "Plan around limited weekly time",
    label: "I only have a few hours a week",
    value: "few_hours",
  },
  {
    description: "Reduce overwhelm and planning load",
    label: "I get overwhelmed easily",
    value: "overwhelmed",
  },
] as const;

export type AIGoalBreakdownPreference =
  (typeof aiGoalBreakdownPreferenceOptions)[number]["value"];

export type AIGoalBreakdownInput = {
  contextNotes?: string;
  goalCategory?: GoalCategory;
  goalTitle: string;
  preferences: AIGoalBreakdownPreference[];
  targetDate?: string;
};

export type AIGeneratedNextAction = {
  estimatedMinutes: ProjectNextActionEstimate;
  title: string;
};

export type AIGeneratedProject = {
  nextActions: AIGeneratedNextAction[];
  title: string;
};

export type AIGoalBreakdown = {
  goalCategory: GoalCategory;
  goalTitle: string;
  projects: AIGeneratedProject[];
  summary: string;
};

export type AIGoalBreakdownSaveInput = {
  goalCategory: GoalCategory;
  goalTitle: string;
  projects: AIGeneratedProject[];
  summary?: string | null;
  targetDate?: number | null;
};

export type AIGoalBreakdownDraftAction = AIGeneratedNextAction & {
  id: string;
  selected: boolean;
};

export type AIGoalBreakdownDraftProject = {
  id: string;
  nextActions: AIGoalBreakdownDraftAction[];
  selected: boolean;
  title: string;
};

export type AIGoalBreakdownDraft = {
  goalCategory: GoalCategory;
  goalTitle: string;
  projects: AIGoalBreakdownDraftProject[];
  summary: string;
};

const goalCategorySet = new Set<GoalCategory>(goalCategoryValues);
const preferenceSet = new Set<AIGoalBreakdownPreference>(
  aiGoalBreakdownPreferenceOptions.map((option) => option.value),
);

export const aiGoalBreakdownJsonSchema = {
  additionalProperties: false,
  properties: {
    goalCategory: {
      enum: goalCategoryValues,
      type: "string",
    },
    goalTitle: {
      minLength: 3,
      type: "string",
    },
    projects: {
      items: {
        additionalProperties: false,
        properties: {
          nextActions: {
            items: {
              additionalProperties: false,
              properties: {
                estimatedMinutes: {
                  enum: nextActionEstimateValues,
                  type: "number",
                },
                title: {
                  minLength: 2,
                  type: "string",
                },
              },
              required: ["title", "estimatedMinutes"],
              type: "object",
            },
            maxItems: 3,
            minItems: 1,
            type: "array",
          },
          title: {
            minLength: 2,
            type: "string",
          },
        },
        required: ["title", "nextActions"],
        type: "object",
      },
      maxItems: 5,
      minItems: 2,
      type: "array",
    },
    summary: {
      minLength: 8,
      type: "string",
    },
  },
  required: ["goalTitle", "goalCategory", "summary", "projects"],
  type: "object",
} as const;

export function parseAIGoalBreakdownInput(
  payload: unknown,
): AIGoalBreakdownInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Enter a goal to break down.");
  }

  const candidate = payload as Record<string, unknown>;
  const goalTitle = normalizeNonEmptyString(candidate.goalTitle, "Add a goal title.");

  const goalCategory = normalizeOptionalGoalCategory(candidate.goalCategory);
  const contextNotes = normalizeOptionalString(candidate.contextNotes);
  const preferences = normalizePreferences(candidate.preferences);
  const targetDate = normalizeOptionalDateInput(candidate.targetDate);

  return {
    contextNotes,
    goalCategory,
    goalTitle,
    preferences,
    targetDate,
  };
}

export function normalizeGeneratedBreakdown(
  payload: unknown,
  preferredCategory?: GoalCategory,
): AIGoalBreakdown {
  if (!payload || typeof payload !== "object") {
    throw new Error("The AI response was empty.");
  }

  const candidate = payload as Record<string, unknown>;
  const goalTitle = normalizeNonEmptyString(
    candidate.goalTitle,
    "The AI response did not include a goal title.",
  );
  const summary =
    normalizeOptionalString(candidate.summary) ??
    "Focus on a few concrete projects and small visible next steps.";

  const rawProjects = Array.isArray(candidate.projects) ? candidate.projects : [];

  const projects = rawProjects
    .map((project) => normalizeGeneratedProject(project))
    .filter((project): project is AIGeneratedProject => project !== null)
    .slice(0, 5);

  if (projects.length === 0) {
    throw new Error("The AI response did not include any usable projects.");
  }

  const goalCategory =
    preferredCategory ??
    normalizeOptionalGoalCategory(candidate.goalCategory) ??
    "personal";

  return {
    goalCategory,
    goalTitle,
    projects,
    summary,
  };
}

export function normalizeEstimatedMinutes(
  value: number | null | undefined,
): ProjectNextActionEstimate {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 5;
  }

  const sortedValues = [...nextActionEstimateValues].sort(
    (first, second) => first - second,
  );

  return sortedValues.reduce((closest, current) => {
    return Math.abs(current - value) < Math.abs(closest - value)
      ? current
      : closest;
  }, sortedValues[0]);
}

export function createBreakdownDraft(
  breakdown: AIGoalBreakdown,
): AIGoalBreakdownDraft {
  return {
    goalCategory: breakdown.goalCategory,
    goalTitle: breakdown.goalTitle,
    projects: breakdown.projects.map((project) => ({
      id: createDraftId(),
      nextActions: project.nextActions.map((nextAction) => ({
        ...nextAction,
        id: createDraftId(),
        selected: true,
      })),
      selected: true,
      title: project.title,
    })),
    summary: breakdown.summary,
  };
}

export function buildAIGoalBreakdownPrompt(input: AIGoalBreakdownInput) {
  const preferenceLabels = input.preferences
    .map(
      (preference) =>
        aiGoalBreakdownPreferenceOptions.find(
          (option) => option.value === preference,
        )?.label ?? preference,
    )
    .join(", ");

  return [
    `Goal: ${input.goalTitle}`,
    `Category: ${input.goalCategory ?? "infer if helpful"}`,
    `Target date: ${input.targetDate ?? "not provided"}`,
    `Context notes: ${input.contextNotes ?? "none"}`,
    `Preferences: ${preferenceLabels || "none"}`,
  ].join("\n");
}

function normalizeGeneratedProject(
  payload: unknown,
): AIGeneratedProject | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const title = normalizeOptionalString(candidate.title);

  if (!title) {
    return null;
  }

  const rawNextActions = Array.isArray(candidate.nextActions)
    ? candidate.nextActions
    : [];
  const nextActions = rawNextActions
    .map((nextAction) => normalizeGeneratedNextAction(nextAction))
    .filter(
      (nextAction): nextAction is AIGeneratedNextAction => nextAction !== null,
    )
    .slice(0, 3);

  if (nextActions.length === 0) {
    return null;
  }

  return {
    nextActions,
    title,
  };
}

function normalizeGeneratedNextAction(
  payload: unknown,
): AIGeneratedNextAction | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const title = normalizeOptionalString(candidate.title);

  if (!title) {
    return null;
  }

  return {
    estimatedMinutes: normalizeEstimatedMinutes(
      typeof candidate.estimatedMinutes === "number"
        ? candidate.estimatedMinutes
        : null,
    ),
    title,
  };
}

function normalizeOptionalGoalCategory(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return goalCategorySet.has(value as GoalCategory)
    ? (value as GoalCategory)
    : undefined;
}

function normalizeOptionalDateInput(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeNonEmptyString(value: unknown, errorMessage: string) {
  const trimmed = normalizeOptionalString(value);

  if (!trimmed) {
    throw new Error(errorMessage);
  }

  return trimmed;
}

function normalizePreferences(value: unknown): AIGoalBreakdownPreference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value)]
    .filter(
      (preference): preference is AIGoalBreakdownPreference =>
        typeof preference === "string" && preferenceSet.has(preference as AIGoalBreakdownPreference),
    )
    .slice(0, aiGoalBreakdownPreferenceOptions.length);
}

function createDraftId() {
  return globalThis.crypto.randomUUID();
}
