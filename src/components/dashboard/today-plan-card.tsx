"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  formatDayLabel,
  getDayContext,
  getEventTypeLabel,
  getTypeBadgeClassName,
  isToday,
  sortEvents,
} from "@/components/calendar/calendar-utils";
import { DayLoadIndicator } from "@/components/calendar/day-load-indicator";
import { EventForm } from "@/components/calendar/event-form";
import { Badge } from "@/components/shared/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { EventView } from "@convex/events";

export function TodayPlanCard() {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dayContext = useMemo(() => getDayContext(selectedDate), [selectedDate]);
  const events = useQuery(api.events.listTodayEvents, dayContext);
  const summary = useQuery(api.events.getDayLoadSummary, dayContext);
  const selectedDateLabel = formatDayLabel(selectedDate);
  const sortedEvents = sortEvents(events ?? []);

  function changeDay(offset: number) {
    setSelectedDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + offset);
      return nextDate;
    });
  }

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Today Plan</CardTitle>
          <CardDescription>{selectedDateLabel}</CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => changeDay(-1)}
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday(selectedDate)}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => changeDay(1)}
          >
            Next
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant={isFormVisible ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsFormVisible((value) => !value)}
            aria-expanded={isFormVisible}
            aria-controls="today-plan-form"
          >
            {isFormVisible ? (
              <X className="size-3.5" aria-hidden="true" />
            ) : (
              <Plus className="size-3.5" aria-hidden="true" />
            )}
            {isFormVisible ? "Hide form" : "Quick add"}
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
        {summary ? (
          <DayLoadIndicator summary={summary} compact />
        ) : (
          <PlanLoadingStrip />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            {summary ? `${summary.fixedCount} fixed` : "Loading fixed"}
          </Badge>
          <Badge>
            {summary ? `${summary.anchorCount} anchors` : "Loading anchors"}
          </Badge>
          <Badge>
            {summary ? `${summary.resetCount} reset` : "Loading reset"}
          </Badge>
        </div>

        {summary?.message ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {summary.message}
          </div>
        ) : null}

        {isFormVisible ? (
          <div
            id="today-plan-form"
            className="rounded-lg border bg-muted/10 p-3"
          >
            <EventForm
              defaultDate={selectedDate}
              onSuccess={() => setIsFormVisible(true)}
            />
          </div>
        ) : null}

        {events === undefined ? (
          <PlanLoadingState />
        ) : sortedEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
            <h3 className="text-sm font-medium">Your day is open.</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a fixed event, anchor, or reset block to start planning.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <List
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">Chronological</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {sortedEvents.length}{" "}
                {sortedEvents.length === 1 ? "event" : "events"}
              </span>
            </div>
            <div className="grid gap-2">
              {sortedEvents.slice(0, 9).map((event) => (
                <TodayPlanEventRow
                  key={`${event._id}-${event.startAt}`}
                  event={event}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/events">
              Open calendar
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TodayPlanEventRow({ event }: { event: EventView }) {
  const deleteEvent = useMutation(api.events.deleteEvent);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventEndTime = Date.parse(event.endAt ?? event.startAt);
  const isPast = !Number.isNaN(eventEndTime) && eventEndTime <= Date.now();
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(event.startAt));

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await deleteEvent({ eventId: event._id });
    } catch {
      setError("Could not delete the event. Try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      {isEditing ? (
        <div className="grid gap-3">
          <EventForm
            mode="edit"
            initialEvent={event}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-[4.25rem_1fr] gap-3">
          <span className="text-xs font-semibold text-muted-foreground">
            {timeLabel}
          </span>
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {event.color ? (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm font-medium",
                      isPast && "text-muted-foreground line-through",
                    )}
                  >
                    {event.title}
                  </p>
                  <span
                    className={cn(
                      "inline-flex h-5 shrink-0 items-center rounded-md border px-1.5 text-[0.7rem] font-medium",
                      getTypeBadgeClassName(event.type),
                    )}
                  >
                    {getEventTypeLabel(event.type)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {event.location ?? event.notes ?? "No extra details"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setError(null);
                    setIsEditing(true);
                  }}
                  disabled={isDeleting}
                  aria-label={`Edit ${event.title}`}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isDeleting}
                      aria-label={`Delete ${event.title}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete event?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete &quot;{event.title}&quot;? This can&apos;t be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanLoadingStrip() {
  return <div className="h-14 rounded-lg border bg-muted/30" />;
}

function PlanLoadingState() {
  return (
    <div className="grid gap-2">
      <div className="h-14 rounded-lg border bg-muted/40" />
      <div className="h-14 rounded-lg border bg-muted/30" />
      <div className="h-14 rounded-lg border bg-muted/20" />
    </div>
  );
}
