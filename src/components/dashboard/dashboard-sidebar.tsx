"use client";

import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Goal,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Daily Brief", href: "/dashboard", icon: Sparkles },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckCircle2 },
  { label: "Calendar", href: "/dashboard/events", icon: CalendarDays },
  { label: "Money", href: "/dashboard", icon: CircleDollarSign },
  { label: "Goals", href: "/dashboard/goals", icon: Goal },
];

export function DashboardSidebar({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen self-start overflow-hidden border-r bg-background md:block">
      <div
        className={cn(
          "flex h-full flex-col py-5 transition-[padding] duration-200",
          isCollapsed ? "px-3" : "px-4",
        )}
      >
        <div
          className={cn(
            "flex items-start gap-2",
            isCollapsed ? "flex-col items-center" : "justify-between",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg",
              isCollapsed ? "justify-center px-0" : "px-2",
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            {!isCollapsed ? (
              <div className="min-w-0">
                <p className="truncate font-semibold">ForMe</p>
                <p className="truncate text-xs text-muted-foreground">
                  Personal hub
                </p>
              </div>
            ) : (
              <span className="sr-only">ForMe</span>
            )}
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
          </Button>
        </div>

        <Separator className="my-5" />

        <nav className="grid gap-1">
          {navItems.map((item) => {
            const isActive =
              item.label === "Dashboard"
                ? pathname === item.href
                : item.href !== "/dashboard" &&
                  (pathname === item.href ||
                    pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-label={item.label}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex h-10 items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {!isCollapsed ? item.label : <span className="sr-only">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!isCollapsed ? (
          <p className="mt-auto px-2 pt-6 text-xs leading-5 text-muted-foreground">
            Keep the day visible. Collapse the nav when you want more room.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
