import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  buildDailyBriefPrompt,
  normalizeGeneratedDailyBrief,
} from "@/lib/ai/generate-daily-brief";
import {
  buildEmailTriagePrompt,
  emailTriageJsonSchema,
  normalizeEmailTriageResult,
} from "@/lib/ai/triage-emails";
import { prioritizeEmailCandidates } from "@/lib/email/classify-email-candidate";
import {
  aiDailyBriefModel,
  aiEmailTriageModel,
  getOpenAIClient,
} from "@/lib/openai";
import {
  fetchAuthedConvexAction,
  fetchAuthedConvexQuery,
} from "@/lib/convex-server-auth";
import { dailyBriefJsonSchema } from "@/lib/ai/generate-daily-brief";
import type { DailyBriefContext } from "@/types/daily-brief";
import type { EmailCandidate, EmailTriageResult } from "@/types/email";
import { api } from "@convex/_generated/api";

export const runtime = "nodejs";

const dailyBriefInstructions = [
  "You are a calm planning assistant writing a short morning brief for ForMe.",
  "Produce a concise, practical dashboard brief.",
  "Prioritize clarity over hype.",
  "Avoid generic motivational language.",
  "Do not make up events, tasks, balances, goals, or risks that are not in the provided context.",
  "If data is missing, simply omit references to it.",
  "Use email triage only as a supporting signal, not the main summary.",
  "Focus on what matters today, what needs attention, any obvious overload, and one low-friction suggestion.",
  "Top priorities must be actionable and concrete.",
  "Warning should be null if nothing stands out.",
  "Suggestion should be practical and easy to follow.",
].join(" ");

const emailTriageInstructions = [
  "You are a calm email triage assistant for ForMe.",
  "Identify only the messages that likely matter today.",
  "Ignore low-signal newsletters, promotions, and obvious noise.",
  "Do not summarize the entire inbox.",
  "Do not invent urgency or facts beyond the provided metadata and snippets.",
  "Suggested actions must be practical and concrete.",
  "Keep the output concise.",
].join(" ");

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Daily brief AI is not configured yet." },
      { status: 500 },
    );
  }

  try {
    const requestContext = parseDailyBriefRequest(await request.json());
    const snapshot = await fetchAuthedConvexQuery(api.dashboard.getDashboardSnapshot, {
      dateKey: requestContext.dateKey,
      startOfDay: requestContext.startOfDay,
      endOfDay: requestContext.endOfDay,
      weekday: requestContext.weekday,
    });
    const gmailStatus = await fetchAuthedConvexQuery(
      api.gmailConnections.getGmailConnectionStatus,
      {},
    );
    const client = getOpenAIClient();

    const emailSummary = gmailStatus.isConnected
      ? await triageEmailForToday({
          client,
          context: {
            date: requestContext.date,
            timezone: requestContext.timezone,
            events: snapshot.events.slice(0, 6).map((event) => ({
              title: event.title,
              startAt: event.startAt,
              endAt: event.endAt,
              type: event.type,
            })),
            tasks: snapshot.tasks.slice(0, 6).map((task) => ({
              title: task.title,
              urgency: task.urgency,
              estimatedMinutes: task.estimatedMinutes,
            })),
            goals: snapshot.goals.slice(0, 4).map((goal) => ({
              title: goal.title,
              status: goal.status,
              progressState: goal.progressState,
            })),
          },
        })
      : null;

    const context: DailyBriefContext = {
      date: requestContext.date,
      timezone: requestContext.timezone,
      events: snapshot.events.map((event) => ({
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        type: event.type,
      })),
      tasks: snapshot.tasks.map((task) => ({
        title: task.title,
        urgency: task.urgency,
        estimatedMinutes: task.estimatedMinutes,
      })),
      goals: snapshot.goals.map((goal) => ({
        title: goal.title,
        status: goal.status,
        progressState: goal.progressState,
      })),
      finance: null,
      emailSummary,
    };

    const response = await client.responses.parse({
      model: aiDailyBriefModel,
      reasoning: { effort: "medium" },
      instructions: dailyBriefInstructions,
      input: buildDailyBriefPrompt(context),
      max_output_tokens: 900,
      safety_identifier: userId,
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

    return NextResponse.json({
      brief: {
        ...brief,
        generatedAt: Date.now(),
        model: aiDailyBriefModel,
      },
    });
  } catch (error) {
    console.error("Daily brief generation failed", error);

    const apiError = error as {
      code?: string | null;
      status?: number;
      type?: string | null;
      message?: string;
    };

    if (apiError.message === "Enter valid daily brief context.") {
      return NextResponse.json({ error: apiError.message }, { status: 400 });
    }

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
        { error: "OpenAI rate limited the daily brief. Try again shortly." },
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
      { error: "Could not generate the daily brief right now." },
      { status: 500 },
    );
  }
}

