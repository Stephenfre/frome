"use client";

import { CalendarDays, HeartPulse, Pin } from "lucide-react";

import { DayLoadIndicator } from "@/components/calendar/day-load-indicator";
import { EventCard } from "@/components/calendar/event-card";
import { sortEvents } from "@/components/calendar/calendar-utils";
import type { DayLoadSummary, EventType, EventView } from "@convex/events";

const sections: Array<{
  type: EventType;
  title: string;
  description: string;
  icon: typeof CalendarDays;
}> = [
  {
    type: "fixed",
    title: "Fixed Events",
    description: "Appointments and commitments that move the day.",
    icon: CalendarDays,
  },
  {
    type: "anchor",
    title: "Anchors",
    description: "Stabilizers that help the day stay followable.",
    icon: Pin,
  },
  {
    type: "reset",
    title: "Reset Blocks",
    description: "Intentional catch-up, decompression, and buffer time.",
    icon: HeartPulse,
  },
];

export type DayViewMode = "grouped" | "chronological";

export function DayView({
  events,
  summary,
  dateLabel,
  viewMode = "chronological",
}: {
  events: EventView[];
  summary: DayLoadSummary;
  dateLabel: string;
  viewMode?: DayViewMode;
}) {
  const sortedEvents = sortEvents(events);
  const eventsByType = new Map(
    sections.map((section) => [
      section.type,
      sortedEvents.filter((event) => event.type === section.type),
    ]),
  );
  const hasEvents = events.length > 0;

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Day Plan
            </p>
            <h2 className="mt-1 text-xl font-semibold">{dateLabel}</h2>
          </div>
          <div className="max-w-sm min-w-[16rem]">
            <DayLoadIndicator summary={summary} />
          </div>
        </div>
      </section>

      {!hasEvents ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <h3 className="text-sm font-medium">Your day is open.</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a fixed event, anchor, or reset block to start planning.
          </p>
        </div>
      ) : null}

      {hasEvents && viewMode === "grouped" ? (
        <div className="grid gap-4">
          {sections.map((section) => {
            const sectionEvents = eventsByType.get(section.type) ?? [];

            return (
              <section key={section.type} className="grid gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <section.icon
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-semibold">{section.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {sectionEvents.length}{" "}
                    {sectionEvents.length === 1 ? "block" : "blocks"}
                  </span>
                </div>

                {sectionEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                    {section.type === "fixed"
                      ? "No fixed events yet."
                      : section.type === "anchor"
                        ? "No anchors scheduled for this day."
                        : "No reset blocks protecting this day yet."}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {sectionEvents.map((event) => (
                      <EventCard
                        key={`${event._id}-${event.startAt}`}
                        event={event}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : null}

      {hasEvents && viewMode === "chronological" ? (
        <section className="grid gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Chronological</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Read the day in time order from first block to last.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {sortedEvents.length}{" "}
              {sortedEvents.length === 1 ? "block" : "blocks"}
            </span>
          </div>
          <div className="grid gap-2">
            {sortedEvents.map((event) => (
              <EventCard key={`${event._id}-${event.startAt}`} event={event} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
