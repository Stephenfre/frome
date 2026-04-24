import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  aiGoalBreakdownJsonSchema,
  buildAIGoalBreakdownPrompt,
  normalizeGeneratedBreakdown,
  parseAIGoalBreakdownInput,
} from "@/lib/ai-goal-breakdown";
import { aiGoalBreakdownModel, getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

const goalBreakdownInstructions = [
  "You are a structured planning assistant for ForMe, a calm productivity app designed to reduce overwhelm.",
  "Turn vague goals into a practical low-friction breakdown using Goal -> Project -> Next Action.",
  "If the goal is vague, rewrite it into a more concrete practical version.",
  "If the goal is already concrete, preserve it.",
  "Break the goal into 2 to 5 projects maximum.",
  "Generate 1 to 3 next actions per project.",
  "Next actions must be specific, visible, direct, and easy to start.",
  "Prefer actions that can usually begin in 2 to 10 minutes when possible.",
  "Avoid vague actions like 'work on this', 'make progress', 'get organized', or 'do finances'.",
  "Prefer direct action phrases like 'Open resume doc', 'Pay APS minimum', or 'Choose one company to apply to'.",
  "Do not include calendar scheduling yet.",
  "Do not include habits, streaks, motivational coaching, or giant plans.",
  "Keep the plan practical, calm, and not overwhelming.",
].join(" ");

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI goal breakdown is not configured yet." },
      { status: 500 },
    );
  }

  try {
    const payload = parseAIGoalBreakdownInput(await request.json());
    const client = getOpenAIClient();

    const response = await client.responses.parse({
      model: aiGoalBreakdownModel,
      reasoning: { effort: "medium" },
      instructions: goalBreakdownInstructions,
      input: buildAIGoalBreakdownPrompt(payload),
      max_output_tokens: 1600,
      safety_identifier: userId,
      text: {
        format: {
          type: "json_schema",
          name: "goal_breakdown",
          strict: true,
          schema: aiGoalBreakdownJsonSchema,
        },
      },
    });

    const breakdown = normalizeGeneratedBreakdown(
      response.output_parsed,
      payload.goalCategory,
    );

    return NextResponse.json({ breakdown });
  } catch (error) {
    console.error("AI goal breakdown failed", error);

    if (
      error instanceof Error &&
      (error.message === "Add a goal title." ||
        error.message === "Enter a goal to break down.")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const apiError = error as {
      code?: string | null;
      status?: number;
      type?: string | null;
    };

    if (
      apiError.code === "insufficient_quota" ||
      apiError.type === "insufficient_quota"
    ) {
      return NextResponse.json(
        {
          error:
            "Your OpenAI API key is valid, but this project has no available quota. Add billing or credits in OpenAI, then try again.",
        },
        { status: 429 },
      );
    }

    if (apiError.status === 429) {
      return NextResponse.json(
        {
          error:
            "OpenAI rate limited this request. Wait a moment and try again.",
        },
        { status: 429 },
      );
    }

    if (apiError.status === 401) {
      return NextResponse.json(
        {
          error:
            "OpenAI rejected the API key. Check that OPENAI_API_KEY is correct and active.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Could not break down that goal right now. Try again." },
      { status: 500 },
    );
  }
}
