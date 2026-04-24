"use client";

import { SignInButton } from "@clerk/nextjs";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import {
  AlarmClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  ListTodo,
  RotateCcw,
  Rows3,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatDayLabel,
  getDayContext,
  getEventTypeLabel,
  getTypeBadgeClassName,
  isToday,
} from "@/components/calendar/calendar-utils";
import { DayView, type DayViewMode } from "@/components/calendar/day-view";
import { EventForm } from "@/components/calendar/event-form";
import { MiniCalendar } from "@/components/calendar/mini-calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { EventType } from "@convex/events";

const scheduleTips = [
  {
    title: "Use one visible home base",
    description:
      "Keep appointments, deadlines, and time blocks here instead of splitting them across notes and memory.",
    icon: CalendarDays,
  },
  {
    title: "Plan tomorrow before distractions start",
    description:
      "Pick 1 to 3 real priorities, then turn each one into a block with a start time and clear first step.",
    icon: ListTodo,
  },
  {
    title: "Leave room for transitions",
    description:
      "ADHD-friendly days work better with buffers, reset blocks, meals, and recovery time than wall-to-wall scheduling.",
    icon: RotateCcw,
  },
  {
    title: "Use reminders to help your future self",
    description:
      "Timers, alarms, and visible cues reduce the pressure to hold the whole day in working memory.",
    icon: AlarmClock,
  },
] as const;

