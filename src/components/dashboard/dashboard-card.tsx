import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  headerAction?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function DashboardCard({
  title,
  description,
  icon: Icon,
  children,
  headerAction,
  className,
  contentClassName,
}: DashboardCardProps) {
  return (
    <Card className={cn("rounded-lg shadow-none", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
