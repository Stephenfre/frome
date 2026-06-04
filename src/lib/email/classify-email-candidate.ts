import type {
  EmailCandidate,
  EmailCandidateClassification,
} from "@/types/email";

const schedulingKeywords = [
  "appointment",
  "calendar",
  "confirm",
  "interview",
  "meeting",
  "reschedule",
  "schedule",
  "tomorrow",
];

const billingKeywords = [
  "amount due",
  "autopay",
  "bill",
  "billing",
  "due",
  "failed payment",
  "invoice",
  "overdue",
  "past due",
  "payment",
  "statement",
];

const workKeywords = [
  "application",
  "career",
  "hiring",
  "interview",
  "job",
  "offer",
  "recruiter",
  "role",
];

const receiptKeywords = [
  "order",
  "receipt",
  "shipping",
  "subscription",
  "tracking",
];

const promotionalKeywords = [
  "deal",
  "newsletter",
  "offer",
  "promo",
  "sale",
  "unsubscribe",
];

export function classifyEmailCandidate(
  candidate: EmailCandidate,
): EmailCandidateClassification {
  const haystack = [
    candidate.subject,
    candidate.from,
    candidate.snippet,
    ...(candidate.labels ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const reasonHints: string[] = [];
  let bucket: EmailCandidateClassification["bucket"] = "personal";
  let score = candidate.isUnread ? 2 : 0;

  if (hasAnyKeyword(haystack, schedulingKeywords)) {
    bucket = "scheduling";
    score += 5;
    reasonHints.push("schedule");
  }

  if (hasAnyKeyword(haystack, billingKeywords)) {
    bucket = "billing";
    score += 5;
    reasonHints.push("money");
  }

  if (hasAnyKeyword(haystack, workKeywords)) {
    bucket = "work";
    score += 4;
    reasonHints.push("work");
  }

  if (hasAnyKeyword(haystack, receiptKeywords) && bucket === "personal") {
    bucket = "receipt";
    score += 1;
    reasonHints.push("receipt");
  }

  const labels = new Set(candidate.labels ?? []);
  const isPromotional =
    hasAnyKeyword(haystack, promotionalKeywords) ||
    labels.has("CATEGORY_PROMOTIONS") ||
    labels.has("CATEGORY_SOCIAL");

  if (isPromotional) {
    bucket = "promotional";
    score -= 5;
    reasonHints.push("promotional");
  }

  if (labels.has("IMPORTANT") || labels.has("STARRED")) {
    score += 2;
    reasonHints.push("important");
  }

  if (candidate.from.toLowerCase().includes("no-reply") && bucket === "personal") {
    score -= 1;
  }

  if (bucket === "personal" && !candidate.isUnread) {
    score -= 1;
  }

  if (score <= 0 && bucket === "personal") {
    bucket = "low_signal";
  }

  return {
    bucket,
    score,
    shouldTriage: score >= 2 && bucket !== "promotional" && bucket !== "low_signal",
    reasonHints,
  };
}

export function prioritizeEmailCandidates(candidates: EmailCandidate[]) {
  const classified = candidates.map((candidate) => ({
    candidate,
    classification: classifyEmailCandidate(candidate),
  }));

  const prioritized = classified
    .filter((item) => item.classification.shouldTriage)
    .sort((left, right) => {
      const unreadDelta =
        Number(right.candidate.isUnread ?? false) -
        Number(left.candidate.isUnread ?? false);

      if (unreadDelta !== 0) {
        return unreadDelta;
      }

      const scoreDelta = right.classification.score - left.classification.score;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return (
        Number(right.candidate.internalDate ?? 0) -
        Number(left.candidate.internalDate ?? 0)
      );
    });

  return {
    prioritized,
    ignoredCount: classified.length - prioritized.length,
  };
}

function hasAnyKeyword(haystack: string, keywords: string[]) {
  return keywords.some((keyword) => haystack.includes(keyword));
}
