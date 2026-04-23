import type { EventView } from "@convex/events";

export function getRoundedStartDate() {
  const date = new Date();
  const minutes = date.getMinutes();
  const minutesToAdd = minutes % 15 === 0 ? 15 : 15 - (minutes % 15);
  date.setMinutes(minutes + minutesToAdd);
  date.setSeconds(0, 0);

  return date;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function applyDateWithExistingTime(
  date: Date,
  existingDate: Date | null,
) {
  const fallbackDate = existingDate ?? getRoundedStartDate();
  const nextDate = new Date(date);
  nextDate.setHours(
    fallbackDate.getHours(),
    fallbackDate.getMinutes(),
    fallbackDate.getSeconds(),
    fallbackDate.getMilliseconds(),
  );

  return nextDate;
}

export function formatEventTimeRange(event: EventView) {
  const startsAt = new Date(event.startsAt);
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endsAt) {
    return formatter.format(startsAt);
  }

  return `${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
}

export function getTodayIsoBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return {
    startOfDay: start.toISOString(),
    endOfDay: end.toISOString(),
  };
}

export function getDateRangeIsoBounds(
  startDate: Date | null,
  endDate: Date | null,
) {
  const start = new Date(startDate ?? new Date());
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate ?? start);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  return {
    startsAtOrAfter: start.toISOString(),
    startsBefore: end.toISOString(),
  };
}

export function formatDateRangeLabel(
  startDate: Date | null,
  endDate: Date | null,
) {
  const start = startDate ?? new Date();
  const end = endDate ?? start;
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });

  if (isSameLocalDay(start, end)) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function isSameLocalDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}
