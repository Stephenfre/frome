"use client";

import { GoalCard } from "@/components/goals/goal-card";
import type { GoalView } from "@convex/goals";

export function GoalsList({
  title,
  description,
  goals,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  goals: GoalView[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <h3 className="text-sm font-medium">{emptyTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal._id} goal={goal} />
          ))}
        </div>
      )}
    </section>
  );
}
