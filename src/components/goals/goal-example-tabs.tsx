"use client";

import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Goal,
  Sparkles,
} from "lucide-react";

import {
  GoalExampleCard,
  GoalExampleHelper,
  GoalExampleLabelValue,
  GoalExampleList,
} from "@/components/goals/goal-example-card";
import { GoalExampleComparison } from "@/components/goals/goal-example-comparison";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const walkthroughTabs = [
  {
    value: "goal",
    label: "Goal",
    title: "Start with the goal",
    subtitle: "Write what you want to accomplish this week.",
    helper: "Good goals are specific enough to measure.",
    icon: Goal,
  },
  {
    value: "concrete",
    label: "Make it concrete",
    title: "Make it concrete",
    subtitle: "Add a number, a deadline, and a clear definition of done.",
    helper: "The clearer the goal, the easier it is to follow through.",
    icon: Sparkles,
  },
  {
    value: "project",
    label: "Project",
    title: "Turn the goal into a project",
    subtitle: "A goal is the outcome. A project is the container for the steps.",
    helper: "Most goals only need one simple project to get started.",
    icon: FolderKanban,
  },
  {
    value: "actions",
    label: "Next actions",
    title: "Add small next actions",
    subtitle: "Make each step easy to start. Think visible, specific, and small.",
    helper: "If you can start it in a few minutes, it’s probably the right size.",
    icon: CheckSquare,
  },
  {
    value: "calendar",
    label: "Calendar blocks",
    title: "Put the plan on your calendar",
    subtitle: "A task list holds possibilities. A calendar protects execution.",
    helper:
      "Give important steps a time so you do not have to remember them later.",
    icon: CalendarDays,
  },
  {
    value: "best",
    label: "Best version",
    title: "Best ADHD-friendly version",
    subtitle: "Here’s what the final version can look like in ForMe.",
    helper: "Start with the smallest step that moves the plan forward.",
    icon: Sparkles,
  },
] as const;

const planningSteps = [
  "Check this week’s calendar",
  "Pick 5 gym time slots",
  "Add all 5 gym sessions to calendar",
  "Set reminders for each session",
];

const prepSteps = [
  "Put gym shoes by door",
  "Pack gym bag",
  "Fill water bottle",
  "Choose workout for tomorrow",
];

const executionSteps = [
  "Go to gym Monday",
  "Go to gym Tuesday",
  "Go to gym Thursday",
  "Go to gym Saturday",
  "Go to gym Sunday",
];

const smallerSteps = [
  "Put on gym clothes",
  "Get in car",
  "Drive to gym",
  "Start first exercise",
];

const scheduleBlocks = [
  "Monday 6:00–7:00 PM — Gym",
  "Tuesday 6:00–7:00 PM — Gym",
  "Thursday 6:00–7:00 PM — Gym",
  "Saturday 10:00–11:00 AM — Gym",
  "Sunday 10:00–11:00 AM — Gym",
];

const reminderCues = [
  "30 min before: change clothes",
  "10 min before: grab keys and bag",
];

const finalNextActions = [
  "Check calendar for open workout times",
  "Schedule 5 gym blocks",
  "Pack gym bag tonight",
  "Lay out gym clothes",
  "Go to first scheduled gym session",
];

