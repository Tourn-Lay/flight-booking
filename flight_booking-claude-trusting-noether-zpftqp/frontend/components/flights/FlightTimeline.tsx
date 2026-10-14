import { Plane } from "lucide-react";
import { formatDuration, formatTime } from "@/lib/utils";

/** departure time/airport ---- duration ----> arrival time/airport */
export function FlightTimeline({
  departure,
  arrival,
  originCode,
  destinationCode,
  originCity,
  destinationCity,
  durationMinutes,
}: {
  departure: string;
  arrival: string;
  originCode: string;
  destinationCode: string;
  originCity?: string;
  destinationCity?: string;
  durationMinutes: number;
}) {
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <div className="text-left">
        <div className="text-2xl font-bold tabular-nums">{formatTime(departure)}</div>
        <div className="text-sm font-semibold">{originCode}</div>
        {originCity && <div className="text-xs text-muted-foreground">{originCity}</div>}
      </div>
      <div className="flex min-w-[80px] flex-1 flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{formatDuration(durationMinutes)}</span>
        <div className="relative flex w-full items-center">
          <span className="h-2 w-2 rounded-full border-2 border-primary bg-background" />
          <span className="h-px flex-1 bg-primary/40" />
          <Plane className="mx-1 h-4 w-4 text-primary" />
          <span className="h-px flex-1 bg-primary/40" />
          <span className="h-2 w-2 rounded-full bg-primary" />
        </div>
        <span className="text-xs text-muted-foreground">Direct</span>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold tabular-nums">{formatTime(arrival)}</div>
        <div className="text-sm font-semibold">{destinationCode}</div>
        {destinationCity && <div className="text-xs text-muted-foreground">{destinationCity}</div>}
      </div>
    </div>
  );
}
