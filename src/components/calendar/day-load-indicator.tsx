"use client";

import type { DayLoadSummary } from "@convex/events";

import {
  getDayLoadClassName,
  getDayLoadFill,
  getDayLoadTrackClassName,
} from "@/components/calendar/calendar-utils";
import { cn } from "@/lib/utils";

export function DayLoadIndicator({
  summary,
  compact = false,
}: {
  summary: DayLoadSummary;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Day Load
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
                getDayLoadClassName(summary.level),
              )}
            >
              {summary.level}
            </span>
            {!compact ? (
              <span className="text-xs text-muted-foreground">
                {summary.totalBlocks} blocks ·{" "}
                {Math.round(summary.totalMinutes / 60)}h
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            getDayLoadTrackClassName(summary.level),
            getDayLoadFill(summary),
          )}
        />
      </div>

      {!compact && summary.message ? (
        <p className="text-xs text-muted-foreground">{summary.message}</p>
      ) : null}
    </div>
  );
}
