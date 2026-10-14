import Link from "next/link";
import { Armchair, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatMoney, formatTime, titleCase } from "@/lib/utils";
import type { Booking } from "@/types";

export function BookingCard({ booking, onCancel }: { booking: Booking; onCancel?: (b: Booking) => void }) {
  const f = booking.flight;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Booking reference</div>
          <div className="font-mono text-lg font-bold">{booking.booking_reference}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={booking.status} />
          <StatusBadge status={booking.payment.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">Flight</div>
          <div className="font-semibold">{f.flight_number}</div>
          <div className="text-sm">
            {f.origin.code} → {f.destination.code}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Departure</div>
          <div className="font-semibold">{formatDate(f.departure_datetime)}</div>
          <div className="text-sm">{formatTime(f.departure_datetime)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" /> Passengers · <Armchair className="h-3 w-3" /> Seats
          </div>
          <div className="font-semibold">
            {booking.number_of_passengers} · {booking.passengers.map((p) => p.seat_number).join(", ")}
          </div>
          <div className="text-sm">{titleCase(booking.cabin_class)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-lg font-bold text-primary">{formatMoney(booking.total_amount)}</div>
          <div className="text-xs text-muted-foreground">Payment: {titleCase(booking.payment.status)}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/my-bookings/${booking.id}`}>View details</Link>
        </Button>
        {booking.can_cancel && onCancel && (
          <Button variant="destructive" size="sm" onClick={() => onCancel(booking)}>
            Cancel booking
          </Button>
        )}
      </div>
    </Card>
  );
}
