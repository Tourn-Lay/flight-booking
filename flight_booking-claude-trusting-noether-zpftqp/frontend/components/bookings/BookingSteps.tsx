import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Seats", "Passengers", "Review"];

export function BookingSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-2 text-sm">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
              i < current && "border-primary bg-primary text-primary-foreground",
              i === current && "border-primary text-primary",
              i > current && "text-muted-foreground",
            )}
          >
            {i < current ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          <span className={cn("hidden sm:inline", i === current ? "font-semibold" : "text-muted-foreground")}>{label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}
