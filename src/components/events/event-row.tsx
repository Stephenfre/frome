"use client";

import { useMutation } from "convex/react";
import { ChevronDown, MapPin, Pencil, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";

import { AddEventForm } from "@/components/events/add-event-form";
import { formatEventTimeRange } from "@/components/events/event-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { EventView } from "@convex/events";

export function EventRow({ event }: { event: EventView }) {
  const deleteEvent = useMutation(api.events.deleteEvent);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locationLabel = event.locationName ?? event.location;
  const addressLabel =
    event.locationAddress && event.locationAddress !== locationLabel
      ? event.locationAddress
      : null;
  const hasExpandableDetails = Boolean(addressLabel || event.notes);
  const eventEndTime = Date.parse(event.endsAt ?? event.startsAt);
  const isOver = !Number.isNaN(eventEndTime) && eventEndTime <= Date.now();

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    const isConfirmed = window.confirm(`Delete "${event.title}"?`);

    if (!isConfirmed) {
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
    <div
      className={cn(
        "rounded-lg border bg-background px-3 py-2.5 transition-colors",
        isEditing && "bg-muted/10",
        isOver && "border-border/60 bg-muted/25",
      )}
    >
      {isEditing ? (
        <AddEventForm
          mode="edit"
          initialEvent={event}
          locationInputMode="text"
          onCancel={() => {
            setIsEditing(false);
          }}
          onSuccess={() => {
            setIsEditing(false);
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
          <button
            type="button"
            onClick={() => {
              if (!hasExpandableDetails) {
                return;
              }

              setIsExpanded((value) => !value);
            }}
            className={cn(
              "grid min-w-0 gap-2 rounded-md text-left transition-colors",
              hasExpandableDetails && "cursor-pointer",
            )}
            aria-expanded={hasExpandableDetails ? isExpanded : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <time className="text-xs font-semibold text-muted-foreground">
                  {formatEventTimeRange(event)}
                </time>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isOver && "text-muted-foreground line-through",
                  )}
                >
                  {event.title}
                </p>
              </div>
              {hasExpandableDetails ? (
                <ChevronDown
                  className={cn(
                    "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>

            {locationLabel ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{locationLabel}</span>
              </span>
            ) : null}

            {!isExpanded && event.notes ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <StickyNote className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{event.notes}</span>
              </span>
            ) : null}
          </button>

          <div className="flex items-center justify-end gap-1 sm:pt-0.5">
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
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      )}
      {!isEditing && isExpanded ? (
        <div className="mt-3 grid gap-2 border-t pt-3 text-xs text-muted-foreground">
          {addressLabel ? (
            <div className="grid gap-1">
              <span className="font-medium text-foreground">Address</span>
              <p>{addressLabel}</p>
            </div>
          ) : null}
          {event.notes ? (
            <div className="grid gap-1">
              <span className="font-medium text-foreground">Notes</span>
              <p className="whitespace-pre-wrap">{event.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
