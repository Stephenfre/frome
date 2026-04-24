"use client";

import { useMutation } from "convex/react";
import { CalendarPlus, Save } from "lucide-react";
import { FormEvent, useCallback, useState } from "react";

import {
  addMinutes,
  buildRecurrenceRuleFromPreset,
  eventColorOptions,
  getAllowedDaysForMonth,
  getDefaultCustomRecurrenceConfig,
  getDefaultTitleForType,
  getRepeatUnitForFrequency,
  getRoundedStartDate,
  getRecurrencePresetValue,
  parseCustomRecurrenceConfig,
  recurrenceOptions,
  reminderOptions,
  repeatFrequencyOptions,
  repeatMonthOptions,
  repeatOrdinalOptions,
  repeatUnitOptions,
  weekdayOptions,
  type CustomRecurrenceConfig,
  type RepeatFrequency,
  type RepeatPatternMode,
  type WeekdayCode,
} from "@/components/calendar/calendar-utils";
import { DateTimeField } from "@/components/calendar/date-time-field";
import {
  GooglePlaceAutocomplete,
  type EventPlaceSelection,
} from "@/components/events/google-place-autocomplete";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { EventType, EventView, RecurrencePreset } from "@convex/events";

function getInitialStartAt(defaultDate?: Date, initialEvent?: EventView) {
  if (initialEvent) {
    return new Date(initialEvent.startAt);
  }

  const roundedStart = getRoundedStartDate();

  if (!defaultDate) {
    return roundedStart;
  }

  const nextDate = new Date(defaultDate);
  nextDate.setHours(roundedStart.getHours(), roundedStart.getMinutes(), 0, 0);

  return nextDate;
}

function getInitialEndAt(initialEvent?: EventView, startAt?: Date) {
  if (initialEvent?.endAt) {
    return new Date(initialEvent.endAt);
  }

  return startAt
    ? addMinutes(startAt, 30)
    : addMinutes(getRoundedStartDate(), 30);
}

function getCustomRecurrenceConfigForPreset(
  preset: RecurrencePreset,
  startAt: Date,
) {
  const config = getDefaultCustomRecurrenceConfig(startAt);

  if (preset === "daily") {
    return {
      ...config,
      frequency: "daily" as const,
      unit: "day" as const,
    };
  }

  if (preset === "weekdays") {
    return {
      ...config,
      frequency: "weekly" as const,
      unit: "week" as const,
      weeklyDays: ["MO", "TU", "WE", "TH", "FR"] as WeekdayCode[],
    };
  }

  if (preset === "monthly") {
    return {
      ...config,
      frequency: "monthly" as const,
      unit: "month" as const,
    };
  }

  return config;
}

function toggleWeekday(values: WeekdayCode[], weekday: WeekdayCode) {
  return values.includes(weekday)
    ? values.filter((value) => value !== weekday)
    : [...values, weekday];
}

function toggleMonthDay(values: number[], day: number) {
  const nextValues = values.includes(day)
    ? values.filter((value) => value !== day)
    : [...values, day];

  return nextValues.sort((left, right) => left - right);
}

