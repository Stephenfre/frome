"use client";

import { CalendarDays } from "lucide-react";
import { format } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function applyTime(date: Date, timeValue: string) {
  const [hours, minutes] = timeValue
    .split(":")
    .map((value) => Number.parseInt(value, 10));
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

function formatTimeValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

export function DateTimeField({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem]">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-9 justify-start px-3 text-left font-normal",
              !value && "text-muted-foreground",
            )}
            disabled={disabled}
          >
            <CalendarDays className="mr-2 size-4" aria-hidden="true" />
            {value ? format(value, "MMM d, yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={(nextDate) => {
              if (!nextDate) {
                return;
              }

              if (value) {
                const nextValue = new Date(nextDate);
                nextValue.setHours(
                  value.getHours(),
                  value.getMinutes(),
                  value.getSeconds(),
                  value.getMilliseconds(),
                );
                onChange(nextValue);
                return;
              }

              onChange(nextDate);
            }}
          />
        </PopoverContent>
      </Popover>

      <input
        type="time"
        step={900}
        value={formatTimeValue(value)}
        onChange={(event) => {
          if (!value) {
            return;
          }

          onChange(applyTime(value, event.target.value));
        }}
        disabled={disabled || !value}
        className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/20 disabled:opacity-50"
      />
    </div>
  );
}
