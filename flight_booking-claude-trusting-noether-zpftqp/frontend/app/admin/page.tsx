"use client";
import Link from "next/link";
import { CalendarDays, Plane, PlaneTakeoff, Ticket, UserRound, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminParts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFetch } from "@/hooks/useFetch";
import { adminService } from "@/services/bookings";
import { formatDate, formatMoney, formatTime, titleCase } from "@/lib/utils";

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch(() => adminService.dashboard(), []);
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  const stats = data && [
    { label: "Total flights", value: data.total_flights, icon: Plane },
    { label: "Today's flights", value: data.todays_flights, icon: CalendarDays },
    { label: "Scheduled flights", value: data.scheduled_flights, icon: PlaneTakeoff },
    { label: "Total bookings", value: data.total_bookings, icon: Ticket },
    { label: "Total passengers", value: data.total_passengers, icon: Users },
    { label: "Total customers", value: data.total_customers, icon: UserRound },
  ];
  const overview = data ? Object.entries(data.flight_status_overview) : [];
  const maxStatus = Math.max(1, ...overview.map(([, n]) => n));

  return (
    <>
      <PageHeader title="Dashboard" description="A quick look at flights, bookings and customers." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {loading || !stats
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : stats.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-2xl font-bold">{value}</div>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent bookings</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/bookings">View all</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading || !data ? (
              <Skeleton className="m-5 h-40" />
            ) : data.recent_bookings.length === 0 ? (
              <EmptyState title="No bookings yet" className="m-5 border-0" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Flight</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.booking_reference}</TableCell>
                      <TableCell>{b.customer.full_name}</TableCell>
                      <TableCell>{b.flight.flight_number} <span className="text-muted-foreground">{b.flight.origin.code}→{b.flight.destination.code}</span></TableCell>
                      <TableCell>{formatMoney(b.total_amount)}</TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Flight status overview</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading || !data ? (
              <Skeleton className="h-40" />
            ) : (
              overview.map(([status, n]) => (
                <div key={status}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{titleCase(status)}</span>
                    <span className="font-semibold">{n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(n / maxStatus) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Upcoming flights</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link href="/admin/flights">Manage flights</Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading || !data ? (
            <Skeleton className="m-5 h-32" />
          ) : data.upcoming_flights.length === 0 ? (
            <EmptyState title="No upcoming flights" className="m-5 border-0" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flight</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.upcoming_flights.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-semibold">{f.flight_number}</TableCell>
                    <TableCell>{f.origin.code} → {f.destination.code}</TableCell>
                    <TableCell>{formatDate(f.departure_datetime)} · {formatTime(f.departure_datetime)}</TableCell>
                    <TableCell>{f.aircraft_code}</TableCell>
                    <TableCell><StatusBadge status={f.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
