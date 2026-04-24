"use client";

import type { DayLoadSummary, EventType, EventView } from "@convex/events";

const weekdayRuleCodes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const singularUnitsByFrequency = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
} as const;

export type RecurrencePresetValue =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "custom";
export type RepeatFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type RepeatUnit = "day" | "week" | "month" | "year";
export type WeekdayCode = (typeof weekdayRuleCodes)[number];
export type RepeatOrdinal = "1" | "2" | "3" | "4" | "5" | "-2" | "-1";
export type RepeatPatternMode = "each" | "onThe";
export type CustomRecurrenceConfig = {
  frequency: RepeatFrequency;
  interval: number;
  unit: RepeatUnit;
  weeklyDays: WeekdayCode[];
  monthlyMode: RepeatPatternMode;
  monthlyDays: number[];
  monthlyOrdinal: RepeatOrdinal;
  monthlyWeekday: WeekdayCode;
  yearlyMonth: number;
  yearlyMode: RepeatPatternMode;
  yearlyDays: number[];
  yearlyOrdinal: RepeatOrdinal;
  yearlyWeekday: WeekdayCode;
};

export const reminderOptions = [
  { label: "No reminder", value: "none" },
  { label: "5 min before", value: "5" },
  { label: "10 min before", value: "10" },
  { label: "15 min before", value: "15" },
  { label: "30 min before", value: "30" },
  { label: "1 hour before", value: "60" },
] as const;

