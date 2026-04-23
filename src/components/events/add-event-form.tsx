"use client";

import { useMutation } from "convex/react";
import { CalendarPlus, Save } from "lucide-react";
import { FormEvent, useCallback, useState } from "react";
import DatePicker from "react-datepicker";

import {
  GooglePlaceAutocomplete,
  type EventPlaceSelection,
} from "@/components/events/google-place-autocomplete";
import {
  addMinutes,
  getRoundedStartDate,
} from "@/components/events/event-utils";
import { Button } from "@/components/ui/button";
import { api } from "@convex/_generated/api";
import type { EventView } from "@convex/events";

function getInitialLocation(event?: EventView) {
  return event?.location ?? event?.locationName ?? "";
}

function getInitialPlaceSelection(
  event?: EventView,
): EventPlaceSelection | null {
  const location = getInitialLocation(event);

  if (!event || !location) {
    return null;
  }

  return {
    location,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    placeId: event.placeId,
    latitude: event.latitude,
    longitude: event.longitude,
  };
}

export function AddEventForm({
  mode = "create",
  initialEvent,
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
  onCancel,
  onSuccess,
  locationInputMode = "autocomplete",
}: {
  mode?: "create" | "edit";
  initialEvent?: EventView;
  startsAt?: Date | null;
  endsAt?: Date | null;
  onStartsAtChange?: (date: Date | null) => void;
  onEndsAtChange?: (date: Date | null) => void;
  onCancel?: () => void;
  onSuccess?: () => void;
  locationInputMode?: "autocomplete" | "text";
}) {
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const [internalStartsAt, setInternalStartsAt] = useState<Date | null>(() =>
    initialEvent ? new Date(initialEvent.startsAt) : getRoundedStartDate(),
  );
  const [internalEndsAt, setInternalEndsAt] = useState<Date | null>(() =>
    initialEvent?.endsAt
      ? new Date(initialEvent.endsAt)
      : initialEvent
        ? null
        : addMinutes(getRoundedStartDate(), 30),
  );
  const resolvedStartsAt = startsAt ?? internalStartsAt;
  const resolvedEndsAt = endsAt ?? internalEndsAt;
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [location, setLocation] = useState(() =>
    getInitialLocation(initialEvent),
  );
  const [selectedPlace, setSelectedPlace] =
    useState<EventPlaceSelection | null>(() =>
      getInitialPlaceSelection(initialEvent),
    );
  const [locationResetKey, setLocationResetKey] = useState(0);
  const [notes, setNotes] = useState(initialEvent?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = mode === "edit";
  const locationMatchesInitialEvent =
    Boolean(initialEvent) &&
    location.trim() === getInitialLocation(initialEvent).trim();

  function updateStartsAt(date: Date | null) {
    onStartsAtChange?.(date);
    if (onStartsAtChange === undefined) {
      setInternalStartsAt(date);
    }
  }

  function updateEndsAt(date: Date | null) {
    onEndsAtChange?.(date);
    if (onEndsAtChange === undefined) {
      setInternalEndsAt(date);
    }
  }

  function handleStartChange(date: Date | null) {
    updateStartsAt(date);

    if (date && (!resolvedEndsAt || resolvedEndsAt <= date)) {
      updateEndsAt(addMinutes(date, 30));
    }
  }

  const handlePlaceSelect = useCallback((place: EventPlaceSelection) => {
    setSelectedPlace(place);
    setLocation(place.location);
  }, []);

  const handleLocationChange = useCallback((value: string) => {
    setLocation(value);
    setSelectedPlace(null);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Add an event title.");
      return;
    }

    if (!resolvedStartsAt) {
      setError("Choose a valid start time.");
      return;
    }

    if (resolvedEndsAt && resolvedEndsAt <= resolvedStartsAt) {
      setError("End time must be after start time.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const eventPayload = {
        title: trimmedTitle,
        startsAt: resolvedStartsAt.toISOString(),
        endsAt: resolvedEndsAt?.toISOString(),
        location: selectedPlace?.location ?? (location.trim() || undefined),
        locationName:
          selectedPlace?.locationName ??
          (isEditing && locationMatchesInitialEvent
            ? initialEvent?.locationName
            : undefined),
        locationAddress:
          selectedPlace?.locationAddress ??
          (isEditing && locationMatchesInitialEvent
            ? initialEvent?.locationAddress
            : undefined),
        placeId:
          selectedPlace?.placeId ??
          (isEditing && locationMatchesInitialEvent
            ? initialEvent?.placeId
            : undefined),
        latitude:
          selectedPlace?.latitude ??
          (isEditing && locationMatchesInitialEvent
            ? initialEvent?.latitude
            : undefined),
        longitude:
          selectedPlace?.longitude ??
          (isEditing && locationMatchesInitialEvent
            ? initialEvent?.longitude
            : undefined),
        notes: notes.trim() || undefined,
      };

      if (isEditing && initialEvent) {
        await updateEvent({
          eventId: initialEvent._id,
          ...eventPayload,
        });
      } else {
        await createEvent(eventPayload);
      }

      if (isEditing) {
        onSuccess?.();
      } else {
        const nextStart = getRoundedStartDate();
        setTitle("");
        updateStartsAt(nextStart);
        updateEndsAt(addMinutes(nextStart, 30));
        setLocation("");
        setSelectedPlace(null);
        setLocationResetKey((key) => key + 1);
        setNotes("");
        onSuccess?.();
      }
    } catch {
      setError(
        isEditing
          ? "Could not save the event. Try again."
          : "Could not add the event. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Event</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Doctor appointment"
          disabled={isSubmitting}
          className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Starts
          </span>
          <DatePicker
            selected={resolvedStartsAt}
            onChange={handleStartChange}
            showTimeSelect
            timeIntervals={15}
            dateFormat="MMM d, h:mm aa"
            calendarClassName="forme-datepicker"
            wrapperClassName="w-full"
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            disabled={isSubmitting}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Ends
          </span>
          <DatePicker
            selected={resolvedEndsAt}
            onChange={(date: Date | null) => updateEndsAt(date)}
            showTimeSelect
            timeIntervals={15}
            dateFormat="MMM d, h:mm aa"
            calendarClassName="forme-datepicker"
            wrapperClassName="w-full"
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            disabled={isSubmitting}
            isClearable
            minDate={resolvedStartsAt ?? undefined}
            placeholderText="Optional"
          />
        </label>
      </div>

      <div className="grid min-w-0 items-start gap-2 sm:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Location
          </span>
          {locationInputMode === "autocomplete" ? (
            <GooglePlaceAutocomplete
              disabled={isSubmitting}
              fallbackValue={location}
              onFallbackValueChange={handleLocationChange}
              onPlaceSelect={handlePlaceSelect}
              resetKey={locationResetKey}
            />
          ) : (
            <input
              value={location}
              onChange={(event) => handleLocationChange(event.target.value)}
              placeholder="Office"
              disabled={isSubmitting}
              className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
            />
          )}
        </div>

        <label className="grid min-w-0 gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Notes
          </span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Bring paperwork"
            disabled={isSubmitting}
            className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="min-h-5 text-xs text-destructive">{error}</p>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
            {isEditing ? (
              <Save className="size-4" aria-hidden="true" />
            ) : (
              <CalendarPlus className="size-4" aria-hidden="true" />
            )}
            {isSubmitting
              ? isEditing
                ? "Saving..."
                : "Adding..."
              : isEditing
                ? "Save event"
                : "Add event"}
          </Button>
        </div>
      </div>
    </form>
  );
}