const exampleSchedule: Array<{
  time: string;
  title: string;
  details: string;
  type: EventType;
}> = [
  {
    time: "8:00",
    title: "Breakfast and get ready",
    details:
      "Use a steady morning anchor before the day starts pulling at you.",
    type: "anchor",
  },
  {
    time: "8:30",
    title: "Review calendar and choose top 3",
    details: "Keep the plan small so it stays followable.",
    type: "anchor",
  },
  {
    time: "9:00",
    title: "Apply to one job",
    details: "Give the hardest task a real time block while energy is higher.",
    type: "fixed",
  },
  {
    time: "9:45",
    title: "Break and transition",
    details: "Buffers protect the rest of the day when focus runs long.",
    type: "reset",
  },
  {
    time: "10:00",
    title: "Pay APS bill",
    details: "Small admin tasks work better when they have a clear start time.",
    type: "fixed",
  },
  {
    time: "10:15",
    title: "Catch-up buffer",
    details: "Leave room for spillover instead of packing every minute.",
    type: "reset",
  },
  {
    time: "11:00",
    title: "Gym",
    details: "Use a predictable anchor to reset energy and attention.",
    type: "anchor",
  },
  {
    time: "1:00",
    title: "Answer emails",
    details:
      "Save lighter admin for later instead of mixing it into deep work.",
    type: "fixed",
  },
  {
    time: "7:30",
    title: "Set up tomorrow",
    details: "A short shutdown keeps tomorrow from starting in reaction mode.",
    type: "anchor",
  },
];

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
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [dayViewMode, setDayViewMode] = useState<DayViewMode>("chronological");
  const dayContext = useMemo(() => getDayContext(selectedDate), [selectedDate]);
  const events = useQuery(api.events.listEventsByDate, dayContext);
  const summary = useQuery(api.events.getDayLoadSummary, dayContext);
  const dateLabel = formatDayLabel(selectedDate);

  function changeDay(offset: number) {
    setSelectedDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + offset);
      return nextDate;
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            One visible home base for your time
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            Calendar
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                View example
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Example Schedule</SheetTitle>
                <SheetDescription>
                  A realistic day leaves room for priorities, transitions, and
                  recovery.
                </SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto px-6 pb-6">
                <ScheduleGuidance />
              </div>
            </SheetContent>
          </Sheet>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => changeDay(-1)}
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
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
        </div>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-2">
        <Card className="rounded-lg shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>
                Pick the day first, then build the plan around it.
              </CardDescription>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <CalendarDays
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
          </CardHeader>
          <CardContent className="grid gap-4">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Form</CardTitle>
              <CardDescription>
                Put time on the day before it gets crowded.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div
              id="calendar-day-form"
              className="rounded-lg border bg-background p-3"
            >
              <EventForm key={dayContext.dateKey} defaultDate={selectedDate} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                {dayViewMode === "grouped"
                  ? "Read the day by type so it stays realistic and easy to follow."
                  : "Read the day in time order from first block to last."}
              </CardDescription>
            </div>
            <div className="flex rounded-lg border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setDayViewMode("grouped")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                  dayViewMode === "grouped"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={dayViewMode === "grouped"}
              >
                <Rows3 className="size-3.5" aria-hidden="true" />
                By type
              </button>
              <button
                type="button"
                onClick={() => setDayViewMode("chronological")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                  dayViewMode === "chronological"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={dayViewMode === "chronological"}
              >
                <List className="size-3.5" aria-hidden="true" />
                Chronological
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {events === undefined || summary === undefined ? (
              <EventsDayLoadingState />
            ) : (
              <DayView
                events={events}
                summary={summary}
                dateLabel={dateLabel}
                viewMode={dayViewMode}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ScheduleGuidance() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Build a Followable Day
        </p>
        <h2 className="text-lg font-semibold">
          The goal is not a perfect schedule.
        </h2>
        <p className="text-sm text-muted-foreground">
          A good ADHD-friendly plan stays simple, visible, and realistic when
          your energy or focus dips.
        </p>
      </div>

      <div className="grid gap-3">
        {scheduleTips.map((tip) => (
          <div
            key={tip.title}
            className="grid gap-2 rounded-lg border bg-background px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <tip.icon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold">{tip.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{tip.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 rounded-lg border border-dashed bg-background px-3 py-3">
        <p className="text-sm font-medium">Simple rule</p>
        <p className="text-sm text-muted-foreground">
          Calendar for when. Task list for what. Routine for repeats. Timer for
          starting.
        </p>
      </div>

      <div className="grid gap-2 rounded-lg border bg-background px-3 py-3">
        <p className="text-sm font-medium">A strong day usually looks like</p>
        <p className="text-sm text-muted-foreground">
          Morning anchor, a short planning block, one important work block,
          lighter admin later, a buffer for catch-up, and a quick shutdown to
          set up tomorrow.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border bg-background px-3 py-3">
        <p className="text-sm font-medium">What the labels mean</p>

        <div className="grid gap-2">
          <div className="grid gap-1 rounded-lg border bg-muted/10 px-3 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${getTypeBadgeClassName("fixed")}`}
              >
                {getEventTypeLabel("fixed")}
              </span>
              <p className="text-sm font-medium">Must-happen time block</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this for appointments, deadlines, or tasks you want to happen
              at a specific time.
            </p>
          </div>

          <div className="grid gap-1 rounded-lg border bg-muted/10 px-3 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${getTypeBadgeClassName("anchor")}`}
              >
                {getEventTypeLabel("anchor")}
              </span>
              <p className="text-sm font-medium">Stabilizing routine block</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this for routines that help the day stay on track, like meals,
              workouts, planning, or shutdown.
            </p>
          </div>

          <div className="grid gap-1 rounded-lg border bg-muted/10 px-3 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${getTypeBadgeClassName("reset")}`}
              >
                {getEventTypeLabel("reset")}
              </span>
              <p className="text-sm font-medium">Buffer or recovery block</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this for catch-up time, decompression, breaks, or transitions
              between harder parts of the day.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border bg-background px-3 py-3">
        <div className="grid gap-1">
          <p className="text-sm font-medium">Example of a well-planned day</p>
          <p className="text-sm text-muted-foreground">
            Notice the small priority list, one main work block, lighter admin
            later, and reset time between transitions.
          </p>
        </div>

        <div className="grid gap-2">
          {exampleSchedule.map((item) => (
            <div
              key={`${item.time}-${item.title}`}
              className="grid grid-cols-[4.25rem_1fr] gap-3 rounded-lg border bg-muted/10 px-3 py-3"
            >
              <span className="text-xs font-semibold text-muted-foreground">
                {item.time}
              </span>
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <span
                    className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${getTypeBadgeClassName(item.type)}`}
                  >
                    {getEventTypeLabel(item.type)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventsDayLoadingState() {
  return (
    <div className="grid gap-4">
      <div className="h-24 rounded-lg border bg-muted/20" />
      <div className="h-28 rounded-lg border bg-muted/30" />
      <div className="h-28 rounded-lg border bg-muted/20" />
      <div className="h-28 rounded-lg border bg-muted/10" />
    </div>
  );
}

function EventsLoadingState() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <section>
        <div className="h-4 w-48 rounded-md bg-muted" />
        <div className="mt-3 h-9 w-32 rounded-md bg-muted" />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="h-[44rem] rounded-lg border bg-background" />
        <div className="h-[44rem] rounded-lg border bg-background" />
      </section>
      <section>
        <div className="h-[44rem] rounded-lg border bg-background" />
      </section>
    </div>
  );
}

function UnauthenticatedEventsState() {
  return (
    <div className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col items-center justify-center rounded-lg border bg-background p-8 text-center">
      <h1 className="text-2xl font-semibold">
        Sign in to manage your calendar
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Your day plans only load after Convex has validated your Clerk session.
      </p>
      <SignInButton mode="redirect">
        <Button className="mt-6">Sign in</Button>
      </SignInButton>
    </div>
  );
}
