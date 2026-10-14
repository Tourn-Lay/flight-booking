import { Card, CardContent } from "@/components/ui/card";
import { FlightTimeline } from "@/components/flights/FlightTimeline";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatLongDate, titleCase } from "@/lib/utils";
import type { Flight, FlightBrief } from "@/types";

type AnyFlight = Flight | FlightBrief;

function route(f: AnyFlight) {
  if ("origin_info" in f) {
    return { o: f.origin_info, d: f.destination_info, duration: f.duration_minutes, aircraft: `${f.aircraft_info.manufacturer} ${f.aircraft_info.model}` };
  }
  const duration = Math.round((new Date(f.arrival_datetime).getTime() - new Date(f.departure_datetime).getTime()) / 60000);
  return { o: f.origin, d: f.destination, duration, aircraft: f.aircraft_code };
}

export function FlightSummary({ flight, cabin, passengers }: { flight: AnyFlight; cabin?: string; passengers?: number }) {
  const r = route(flight);
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Flight</div>
            <div className="text-lg font-bold">
              {flight.flight_number} <span className="font-normal text-muted-foreground">· {r.o.code} → {r.d.code}</span>
            </div>
          </div>
          <StatusBadge status={flight.status} />
        </div>
        <FlightTimeline
          departure={flight.departure_datetime}
          arrival={flight.arrival_datetime}
          originCode={r.o.code}
          destinationCode={r.d.code}
          originCity={r.o.city}
          destinationCity={r.d.city}
          durationMinutes={r.duration}
        />
        <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">{formatDate(flight.departure_datetime)}</dd>
            <dd className="text-xs text-muted-foreground">{formatLongDate(flight.departure_datetime).split(",")[0]}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Aircraft</dt>
            <dd className="font-medium">{r.aircraft}</dd>
          </div>
          {cabin && (
            <div>
              <dt className="text-xs text-muted-foreground">Cabin</dt>
              <dd className="font-medium">{titleCase(cabin)}</dd>
            </div>
          )}
          {passengers !== undefined && (
            <div>
              <dt className="text-xs text-muted-foreground">Passengers</dt>
              <dd className="font-medium">{passengers}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
