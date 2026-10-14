import Link from "next/link";
import { Armchair, PlaneTakeoff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FlightTimeline } from "./FlightTimeline";
import { formatMoney, titleCase } from "@/lib/utils";
import type { FlightSearchResult } from "@/types";

export function FlightCard({ flight, passengers }: { flight: FlightSearchResult; passengers: number }) {
  const qs = `cabin_class=${flight.cabin_class}&passengers=${passengers}`;
  const low = flight.available_seats_in_cabin <= 10;
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:gap-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              <PlaneTakeoff className="h-4 w-4 text-primary" /> {flight.flight_number}
            </span>
            <span className="text-muted-foreground">
              {flight.aircraft_info.manufacturer} {flight.aircraft_info.model}
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{titleCase(flight.cabin_class)}</span>
            {flight.status === "DELAYED" && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-amber-700">Delayed</span>}
          </div>
          <FlightTimeline
            departure={flight.departure_datetime}
            arrival={flight.arrival_datetime}
            originCode={flight.origin_info.code}
            destinationCode={flight.destination_info.code}
            originCity={flight.origin_info.city}
            destinationCity={flight.destination_info.city}
            durationMinutes={flight.duration_minutes}
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t pt-4 md:min-w-[190px] md:flex-col md:items-end md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <div className="text-left md:text-right">
            <div className="text-2xl font-bold text-primary">{formatMoney(flight.price)}</div>
            <div className="text-xs text-muted-foreground">per passenger</div>
            <div className={`mt-1 flex items-center gap-1 text-xs md:justify-end ${low ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
              <Armchair className="h-3.5 w-3.5" /> {flight.available_seats_in_cabin} seats left
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href={`/booking/${flight.id}/seats?${qs}`}>Select</Link>
            </Button>
            <Link href={`/flights/${flight.id}?${qs}`} className="text-center text-xs text-primary hover:underline">
              Flight details
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
