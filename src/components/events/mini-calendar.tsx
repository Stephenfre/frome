"use client";

import { useMemo } from "react";
import DatePicker from "react-datepicker";

import type { EventView } from "@convex/events";

export function MiniCalendar({
  events,
  startDate,
  endDate,
  onRangeChange,
}: {
  events: EventView[];
  startDate: Date | null;
  endDate: Date | null;
  onRangeChange: (range: [Date | null, Date | null]) => void;
}) {
  const eventDateKeys = useMemo(() => {
    return new Set(
      events.map((event) => getLocalDayKey(new Date(event.startsAt))),
    );
  }, [events]);

  return (
    <div className="rounded-lg bg-background p-3">
      <DatePicker
        startDate={startDate}
        endDate={endDate}
        onChange={onRangeChange}
        selectsRange
        inline
        calendarClassName="forme-datepicker forme-datepicker-inline"
        dayClassName={(date) =>
          eventDateKeys.has(getLocalDayKey(date)) ? "forme-event-day" : ""
        }
      />
    </div>
  );
}

function getLocalDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
