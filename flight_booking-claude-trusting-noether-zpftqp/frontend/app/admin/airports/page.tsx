"use client";
import * as React from "react";
import { Eye, Loader2, MoreHorizontal, Pencil, Plus, Power } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { DetailRow, FilterBar, FilterSelect, PageHeader, SearchInput, TableCard } from "@/components/admin/AdminParts";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounced } from "@/hooks/useFetch";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { ApiError } from "@/lib/api";
import { airportSchema } from "@/lib/validators";
import { formatDate } from "@/lib/utils";
import { airportService } from "@/services/airports";
import type { Airport } from "@/types";

type Values = z.infer<typeof airportSchema>;

function AirportDialog({ airport, open, onOpenChange, onSaved }: { airport: Airport | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const form = useForm<Values>({ resolver: zodResolver(airportSchema), defaultValues: { code: "", name: "", city: "", country: "", status: "ACTIVE" } });
  React.useEffect(() => {
    if (open) form.reset(airport ? { code: airport.code, name: airport.name, city: airport.city, country: airport.country, status: airport.status ?? "ACTIVE" } : { code: "", name: "", city: "", country: "", status: "ACTIVE" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, airport]);

  async function onSubmit(v: Values) {
    try {
      const payload = { ...v, code: v.code.toUpperCase() };
      if (airport) await airportService.update(airport.id, payload);
      else await airportService.create(payload);
      toast.success(airport ? "Airport updated successfully." : "Airport created successfully.");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [f, m] of Object.entries(e.errors)) if (f in v) form.setError(f as keyof Values, { message: Array.isArray(m) ? String(m[0]) : String(m) });
        toast.error(e.message);
      }
    }
  }

  const text = (name: keyof Values, label: string, placeholder?: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input placeholder={placeholder} {...field} /></FormControl><FormMessage /></FormItem>
    )} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{airport ? "Edit airport" : "Create airport"}</DialogTitle>
          <DialogDescription>The airport code must be unique (for example PNH).</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              {text("code", "Code", "PNH")}
              {text("name", "Airport name", "Phnom Penh International Airport")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("city", "City", "Phnom Penh")}
              {text("country", "Country", "Cambodia")}
            </div>
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />} {airport ? "Save changes" : "Create airport"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAirportsPage() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const debounced = useDebounced(search);
  const { data, loading, error, reload, page, setPage, totalPages } = usePagedQuery(airportService.list, { search: debounced, status });

  const [editing, setEditing] = React.useState<Airport | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<Airport | null>(null);
  const [toggling, setToggling] = React.useState<Airport | null>(null);

  return (
    <>
      <PageHeader
        title="Airports"
        description="Manage the airports customers can fly between."
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> Create airport</Button>}
      />
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search code, name, city..." className="sm:col-span-2" />
        <FilterSelect value={status} onChange={setStatus} placeholder="All statuses" options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />
      </FilterBar>

      <TableCard loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length} emptyTitle="No airports found." page={page} totalPages={totalPages} onPageChange={setPage} total={data?.count}>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Code</TableHead><TableHead>Airport</TableHead><TableHead>City</TableHead><TableHead>Country</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono font-bold">{a.code}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.city}</TableCell>
                <TableCell>{a.country}</TableCell>
                <TableCell><StatusBadge status={a.status ?? "ACTIVE"} /></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${a.code}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setViewing(a)}><Eye /> View</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setEditing(a); setFormOpen(true); }}><Pencil /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setToggling(a)}><Power /> {a.status === "ACTIVE" ? "Deactivate" : "Activate"}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <AirportDialog airport={editing} open={formOpen} onOpenChange={setFormOpen} onSaved={reload} />

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewing?.code} - {viewing?.name}</DialogTitle></DialogHeader>
          {viewing && (
            <dl>
              <DetailRow label="Code">{viewing.code}</DetailRow>
              <DetailRow label="Name">{viewing.name}</DetailRow>
              <DetailRow label="City">{viewing.city}</DetailRow>
              <DetailRow label="Country">{viewing.country}</DetailRow>
              <DetailRow label="Status"><StatusBadge status={viewing.status ?? "ACTIVE"} /></DetailRow>
              {viewing.created_at && <DetailRow label="Created">{formatDate(viewing.created_at)}</DetailRow>}
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(o) => !o && setToggling(null)}
        destructive={toggling?.status === "ACTIVE"}
        title={toggling?.status === "ACTIVE" ? "Deactivate airport?" : "Activate airport?"}
        description={toggling?.status === "ACTIVE" ? `${toggling?.code} will be hidden from customers and from flight search.` : `${toggling?.code} will become visible to customers again.`}
        confirmLabel={toggling?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        onConfirm={async () => {
          if (!toggling) return;
          try {
            await airportService.update(toggling.id, { status: toggling.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
            toast.success(`Airport ${toggling.code} ${toggling.status === "ACTIVE" ? "deactivated" : "activated"}.`);
            reload();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not update the airport.");
          }
        }}
      />
    </>
  );
}
