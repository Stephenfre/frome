"use client";

import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Goal,
  Home,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Daily Brief", href: "/dashboard", icon: Sparkles },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckCircle2 },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays },
  { label: "Money", href: "/dashboard", icon: CircleDollarSign },
  { label: "Goals", href: "/dashboard", icon: Goal },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r bg-background md:block">
      <div className="flex h-full flex-col px-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">ForMe</p>
            <p className="text-xs text-muted-foreground">Personal hub</p>
          </div>
        </Link>

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
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
