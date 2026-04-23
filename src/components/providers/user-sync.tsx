"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "@convex/_generated/api";

export function AuthenticatedUserSync() {
  const { user, isLoaded } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || isLoading || !isAuthenticated || !user) {
      return;
    }

    if (lastSyncedUserId.current === user.id) {
      return;
    }

    lastSyncedUserId.current = user.id;

    void upsertCurrentUser().catch(() => {
      lastSyncedUserId.current = null;
    });
  }, [isAuthenticated, isLoaded, isLoading, upsertCurrentUser, user]);

  return null;
}