export const recurrenceOptions = [
  { label: "Does not repeat", value: "none" },
  { label: "Daily", value: "daily" },
  { label: "Weekdays", value: "weekdays" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom...", value: "custom" },
] as const;

export const repeatFrequencyOptions: Array<{
  label: string;
  value: RepeatFrequency;
}> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

export const repeatUnitOptions: Array<{ label: string; value: RepeatUnit }> = [
  { label: "day", value: "day" },
  { label: "week", value: "week" },
  { label: "month", value: "month" },
  { label: "year", value: "year" },
];

export const weekdayOptions: Array<{ label: string; shortLabel: string; value: WeekdayCode }> = [
  { label: "Sunday", shortLabel: "Sun", value: "SU" },
  { label: "Monday", shortLabel: "Mon", value: "MO" },
  { label: "Tuesday", shortLabel: "Tue", value: "TU" },
  { label: "Wednesday", shortLabel: "Wed", value: "WE" },
  { label: "Thursday", shortLabel: "Thu", value: "TH" },
  { label: "Friday", shortLabel: "Fri", value: "FR" },
  { label: "Saturday", shortLabel: "Sat", value: "SA" },
];

export const repeatOrdinalOptions: Array<{
  label: string;
  value: RepeatOrdinal;
}> = [
  { label: "First", value: "1" },
  { label: "Second", value: "2" },
  { label: "Third", value: "3" },
  { label: "Fourth", value: "4" },
  { label: "Fifth", value: "5" },
  { label: "Next to last", value: "-2" },
  { label: "Last", value: "-1" },
];

export const repeatMonthOptions = Array.from({ length: 12 }, (_, index) => ({
  label: new Intl.DateTimeFormat(undefined, { month: "long" }).format(
    new Date(2024, index, 1),
  ),
  value: index + 1,
}));

export const eventColorOptions = [
  { label: "Sky", value: "#0ea5e9" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Slate", value: "#64748b" },
] as const;

function normalizeRecurrenceRuleValue(recurrenceRule?: string) {
  if (!recurrenceRule) {
    return undefined;
  }

  return recurrenceRule.startsWith("RRULE:")
    ? recurrenceRule.slice("RRULE:".length)
    : recurrenceRule;
}

function parseRecurrenceRuleParts(recurrenceRule?: string) {
  const normalizedRule = normalizeRecurrenceRuleValue(recurrenceRule);

  if (!normalizedRule) {
    return null;
  }

  const parts = new Map<string, string>();

  for (const segment of normalizedRule.split(";")) {
    const [key, value] = segment.split("=");

    if (!key || !value) {
      continue;
    }

    parts.set(key.toUpperCase(), value);
  }

  return parts;
}

function uniqueSortedNumbers(values: number[]) {
  return Array.from(new Set(values))
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b);
}

function uniqueSortedWeekdays(values: WeekdayCode[]) {
  return Array.from(new Set(values)).sort(
    (left, right) =>
      weekdayRuleCodes.indexOf(left) - weekdayRuleCodes.indexOf(right),
  );
}

function getWeekdayCode(date: Date): WeekdayCode {
  return weekdayRuleCodes[date.getDay()];
}

function getDefaultOrdinalFromDate(date: Date): RepeatOrdinal {
  const dayOfMonth = date.getDate();
  const daysInMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();

  if (dayOfMonth + 7 > daysInMonth) {
    return "-1";
  }

  if (dayOfMonth + 14 > daysInMonth) {
    return "-2";
  }

  return String(Math.ceil(dayOfMonth / 7)) as RepeatOrdinal;
}

function getIntervalValue(value?: string) {
  const parsedValue = Number.parseInt(value ?? "1", 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getAllowedMonthDays(month: number, year = new Date().getFullYear()) {
  return Array.from({ length: getDaysInMonth(year, month) }, (_, index) => index + 1);
}

function normalizeRepeatUnitForFrequency(frequency: RepeatFrequency): RepeatUnit {
  return singularUnitsByFrequency[frequency];
}

export function getDefaultCustomRecurrenceConfig(
  startAt = new Date(),
): CustomRecurrenceConfig {
  const weekdayCode = getWeekdayCode(startAt);
  const dayOfMonth = startAt.getDate();
  const month = startAt.getMonth() + 1;
  const ordinal = getDefaultOrdinalFromDate(startAt);

  return {
    frequency: "weekly",
    interval: 1,
    unit: "week",
    weeklyDays: [weekdayCode],
    monthlyMode: "each",
    monthlyDays: [dayOfMonth],
    monthlyOrdinal: ordinal,
    monthlyWeekday: weekdayCode,
    yearlyMonth: month,
    yearlyMode: "each",
    yearlyDays: [dayOfMonth],
    yearlyOrdinal: ordinal,
    yearlyWeekday: weekdayCode,
  };
}

export function parseCustomRecurrenceConfig(
  recurrenceRule: string | undefined,
  startAt = new Date(),
): CustomRecurrenceConfig {
  const fallback = getDefaultCustomRecurrenceConfig(startAt);
  const normalizedRule = normalizeRecurrenceRuleValue(recurrenceRule);

  if (!normalizedRule) {
    return fallback;
  }

  const parts = parseRecurrenceRuleParts(normalizedRule);

  if (!parts) {
    return fallback;
  }

  const frequency = parts.get("FREQ");
  const interval = getIntervalValue(parts.get("INTERVAL"));
  const byDay = parts
    .get("BYDAY")
    ?.split(",")
    .filter((value): value is WeekdayCode =>
      weekdayRuleCodes.includes(value as WeekdayCode),
    );
  const byMonthDay = parts
    .get("BYMONTHDAY")
    ?.split(",")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 31);
  const bySetPos = parts.get("BYSETPOS");
  const byMonth = Number.parseInt(parts.get("BYMONTH") ?? "", 10);

  if (frequency === "DAILY") {
    return {
      ...fallback,
      frequency: "daily",
      interval,
      unit: "day",
    };
  }

  if (frequency === "WEEKLY") {
    return {
      ...fallback,
      frequency: "weekly",
      interval,
      unit: "week",
      weeklyDays:
        byDay && byDay.length > 0 ? uniqueSortedWeekdays(byDay) : fallback.weeklyDays,
    };
  }

  if (frequency === "MONTHLY") {
    if (byMonthDay && byMonthDay.length > 0) {
      return {
        ...fallback,
        frequency: "monthly",
        interval,
        unit: "month",
        monthlyMode: "each",
        monthlyDays: uniqueSortedNumbers(byMonthDay),
      };
    }

    if (
      byDay &&
      byDay.length > 0 &&
      bySetPos &&
      repeatOrdinalOptions.some((option) => option.value === bySetPos)
    ) {
      return {
        ...fallback,
        frequency: "monthly",
        interval,
        unit: "month",
        monthlyMode: "onThe",
        monthlyOrdinal: bySetPos as RepeatOrdinal,
        monthlyWeekday: byDay[0],
      };
    }
  }

  if (frequency === "YEARLY") {
    const month = Number.isInteger(byMonth) && byMonth >= 1 && byMonth <= 12
      ? byMonth
      : fallback.yearlyMonth;

    if (byMonthDay && byMonthDay.length > 0) {
      return {
        ...fallback,
        frequency: "yearly",
        interval,
        unit: "year",
        yearlyMonth: month,
        yearlyMode: "each",
        yearlyDays: uniqueSortedNumbers(byMonthDay),
      };
    }

    if (
      byDay &&
      byDay.length > 0 &&
      bySetPos &&
      repeatOrdinalOptions.some((option) => option.value === bySetPos)
    ) {
      return {
        ...fallback,
        frequency: "yearly",
        interval,
        unit: "year",
        yearlyMonth: month,
        yearlyMode: "onThe",
        yearlyOrdinal: bySetPos as RepeatOrdinal,
        yearlyWeekday: byDay[0],
      };
    }
  }

  return fallback;
}

export function getRecurrencePresetValue(
  recurrenceRule?: string,
): RecurrencePresetValue {
  const normalizedRule = normalizeRecurrenceRuleValue(recurrenceRule);
  const parts = parseRecurrenceRuleParts(normalizedRule);

  if (!normalizedRule) {
    return "none";
  }

  if (normalizedRule === "daily") {
    return "daily";
  }

  if (normalizedRule === "weekdays") {
    return "weekdays";
  }

  if (normalizedRule.startsWith("weekly:")) {
    return "weekly";
  }

  if (
    parts?.get("FREQ") === "WEEKLY" &&
    parts.get("BYDAY") === "MO,TU,WE,TH,FR" &&
    getIntervalValue(parts.get("INTERVAL")) === 1
  ) {
    return "weekdays";
  }

  if (
    parts?.get("FREQ") === "DAILY" &&
    getIntervalValue(parts.get("INTERVAL")) === 1
  ) {
    return "daily";
  }

  if (
    parts?.get("FREQ") === "WEEKLY" &&
    getIntervalValue(parts.get("INTERVAL")) === 1 &&
    parts.get("BYDAY")?.split(",").length === 1
  ) {
    return "weekly";
  }

  if (
    parts?.get("FREQ") === "MONTHLY" &&
    getIntervalValue(parts.get("INTERVAL")) === 1 &&
    parts.has("BYMONTHDAY") &&
    !parts.has("BYDAY") &&
    !parts.has("BYSETPOS") &&
    parts.get("BYMONTHDAY")?.split(",").length === 1
  ) {
    return "monthly";
  }

  return "custom";
}

export function getCustomRecurrenceRuleValue(recurrenceRule?: string) {
  return getRecurrencePresetValue(recurrenceRule) === "custom"
    ? (normalizeRecurrenceRuleValue(recurrenceRule) ?? "")
    : "";
}

export function buildRecurrenceRuleFromPreset({
  preset,
  startAt,
  customConfig,
}: {
  preset: RecurrencePresetValue;
  startAt: Date;
  customConfig?: CustomRecurrenceConfig;
}) {
  if (preset === "none") {
    return undefined;
  }

  if (preset === "custom") {
    if (!customConfig) {
      return undefined;
    }

    const interval = Math.max(1, Math.floor(customConfig.interval || 1));

    if (customConfig.frequency === "daily") {
      return interval === 1
        ? "FREQ=DAILY"
        : `FREQ=DAILY;INTERVAL=${interval}`;
    }

    if (customConfig.frequency === "weekly") {
      const weeklyDays = uniqueSortedWeekdays(customConfig.weeklyDays);

      if (weeklyDays.length === 0) {
        return undefined;
      }

      return [
        "FREQ=WEEKLY",
        ...(interval > 1 ? [`INTERVAL=${interval}`] : []),
        `BYDAY=${weeklyDays.join(",")}`,
      ].join(";");
    }

    if (customConfig.frequency === "monthly") {
      if (customConfig.monthlyMode === "each") {
        const monthlyDays = uniqueSortedNumbers(customConfig.monthlyDays).filter(
          (value) => value >= 1 && value <= 31,
        );

        if (monthlyDays.length === 0) {
          return undefined;
        }

        return [
          "FREQ=MONTHLY",
          ...(interval > 1 ? [`INTERVAL=${interval}`] : []),
          `BYMONTHDAY=${monthlyDays.join(",")}`,
        ].join(";");
      }

      return [
        "FREQ=MONTHLY",
        ...(interval > 1 ? [`INTERVAL=${interval}`] : []),
        `BYDAY=${customConfig.monthlyWeekday}`,
        `BYSETPOS=${customConfig.monthlyOrdinal}`,
      ].join(";");
    }

    const yearlyMonth = customConfig.yearlyMonth;

    if (yearlyMonth < 1 || yearlyMonth > 12) {
      return undefined;
    }

    if (customConfig.yearlyMode === "each") {
      const maxMonthDay = getDaysInMonth(startAt.getFullYear(), yearlyMonth);
      const yearlyDays = uniqueSortedNumbers(customConfig.yearlyDays).filter(
        (value) => value >= 1 && value <= maxMonthDay,
      );

      if (yearlyDays.length === 0) {
        return undefined;
      }

      return [
        "FREQ=YEARLY",
        ...(interval > 1 ? [`INTERVAL=${interval}`] : []),
        `BYMONTH=${yearlyMonth}`,
        `BYMONTHDAY=${yearlyDays.join(",")}`,
      ].join(";");
    }

    return [
      "FREQ=YEARLY",
      ...(interval > 1 ? [`INTERVAL=${interval}`] : []),
      `BYMONTH=${yearlyMonth}`,
      `BYDAY=${customConfig.yearlyWeekday}`,
      `BYSETPOS=${customConfig.yearlyOrdinal}`,
    ].join(";");
  }

  if (preset === "daily") {
    return "FREQ=DAILY";
  }

  if (preset === "weekdays") {
    return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
  }

  if (preset === "weekly") {
    return `FREQ=WEEKLY;BYDAY=${weekdayRuleCodes[startAt.getDay()]}`;
  }

  return `FREQ=MONTHLY;BYMONTHDAY=${startAt.getDate()}`;
}

export function getAllowedDaysForMonth(month: number, year = new Date().getFullYear()) {
  return getAllowedMonthDays(month, year);
}

export function getRepeatUnitForFrequency(frequency: RepeatFrequency) {
  return normalizeRepeatUnitForFrequency(frequency);
}

export function getRoundedStartDate(date = new Date()) {
  const nextDate = new Date(date);
  const minutes = nextDate.getMinutes();
  const minutesToAdd = minutes % 15 === 0 ? 15 : 15 - (minutes % 15);
  nextDate.setMinutes(minutes + minutesToAdd);
  nextDate.setSeconds(0, 0);

  return nextDate;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function getDayContext(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(startOfDay.getDate() + 1);

  return {
    dateKey: getDateKey(date),
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString(),
    weekday: date.getDay(),
  };
}

export function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatEventTimeRange(event: EventView) {
  const startsAt = new Date(event.startAt);
  const endsAt = event.endAt ? new Date(event.endAt) : null;
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endsAt) {
    return formatter.format(startsAt);
  }

  return `${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
}

export function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function isToday(date: Date) {
  return getDateKey(date) === getDateKey(new Date());
}

export function getEventTypeLabel(type: EventType) {
  switch (type) {
    case "fixed":
      return "Fixed";
    case "anchor":
      return "Anchor";
    case "reset":
      return "Reset";
  }
}

export function getRecurrenceLabel(recurrenceRule?: string) {
  const normalizedRule = normalizeRecurrenceRuleValue(recurrenceRule);

  if (!normalizedRule) {
    return null;
  }

  const preset = getRecurrencePresetValue(normalizedRule);

  if (preset === "daily") {
    return "Daily";
  }

  if (preset === "weekdays") {
    return "Weekdays";
  }

  if (preset === "weekly") {
    return "Weekly";
  }

  if (preset === "monthly") {
    return "Monthly";
  }

  const parts = parseRecurrenceRuleParts(normalizedRule);

  if (!parts) {
    return "Custom";
  }

  const frequency = parts.get("FREQ");
  const interval = getIntervalValue(parts.get("INTERVAL"));

  if (frequency === "YEARLY") {
    return interval === 1 ? "Yearly" : `Every ${interval} years`;
  }

  if (frequency === "MONTHLY") {
    return interval === 1 ? "Monthly" : `Every ${interval} months`;
  }

  if (frequency === "WEEKLY") {
    return interval === 1 ? "Weekly" : `Every ${interval} weeks`;
  }

  if (frequency === "DAILY") {
    return interval === 1 ? "Daily" : `Every ${interval} days`;
  }

  return "Custom";
}

export function getReminderLabel(reminderMinutesBefore?: number) {
  if (reminderMinutesBefore === undefined) {
    return null;
  }

  if (reminderMinutesBefore === 0) {
    return "At time of event";
  }

  if (reminderMinutesBefore < 60) {
    return `${reminderMinutesBefore} min before`;
  }

  if (reminderMinutesBefore % 60 === 0) {
    const hours = reminderMinutesBefore / 60;
    return `${hours} hour${hours === 1 ? "" : "s"} before`;
  }

  return `${reminderMinutesBefore} min before`;
}

export function getDefaultTitleForType(type: EventType) {
  if (type === "reset") {
    return "Reset Block";
  }

  if (type === "anchor") {
    return "Morning Anchor";
  }

  return "";
}

export function getTypeBadgeClassName(type: EventType) {
  switch (type) {
    case "fixed":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "anchor":
      return "border-teal-200 bg-teal-50 text-teal-700";
    case "reset":
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export function getTypeCardClassName(type: EventType) {
  switch (type) {
    case "fixed":
      return "border-slate-200 bg-slate-50/50";
    case "anchor":
      return "border-teal-200 bg-teal-50/50";
    case "reset":
      return "border-amber-200 bg-amber-50/50";
  }
}

export function getDayLoadClassName(level: DayLoadSummary["level"]) {
  switch (level) {
    case "Light":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Balanced":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Heavy":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Overpacked":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

export function getDayLoadTrackClassName(level: DayLoadSummary["level"]) {
  switch (level) {
    case "Light":
      return "bg-emerald-500";
    case "Balanced":
      return "bg-sky-500";
    case "Heavy":
      return "bg-amber-500";
    case "Overpacked":
      return "bg-rose-500";
  }
}

export function getDayLoadFill(summary: DayLoadSummary) {
  if (summary.level === "Light") {
    return "w-1/4";
  }

  if (summary.level === "Balanced") {
    return "w-2/4";
  }

  if (summary.level === "Heavy") {
    return "w-3/4";
  }

  return "w-full";
}

export function sortEvents(events: EventView[]) {
  return [...events].sort((firstEvent, secondEvent) =>
    firstEvent.startAt.localeCompare(secondEvent.startAt),
  );
}
