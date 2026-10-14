"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { PriceBreakdown } from "@/components/bookings/PriceBreakdown";
import { useFetch } from "@/hooks/useFetch";
import { bookingService } from "@/services/bookings";
import { formatDate, formatMoney, formatTime } from "@/lib/utils";

export default function BookingSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const { data: b, loading, error, reload } = useFetch(() => bookingService.get(id), [id]);

  if (loading) return <PageSkeleton />;
  if (error || !b) return <div className="container py-10"><ErrorState message={error?.message ?? "Booking not found."} onRetry={reload} /></div>;

  const rows: [string, React.ReactNode][] = [
    ["Flight number", b.flight.flight_number],
    ["Route", `${b.flight.origin.city} (${b.flight.origin.code}) → ${b.flight.destination.city} (${b.flight.destination.code})`],
    ["Departure", `${formatDate(b.flight.departure_datetime)} · ${formatTime(b.flight.departure_datetime)}`],
    ["Passengers", b.passengers.map((p) => p.full_name).join(", ")],
    ["Seats", b.passengers.map((p) => p.seat_number).join(", ")],
    ["Total", <span key="t" className="font-bold text-primary">{formatMoney(b.total_amount)}</span>],
    ["Payment status", <StatusBadge key="p" status={b.payment.status} />],
    ["Booking status", <StatusBadge key="s" status={b.status} />],
  ];

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <CheckCircle2 className="mb-3 h-14 w-14 text-success" />
        <h1 className="text-3xl font-bold">Booking Confirmed</h1>
        <p className="mt-1 text-muted-foreground">Thank you! Your booking has been received and is awaiting confirmation.</p>
      </div>
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="rounded-lg bg-primary/5 p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Booking reference</div>
            <div className="font-mono text-3xl font-bold tracking-wider text-primary">{b.booking_reference}</div>
          </div>
          <dl className="divide-y text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <PriceBreakdown unitPrice={b.ticket_price} passengers={b.number_of_passengers} subtotal={b.subtotal} tax={b.tax} total={b.total_amount} taxRate={b.tax_rate} />
        </CardContent>
      </Card>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild size="lg"><Link href="/my-bookings">View My Bookings</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/">Back to Home</Link></Button>
      </div>
    </div>
  );
}
