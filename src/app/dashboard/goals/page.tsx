"use client";

import { SignInButton } from "@clerk/nextjs";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { Goal, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { GoalCreationFlow } from "@/components/goals/goal-creation-flow";
import { GoalExampleTabs } from "@/components/goals/goal-example-tabs";
import { GoalsList } from "@/components/goals/goals-list";
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
import { api } from "@convex/_generated/api";

export default function GoalsPage() {
  return (
    <>
      <Authenticated>
        <AuthenticatedGoalsPage />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedGoalsState />
      </Unauthenticated>
      <AuthLoading>
        <GoalsPageLoadingState />
      </AuthLoading>
    </>
  );
}

function AuthenticatedGoalsPage() {
  const goals = useQuery(api.goals.listGoals);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const activeGoals = useMemo(
    () => (goals ?? []).filter((goal) => goal.status === "active"),
    [goals],
  );
  const archivedGoals = useMemo(
    () => (goals ?? []).filter((goal) => goal.status !== "active"),
    [goals],
  );

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Goal → Project → Next Action → Scheduled Block
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Goals</h1>
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
                <SheetTitle>How to Create Goals</SheetTitle>
                <SheetDescription>
                  Example-first walkthrough for turning a vague goal into a clear
                  plan you can actually follow.
                </SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto px-6 pb-6">
                <GoalExampleTabs />
              </div>
            </SheetContent>
          </Sheet>
          <Button
            type="button"
            variant={isFormVisible ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsFormVisible((value) => !value)}
            aria-expanded={isFormVisible}
            aria-controls="goal-create-form"
          >
            {isFormVisible ? (
              <X className="size-3.5" aria-hidden="true" />
            ) : (
              <Plus className="size-3.5" aria-hidden="true" />
            )}
            {isFormVisible ? "Hide form" : "Create goal"}
          </Button>
        </div>
      </section>

      {isFormVisible ? (
        <Card className="rounded-lg shadow-none" id="goal-create-form">
          <CardHeader>
            <CardTitle>Set Up a Goal</CardTitle>
            <CardDescription>
              Move from outcome to project to next action before the plan gets
              fuzzy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoalCreationFlow
              onCancel={() => setIsFormVisible(false)}
              onComplete={() => setIsFormVisible(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      {goals === undefined ? (
        <GoalsLoadingSections />
      ) : (
        <div className="grid gap-8">
          <GoalsList
            title="Active Goals"
            description="Keep the active list short so it stays visible and followable."
            goals={activeGoals}
            emptyTitle="No active goals yet."
            emptyDescription="Start with 1-3 concrete goals."
          />
          <GoalsList
            title="Paused & Archived"
            description="Store goals here when they are no longer in the current horizon."
            goals={archivedGoals}
            emptyTitle="Nothing paused or archived."
            emptyDescription="Pause or archive goals instead of letting them stay vague and active."
          />
        </div>
      )}
    </div>
  );
}

function GoalsLoadingSections() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-lg border bg-background" />
        <div className="h-56 rounded-lg border bg-background" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-40 rounded-lg border bg-background" />
        <div className="h-40 rounded-lg border bg-background" />
      </div>
    </div>
  );
}

function GoalsPageLoadingState() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <section>
        <div className="h-4 w-52 rounded-md bg-muted" />
        <div className="mt-3 h-9 w-56 rounded-md bg-muted" />
      </section>
      <div className="h-48 rounded-lg border bg-background" />
      <GoalsLoadingSections />
    </div>
  );
}

function UnauthenticatedGoalsState() {
  return (
    <div className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col items-center justify-center rounded-lg border bg-background p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Goal className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold">Sign in to manage goals</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Keep only a few active goals, break them into projects, and always know
        the next visible step.
      </p>
      <SignInButton mode="redirect">
        <Button className="mt-6">Sign in</Button>
      </SignInButton>
    </div>
  );
}
