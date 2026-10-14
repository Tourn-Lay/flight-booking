"use client";
import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { BookingDetails } from "@/components/bookings/BookingDetails";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { useFetch } from "@/hooks/useFetch";
import { bookingService } from "@/services/bookings";

function Details() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useFetch(() => bookingService.get(id), [id]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (loading) return <PageSkeleton />;
  if (error?.status === 404) notFound();
  if (error || !data) return <div className="container py-10"><ErrorState message={error?.message ?? "Booking not found."} onRetry={reload} /></div>;

  return (
    <div className="container max-w-3xl py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4"><Link href="/my-bookings">← My bookings</Link></Button>
      <BookingDetails booking={data} />
      {data.can_cancel && (
        <div className="mt-6 flex justify-end">
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Cancel booking</Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancel this booking?"
        description={`Booking ${data.booking_reference} will be cancelled and your seats released. This cannot be undone.`}
        confirmLabel="Yes, cancel booking"
        onConfirm={async () => {
          try {
            await bookingService.cancel(data.id);
            toast.success("Booking cancelled.");
            reload();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not cancel the booking.");
          }
        }}
      />
    </div>
  );
}

export default function BookingDetailsPage() {
  return (
    <RequireAuth>
      <Details />
    </RequireAuth>
  );
}
