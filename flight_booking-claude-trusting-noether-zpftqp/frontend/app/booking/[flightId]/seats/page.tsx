"use client";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingSteps } from "@/components/bookings/BookingSteps";
import { FlightSummary } from "@/components/bookings/FlightSummary";
import { SeatLegend, SeatMap, type MapSeat } from "@/components/seats/SeatMap";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { useBookingDraft } from "@/features/booking/BookingContext";
import { useFetch } from "@/hooks/useFetch";
import { flightService } from "@/services/flights";
import { formatMoney, titleCase } from "@/lib/utils";
import type { CabinClass } from "@/types";

function SeatSelection() {
  const { flightId } = useParams<{ flightId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { draft, ready, start, update } = useBookingDraft();
  const cabin = (params.get("cabin_class") === "BUSINESS" ? "BUSINESS" : "ECONOMY") as CabinClass;
  const passengerCount = Math.min(9, Math.max(1, Number(params.get("passengers") ?? 1) || 1));
  const { data, loading, error, reload } = useFetch(() => flightService.seats(flightId), [flightId]);

  React.useEffect(() => {
    if (ready) start(Number(flightId), cabin, passengerCount);
  }, [ready, flightId, cabin, passengerCount, start]);

  if (loading || !ready) return <PageSkeleton />;
  if (error || !data) return <div className="container py-10"><ErrorState message={error?.message ?? "Could not load the seat map."} onRetry={reload} /></div>;

  const { flight, seats } = data;
  const price = cabin === "BUSINESS" ? flight.business_price : flight.economy_price;
  const selected = draft.flightId === flight.id ? draft.seats : [];
  // drop any previously selected seat that has been taken in the meantime
  const stillFree = selected.filter((s) => seats.find((x) => x.id === s.id)?.status === "AVAILABLE");

  function toggle(seat: MapSeat) {
    const exists = stillFree.some((s) => s.id === seat.id);
    if (exists) return update({ seats: stillFree.filter((s) => s.id !== seat.id) });
    if (stillFree.length >= passengerCount) {
      return toast.info(`You have already chosen ${passengerCount} seat${passengerCount > 1 ? "s" : ""}. Deselect one first.`);
    }
    update({ seats: [...stillFree, { id: seat.id, seat_number: seat.seat_number }] });
  }

  const complete = stillFree.length === passengerCount;
  const cabinSeatsLeft = seats.filter((s) => s.seat_class === cabin && s.status === "AVAILABLE").length;

  return (
    <div className="container py-8">
      <BookingSteps current={0} />
      <h1 className="mb-6 text-2xl font-bold">Choose your seats</h1>
      {!flight.is_bookable ? (
        <ErrorState message="This flight can no longer be booked." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4 lg:order-2">
            <FlightSummary flight={flight} cabin={cabin} passengers={passengerCount} />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Seat assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: passengerCount }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span>Passenger {i + 1}</span>
                    <span className={stillFree[i] ? "font-semibold text-primary" : "text-muted-foreground"}>
                      {stillFree[i] ? `→ ${stillFree[i].seat_number}` : "Not selected"}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
                  <span>{titleCase(cabin)} · {formatMoney(price)} / passenger</span>
                  <span>{cabinSeatsLeft} seats left</span>
                </div>
                <Button
                  className="mt-2 w-full"
                  size="lg"
                  disabled={!complete}
                  onClick={() => {
                    update({ seats: stillFree });
                    router.push(`/booking/${flight.id}/passengers?cabin_class=${cabin}&passengers=${passengerCount}`);
                  }}
                >
                  Continue
                </Button>
                {!complete && (
                  <p className="text-center text-xs text-muted-foreground">
                    Select {passengerCount - stillFree.length} more seat{passengerCount - stillFree.length > 1 ? "s" : ""} to continue.
                  </p>
                )}
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href={`/flights/${flight.id}?cabin_class=${cabin}&passengers=${passengerCount}`}>← Back to flight</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:order-1">
            <CardContent className="space-y-5 p-5">
              <SeatLegend />
              <SeatMap seats={seats} cabin={cabin} selectedIds={stillFree.map((s) => s.id)} onToggle={toggle} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function SeatsPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <SeatSelection />
    </React.Suspense>
  );
}
