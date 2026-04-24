"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function ExampleChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "muted" | "highlight";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-[0.7rem] font-medium tracking-[0.08em] uppercase",
        tone === "default" && "bg-background text-foreground",
        tone === "muted" && "bg-muted/40 text-muted-foreground",
        tone === "highlight" &&
          "border-foreground/15 bg-foreground/[0.04] text-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function GoalExampleCard({
  title,
  subtitle,
  chips,
  children,
  className,
  tone = "default",
}: {
  title?: string;
  subtitle?: string;
  chips?: string[];
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted" | "highlight";
}) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border p-4 shadow-sm shadow-black/[0.02]",
        tone === "default" && "bg-background",
        tone === "muted" && "bg-muted/15",
        tone === "highlight" && "border-foreground/15 bg-foreground/[0.03]",
        className,
      )}
    >
      {chips && chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <ExampleChip key={chip} tone={tone === "highlight" ? "highlight" : "muted"}>
              {chip}
            </ExampleChip>
          ))}
        </div>
      ) : null}
      {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
      {subtitle ? (
        <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
      ) : null}
      {children}
    </div>
  );
}

export function GoalExampleList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-1.5 text-sm text-muted-foreground", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-[0.45rem] size-1 rounded-full bg-current/60" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function GoalExampleHelper({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function GoalExampleLabelValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
