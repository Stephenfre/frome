export type EmailCandidate = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  internalDate?: string;
  labels?: string[];
  isUnread?: boolean;
};

export type EmailCandidateBucket =
  | "scheduling"
  | "billing"
  | "work"
  | "personal"
  | "receipt"
  | "promotional"
  | "low_signal";

export type EmailCandidateClassification = {
  bucket: EmailCandidateBucket;
  score: number;
  shouldTriage: boolean;
  reasonHints: string[];
};

export type EmailTriageItemCategory =
  | "schedule"
  | "money"
  | "work"
  | "personal"
  | "other";

export type EmailTriagePriority = "high" | "medium" | "low";

export type EmailTriageItem = {
  id: string;
  subject: string;
  from: string;
  reason: string;
  category: EmailTriageItemCategory;
  priority: EmailTriagePriority;
  suggestedAction?: string;
};

export type EmailTriageResult = {
  summary: string;
  importantCount: number;
  ignoreCount: number;
  items: EmailTriageItem[];
};
