"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingNavActions() {
  return (
    <>
      <Authenticated>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-9",
              },
            }}
          />
        </div>
      </Authenticated>
      <Unauthenticated>
        <SignInButton mode="redirect">
          <Button variant="ghost">Sign in</Button>
        </SignInButton>
      </Unauthenticated>
      <AuthLoading>
        <div className="h-9 w-20 rounded-md bg-background/60" />
      </AuthLoading>
    </>
  );
}

export function LandingHeroActions() {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Authenticated>
        <Button size="lg" asChild className="gap-2">
          <Link href="/dashboard">
            Go to dashboard
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </Authenticated>
      <Unauthenticated>
        <SignUpButton mode="redirect">
          <Button size="lg" className="gap-2">
            Create account
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </SignUpButton>
        <SignInButton mode="redirect">
          <Button size="lg" variant="outline">
            Sign in
          </Button>
        </SignInButton>
      </Unauthenticated>
      <AuthLoading>
        <div className="h-11 w-36 rounded-md bg-background/60" />
      </AuthLoading>
    </div>
  );
}
