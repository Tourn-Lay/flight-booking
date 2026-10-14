"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ticket } from "lucide-react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { BookingCard } from "@/components/bookings/BookingCard";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFetch } from "@/hooks/useFetch";
import { bookingService } from "@/services/bookings";
import type { Booking } from "@/types";

const EMPTY: Record<string, string> = {
  upcoming: "No upcoming bookings.",
  completed: "No completed trips yet.",
  cancelled: "No cancelled bookings.",
};

function MyBookings() {
  const { data, loading, error, reload } = useFetch(() => bookingService.myBookings(), []);
  const [target, setTarget] = React.useState<Booking | null>(null);

  const groups = React.useMemo(() => {
    const all = data ?? [];
    return {
      upcoming: all.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED"),
      completed: all.filter((b) => b.status === "COMPLETED"),
      cancelled: all.filter((b) => b.status === "CANCELLED"),
    };
  }, [data]);

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My bookings</h1>
        <Button asChild><Link href="/flights">Book a flight</Link></Button>
      </div>
      {loading && <CardListSkeleton />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!loading && !error && (
        <Tabs defaultValue="upcoming">
          <TabsList>
            {(Object.keys(groups) as (keyof typeof groups)[]).map((k) => (
              <TabsTrigger key={k} value={k} className="capitalize">
                {k} ({groups[k].length})
              </TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(groups) as (keyof typeof groups)[]).map((k) => (
            <TabsContent key={k} value={k} className="space-y-4">
              {groups[k].length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title={EMPTY[k]}
                  description={k === "upcoming" ? "Search for a flight to plan your next trip." : undefined}
                  action={k === "upcoming" ? <Button asChild><Link href="/flights">Search flights</Link></Button> : undefined}
                />
              ) : (
                groups[k].map((b) => <BookingCard key={b.id} booking={b} onCancel={setTarget} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Cancel this booking?"
        description={target && `Booking ${target.booking_reference} will be cancelled and your seats released. This cannot be undone.`}
        confirmLabel="Yes, cancel booking"
        onConfirm={async () => {
          if (!target) return;
          try {
            await bookingService.cancel(target.id);
            toast.success(`Booking ${target.booking_reference} cancelled.`);
            reload();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not cancel the booking.");
          }
        }}
      />
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <RequireAuth>
      <MyBookings />
    </RequireAuth>
  );
}
