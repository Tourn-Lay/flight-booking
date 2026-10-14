"use client";
import * as React from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState, NoResults, TableSkeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Card wrapper that handles loading / error / empty / pagination around a table. */
export function TableCard({
  loading,
  error,
  onRetry,
  isEmpty,
  emptyTitle,
  page,
  totalPages,
  onPageChange,
  total,
  children,
}: {
  loading: boolean;
  error: { message: string } | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyTitle: string;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total?: number;
  children: React.ReactNode;
}) {
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
  return (
    <Card className="overflow-hidden">
      {loading ? (
        <TableSkeleton />
      ) : isEmpty ? (
        <div className="p-6">
          <NoResults title={emptyTitle} description="Try changing or clearing your filters." className="border-0" />
        </div>
      ) : (
        children
      )}
      {!loading && !isEmpty && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
          <span className="text-xs text-muted-foreground">{total !== undefined ? `${total} record${total === 1 ? "" : "s"}` : ""}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </Card>
  );
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
