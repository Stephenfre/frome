"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { cn } from "@/lib/utils";

const SIDEBAR_PREFERENCE_KEY = "forme-dashboard-sidebar-collapsed";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

  useEffect(() => {
    const storedPreference = window.localStorage.getItem(
      SIDEBAR_PREFERENCE_KEY,
    );

    if (storedPreference !== null) {
      setIsSidebarCollapsed(storedPreference === "true");
    }

    setHasLoadedPreference(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPreference) {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_PREFERENCE_KEY,
      String(isSidebarCollapsed),
    );
  }, [hasLoadedPreference, isSidebarCollapsed]);

  return (
    <div className="min-h-screen bg-muted/30">
      <div
        className={cn(
          "grid min-h-screen transition-[grid-template-columns] duration-200 ease-out",
          isSidebarCollapsed
            ? "md:grid-cols-[5.5rem_1fr]"
            : "md:grid-cols-[17rem_1fr]",
        )}
      >
        <DashboardSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() =>
            setIsSidebarCollapsed((currentValue) => !currentValue)
          }
        />
        <div className="flex min-w-0 flex-col">
          <DashboardTopBar />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
