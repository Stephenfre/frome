"use client";

import { useQuery } from "convex/react";
import { CalendarDays, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AddEventForm } from "@/components/events/add-event-form";
import { EventRow } from "@/components/events/event-row";
import {
  addMinutes,
  applyDateWithExistingTime,
  formatDateRangeLabel,
  getDateRangeIsoBounds,
  getRoundedStartDate,
} from "@/components/events/event-utils";
import { MiniCalendar } from "@/components/events/mini-calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@convex/_generated/api";

export function AgendaCard() {
  const [selectedRange, setSelectedRange] = useState<
    [Date | null, Date | null]
  >(() => {
    const today = new Date();
    return [today, today];
  });
  const [selectedStartDate, selectedEndDate] = selectedRange;
  const rangeBounds = useMemo(
    () => getDateRangeIsoBounds(selectedStartDate, selectedEndDate),
    [selectedStartDate, selectedEndDate],
  );
  const events = useQuery(api.events.listEventsInRange, rangeBounds);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formStartsAt, setFormStartsAt] = useState<Date | null>(() =>
    getRoundedStartDate(),
  );
  const [formEndsAt, setFormEndsAt] = useState<Date | null>(() =>
    addMinutes(getRoundedStartDate(), 30),
  );
  const rangeLabel = formatDateRangeLabel(selectedStartDate, selectedEndDate);

  function handleRangeChange(range: [Date | null, Date | null]) {
    const [nextStartDate, nextEndDate] = range;

    setSelectedRange(range);

    if (nextStartDate) {
      setFormStartsAt((currentStartsAt) =>
        applyDateWithExistingTime(nextStartDate, currentStartsAt),
      );
    }

    if (nextEndDate) {
      setFormEndsAt((currentEndsAt) =>
        applyDateWithExistingTime(
          nextEndDate,
          currentEndsAt ?? (formStartsAt ? addMinutes(formStartsAt, 30) : null),
        ),
      );
    } else {
      setFormEndsAt(null);
    }
  }

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
          <CardDescription>
            {events === undefined
              ? "Loading agenda"
              : `${events.length} ${events.length === 1 ? "event" : "events"} · ${rangeLabel}`}
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant={isFormVisible ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsFormVisible((value) => !value)}
            aria-expanded={isFormVisible}
            aria-controls="agenda-event-form"
          >
            {isFormVisible ? (
              <X className="size-3.5" aria-hidden="true" />
            ) : (
              <Plus className="size-3.5" aria-hidden="true" />
            )}
            {isFormVisible ? "Hide form" : "Add event"}
          </Button>
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <CalendarDays
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <MiniCalendar
          events={events ?? []}
          startDate={selectedStartDate}
          endDate={selectedEndDate}
          onRangeChange={handleRangeChange}
        />

        {isFormVisible ? (
          <div id="agenda-event-form">
            <AddEventForm
              startsAt={formStartsAt}
              endsAt={formEndsAt}
              onStartsAtChange={setFormStartsAt}
              onEndsAtChange={setFormEndsAt}
            />
          </div>
        ) : null}

        <div className="grid gap-2">
          {events === undefined ? (
            <AgendaLoadingState />
          ) : events.length === 0 ? (
            <AgendaEmptyState />
          ) : (
            events.map((event) => <EventRow key={event._id} event={event} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AgendaLoadingState() {
  return (
    <div className="grid gap-2">
      <div className="h-16 rounded-lg border bg-muted/40" />
      <div className="h-16 rounded-lg border bg-muted/30" />
      <div className="h-16 rounded-lg border bg-muted/20" />
    </div>
  );
}

function AgendaEmptyState() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
      <h3 className="text-sm font-medium">No events today.</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Add a manual event to build today&apos;s schedule.
      </p>
    </div>
  );
}
