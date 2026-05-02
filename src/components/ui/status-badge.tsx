import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "active"
  | "expired"
  | "cancelled"
  | "completed"
  | "refunded"
  | "pending"
  | "connected"
  | "error"
  | "monthly"
  | "yearly"
  | "weekly"
  | "subscription"
  | "one_time";

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-muted-foreground border-border",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  refunded: {
    label: "Refunded",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  },
  connected: {
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  error: {
    label: "Error",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  monthly: {
    label: "Monthly",
    className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  },
  yearly: {
    label: "Yearly",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  },
  weekly: {
    label: "Weekly",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  },
  subscription: {
    label: "Subscription",
    className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  },
  one_time: {
    label: "One-time",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StatusType] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