function parseDailyBriefRequest(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Enter valid daily brief context.");
  }

  const candidate = payload as Record<string, unknown>;
  const date =
    typeof candidate.date === "string" && candidate.date.trim().length > 0
      ? candidate.date.trim()
      : null;
  const dateKey =
    typeof candidate.dateKey === "string" && candidate.dateKey.trim().length > 0
      ? candidate.dateKey.trim()
      : null;
  const startOfDay =
    typeof candidate.startOfDay === "string" && candidate.startOfDay.trim().length > 0
      ? candidate.startOfDay
      : null;
  const endOfDay =
    typeof candidate.endOfDay === "string" && candidate.endOfDay.trim().length > 0
      ? candidate.endOfDay
      : null;
  const weekday =
    typeof candidate.weekday === "number" ? candidate.weekday : null;

  if (!date || !dateKey || !startOfDay || !endOfDay || weekday === null) {
    throw new Error("Enter valid daily brief context.");
  }

  return {
    date,
    dateKey,
    startOfDay,
    endOfDay,
    weekday,
    timezone:
      typeof candidate.timezone === "string" ? candidate.timezone : undefined,
  };
}

async function triageEmailForToday({
  client,
  context,
}: {
  client: ReturnType<typeof getOpenAIClient>;
  context: Pick<DailyBriefContext, "date" | "timezone" | "events" | "tasks" | "goals">;
}) {
  let candidates: EmailCandidate[] = [];

  try {
    candidates = await fetchAuthedConvexAction(
      api.gmailActions.listRecentEmailCandidatesForDailyBrief,
      {
        maxCandidates: 20,
        lookbackDays: 3,
      },
    );
  } catch (error) {
    console.error("Email candidate fetch failed", error);
    return null;
  }

  if (candidates.length === 0) {
    return null;
  }

  const prioritized = prioritizeEmailCandidates(candidates);
  const triageCandidates = prioritized.prioritized
    .slice(0, 10)
    .map((item) => item.candidate);

  if (triageCandidates.length === 0) {
    return {
      summary: "No emails need attention right now.",
      importantCount: 0,
      ignoreCount: candidates.length,
      items: [],
    } satisfies EmailTriageResult;
  }

  try {
    const response = await client.responses.parse({
      model: aiEmailTriageModel,
      reasoning: { effort: "medium" },
      instructions: emailTriageInstructions,
      input: buildEmailTriagePrompt({
        candidates: triageCandidates,
        context,
      }),
      max_output_tokens: 900,
      text: {
        format: {
          type: "json_schema",
          name: "email_triage",
          strict: true,
          schema: emailTriageJsonSchema,
        },
      },
    });

    const triage = normalizeEmailTriageResult(
      response.output_parsed,
      triageCandidates,
      prioritized.ignoredCount,
    );

    return triage.items.length > 0 ? triage : null;
  } catch (error) {
    console.error("Email triage failed", error);
    return null;
  }
}
