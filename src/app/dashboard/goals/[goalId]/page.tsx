"use client";

import { SignInButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Goal } from "lucide-react";
import { useParams } from "next/navigation";

import { GoalDetail } from "@/components/goals/goal-detail";
import { Button } from "@/components/ui/button";
import type { Id } from "@convex/_generated/dataModel";

export default function GoalDetailPage() {
  return (
    <>
      <Authenticated>
        <AuthenticatedGoalDetailPage />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedGoalDetailState />
      </Unauthenticated>
      <AuthLoading>
        <GoalDetailLoadingShell />
      </AuthLoading>
    </>
  );
}

function AuthenticatedGoalDetailPage() {
  const params = useParams<{ goalId: string }>();

  return <GoalDetail goalId={params.goalId as Id<"goals">} />;
}

function GoalDetailLoadingShell() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <div className="h-20 rounded-lg border bg-background" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-lg border bg-background" />
        <div className="h-48 rounded-lg border bg-background" />
      </div>
      <div className="h-96 rounded-lg border bg-background" />
    </div>
  );
}

function UnauthenticatedGoalDetailState() {
  return (
    <div className="mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col items-center justify-center rounded-lg border bg-background p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Goal className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold">Sign in to view goals</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Goal detail is only available after your session is loaded.
      </p>
      <SignInButton mode="redirect">
        <Button className="mt-6">Sign in</Button>
      </SignInButton>
    </div>
  );
}