export function EventForm({
  mode = "create",
  defaultDate,
  initialEvent,
  onCancel,
  onSuccess,
}: {
  mode?: "create" | "edit";
  defaultDate?: Date;
  initialEvent?: EventView;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const initialType = initialEvent?.type ?? "fixed";
  const initialStartAt = getInitialStartAt(defaultDate, initialEvent);
  const initialEndAt = getInitialEndAt(initialEvent, initialStartAt);
  const [type, setType] = useState<EventType>(initialType);
  const [title, setTitle] = useState(
    initialEvent?.title ?? getDefaultTitleForType(initialType),
  );
  const [startAt, setStartAt] = useState<Date | null>(initialStartAt);
  const [endAt, setEndAt] = useState<Date | null>(
    initialEvent?.endAt
      ? initialEndAt
      : initialType === "fixed"
        ? initialEndAt
        : null,
  );
  const [resetDurationMinutes, setResetDurationMinutes] = useState(() => {
    if (initialEvent?.endAt) {
      const duration =
        Date.parse(initialEvent.endAt) - Date.parse(initialEvent.startAt);
      return duration > 0 ? Math.round(duration / 60000) : 30;
    }

    return 30;
  });
  const [location, setLocation] = useState(initialEvent?.location ?? "");
  const [locationName, setLocationName] = useState(
    initialEvent?.locationName ?? "",
  );
  const [locationAddress, setLocationAddress] = useState(
    initialEvent?.locationAddress ?? "",
  );
  const [placeId, setPlaceId] = useState(initialEvent?.placeId ?? "");
  const [latitude, setLatitude] = useState<number | undefined>(
    initialEvent?.latitude,
  );
  const [longitude, setLongitude] = useState<number | undefined>(
    initialEvent?.longitude,
  );
  const [color, setColor] = useState(initialEvent?.color ?? "");
  const [notes, setNotes] = useState(initialEvent?.notes ?? "");
  const [placeResetKey, setPlaceResetKey] = useState(0);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<string>(
    initialEvent?.reminderMinutesBefore !== undefined
      ? String(initialEvent.reminderMinutesBefore)
      : "none",
  );
  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>(
    () =>
      initialEvent?.isRecurring
        ? getRecurrencePresetValue(initialEvent.recurrenceRule)
        : "none",
  );
  const [customRecurrenceConfig, setCustomRecurrenceConfig] =
    useState<CustomRecurrenceConfig>(() =>
      initialEvent?.isRecurring
        ? parseCustomRecurrenceConfig(
            initialEvent.recurrenceRule,
            initialStartAt,
          )
        : getDefaultCustomRecurrenceConfig(initialStartAt),
    );
  const yearlyDayOptions = getAllowedDaysForMonth(
    customRecurrenceConfig.yearlyMonth,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = mode === "edit";

  const clearPlaceSelection = useCallback(() => {
    setLocation("");
    setLocationName("");
    setLocationAddress("");
    setPlaceId("");
    setLatitude(undefined);
    setLongitude(undefined);
    setPlaceResetKey((currentValue) => currentValue + 1);
  }, []);

  const handlePlaceSelect = useCallback((place: EventPlaceSelection) => {
    setLocation(place.location);
    setLocationName(place.locationName ?? "");
    setLocationAddress(place.locationAddress ?? "");
    setPlaceId(place.placeId ?? "");
    setLatitude(place.latitude);
    setLongitude(place.longitude);
  }, []);

  function handleTypeChange(nextType: EventType) {
    setType(nextType);
    setError(null);

    if (!title.trim() || title === getDefaultTitleForType(type)) {
      setTitle(getDefaultTitleForType(nextType));
    }

    if (nextType !== "fixed") {
      clearPlaceSelection();
    }

    if (nextType === "reset" && startAt) {
      setEndAt(null);
    }

    if (nextType === "fixed" && startAt && !endAt) {
      setEndAt(addMinutes(startAt, 30));
    }
  }

  function handleRecurrencePresetChange(nextPreset: RecurrencePreset) {
    setRecurrencePreset(nextPreset);

    if (nextPreset === "custom" && startAt) {
      setCustomRecurrenceConfig(
        getCustomRecurrenceConfigForPreset(recurrencePreset, startAt),
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!startAt) {
      setError("Choose a valid start time.");
      return;
    }

    const trimmedTitle = title.trim() || getDefaultTitleForType(type);
    let nextEndAt: string | undefined;

    if (type === "reset") {
      nextEndAt = addMinutes(startAt, resetDurationMinutes).toISOString();
    } else if (endAt) {
      if (endAt <= startAt) {
        setError("End time must be after start time.");
        return;
      }

      nextEndAt = endAt.toISOString();
    }

    const recurrenceRule = buildRecurrenceRuleFromPreset({
      preset: recurrencePreset,
      startAt,
      customConfig: customRecurrenceConfig,
    });

    if (recurrencePreset !== "none" && !recurrenceRule) {
      setError(
        recurrencePreset === "custom"
          ? "Choose a valid custom repeat rule."
          : "Choose a valid recurrence rule.",
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        title: trimmedTitle,
        type,
        startAt: startAt.toISOString(),
        ...(nextEndAt ? { endAt: nextEndAt } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(color ? { color } : {}),
        ...(type === "fixed" && location.trim()
          ? {
              location: location.trim(),
              ...(locationName.trim()
                ? { locationName: locationName.trim() }
                : {}),
              ...(locationAddress.trim()
                ? { locationAddress: locationAddress.trim() }
                : {}),
              ...(placeId.trim() ? { placeId: placeId.trim() } : {}),
              ...(latitude !== undefined ? { latitude } : {}),
              ...(longitude !== undefined ? { longitude } : {}),
            }
          : {}),
        ...(reminderMinutesBefore !== "none"
          ? {
              reminderMinutesBefore: Number.parseInt(reminderMinutesBefore, 10),
            }
          : {}),
        ...(recurrencePreset !== "none" && recurrenceRule
          ? { isRecurring: true, recurrenceRule }
          : {}),
      };

      if (isEditing && initialEvent) {
        await updateEvent({
          eventId: initialEvent._id,
          ...payload,
        });
      } else {
        await createEvent(payload);
        const nextStartAt = getInitialStartAt(defaultDate);
        setTitle(getDefaultTitleForType(type));
        setStartAt(nextStartAt);
        setEndAt(type === "fixed" ? addMinutes(nextStartAt, 30) : null);
        setResetDurationMinutes(30);
        clearPlaceSelection();
        setColor("");
        setNotes("");
        setReminderMinutesBefore("none");
        setRecurrencePreset("none");
        setCustomRecurrenceConfig(
          getDefaultCustomRecurrenceConfig(nextStartAt),
        );
      }

      onSuccess?.();
    } catch {
      setError(
        isEditing
          ? "Could not save the event. Try again."
          : "Could not create the event. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <span className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Event Type
        </span>
        <div className="grid grid-cols-3 gap-2">
          {(["fixed", "anchor", "reset"] as EventType[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleTypeChange(option)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                type === option
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {option === "fixed"
                ? "Fixed"
                : option === "anchor"
                  ? "Anchor"
                  : "Reset"}
            </button>
          ))}
        </div>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Title</span>
        <input
          value={title}
          onChange={(nextEvent) => setTitle(nextEvent.target.value)}
          placeholder={
            type === "fixed"
              ? "Doctor appointment"
              : type === "anchor"
                ? "Morning anchor"
                : "Reset Block"
          }
          disabled={isSubmitting}
          className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {type === "anchor" ? "Preferred start" : "Starts"}
          </span>
          <DateTimeField
            value={startAt}
            onChange={setStartAt}
            placeholder="Pick a date"
            disabled={isSubmitting}
          />
        </label>

        {type === "reset" ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Duration
            </span>
            <select
              value={String(resetDurationMinutes)}
              onChange={(nextEvent) =>
                setResetDurationMinutes(
                  Number.parseInt(nextEvent.target.value, 10),
                )
              }
              disabled={isSubmitting}
              className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            >
              {[15, 30, 45, 60, 90].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Ends
            </span>
            <DateTimeField
              value={endAt}
              onChange={setEndAt}
              placeholder="Pick a date"
              disabled={isSubmitting}
            />
            {type === "anchor" ? (
              <button
                type="button"
                onClick={() => setEndAt(null)}
                disabled={isSubmitting || !endAt}
                className="justify-self-start text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                Clear end time
              </button>
            ) : null}
          </label>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {type === "fixed" ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Location
            </span>
            <GooglePlaceAutocomplete
              disabled={isSubmitting}
              fallbackValue={location}
              onFallbackValueChange={(value) => {
                setLocation(value);
                setLocationName("");
                setLocationAddress("");
                setPlaceId("");
                setLatitude(undefined);
                setLongitude(undefined);
              }}
              onPlaceSelect={handlePlaceSelect}
              resetKey={placeResetKey}
            />
          </label>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {type === "anchor"
              ? "Anchors work best as reliable time cues."
              : "Reset blocks protect recovery and catch-up time."}
          </div>
        )}

        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Reminder
          </span>
          <select
            value={reminderMinutesBefore}
            onChange={(nextEvent) =>
              setReminderMinutesBefore(nextEvent.target.value)
            }
            disabled={isSubmitting}
            className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
          >
            {reminderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Recurrence
        </span>
        <select
          value={recurrencePreset}
          onChange={(nextEvent) =>
            handleRecurrencePresetChange(
              nextEvent.target.value as RecurrencePreset,
            )
          }
          disabled={isSubmitting}
          className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
        >
          {recurrenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {recurrencePreset === "custom" ? (
        <div className="grid gap-4 rounded-xl border bg-muted/20 p-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Frequency
              </span>
              <select
                value={customRecurrenceConfig.frequency}
                onChange={(nextEvent) => {
                  const nextFrequency = nextEvent.target
                    .value as RepeatFrequency;

                  setCustomRecurrenceConfig((currentValue) => ({
                    ...currentValue,
                    frequency: nextFrequency,
                    unit: getRepeatUnitForFrequency(nextFrequency),
                  }));
                }}
                disabled={isSubmitting}
                className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
              >
                {repeatFrequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Every
              </span>
              <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={String(customRecurrenceConfig.interval)}
                  onChange={(nextEvent) =>
                    setCustomRecurrenceConfig((currentValue) => ({
                      ...currentValue,
                      interval: Math.max(
                        1,
                        Number.parseInt(nextEvent.target.value, 10) || 1,
                      ),
                    }))
                  }
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                />
                <select
                  value={customRecurrenceConfig.unit}
                  onChange={(nextEvent) => {
                    const nextUnit = nextEvent.target.value as
                      | "day"
                      | "week"
                      | "month"
                      | "year";
                    const nextFrequency =
                      nextUnit === "day"
                        ? "daily"
                        : nextUnit === "week"
                          ? "weekly"
                          : nextUnit === "month"
                            ? "monthly"
                            : "yearly";

                    setCustomRecurrenceConfig((currentValue) => ({
                      ...currentValue,
                      unit: nextUnit,
                      frequency: nextFrequency,
                    }));
                  }}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                >
                  {repeatUnitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Event will occur every {customRecurrenceConfig.interval}{" "}
                {customRecurrenceConfig.unit}
                {customRecurrenceConfig.interval === 1 ? "" : "s"}.
              </p>
            </label>
          </div>

          {customRecurrenceConfig.frequency === "weekly" ? (
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Repeat on
              </span>
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map((option) => {
                  const isSelected = customRecurrenceConfig.weeklyDays.includes(
                    option.value,
                  );

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setCustomRecurrenceConfig((currentValue) => ({
                          ...currentValue,
                          weeklyDays: toggleWeekday(
                            currentValue.weeklyDays,
                            option.value,
                          ),
                        }))
                      }
                      disabled={isSubmitting}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {customRecurrenceConfig.frequency === "monthly" ? (
            <div className="grid gap-3">
              <div className="flex rounded-lg border bg-background p-1">
                {(["each", "onThe"] as RepeatPatternMode[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setCustomRecurrenceConfig((currentValue) => ({
                        ...currentValue,
                        monthlyMode: option,
                      }))
                    }
                    disabled={isSubmitting}
                    className={cn(
                      "h-8 flex-1 rounded-md px-3 text-sm font-medium transition-colors",
                      customRecurrenceConfig.monthlyMode === option
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option === "each" ? "Each" : "On the"}
                  </button>
                ))}
              </div>

              {customRecurrenceConfig.monthlyMode === "each" ? (
                <div className="grid gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Days of the month
                  </span>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 31 }, (_, index) => index + 1).map(
                      (day) => {
                        const isSelected =
                          customRecurrenceConfig.monthlyDays.includes(day);

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              setCustomRecurrenceConfig((currentValue) => ({
                                ...currentValue,
                                monthlyDays: toggleMonthDay(
                                  currentValue.monthlyDays,
                                  day,
                                ),
                              }))
                            }
                            disabled={isSubmitting}
                            className={cn(
                              "h-9 rounded-lg border text-sm font-medium transition-colors",
                              isSelected
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {day}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Occurrence
                    </span>
                    <select
                      value={customRecurrenceConfig.monthlyOrdinal}
                      onChange={(nextEvent) =>
                        setCustomRecurrenceConfig((currentValue) => ({
                          ...currentValue,
                          monthlyOrdinal: nextEvent.target.value as
                            | "1"
                            | "2"
                            | "3"
                            | "4"
                            | "5"
                            | "-2"
                            | "-1",
                        }))
                      }
                      disabled={isSubmitting}
                      className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                    >
                      {repeatOrdinalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Weekday
                    </span>
                    <select
                      value={customRecurrenceConfig.monthlyWeekday}
                      onChange={(nextEvent) =>
                        setCustomRecurrenceConfig((currentValue) => ({
                          ...currentValue,
                          monthlyWeekday: nextEvent.target.value as WeekdayCode,
                        }))
                      }
                      disabled={isSubmitting}
                      className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                    >
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          ) : null}

          {customRecurrenceConfig.frequency === "yearly" ? (
            <div className="grid gap-3">
              <label className="grid gap-1.5 sm:max-w-xs">
                <span className="text-xs font-medium text-muted-foreground">
                  Month
                </span>
                <select
                  value={String(customRecurrenceConfig.yearlyMonth)}
                  onChange={(nextEvent) => {
                    const nextMonth = Number.parseInt(
                      nextEvent.target.value,
                      10,
                    );

                    setCustomRecurrenceConfig((currentValue) => ({
                      ...currentValue,
                      yearlyMonth: nextMonth,
                      yearlyDays: currentValue.yearlyDays.filter((day) =>
                        getAllowedDaysForMonth(nextMonth).includes(day),
                      ),
                    }));
                  }}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                >
                  {repeatMonthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex rounded-lg border bg-background p-1">
                {(["each", "onThe"] as RepeatPatternMode[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setCustomRecurrenceConfig((currentValue) => ({
                        ...currentValue,
                        yearlyMode: option,
                      }))
                    }
                    disabled={isSubmitting}
                    className={cn(
                      "h-8 flex-1 rounded-md px-3 text-sm font-medium transition-colors",
                      customRecurrenceConfig.yearlyMode === option
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option === "each" ? "Each" : "On the"}
                  </button>
                ))}
              </div>

              {customRecurrenceConfig.yearlyMode === "each" ? (
                <div className="grid gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Days in{" "}
                    {
                      repeatMonthOptions[customRecurrenceConfig.yearlyMonth - 1]
                        ?.label
                    }
                  </span>
                  <div className="grid grid-cols-7 gap-2">
                    {yearlyDayOptions.map((day) => {
                      const isSelected =
                        customRecurrenceConfig.yearlyDays.includes(day);

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setCustomRecurrenceConfig((currentValue) => ({
                              ...currentValue,
                              yearlyDays: toggleMonthDay(
                                currentValue.yearlyDays,
                                day,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                          className={cn(
                            "h-9 rounded-lg border text-sm font-medium transition-colors",
                            isSelected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Occurrence
                    </span>
                    <select
                      value={customRecurrenceConfig.yearlyOrdinal}
                      onChange={(nextEvent) =>
                        setCustomRecurrenceConfig((currentValue) => ({
                          ...currentValue,
                          yearlyOrdinal: nextEvent.target.value as
                            | "1"
                            | "2"
                            | "3"
                            | "4"
                            | "5"
                            | "-2"
                            | "-1",
                        }))
                      }
                      disabled={isSubmitting}
                      className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                    >
                      {repeatOrdinalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Weekday
                    </span>
                    <select
                      value={customRecurrenceConfig.yearlyWeekday}
                      onChange={(nextEvent) =>
                        setCustomRecurrenceConfig((currentValue) => ({
                          ...currentValue,
                          yearlyWeekday: nextEvent.target.value as WeekdayCode,
                        }))
                      }
                      disabled={isSubmitting}
                      className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                    >
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Notes</span>
        <textarea
          value={notes}
          onChange={(nextEvent) => setNotes(nextEvent.target.value)}
          placeholder="Anything that will make this easier to follow."
          disabled={isSubmitting}
          rows={3}
          className="rounded-lg border bg-background px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
      </label>
      <div className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">Color</span>
        <div className="flex flex-wrap items-center gap-2">
          {eventColorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColor(option.value)}
              aria-label={`Use ${option.label} color`}
              aria-pressed={color === option.value}
              className={cn(
                "size-7 rounded-full border-2 transition-transform hover:scale-105",
                color === option.value ? "border-foreground" : "border-border",
              )}
              style={{ backgroundColor: option.value }}
            />
          ))}
          <label className="inline-flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
            Custom
            <input
              type="color"
              value={color || "#0ea5e9"}
              onChange={(nextEvent) => setColor(nextEvent.target.value)}
              disabled={isSubmitting}
              className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
          <button
            type="button"
            onClick={() => setColor("")}
            disabled={isSubmitting || !color}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Clear
          </button>
        </div>
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
          <Button type="submit" disabled={isSubmitting || !startAt}>
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
