import type { EmailTriageResult } from "@/types/email";

export type DailyBrief = {
  summary: string;
  topPriorities: string[];
  warning?: string | null;
  suggestion?: string | null;
  emailSummary?: EmailTriageResult | null;
};

export type DailyBriefContext = {
  date: string;
  timezone?: string;
  events?: Array<{
    title: string;
    startAt?: string;
    endAt?: string;
    type?: string;
  }>;
  tasks?: Array<{
    title: string;
    urgency?: string;
    estimatedMinutes?: number;
  }>;
  goals?: Array<{
    title: string;
    status?: string;
    progressState?: string;
  }>;
  finance?: {
    summary?: string;
    alerts?: string[];
  } | null;
  emailSummary?: EmailTriageResult | null;
};
