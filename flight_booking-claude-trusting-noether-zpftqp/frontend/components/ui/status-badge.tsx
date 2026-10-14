import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

const VARIANTS: Record<string, Variant> = {
  // flight
  SCHEDULED: "default",
  BOARDING: "warning",
  DEPARTED: "secondary",
  ARRIVED: "success",
  DELAYED: "warning",
  CANCELLED: "destructive",
  // booking
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "default",
  // payment
  UNPAID: "warning",
  PAID: "success",
  REFUNDED: "secondary",
  // generic
  ACTIVE: "success",
  INACTIVE: "secondary",
  MAINTENANCE: "warning",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? "outline"} className={className}>
      {titleCase(status)}
    </Badge>
  );
}
