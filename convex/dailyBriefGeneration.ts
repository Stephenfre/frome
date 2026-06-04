"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { DailyBriefView } from "./dailyBriefs";
import {
  buildDailyBriefPrompt,
  dailyBriefJsonSchema,
  normalizeGeneratedDailyBrief,
} from "../src/lib/ai/generate-daily-brief";
import { aiDailyBriefModel, getOpenAIClient } from "../src/lib/openai";

const dailyBriefInstructions = [
  "You are a calm planning assistant writing a short morning brief for ForMe.",
  "Produce a concise, practical dashboard brief.",
  "Prioritize clarity over hype.",
  "Avoid generic motivational language.",
  "Do not make up events, tasks, balances, goals, or risks that are not in the provided context.",
  "If data is missing, simply omit references to it.",
  "Focus on what matters today, what needs attention, any obvious overload, and one low-friction suggestion.",
  "Top priorities must be actionable and concrete.",
  "Warning should be null if nothing stands out.",
  "Suggestion should be practical and easy to follow.",
].join(" ");

export const generateDailyBrief = action({
  args: {
    date: v.string(),
    dateKey: v.string(),
    startOfDay: v.string(),
    endOfDay: v.string(),
    weekday: v.number(),
    timezone: v.optional(v.string()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<DailyBriefView> => {
    const existingBrief: DailyBriefView | null = await ctx.runQuery(
      internal.dailyBriefs.getDailyBriefForDateInternal,
      { date: args.date },
    );

    if (existingBrief && !args.force) {
      return existingBrief;
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Daily brief AI is not configured yet.");
    }

    const context = await ctx.runQuery(
      internal.dailyBriefs.getDailyBriefGenerationContext,
      {
        date: args.date,
        dateKey: args.dateKey,
        startOfDay: args.startOfDay,
        endOfDay: args.endOfDay,
        weekday: args.weekday,
        timezone: args.timezone,
      },
    );

    try {
      const client = getOpenAIClient();
      const identity = await ctx.auth.getUserIdentity();
      const response = await client.responses.parse({
        model: aiDailyBriefModel,
        reasoning: { effort: "medium" },
        instructions: dailyBriefInstructions,
        input: buildDailyBriefPrompt(context),
        max_output_tokens: 900,
        safety_identifier: identity
          ? getOpenAISafetyIdentifier(identity)
          : undefined,
        text: {
          format: {
            type: "json_schema",
            name: "daily_brief",
            strict: true,
            schema: dailyBriefJsonSchema,
          },
        },
      });

      const brief = normalizeGeneratedDailyBrief(response.output_parsed, context);

      return await ctx.runMutation(internal.dailyBriefs.saveDailyBrief, {
        date: args.date,
        summary: brief.summary,
        topPriorities: brief.topPriorities,
        warning: brief.warning ?? undefined,
        suggestion: brief.suggestion ?? undefined,
        generatedAt: Date.now(),
        model: aiDailyBriefModel,
      });
    } catch (error) {
      console.error("Daily brief generation failed", error);

      const apiError = error as {
        code?: string | null;
        status?: number;
        type?: string | null;
      };

      if (
        apiError.code === "insufficient_quota" ||
        apiError.type === "insufficient_quota"
      ) {
        throw new Error(
          "Your OpenAI API key is valid, but this project has no available quota.",
        );
      }

      if (apiError.status === 429) {
        throw new Error("OpenAI rate limited the daily brief. Try again shortly.");
      }

      if (apiError.status === 401) {
        throw new Error(
          "OpenAI rejected the API key. Check that OPENAI_API_KEY is correct.",
        );
      }

      throw new Error("Could not generate the daily brief right now.");
    }
  },
});

function getOpenAISafetyIdentifier(identity: {
  subject?: string | null;
  tokenIdentifier?: string | null;
}) {
  const identifier =
    identity.subject?.trim() || identity.tokenIdentifier?.trim() || "unknown";

  return identifier.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}
