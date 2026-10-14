"use client";
import * as React from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { DetailRow, FilterBar, FilterSelect, PageHeader, SearchInput, TableCard } from "@/components/admin/AdminParts";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounced } from "@/hooks/useFetch";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { formatDate } from "@/lib/utils";
import { adminService } from "@/services/bookings";
import type { Customer } from "@/types";

export default function AdminCustomersPage() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const debounced = useDebounced(search);
  const { data, loading, error, reload, page, setPage, totalPages } = usePagedQuery(adminService.customers, { search: debounced, status });
  const [viewingId, setViewingId] = React.useState<number | null>(null);
  const viewing = data?.results.find((c) => c.id === viewingId) ?? null;
  const [toggle, setToggle] = React.useState<Customer | null>(null);

  return (
    <>
      <PageHeader title="Customers" description="People who registered on the booking website." />
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone..." className="sm:col-span-2" />
        <FilterSelect value={status} onChange={setStatus} placeholder="All statuses" options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />
      </FilterBar>
      <TableCard loading={loading} error={error} onRetry={reload} isEmpty={!data?.results.length} emptyTitle="No customers found." page={page} totalPages={totalPages} onPageChange={setPage} total={data?.count}>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Customer</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Bookings</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead><TableHead className="text-right">View</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.full_name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone || <span className="text-muted-foreground">-</span>}</TableCell>
                <TableCell>{c.total_bookings}</TableCell>
                <TableCell>{formatDate(c.date_joined)}</TableCell>
                <TableCell><StatusBadge status={c.is_active ? "ACTIVE" : "INACTIVE"} /></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setViewingId(c.id)} aria-label={`View ${c.full_name}`}><Eye /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewing?.full_name}</DialogTitle></DialogHeader>
          {viewing && (
            <>
              <dl>
                <DetailRow label="Email">{viewing.email}</DetailRow>
                <DetailRow label="Phone">{viewing.phone || "-"}</DetailRow>
                <DetailRow label="Total bookings">{viewing.total_bookings}</DetailRow>
                <DetailRow label="Joined">{formatDate(viewing.date_joined)}</DetailRow>
                <DetailRow label="Status"><StatusBadge status={viewing.is_active ? "ACTIVE" : "INACTIVE"} /></DetailRow>
              </dl>
              <DialogFooter>
                <Button variant={viewing.is_active ? "destructive" : "default"} onClick={() => setToggle(viewing)}>
                  {viewing.is_active ? "Deactivate account" : "Activate account"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toggle !== null}
        onOpenChange={(o) => !o && setToggle(null)}
        destructive={toggle?.is_active ?? true}
        title={toggle?.is_active ? "Deactivate this customer?" : "Activate this customer?"}
        description={toggle?.is_active ? "They will no longer be able to log in. Existing bookings are kept." : "They will be able to log in again."}
        confirmLabel={toggle?.is_active ? "Deactivate" : "Activate"}
        onConfirm={async () => {
          if (!toggle) return;
          try {
            await adminService.setCustomerActive(toggle.id, !toggle.is_active);
            toast.success(`Customer ${toggle.is_active ? "deactivated" : "activated"}.`);
            reload();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not update the customer.");
          }
        }}
      />
    </>
  );
}
