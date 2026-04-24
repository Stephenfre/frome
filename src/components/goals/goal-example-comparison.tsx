"use client";

import { GoalExampleCard, GoalExampleLabelValue, GoalExampleList } from "@/components/goals/goal-example-card";

export function GoalExampleComparison({
  before,
  better,
  whyItWorks,
}: {
  before: string;
  better: string;
  whyItWorks: string[];
}) {
  return (
    <GoalExampleCard
      title="Before / Better"
      subtitle="Tighten the goal until the finish line is obvious."
      chips={["Goal"]}
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <div className="grid gap-3 rounded-lg border bg-muted/10 p-3">
          <GoalExampleLabelValue label="Before" value={before} />
        </div>
        <div className="hidden items-center justify-center text-sm text-muted-foreground lg:flex">
          →
        </div>
        <div className="grid gap-3 rounded-lg border border-foreground/15 bg-foreground/[0.03] p-3">
          <GoalExampleLabelValue label="Better" value={better} />
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Why this works
        </p>
        <GoalExampleList items={whyItWorks} />
      </div>
    </GoalExampleCard>
  );
}
