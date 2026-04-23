import { UserButton } from "@clerk/nextjs";
import { Bell, Search, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function DashboardTopBar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold">ForMe</span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground md:flex md:max-w-md">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Search tasks, events, and goals</span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Notifications">
            <Bell className="size-4" aria-hidden="true" />
          </Button>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-9",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
