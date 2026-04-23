import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-md border bg-background px-2.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}
