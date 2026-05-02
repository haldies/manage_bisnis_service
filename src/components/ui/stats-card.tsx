import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon?: LucideIcon;
  iconColor?: string;
  isLoading?: boolean;
  description?: string;
}

export function StatsCard({
  label,
  value,
  delta,
  icon: Icon,
  iconColor = "text-primary",
  isLoading,
  description,
}: StatsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="mt-3 h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <div className={cn("rounded-lg p-2 bg-secondary/80", iconColor.replace("text-", "bg-").replace("/80", "/10"))}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
          )}
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {delta !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              )}
            >
              {delta >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(delta)}%
            </span>
          )}
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