export function GoalExampleTabs() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-2xl border bg-muted/10 p-5 shadow-sm shadow-black/[0.02]">
        <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          <span className="inline-flex h-6 items-center rounded-full border bg-background px-2.5">
            Goal
          </span>
          <span>→</span>
          <span className="inline-flex h-6 items-center rounded-full border bg-background px-2.5">
            Project
          </span>
          <span>→</span>
          <span className="inline-flex h-6 items-center rounded-full border bg-background px-2.5">
            Next action
          </span>
          <span>→</span>
          <span className="inline-flex h-6 items-center rounded-full border bg-background px-2.5">
            Calendar
          </span>
        </div>
        <div className="grid gap-1.5">
          <h2 className="text-lg font-semibold">Build one example all the way through</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            The point is not to write a perfect plan. The point is to make the next
            step obvious enough to follow.
          </p>
        </div>
      </div>

      <Tabs defaultValue="goal" className="grid gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1.5">
          {walkthroughTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="min-w-0 gap-1.5 rounded-lg px-3 py-2"
            >
              <tab.icon className="size-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="goal" className="grid gap-4">
          <SlideHeader
            title={walkthroughTabs[0].title}
            subtitle={walkthroughTabs[0].subtitle}
          />
          <GoalExampleCard title="Example goal" chips={["Goal"]}>
            <p className="text-base font-semibold">Go to the gym 5 times this week</p>
          </GoalExampleCard>
          <GoalExampleHelper>{walkthroughTabs[0].helper}</GoalExampleHelper>
        </TabsContent>

        <TabsContent value="concrete" className="grid gap-4">
          <SlideHeader
            title={walkthroughTabs[1].title}
            subtitle={walkthroughTabs[1].subtitle}
          />
          <GoalExampleComparison
            before="Go to the gym 5 times this week"
            better="Complete 5 gym visits by Sunday"
            whyItWorks={[
              "has a number",
              "has a deadline",
              "defines what done looks like",
            ]}
          />
          <GoalExampleHelper>{walkthroughTabs[1].helper}</GoalExampleHelper>
        </TabsContent>

        <TabsContent value="project" className="grid gap-4">
          <SlideHeader
            title={walkthroughTabs[2].title}
            subtitle={walkthroughTabs[2].subtitle}
          />
          <GoalExampleCard chips={["Goal", "Project"]}>
            <div className="grid gap-4 md:grid-cols-2">
              <GoalExampleLabelValue
                label="Goal"
                value="Complete 5 gym visits by Sunday"
              />
              <GoalExampleLabelValue
                label="Project"
                value="This week’s gym plan"
              />
            </div>
          </GoalExampleCard>
          <GoalExampleCard
            title="Optional supporting note"
            subtitle="You can split it into smaller projects if needed."
            chips={["Project"]}
            tone="muted"
          >
            <GoalExampleList
              items={["Gym schedule", "Gym prep", "Workout execution"]}
            />
          </GoalExampleCard>
          <GoalExampleHelper>{walkthroughTabs[2].helper}</GoalExampleHelper>
        </TabsContent>

        <TabsContent value="actions" className="grid gap-4">
          <SlideHeader
            title={walkthroughTabs[3].title}
            subtitle={walkthroughTabs[3].subtitle}
          />
          <div className="grid gap-3 xl:grid-cols-3">
            <GoalExampleCard title="Planning" chips={["Next action"]}>
              <GoalExampleList items={planningSteps} />
            </GoalExampleCard>
            <GoalExampleCard title="Prep" chips={["Next action"]}>
              <GoalExampleList items={prepSteps} />
            </GoalExampleCard>
            <GoalExampleCard title="Execution" chips={["Next action"]}>
              <GoalExampleList items={executionSteps} />
            </GoalExampleCard>
          </div>
          <GoalExampleCard
            title="If a step still feels too big, make it smaller"
            chips={["Tip"]}
            tone="muted"
          >
            <GoalExampleList items={smallerSteps} />
          </GoalExampleCard>
          <GoalExampleHelper>{walkthroughTabs[3].helper}</GoalExampleHelper>
        </TabsContent>

        <TabsContent value="calendar" className="grid gap-4">
          <SlideHeader
            title={walkthroughTabs[4].title}
            subtitle={walkthroughTabs[4].subtitle}
          />
          <div className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
            <GoalExampleCard title="Example schedule" chips={["Calendar"]}>
              <GoalExampleList items={scheduleBlocks} />
            </GoalExampleCard>
            <GoalExampleCard title="Add reminders like" chips={["Reminder"]}>
              <GoalExampleList items={reminderCues} />
            </GoalExampleCard>
          </div>
          <GoalExampleHelper>{walkthroughTabs[4].helper}</GoalExampleHelper>
        </TabsContent>

        <TabsContent value="best" className="grid gap-4">
          <SlideHeader
            title={walkthroughTabs[5].title}
            subtitle={walkthroughTabs[5].subtitle}
          />
          <GoalExampleCard title="Final example" chips={["Goal", "Project", "Next action"]}>
            <div className="grid gap-4">
              <GoalExampleLabelValue
                label="Goal"
                value="Complete 5 gym visits this week"
              />
              <GoalExampleLabelValue
                label="Project"
                value="Gym this week"
              />
              <div className="grid gap-2">
                <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Next actions
                </p>
                <GoalExampleList items={finalNextActions} />
              </div>
            </div>
          </GoalExampleCard>
          <GoalExampleCard
            title="Best first step"
            chips={["Highlight"]}
            tone="highlight"
          >
            <p className="text-base font-semibold">
              Open calendar and choose 5 gym times
            </p>
          </GoalExampleCard>
          <GoalExampleHelper>{walkthroughTabs[5].helper}</GoalExampleHelper>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SlideHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid gap-1.5">
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
    </div>
  );
}
