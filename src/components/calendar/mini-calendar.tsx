"use client";

import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

import { api } from "@convex/_generated/api";
import type { EventView } from "@convex/events";
import { Calendar } from "@/components/ui/calendar";

function getMonthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);

  return {
    startOfRange: start.toISOString(),
    endOfRange: end.toISOString(),
  };
}

function getLocalDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function MiniCalendar({
  selectedDate,
  onDateChange,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  useEffect(() => {
    setVisibleMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
  }, [selectedDate]);

  const monthBounds = useMemo(
    () => getMonthBounds(visibleMonth),
    [visibleMonth],
  );
  const monthEvents = useQuery(api.events.listEventsInRange, monthBounds);
  const eventDateKeys = useMemo(() => {
    return new Set(
      (monthEvents ?? []).map((event: EventView) =>
        getLocalDayKey(new Date(event.startAt)),
      ),
    );
  }, [monthEvents]);

  return (
    <div className="rounded-lg border bg-background">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(nextDate) => {
          if (nextDate) {
            onDateChange(nextDate);
          }
        }}
        month={visibleMonth}
        onMonthChange={(nextDate) =>
          setVisibleMonth(
            new Date(nextDate.getFullYear(), nextDate.getMonth(), 1),
          )
        }
        modifiers={{
          hasEvents: Array.from(eventDateKeys).map((dateKey) => {
            const [year, month, day] = dateKey.split("-").map(Number);
            return new Date(year, month, day);
          }),
        }}
        modifiersClassNames={{
          hasEvents: "forme-calendar-event-day",
        }}
        className="w-full"
      />
    </div>
  );
}
