"use client";
import * as React from "react";
import { Ban, Eye, Loader2, MoreHorizontal, Pencil, Plus, Repeat, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { DetailRow, FilterBar, FilterSelect, PageHeader, SearchInput, TableCard } from "@/components/admin/AdminParts";
import { FlightSummary } from "@/components/bookings/FlightSummary";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounced, useFetch } from "@/hooks/useFetch";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { ApiError } from "@/lib/api";
import { flightSchema } from "@/lib/validators";
import { formatDate, formatMoney, formatTime, isoToLocalInput, localInputToISO } from "@/lib/utils";
import { aircraftService } from "@/services/aircraft";
import { airportService } from "@/services/airports";
import { flightService } from "@/services/flights";
import type { Flight, FlightStatus } from "@/types";

type Values = z.infer<typeof flightSchema>;
const STATUSES: FlightStatus[] = ["SCHEDULED", "BOARDING", "DEPARTED", "ARRIVED", "DELAYED", "CANCELLED"];
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const EMPTY: Values = {
  flight_number: "", aircraft: "", origin: "", destination: "", departure_datetime: "", arrival_datetime: "",
  economy_price: 95, business_price: 220,
};

function FlightDialog({ flight, open, onOpenChange, onSaved }: { flight: Flight | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const form = useForm<Values>({ resolver: zodResolver(flightSchema), defaultValues: EMPTY });
  const { data: airports } = useFetch(() => airportService.list({ page_size: 100 }), [], open);
  const { data: aircraft } = useFetch(() => aircraftService.list({ page_size: 100, status: "ACTIVE" }), [], open);

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      flight
        ? {
            flight_number: flight.flight_number,
            aircraft: String(flight.aircraft),
            origin: String(flight.origin),
            destination: String(flight.destination),
            departure_datetime: isoToLocalInput(flight.departure_datetime),
            arrival_datetime: isoToLocalInput(flight.arrival_datetime),
            economy_price: Number(flight.economy_price),
            business_price: Number(flight.business_price),
          }
        : EMPTY,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flight]);

  async function onSubmit(v: Values) {
    const payload = {
      flight_number: v.flight_number.toUpperCase(),
      aircraft: Number(v.aircraft),
      origin: Number(v.origin),
      destination: Number(v.destination),
      departure_datetime: localInputToISO(v.departure_datetime),
      arrival_datetime: localInputToISO(v.arrival_datetime),
      economy_price: v.economy_price,
      business_price: v.business_price,
    };
    try {
      if (flight) await flightService.update(flight.id, payload);
      else await flightService.create(payload);
      toast.success(flight ? "Flight updated successfully." : "Flight created successfully.");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [f, m] of Object.entries(e.errors)) if (f in v) form.setError(f as keyof Values, { message: Array.isArray(m) ? String(m[0]) : String(m) });
        toast.error(e.message);
      }
    }
  }

  const airportField = (name: "origin" | "destination", text: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{text}</FormLabel>
        <Select value={field.value || undefined} onValueChange={field.onChange}>
          <FormControl><SelectTrigger><SelectValue placeholder="Select airport" /></SelectTrigger></FormControl>
          <SelectContent>
            {airports?.results.filter((a) => a.status === "ACTIVE" || String(a.id) === field.value).map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.city}</SelectItem>)}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )} />
  );
  const price = (name: "economy_price" | "business_price", text: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{text}</FormLabel>
        <FormControl><Input type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(e.target.value === "" ? NaN : Number(e.target.value))} value={Number.isNaN(field.value) ? "" : field.value} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
  const when = (name: "departure_datetime" | "arrival_datetime", text: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{text}</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
    )} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{flight ? `Edit flight ${flight.flight_number}` : "Create flight"}</DialogTitle>
          <DialogDescription>Times are in Cambodia time (UTC+7). Changing prices never affects existing bookings.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="flight_number" render={({ field }) => (
                <FormItem><FormLabel>Flight number</FormLabel><FormControl><Input placeholder="G7-101" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="aircraft" render={({ field }) => (
                <FormItem>
                  <FormLabel>Aircraft (active only)</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select aircraft" /></SelectTrigger></FormControl>
                    <SelectContent>{aircraft?.results.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.aircraft_code} - {a.manufacturer} {a.model}</SelectItem>)}
                      {flight && !aircraft?.results.some((a) => a.id === flight.aircraft) && <SelectItem value={String(flight.aircraft)}>{flight.aircraft_info.aircraft_code} (current)</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {airportField("origin", "Origin")}
              {airportField("destination", "Destination")}
              {when("departure_datetime", "Departure")}
              {when("arrival_datetime", "Arrival")}
              {price("economy_price", "Economy price (USD)")}
              {price("business_price", "Business price (USD)")}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} {flight ? "Save changes" : "Create flight"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminFlightsPage() {
  const [search, setSearch] = React.useState("");
  const [origin, setOrigin] = React.useState("ALL");
  const [destination, setDestination] = React.useState("ALL");
  const [date, setDate] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const debounced = useDebounced(search);
  const { data: airports } = useFetch(() => airportService.list({ page_size: 100 }), []);
  const { data, loading, error, reload, page, setPage, totalPages } = usePagedQuery(flightService.list, {
    search: debounced, origin, destination, date, status, ordering: "-departure_datetime",
  });

  const [editing, setEditing] = React.useState<Flight | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<Flight | null>(null);
  const [cancelling, setCancelling] = React.useState<Flight | null>(null);
  const airportOptions = (airports?.results ?? []).map((a) => ({ value: a.code, label: `${a.code} - ${a.city}` }));

  async function setFlightStatus(f: Flight, s: FlightStatus) {
    try {
      await flightService.updateStatus(f.id, s);
      toast.success(`Flight ${f.flight_number} is now ${s.toLowerCase()}.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the status.");
    }
  }

  return (
    <>
      <PageHeader title="Flights" description="Schedule flights, set prices and update flight status." actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> Create flight</Button>} />
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search flight, city..." />
        <FilterSelect value={origin} onChange={setOrigin} placeholder="Any origin" options={airportOptions} />
        <FilterSelect value={destination} onChange={setDestination} placeholder="Any destination" options={airportOptions} />
        <div className="flex gap-1">
          <DatePicker value={date} onChange={setDate} placeholder="Any date" />
          {date && <Button variant="ghost" size="icon" onClick={() => setDate("")} aria-label="Clear date"><X /></Button>}
        </div>
        <FilterSelect value={status} onChange={setStatus} placeholder="All statuses" options={STATUSES.map((s) => ({ value: s, label: label(s) }))} />
      </FilterBar>

      <TableCard loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length} emptyTitle="No flights found." page={page} totalPages={totalPages} onPageChange={setPage} total={data?.count}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flight</TableHead><TableHead>Route</TableHead><TableHead>Aircraft</TableHead><TableHead>Departure</TableHead><TableHead>Arrival</TableHead>
              <TableHead>Economy</TableHead><TableHead>Business</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-bold">{f.flight_number}</TableCell>
                <TableCell className="whitespace-nowrap">{f.origin_info.code} → {f.destination_info.code}</TableCell>
                <TableCell>{f.aircraft_info.aircraft_code}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(f.departure_datetime)}<br /><span className="text-xs text-muted-foreground">{formatTime(f.departure_datetime)}</span></TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(f.arrival_datetime)}<br /><span className="text-xs text-muted-foreground">{formatTime(f.arrival_datetime)}</span></TableCell>
                <TableCell>{formatMoney(f.economy_price)}</TableCell>
                <TableCell>{formatMoney(f.business_price)}</TableCell>
                <TableCell><StatusBadge status={f.status} /></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${f.flight_number}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setViewing(f)}><Eye /> View</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setEditing(f); setFormOpen(true); }}><Pencil /> Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground"><Repeat className="h-3 w-3" /> Update status</DropdownMenuLabel>
                      {STATUSES.filter((s) => s !== f.status && s !== "CANCELLED").map((s) => (
                        <DropdownMenuItem key={s} onSelect={() => setFlightStatus(f, s)}>{label(s)}</DropdownMenuItem>
                      ))}
                      {f.status !== "CANCELLED" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setCancelling(f)}><Ban /> Cancel flight</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <FlightDialog flight={editing} open={formOpen} onOpenChange={setFormOpen} onSaved={reload} />

      <Sheet open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Flight {viewing?.flight_number}</SheetTitle>
            <SheetDescription>Flight details and seat availability</SheetDescription>
          </SheetHeader>
          {viewing && (
            <div className="mt-5 space-y-5">
              <FlightSummary flight={viewing} />
              <dl>
                <DetailRow label="Economy price">{formatMoney(viewing.economy_price)}</DetailRow>
                <DetailRow label="Business price">{formatMoney(viewing.business_price)}</DetailRow>
                <DetailRow label="Economy seats left">{viewing.available_seats.economy}</DetailRow>
                <DetailRow label="Business seats left">{viewing.available_seats.business}</DetailRow>
                <DetailRow label="Bookable">{viewing.is_bookable ? "Yes" : "No"}</DetailRow>
              </dl>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
        title={`Cancel flight ${cancelling?.flight_number}?`}
        description="Every pending or confirmed booking on this flight will be cancelled, seats released and paid bookings refunded. This cannot be undone."
        confirmLabel="Cancel flight"
        onConfirm={async () => { if (cancelling) await setFlightStatus(cancelling, "CANCELLED"); }}
      />
    </>
  );
}
