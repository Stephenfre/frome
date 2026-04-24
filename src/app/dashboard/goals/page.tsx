"use client";

import { SignInButton } from "@clerk/nextjs";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Goal,
  Plus,
  Rows3,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { GoalCreationFlow } from "@/components/goals/goal-creation-flow";
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

const goalsPlanningModel = [
  {
    title: "Keep goals few and concrete",
    description:
      "Run only 1-3 active goals at a time. Use specific outcomes like 'Submit 5 job applications this week' instead of vague aspirations.",
    icon: Goal,
  },
  {
    title: "Turn each goal into projects",
    description:
      "A goal is an outcome. Projects are the weekly containers that explain what this goal means in real life.",
    icon: FolderKanban,
  },
  {
    title: "Give every project one visible next action",
    description:
      "Do not let a project stay abstract. Replace 'resume' with something startable like 'rewrite Phoenix Suns bullet'.",
    icon: CheckSquare,
  },
  {
    title: "Protect important steps with time",
    description:
      "A task list holds possibilities. The calendar protects execution when a step needs real time.",
    icon: CalendarDays,
  },
] as const;

const exampleGoalBreakdowns = [
  {
    goal: "Get a new software job",
    project: "Resume refresh",
    nextAction: "Open resume doc",
    scheduledBlock: "Tuesday 10:00-10:20 AM",
  },
  {
    goal: "Pay all bills on time this month",
    project: "April finances",
    nextAction: "Call credit card company",
    scheduledBlock: "Tuesday 1:00-1:15 PM",
  },
  {
    goal: "Go to the gym 3 times a week",
    project: "Gym routine",
    nextAction: "Put gym shoes by door",
    scheduledBlock: "Wednesday 6:00 PM",
  },
] as const;

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
                  Keep goals concrete, break them down fast, and never leave the
                  next step vague.
                </SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto px-6 pb-6">
                <GoalsExampleGuidance />
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

function GoalsExampleGuidance() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-2 rounded-xl border bg-muted/15 p-4">
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Lowest-Friction Model
        </p>
        <h2 className="text-lg font-semibold">
          Goals should not stay abstract for long.
        </h2>
        <p className="text-sm text-muted-foreground">
          For ADHD planning, the best system is usually:
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="rounded-md border bg-background px-2.5 py-1">
            Goal
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded-md border bg-background px-2.5 py-1">
            Project
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded-md border bg-background px-2.5 py-1">
            Next Action
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded-md border bg-background px-2.5 py-1">
            Scheduled Block
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Never ask the brain to remember the plan. Make the plan visible, make
          the next step tiny, and give important steps a time.
        </p>
      </div>

      <div className="grid gap-3">
        {goalsPlanningModel.map((item) => (
          <div
            key={item.title}
            className="grid gap-2 rounded-lg border bg-background px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <item.icon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold">{item.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-dashed bg-muted/10 p-4">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Examples
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            What good goal breakdowns look like
          </h3>
        </div>
        <div className="grid gap-3">
          {exampleGoalBreakdowns.map((example) => (
            <div
              key={`${example.goal}-${example.project}`}
              className="grid gap-2 rounded-lg border bg-background px-4 py-3"
            >
              <div className="grid gap-1 text-sm">
                <p>
                  <span className="font-medium">Goal:</span> {example.goal}
                </p>
                <p>
                  <span className="font-medium">Project:</span>{" "}
                  {example.project}
                </p>
                <p>
                  <span className="font-medium">Next action:</span>{" "}
                  {example.nextAction}
                </p>
                <p>
                  <span className="font-medium">Scheduled block:</span>{" "}
                  {example.scheduledBlock}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-background p-4">
        <div className="flex items-center gap-2">
          <Rows3 className="size-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold">Simple rules</h3>
        </div>
        <ul className="grid gap-2 text-sm text-muted-foreground">
          <li>Only keep 1-3 active goals at a time.</li>
          <li>Every project should always have one visible next action.</li>
          <li>Make next actions small enough to start in 2-10 minutes.</li>
          <li>Use daily and weekly reviews instead of giant future piles.</li>
          <li>Schedule only the steps that need real protection.</li>
        </ul>
      </div>
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
