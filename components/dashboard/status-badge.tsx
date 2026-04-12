import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "healthy" | "up" | "READY" | "degraded" | "down" | "unknown" | "error" | string;

const statusConfig: Record<string, { label: string; className: string }> = {
  healthy: { label: "תקין", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  up: { label: "פעיל", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  READY: { label: "READY", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  running: { label: "Running", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  degraded: { label: "חלקי", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  down: { label: "נפל", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  error: { label: "שגיאה", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  ERROR: { label: "ERROR", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      <span className={cn(
        "inline-block w-2 h-2 rounded-full mr-1.5",
        status === "down" || status === "error" || status === "ERROR" ? "bg-red-500" :
        status === "degraded" ? "bg-yellow-500" : "bg-green-500"
      )} />
      {config.label}
    </Badge>
  );
}
