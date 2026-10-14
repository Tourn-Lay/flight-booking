"use client";
import * as React from "react";
import { Banknote, Ban, CheckCircle2, Eye, MoreHorizontal, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { FilterBar, FilterSelect, PageHeader, SearchInput, TableCard } from "@/components/admin/AdminParts";
import { BookingDetails } from "@/components/bookings/BookingDetails";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounced } from "@/hooks/useFetch";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { formatDate, formatMoney } from "@/lib/utils";
import { bookingService } from "@/services/bookings";
import type { Booking } from "@/types";

type Pending = { kind: "cancel" | "pay" | "confirm" | "complete"; booking: Booking } | null;

export default function AdminBookingsPage() {
  const [reference, setReference] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [flight, setFlight] = React.useState("");
  const [date, setDate] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [paymentStatus, setPaymentStatus] = React.useState("ALL");
  const dRef = useDebounced(reference);
  const dCustomer = useDebounced(customer);
  const dFlight = useDebounced(flight);

  const { data, loading, error, reload, page, setPage, totalPages } = usePagedQuery(bookingService.list, {
    reference: dRef, customer: dCustomer, flight: dFlight, date, status, payment_status: paymentStatus,
  });
  const [viewingId, setViewingId] = React.useState<number | null>(null);
  const viewing = data?.results.find((b) => b.id === viewingId) ?? null;
  const [pending, setPending] = React.useState<Pending>(null);

  const copy: Record<string, { title: string; text: string; label: string; destructive: boolean }> = {
    cancel: { title: "Cancel booking?", text: "The booking is cancelled, its seats are released and a paid payment is marked refunded.", label: "Cancel booking", destructive: true },
    pay: { title: "Mark payment as paid?", text: "This records the simulated payment as received.", label: "Mark as paid", destructive: false },
    confirm: { title: "Confirm booking?", text: "The booking moves from pending to confirmed.", label: "Confirm booking", destructive: false },
    complete: { title: "Complete booking?", text: "Marks the trip as completed.", label: "Complete", destructive: false },
  };

  async function run() {
    if (!pending) return;
    const { kind, booking } = pending;
    try {
      if (kind === "cancel") await bookingService.cancel(booking.id);
      if (kind === "confirm") await bookingService.confirm(booking.id);
      if (kind === "complete") await bookingService.complete(booking.id);
      if (kind === "pay") await bookingService.markPaid(booking.payment.id);
      toast.success(
        kind === "pay" ? `Payment for ${booking.booking_reference} marked as paid.` : `Booking ${booking.booking_reference} ${kind === "cancel" ? "cancelled" : kind === "confirm" ? "confirmed" : "completed"}.`,
      );
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    }
  }

  return (
    <>
      <PageHeader title="Bookings" description="Review bookings, confirm them and track payments." />
      <FilterBar>
        <SearchInput value={reference} onChange={setReference} placeholder="Reference" />
        <SearchInput value={customer} onChange={setCustomer} placeholder="Customer name / email" />
        <SearchInput value={flight} onChange={setFlight} placeholder="Flight number" />
        <div className="flex gap-1">
          <DatePicker value={date} onChange={setDate} placeholder="Departure date" />
          {date && <Button variant="ghost" size="icon" onClick={() => setDate("")} aria-label="Clear date"><X /></Button>}
        </div>
        <FilterSelect value={status} onChange={setStatus} placeholder="Booking status" options={["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
        <FilterSelect value={paymentStatus} onChange={setPaymentStatus} placeholder="Payment status" options={["UNPAID", "PAID", "REFUNDED"].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
      </FilterBar>

      <TableCard loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length} emptyTitle="No bookings found." page={page} totalPages={totalPages} onPageChange={setPage} total={data?.count}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead><TableHead>Customer</TableHead><TableHead>Flight</TableHead><TableHead>Route</TableHead><TableHead>Pax</TableHead>
              <TableHead>Total</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="whitespace-nowrap font-mono text-xs font-semibold">{b.booking_reference}</TableCell>
                <TableCell>{b.customer.full_name}<br /><span className="text-xs text-muted-foreground">{b.customer.email}</span></TableCell>
                <TableCell className="whitespace-nowrap">{b.flight.flight_number}<br /><span className="text-xs text-muted-foreground">{formatDate(b.flight.departure_datetime)}</span></TableCell>
                <TableCell className="whitespace-nowrap">{b.flight.origin.code} → {b.flight.destination.code}</TableCell>
                <TableCell>{b.number_of_passengers}</TableCell>
                <TableCell className="whitespace-nowrap font-medium">{formatMoney(b.total_amount)}</TableCell>
                <TableCell><StatusBadge status={b.payment.status} /></TableCell>
                <TableCell><StatusBadge status={b.status} /></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${b.booking_reference}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setViewingId(b.id)}><Eye /> View</DropdownMenuItem>
                      {b.status === "PENDING" && <DropdownMenuItem onSelect={() => setPending({ kind: "confirm", booking: b })}><CheckCircle2 /> Confirm</DropdownMenuItem>}
                      {b.payment.status === "UNPAID" && b.status !== "CANCELLED" && <DropdownMenuItem onSelect={() => setPending({ kind: "pay", booking: b })}><Banknote /> Mark paid</DropdownMenuItem>}
                      {b.status === "CONFIRMED" && b.flight.status === "ARRIVED" && <DropdownMenuItem onSelect={() => setPending({ kind: "complete", booking: b })}><Flag /> Complete</DropdownMenuItem>}
                      {b.can_cancel && (<><DropdownMenuSeparator /><DropdownMenuItem destructive onSelect={() => setPending({ kind: "cancel", booking: b })}><Ban /> Cancel</DropdownMenuItem></>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <Sheet open={viewing !== null} onOpenChange={(o) => !o && setViewingId(null)}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Booking details</SheetTitle>
            <SheetDescription>Customer, flight, passengers, seats and payment</SheetDescription>
          </SheetHeader>
          {viewing && (
            <div className="mt-5 space-y-5">
              <BookingDetails booking={viewing} showCustomer />
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {viewing.status === "PENDING" && <Button onClick={() => setPending({ kind: "confirm", booking: viewing })}><CheckCircle2 /> Confirm</Button>}
                {viewing.payment.status === "UNPAID" && viewing.status !== "CANCELLED" && <Button variant="secondary" onClick={() => setPending({ kind: "pay", booking: viewing })}><Banknote /> Mark paid</Button>}
                {viewing.can_cancel && <Button variant="destructive" onClick={() => setPending({ kind: "cancel", booking: viewing })}><Ban /> Cancel</Button>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? copy[pending.kind].title : ""}
        description={pending && `${pending.booking.booking_reference}: ${copy[pending.kind].text}`}
        confirmLabel={pending ? copy[pending.kind].label : "Confirm"}
        destructive={pending ? copy[pending.kind].destructive : false}
        onConfirm={run}
      />
    </>
  );
}
