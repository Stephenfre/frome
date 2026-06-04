import OpenAI from "openai";

let openAIClient: OpenAI | null = null;
export const openAIModel = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
export const aiGoalBreakdownModel =
  process.env.OPENAI_GOAL_BREAKDOWN_MODEL ?? openAIModel;
export const aiDailyBriefModel =
  process.env.OPENAI_DAILY_BRIEF_MODEL ?? openAIModel;
export const aiEmailTriageModel =
  process.env.OPENAI_EMAIL_TRIAGE_MODEL ?? openAIModel;
export const aiPlanDayModel =
  process.env.OPENAI_PLAN_DAY_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4";

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  openAIClient ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openAIClient;
}
