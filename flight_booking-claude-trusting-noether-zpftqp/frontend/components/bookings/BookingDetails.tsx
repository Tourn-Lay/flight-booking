import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriceBreakdown } from "./PriceBreakdown";
import { FlightSummary } from "./FlightSummary";
import { formatDate, formatDateTime, titleCase } from "@/lib/utils";
import type { Booking } from "@/types";

const GENDER: Record<string, string> = { M: "Male", F: "Female", O: "Other" };

/** Complete read-only view of a booking (customer pages and the admin detail sheet). */
export function BookingDetails({ booking, showCustomer = false }: { booking: Booking; showCustomer?: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Booking reference</div>
          <div className="font-mono text-2xl font-bold">{booking.booking_reference}</div>
          <div className="text-xs text-muted-foreground">Booked {formatDateTime(booking.created_at)}</div>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={booking.status} />
          <StatusBadge status={booking.payment.status} />
        </div>
      </div>

      {showCustomer && (
        <Card>
          <CardContent className="p-4 text-sm">
            <div className="text-xs text-muted-foreground">Customer</div>
            <div className="font-medium">{booking.customer.full_name}</div>
            <div className="text-muted-foreground">
              {booking.customer.email}
              {booking.customer.phone && ` · ${booking.customer.phone}`}
            </div>
          </CardContent>
        </Card>
      )}

      <FlightSummary flight={booking.flight} cabin={booking.cabin_class} passengers={booking.number_of_passengers} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Passengers &amp; seats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {booking.passengers.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <div>
                <div className="font-medium">
                  {i + 1}. {p.full_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {GENDER[p.gender] ?? p.gender} · {formatDate(p.date_of_birth)} · {p.nationality}
                  {p.passport_number && ` · Passport ${p.passport_number}${p.passport_expiry ? ` (exp. ${formatDate(p.passport_expiry)})` : ""}`}
                </div>
              </div>
              <div className="rounded-md bg-primary/10 px-3 py-1 font-semibold text-primary">Seat {p.seat_number}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Price &amp; payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PriceBreakdown
            unitPrice={booking.ticket_price}
            passengers={booking.number_of_passengers}
            subtotal={booking.subtotal}
            tax={booking.tax}
            total={booking.total_amount}
            taxRate={booking.tax_rate}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
            <span className="text-muted-foreground">Payment method: {titleCase(booking.payment.payment_method)}</span>
            <span className="flex items-center gap-2">
              <StatusBadge status={booking.payment.status} />
              {booking.payment.paid_at && <span className="text-xs text-muted-foreground">on {formatDateTime(booking.payment.paid_at)}</span>}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
