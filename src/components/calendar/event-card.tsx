"use client";

import { useMutation } from "convex/react";
import {
  Bell,
  ChevronDown,
  MapPin,
  Pencil,
  Repeat2,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  formatEventTimeRange,
  getEventTypeLabel,
  getRecurrenceLabel,
  getReminderLabel,
  getTypeBadgeClassName,
  getTypeCardClassName,
} from "@/components/calendar/calendar-utils";
import { EventForm } from "@/components/calendar/event-form";
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
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { EventView } from "@convex/events";

export function EventCard({ event }: { event: EventView }) {
  const deleteEvent = useMutation(api.events.deleteEvent);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDetails = Boolean(
    event.notes || event.location || event.reminderMinutesBefore !== undefined,
  );
  const eventEndTime = Date.parse(event.endAt ?? event.startAt);
  const isPast = !Number.isNaN(eventEndTime) && eventEndTime <= Date.now();

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

  const recurrenceLabel = getRecurrenceLabel(event.recurrenceRule);
  const reminderLabel = getReminderLabel(event.reminderMinutesBefore);

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-3 transition-colors",
        getTypeCardClassName(event.type),
        isPast && "border-border/60 bg-muted/30",
      )}
      style={
        event.color
          ? {
              borderLeftWidth: "4px",
              borderLeftColor: event.color,
            }
          : undefined
      }
    >
      {isEditing ? (
        <EventForm
          mode="edit"
          initialEvent={event}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => setIsEditing(false)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
          <button
            type="button"
            onClick={() => {
              if (!hasDetails) {
                return;
              }

              setIsExpanded((value) => !value);
            }}
            className={cn(
              "grid min-w-0 gap-2 text-left",
              hasDetails && "cursor-pointer",
            )}
            aria-expanded={hasDetails ? isExpanded : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  {event.color ? (
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: event.color }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
                      getTypeBadgeClassName(event.type),
                    )}
                  >
                    {getEventTypeLabel(event.type)}
                  </span>
                  {event.isRecurring && recurrenceLabel ? (
                    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background/80 px-2 text-xs font-medium text-muted-foreground">
                      <Repeat2 className="size-3" aria-hidden="true" />
                      {recurrenceLabel}
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "text-base font-medium",
                    isPast && "text-muted-foreground line-through",
                  )}
                >
                  {event.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatEventTimeRange(event)}</span>
                  {event.location ? (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="size-3" aria-hidden="true" />
                      <span className="truncate">{event.location}</span>
                    </span>
                  ) : null}
                </div>
              </div>
              {hasDetails ? (
                <ChevronDown
                  className={cn(
                    "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          </button>

          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null);
                setIsEditing(true);
              }}
              disabled={isDeleting}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Delete &quot;{event.title}&quot;? This can&apos;t be undone.
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
      )}

      {!isEditing && isExpanded ? (
        <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 text-sm">
          {event.notes ? (
            <div className="grid gap-1">
              <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-foreground/90">
                {event.notes}
              </p>
            </div>
          ) : null}

          {reminderLabel ? (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Bell className="size-3.5" aria-hidden="true" />
              {reminderLabel}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
