import OpenAI from "openai";

let openAIClient: OpenAI | null = null;
export const aiGoalBreakdownModel =
  process.env.OPENAI_GOAL_BREAKDOWN_MODEL ?? "gpt-5.4";

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  openAIClient ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openAIClient;
}
