"use client";
import * as React from "react";
import Link from "next/link";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Armchair, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlightSummary } from "@/components/bookings/FlightSummary";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { useFetch } from "@/hooks/useFetch";
import { flightService } from "@/services/flights";
import { cn, formatMoney } from "@/lib/utils";
import type { CabinClass } from "@/types";

function FlightDetails() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const [cabin, setCabin] = React.useState<CabinClass>(params.get("cabin_class") === "BUSINESS" ? "BUSINESS" : "ECONOMY");
  const [passengers, setPassengers] = React.useState(Math.max(1, Number(params.get("passengers") ?? 1) || 1));
  const { data: flight, loading, error, reload } = useFetch(() => flightService.get(id), [id]);

  if (loading) return <PageSkeleton />;
  if (error?.status === 404) notFound();
  if (error || !flight) return <div className="container py-10"><ErrorState message={error?.message ?? "Flight not found."} onRetry={reload} /></div>;

  const cabins = [
    { key: "ECONOMY" as const, label: "Economy", price: flight.economy_price, seats: flight.available_seats.economy, perks: "Standard seat · carry-on included" },
    { key: "BUSINESS" as const, label: "Business", price: flight.business_price, seats: flight.available_seats.business, perks: "Extra legroom · priority boarding" },
  ];
  const selected = cabins.find((c) => c.key === cabin)!;
  const canBook = flight.is_bookable && selected.seats >= passengers;

  return (
    <div className="container max-w-4xl py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/flights">← Back to search</Link>
      </Button>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Plane className="h-6 w-6 -rotate-45 text-primary" /> Flight {flight.flight_number}
      </h1>
      <FlightSummary flight={flight} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Cabin options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {cabins.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCabin(c.key)}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-colors",
                  cabin === c.key ? "border-primary bg-primary/5" : "hover:border-primary/40",
                  c.seats === 0 && "opacity-60",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{c.label}</span>
                  <span className="text-xl font-bold text-primary">{formatMoney(c.price)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.perks}</p>
                <p className="mt-2 flex items-center gap-1 text-xs">
                  <Armchair className="h-3.5 w-3.5" /> {c.seats > 0 ? `${c.seats} seats available` : "Sold out"}
                </p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-5">
            <div className="w-44">
              <label className="mb-1.5 block text-sm font-medium">Passengers</label>
              <Select value={String(passengers)} onValueChange={(v) => setPassengers(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "passenger" : "passengers"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Price per passenger</div>
              <div className="text-2xl font-bold text-primary">{formatMoney(selected.price)}</div>
            </div>
            <Button
              size="lg"
              variant="accent"
              disabled={!canBook}
              onClick={() => router.push(`/booking/${flight.id}/seats?cabin_class=${cabin}&passengers=${passengers}`)}
            >
              Select Flight
            </Button>
          </div>
          {!flight.is_bookable && (
            <p className="text-sm text-destructive">This flight is {flight.status.toLowerCase()} and can no longer be booked.</p>
          )}
          {flight.is_bookable && selected.seats < passengers && (
            <p className="text-sm text-destructive">Not enough {selected.label.toLowerCase()} seats left for {passengers} passengers.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FlightDetailsPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <FlightDetails />
    </React.Suspense>
  );
}
