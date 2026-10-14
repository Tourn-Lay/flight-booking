"use client";
import * as React from "react";
import { Plane, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MapSeat {
  id: number;
  seat_number: string;
  row: number;
  column: string;
  seat_class: string;
  /** AVAILABLE | RESERVED | INACTIVE */
  status: string;
}

interface SeatMapProps {
  seats: MapSeat[];
  /** cabin the customer is booking; seats of other cabins are shown but not selectable */
  cabin?: string;
  selectedIds?: number[];
  onToggle?: (seat: MapSeat) => void;
  /** override which seats are clickable (admin seat management) */
  isClickable?: (seat: MapSeat) => boolean;
}

const CABIN_LABEL: Record<string, string> = { BUSINESS: "Business class", ECONOMY: "Economy class", FIRST_CLASS: "First class" };

export function SeatMap({ seats, cabin, selectedIds = [], onToggle, isClickable }: SeatMapProps) {
  // group seats: class -> row -> seats
  const groups = React.useMemo(() => {
    const order = ["FIRST_CLASS", "BUSINESS", "ECONOMY"];
    const byClass = new Map<string, Map<number, MapSeat[]>>();
    for (const s of seats) {
      if (!byClass.has(s.seat_class)) byClass.set(s.seat_class, new Map());
      const rows = byClass.get(s.seat_class)!;
      rows.set(s.row, [...(rows.get(s.row) ?? []), s]);
    }
    return order
      .filter((c) => byClass.has(c))
      .map((c) => ({
        seatClass: c,
        rows: [...byClass.get(c)!.entries()].sort((a, b) => a[0] - b[0]).map(([row, list]) => [row, list.sort((a, b) => a.column.localeCompare(b.column))] as const),
        columns: [...new Set(seats.filter((s) => s.seat_class === c).map((s) => s.column))].sort(),
      }));
  }, [seats]);

  const clickable = (s: MapSeat) => {
    if (isClickable) return isClickable(s);
    return s.status === "AVAILABLE" && (!cabin || s.seat_class === cabin);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex flex-col items-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Plane className="mb-1 h-5 w-5 text-primary" />
        Front
      </div>
      <div className="rounded-t-[3rem] rounded-b-xl border-2 border-border bg-card px-3 pb-6 pt-8 sm:px-6">
        {groups.map((g) => {
          const half = Math.ceil(g.columns.length / 2);
          return (
            <section key={g.seatClass} className="mb-6 last:mb-0">
              <h4
                className={cn(
                  "mb-3 text-center text-xs font-semibold uppercase tracking-wide",
                  cabin && g.seatClass !== cabin ? "text-muted-foreground/60" : "text-foreground",
                )}
              >
                {CABIN_LABEL[g.seatClass] ?? g.seatClass}
                {cabin && g.seatClass !== cabin && " (not in your cabin)"}
              </h4>
              <div className="mb-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-6" />
                {g.columns.map((c, i) => (
                  <React.Fragment key={c}>
                    {i === half && <span className="w-5" />}
                    <span className="w-9 text-center font-medium">{c}</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="space-y-1.5">
                {g.rows.map(([row, list]) => (
                  <div key={row} className="flex items-center justify-center gap-1.5">
                    <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{row}</span>
                    {g.columns.map((col, i) => {
                      const seat = list.find((s) => s.column === col);
                      return (
                        <React.Fragment key={col}>
                          {i === half && <span className="w-5" aria-hidden />}
                          {seat ? (
                            <SeatButton seat={seat} selected={selectedIds.includes(seat.id)} disabled={!clickable(seat)} otherCabin={!!cabin && seat.seat_class !== cabin} onToggle={onToggle} />
                          ) : (
                            <span className="h-9 w-9" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  selected,
  disabled,
  otherCabin,
  onToggle,
}: {
  seat: MapSeat;
  selected: boolean;
  disabled: boolean;
  otherCabin: boolean;
  onToggle?: (seat: MapSeat) => void;
}) {
  const unavailable = seat.status !== "AVAILABLE";
  const label = selected
    ? `Seat ${seat.seat_number}, selected`
    : unavailable
      ? `Seat ${seat.seat_number}, unavailable`
      : `Seat ${seat.seat_number}, available`;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={`${seat.seat_number}${unavailable ? " (unavailable)" : ""}`}
      disabled={disabled}
      onClick={() => onToggle?.(seat)}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md border text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary bg-primary text-primary-foreground shadow",
        !selected && !unavailable && !otherCabin && "border-primary/40 bg-background text-primary hover:bg-primary/10",
        !selected && !unavailable && otherCabin && "border-border bg-background text-muted-foreground/50",
        unavailable && "border-transparent bg-muted text-muted-foreground",
        disabled && !selected && "cursor-not-allowed",
      )}
    >
      {unavailable ? <X className="h-4 w-4" /> : seat.seat_number.replace(/^\d+/, "")}
    </button>
  );
}

export function SeatLegend({ labels }: { labels?: { available: string; selected: string; unavailable: string } }) {
  const l = labels ?? { available: "Available", selected: "Selected", unavailable: "Unavailable" };
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-5 w-5 rounded border border-primary/40 bg-background" /> {l.available}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-5 w-5 rounded border border-primary bg-primary" /> {l.selected}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-muted">
          <X className="h-3 w-3" />
        </span>
        {l.unavailable}
      </span>
    </div>
  );
}
