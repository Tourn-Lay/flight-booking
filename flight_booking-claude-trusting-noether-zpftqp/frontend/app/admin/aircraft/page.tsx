"use client";
import * as React from "react";
import { Eye, Loader2, MoreHorizontal, Pencil, Plus, Repeat } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { DetailRow, FilterBar, FilterSelect, PageHeader, SearchInput, TableCard } from "@/components/admin/AdminParts";
import { SeatLegend, SeatMap, type MapSeat } from "@/components/seats/SeatMap";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounced, useFetch } from "@/hooks/useFetch";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { ApiError } from "@/lib/api";
import { aircraftSchema } from "@/lib/validators";
import { aircraftService } from "@/services/aircraft";
import type { Aircraft, AircraftStatus } from "@/types";

type Values = z.infer<typeof aircraftSchema>;
const STATUSES: AircraftStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE"];

function AircraftDialog({ aircraft, open, onOpenChange, onSaved }: { aircraft: Aircraft | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const form = useForm<Values>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: { aircraft_code: "", manufacturer: "", model: "", total_seats: 180, business_seats: 12, status: "ACTIVE" },
  });
  const locked = Boolean(aircraft && (aircraft.flights_count ?? 0) > 0);
  React.useEffect(() => {
    if (!open) return;
    form.reset(
      aircraft
        ? { aircraft_code: aircraft.aircraft_code, manufacturer: aircraft.manufacturer, model: aircraft.model, total_seats: aircraft.total_seats, business_seats: aircraft.business_seat_count ?? 0, status: aircraft.status }
        : { aircraft_code: "", manufacturer: "", model: "", total_seats: 180, business_seats: 12, status: "ACTIVE" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, aircraft]);

  async function onSubmit(v: Values) {
    try {
      if (v.business_seats > v.total_seats) return form.setError("business_seats", { message: "Cannot exceed total seats" });
      if (aircraft) {
        const { total_seats, business_seats, ...rest } = v;
        await aircraftService.update(aircraft.id, locked ? rest : { ...rest, total_seats, business_seats });
      } else await aircraftService.create(v);
      toast.success(aircraft ? "Aircraft updated successfully." : "Aircraft created with its seat map.");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [f, m] of Object.entries(e.errors)) if (f in v) form.setError(f as keyof Values, { message: Array.isArray(m) ? String(m[0]) : String(m) });
        toast.error(e.message);
      }
    }
  }

  const text = (name: "aircraft_code" | "manufacturer" | "model", label: string, placeholder: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input placeholder={placeholder} {...field} /></FormControl><FormMessage /></FormItem>
    )} />
  );
  const num = (name: "total_seats" | "business_seats", label: string, hint?: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input type="number" disabled={locked} {...field} onChange={(e) => field.onChange(e.target.value === "" ? NaN : Number(e.target.value))} value={Number.isNaN(field.value) ? "" : field.value} /></FormControl>
        {hint && <FormDescription>{hint}</FormDescription>}
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{aircraft ? "Edit aircraft" : "Create aircraft"}</DialogTitle>
          <DialogDescription>{locked ? "Seat layout is locked because this aircraft is assigned to flights." : "Seats are generated automatically from these numbers."}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {text("aircraft_code", "Aircraft code", "AC-005")}
            <div className="grid gap-4 sm:grid-cols-2">
              {text("manufacturer", "Manufacturer", "Airbus")}
              {text("model", "Model", "A320")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {num("total_seats", "Total seats")}
              {num("business_seats", "Business seats", "Multiple of 4 (4 per row)")}
            </div>
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} {aircraft ? "Save changes" : "Create aircraft"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AircraftView({ aircraft, onClose, onChanged }: { aircraft: Aircraft | null; onClose: () => void; onChanged: () => void }) {
  const { data: seats, loading, reload } = useFetch(() => aircraftService.seats(aircraft!.id), [aircraft?.id], aircraft !== null);
  const mapSeats: MapSeat[] = (seats ?? []).map((s) => ({ ...s, status: s.status === "ACTIVE" ? "AVAILABLE" : "INACTIVE" }));

  async function toggle(seat: MapSeat) {
    try {
      await aircraftService.updateSeat(seat.id, seat.status === "AVAILABLE" ? "INACTIVE" : "ACTIVE");
      toast.success(`Seat ${seat.seat_number} ${seat.status === "AVAILABLE" ? "deactivated" : "activated"}.`);
      reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the seat.");
    }
  }

  return (
    <Dialog open={aircraft !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{aircraft?.aircraft_code} - {aircraft?.manufacturer} {aircraft?.model}</DialogTitle>
          <DialogDescription>Click a seat to activate / deactivate it. Deactivated seats cannot be booked on any flight.</DialogDescription>
        </DialogHeader>
        {aircraft && (
          <>
            <dl>
              <DetailRow label="Status"><StatusBadge status={aircraft.status} /></DetailRow>
              <DetailRow label="Total seats">{aircraft.total_seats}</DetailRow>
              <DetailRow label="Business / Economy">{aircraft.business_seat_count} / {aircraft.economy_seat_count}</DetailRow>
              <DetailRow label="Assigned flights">{aircraft.flights_count ?? 0}</DetailRow>
            </dl>
            <SeatLegend labels={{ available: "Active", selected: "Selected", unavailable: "Inactive" }} />
            <div className="max-h-[50vh] overflow-y-auto rounded-lg bg-secondary/40 p-3">
              {loading ? <Skeleton className="h-64" /> : <SeatMap seats={mapSeats} isClickable={() => true} onToggle={toggle} />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAircraftPage() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const debounced = useDebounced(search);
  const { data, loading, error, reload, page, setPage, totalPages } = usePagedQuery(aircraftService.list, { search: debounced, status });
  const [editing, setEditing] = React.useState<Aircraft | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [viewingId, setViewingId] = React.useState<number | null>(null);
  const viewing = data?.results.find((a) => a.id === viewingId) ?? null;

  async function changeStatus(a: Aircraft, s: AircraftStatus) {
    try {
      await aircraftService.update(a.id, { status: s });
      toast.success(`${a.aircraft_code} is now ${s.toLowerCase()}.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change status.");
    }
  }

  return (
    <>
      <PageHeader title="Aircraft" description="Manage the fleet and each aircraft's seat map." actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> Create aircraft</Button>} />
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search code, manufacturer, model..." className="sm:col-span-2" />
        <FilterSelect value={status} onChange={setStatus} placeholder="All statuses" options={STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
      </FilterBar>
      <TableCard loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length} emptyTitle="No aircraft found." page={page} totalPages={totalPages} onPageChange={setPage} total={data?.count}>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Aircraft code</TableHead><TableHead>Manufacturer</TableHead><TableHead>Model</TableHead><TableHead>Total seats</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono font-bold">{a.aircraft_code}</TableCell>
                <TableCell>{a.manufacturer}</TableCell>
                <TableCell>{a.model}</TableCell>
                <TableCell>{a.total_seats}</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${a.aircraft_code}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setViewingId(a.id)}><Eye /> View seats</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setEditing(a); setFormOpen(true); }}><Pencil /> Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground"><Repeat className="h-3 w-3" /> Change status</DropdownMenuLabel>
                      {STATUSES.filter((s) => s !== a.status).map((s) => (
                        <DropdownMenuItem key={s} onSelect={() => changeStatus(a, s)}>{s.charAt(0) + s.slice(1).toLowerCase()}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      <AircraftDialog aircraft={editing} open={formOpen} onOpenChange={setFormOpen} onSaved={reload} />
      <AircraftView aircraft={viewing} onClose={() => setViewingId(null)} onChanged={reload} />
    </>
  );
}
