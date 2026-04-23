"use client";

import { SignInButton } from "@clerk/nextjs";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { CalendarDays, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { EventRow } from "@/components/events/event-row";
import {
  addMinutes,
  applyDateWithExistingTime,
  formatDateRangeLabel,
  getDateRangeIsoBounds,
  getRoundedStartDate,
} from "@/components/events/event-utils";
import { AddEventForm } from "@/components/events/add-event-form";
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
import type { EventView } from "@convex/events";

export default function EventsPage() {
  return (
    <>
      <Authenticated>
        <AuthenticatedEventsPage />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedEventsState />
      </Unauthenticated>
      <AuthLoading>
        <EventsLoadingState />
      </AuthLoading>
    </>
  );
}

function AuthenticatedEventsPage() {
  const [selectedRange, setSelectedRange] = useState<
    [Date | null, Date | null]
  >(() => {
    const today = new Date();
    return [today, today];
  });
  const [selectedStartDate, selectedEndDate] = selectedRange;
  const [formStartsAt, setFormStartsAt] = useState<Date | null>(() =>
    getRoundedStartDate(),
  );
  const [formEndsAt, setFormEndsAt] = useState<Date | null>(() =>
    addMinutes(getRoundedStartDate(), 30),
  );
  const [isFormVisible, setIsFormVisible] = useState(true);
  const rangeBounds = useMemo(
    () => getDateRangeIsoBounds(selectedStartDate, selectedEndDate),
    [selectedStartDate, selectedEndDate],
  );
  const events = useQuery(api.events.listEventsInRange, rangeBounds);
  const groupedEvents = useMemo(() => groupEventsByDay(events ?? []), [events]);
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
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manual calendar planning
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            Events
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {events === undefined
            ? "Loading events"
            : `${events.length} ${events.length === 1 ? "event" : "events"} in ${rangeLabel}`}
        </p>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="rounded-lg shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Plan a Time Block</CardTitle>
              <CardDescription>
                Pick a day range, then add or adjust events.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant={isFormVisible ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsFormVisible((value) => !value)}
              aria-expanded={isFormVisible}
              aria-controls="events-page-add-form"
            >
              {isFormVisible ? (
                <X className="size-3.5" aria-hidden="true" />
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
              {isFormVisible ? "Hide form" : "Add event"}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            <MiniCalendar
              events={events ?? []}
              startDate={selectedStartDate}
              endDate={selectedEndDate}
              onRangeChange={handleRangeChange}
            />
            {isFormVisible ? (
              <div id="events-page-add-form">
                <AddEventForm
                  startsAt={formStartsAt}
                  endsAt={formEndsAt}
                  onStartsAtChange={setFormStartsAt}
                  onEndsAtChange={setFormEndsAt}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{rangeLabel}</CardTitle>
              <CardDescription>
                Expand an event to read full notes and address details.
              </CardDescription>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <CalendarDays
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
          </CardHeader>
          <CardContent>
            {events === undefined ? (
              <EventsPanelLoadingState />
            ) : groupedEvents.length === 0 ? (
              <EventsPanelEmptyState rangeLabel={rangeLabel} />
            ) : (
              <div className="grid gap-6">
                {groupedEvents.map((group) => (
                  <section key={group.key} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold">{group.label}</h2>
                      <span className="text-xs text-muted-foreground">
                        {group.events.length}{" "}
                        {group.events.length === 1 ? "event" : "events"}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {group.events.map((event) => (
                        <EventRow key={event._id} event={event} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function groupEventsByDay(events: EventView[]) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const groupedEvents = new Map<
    string,
    { key: string; label: string; events: EventView[] }
  >();

  for (const event of events) {
    const startsAt = new Date(event.startsAt);
    const key = `${startsAt.getFullYear()}-${startsAt.getMonth()}-${startsAt.getDate()}`;
    const existingGroup = groupedEvents.get(key);

    if (existingGroup) {
      existingGroup.events.push(event);
      continue;
    }

    groupedEvents.set(key, {
      key,
      label: formatter.format(startsAt),
      events: [event],
    });
  }

  return Array.from(groupedEvents.values());
}

function EventsPanelLoadingState() {
  return (
    <div className="grid gap-2">
      <div className="h-16 rounded-lg border bg-muted/40" />
      <div className="h-16 rounded-lg border bg-muted/30" />
      <div className="h-16 rounded-lg border bg-muted/20" />
      <div className="h-16 rounded-lg border bg-muted/10" />
    </div>
  );
}

function EventsPanelEmptyState({ rangeLabel }: { rangeLabel: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
      <h3 className="text-sm font-medium">No events in {rangeLabel}.</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Use the calendar to change the range or add a new event for that window.
      </p>
    </div>
  );
}

function EventsLoadingState() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <section>
        <div className="h-4 w-36 rounded-md bg-muted" />
        <div className="mt-3 h-9 w-48 rounded-md bg-muted" />
      </section>
      <section className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <div className="h-[34rem] rounded-lg border bg-background" />
        <div className="h-[34rem] rounded-lg border bg-background" />
      </section>
    </div>
  );
}

function UnauthenticatedEventsState() {
  return (
    <div className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col items-center justify-center rounded-lg border bg-background p-8 text-center">
      <h1 className="text-2xl font-semibold">Sign in to manage events</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Your calendar data is loaded after Convex validates your Clerk session.
      </p>
      <SignInButton mode="redirect">
        <Button className="mt-6">Sign in</Button>
      </SignInButton>
    </div>
  );
}
