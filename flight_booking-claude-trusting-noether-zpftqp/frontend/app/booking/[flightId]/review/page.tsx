"use client";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingSteps } from "@/components/bookings/BookingSteps";
import { FlightSummary } from "@/components/bookings/FlightSummary";
import { PriceBreakdown } from "@/components/bookings/PriceBreakdown";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { useBookingDraft } from "@/features/booking/BookingContext";
import { useFetch } from "@/hooks/useFetch";
import { ApiError } from "@/lib/api";
import { flightService } from "@/services/flights";
import { bookingService } from "@/services/bookings";
import { formatDate } from "@/lib/utils";
import type { CabinClass, PaymentMethod } from "@/types";

const TAX_RATE = 0.1; // display only - the backend calculates the real amounts

function Review() {
  const { flightId } = useParams<{ flightId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { draft, ready, update, reset } = useBookingDraft();
  const { data: flight, loading, error, reload } = useFetch(() => flightService.get(flightId), [flightId]);
  const [submitting, setSubmitting] = React.useState(false);
  const [conflict, setConflict] = React.useState<string | null>(null);

  const cabin = (params.get("cabin_class") === "BUSINESS" ? "BUSINESS" : draft.cabin) as CabinClass;
  const seats = draft.flightId === Number(flightId) ? draft.seats : [];
  const passengers = draft.passengers;

  if (loading || !ready) return <PageSkeleton />;
  if (error || !flight) return <div className="container py-10"><ErrorState message={error?.message ?? "Flight not found."} onRetry={reload} /></div>;
  if (seats.length === 0 || passengers.length !== seats.length) {
    return (
      <div className="container py-10">
        <ErrorState message="Your booking details are incomplete. Please start from seat selection." />
        <div className="mt-4 text-center">
          <Button asChild><Link href={`/booking/${flightId}/seats?cabin_class=${cabin}&passengers=${draft.passengerCount}`}>Choose seats</Link></Button>
        </div>
      </div>
    );
  }

  const unit = Number(cabin === "BUSINESS" ? flight.business_price : flight.economy_price);
  const subtotal = unit * seats.length;
  const tax = subtotal * TAX_RATE;

  async function confirm() {
    setSubmitting(true);
    try {
      const booking = await bookingService.create({
        flight: Number(flightId),
        cabin_class: cabin,
        payment_method: draft.paymentMethod,
        passengers: passengers.map((p, i) => ({
          ...p,
          passport_number: p.passport_number || "",
          passport_expiry: p.passport_expiry || null,
          seat_id: seats[i].id,
        })),
      });
      toast.success("Booking created successfully.");
      reset();
      router.replace(`/booking/success/${booking.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConflict(e.message);
        update({ seats: [] }); // force a fresh seat choice
      } else {
        toast.error(e instanceof Error ? e.message : "Could not create the booking.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <BookingSteps current={2} />
      <h1 className="mb-6 text-2xl font-bold">Review your booking</h1>
      <div className="space-y-5">
        <FlightSummary flight={flight} cabin={cabin} passengers={seats.length} />

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Passengers &amp; seats</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {passengers.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <div className="font-medium">Passenger {i + 1}: {p.first_name} {p.last_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.nationality} · born {formatDate(p.date_of_birth)}{p.passport_number ? ` · passport ${p.passport_number}` : ""}
                  </div>
                </div>
                <div className="rounded-md bg-primary/10 px-3 py-1 font-semibold text-primary">Seat {seats[i].seat_number}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Price &amp; payment</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <PriceBreakdown
              unitPrice={unit}
              passengers={seats.length}
              subtotal={subtotal}
              tax={tax}
              total={subtotal + tax}
              taxRate={TAX_RATE}
              note="The final amount is calculated and confirmed by our system when you book."
            />
            <div className="max-w-xs">
              <label className="mb-1.5 block text-sm font-medium">Payment method (simulated)</label>
              <Select value={draft.paymentMethod} onValueChange={(v) => update({ paymentMethod: v as PaymentMethod })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAY_LATER">Pay later</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">No real payment is taken. An administrator marks the payment as paid.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button asChild variant="outline" disabled={submitting}>
            <Link href={`/booking/${flightId}/passengers?cabin_class=${cabin}&passengers=${seats.length}`}>Back</Link>
          </Button>
          <Button size="lg" variant="accent" onClick={confirm} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />} Confirm Booking
          </Button>
        </div>
      </div>

      <Dialog open={conflict !== null} onOpenChange={(o) => !o && setConflict(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seat no longer available</DialogTitle>
            <DialogDescription>{conflict}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => router.replace(`/booking/${flightId}/seats?cabin_class=${cabin}&passengers=${passengers.length}`)}>
              Choose another seat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <Review />
    </React.Suspense>
  );
}
