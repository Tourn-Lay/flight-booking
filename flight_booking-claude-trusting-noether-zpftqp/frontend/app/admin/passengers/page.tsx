"use client";
import * as React from "react";
import { Eye } from "lucide-react";
import { DetailRow, FilterBar, PageHeader, SearchInput, TableCard } from "@/components/admin/AdminParts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounced } from "@/hooks/useFetch";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { formatDate, titleCase } from "@/lib/utils";
import { adminService } from "@/services/bookings";
import type { PassengerRecord } from "@/types";

const GENDER: Record<string, string> = { M: "Male", F: "Female", O: "Other" };

export default function AdminPassengersPage() {
  const [search, setSearch] = React.useState("");
  const debounced = useDebounced(search);
  const { data, loading, error, reload, page, setPage, totalPages } = usePagedQuery(adminService.passengers, { search: debounced });
  const [viewing, setViewing] = React.useState<PassengerRecord | null>(null);

  return (
    <>
      <PageHeader title="Passengers" description="Everyone travelling on a booking, with their seat and travel document." />
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, passport, reference, flight..." className="sm:col-span-2" />
      </FilterBar>
      <TableCard loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length} emptyTitle="No passengers found." page={page} totalPages={totalPages} onPageChange={setPage} total={data?.count}>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Passenger</TableHead><TableHead>Booking</TableHead><TableHead>Flight</TableHead><TableHead>Seat</TableHead><TableHead>Nationality</TableHead><TableHead>Passport</TableHead><TableHead className="text-right">View</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                <TableCell className="font-mono text-xs">{p.booking_reference}</TableCell>
                <TableCell className="whitespace-nowrap">{p.flight.flight_number} <span className="text-muted-foreground">{p.flight.origin.code}→{p.flight.destination.code}</span></TableCell>
                <TableCell><span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">{p.seat_number}</span></TableCell>
                <TableCell>{p.nationality}</TableCell>
                <TableCell>{p.passport_number || <span className="text-muted-foreground">-</span>}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setViewing(p)} aria-label={`View ${p.full_name}`}><Eye /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewing?.full_name}</DialogTitle></DialogHeader>
          {viewing && (
            <dl>
              <DetailRow label="Gender">{GENDER[viewing.gender] ?? viewing.gender}</DetailRow>
              <DetailRow label="Date of birth">{formatDate(viewing.date_of_birth)}</DetailRow>
              <DetailRow label="Nationality">{viewing.nationality}</DetailRow>
              <DetailRow label="Passport number">{viewing.passport_number || "-"}</DetailRow>
              <DetailRow label="Passport expiry">{viewing.passport_expiry ? formatDate(viewing.passport_expiry) : "-"}</DetailRow>
              <DetailRow label="Booking">{viewing.booking_reference} <StatusBadge status={viewing.booking_status} className="ml-1" /></DetailRow>
              <DetailRow label="Booked by">{viewing.customer_email}</DetailRow>
              <DetailRow label="Flight">{viewing.flight.flight_number} · {viewing.flight.origin.code} → {viewing.flight.destination.code}</DetailRow>
              <DetailRow label="Departure">{formatDate(viewing.flight.departure_datetime)}</DetailRow>
              <DetailRow label="Seat">{viewing.seat_number} ({titleCase(viewing.seat_class)})</DetailRow>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
