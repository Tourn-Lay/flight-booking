"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlaneTakeoff } from "lucide-react";
import { FlightSearchForm } from "@/components/flights/FlightSearchForm";
import { FlightCard } from "@/components/flights/FlightCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardListSkeleton, EmptyState, ErrorState, NoResults } from "@/components/ui/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/hooks/useFetch";
import { flightService } from "@/services/flights";
import { formatLongDate, formatMoney, parseISODate, titleCase } from "@/lib/utils";
import type { CabinClass, FlightSearchResult } from "@/types";

const TIME_SLOTS = [
  { key: "morning", label: "Morning", sub: "05:00 - 11:59", from: 5, to: 12 },
  { key: "afternoon", label: "Afternoon", sub: "12:00 - 17:59", from: 12, to: 18 },
  { key: "evening", label: "Evening", sub: "18:00 - 04:59", from: 18, to: 29 },
];

function hourInCambodia(iso: string) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Phnom_Penh" }).format(new Date(iso)));
  return h < 5 ? h + 24 : h;
}

function FlightsContent() {
  const params = useSearchParams();
  const origin = params.get("origin") ?? "";
  const destination = params.get("destination") ?? "";
  const date = params.get("date") ?? "";
  const passengers = Math.max(1, Number(params.get("passengers") ?? 1) || 1);
  const cabin = (params.get("cabin_class") === "BUSINESS" ? "BUSINESS" : "ECONOMY") as CabinClass;
  const hasSearch = Boolean(origin && destination && date);

  const { data, loading, error, reload } = useFetch(
    () => flightService.search({ origin, destination, date, passengers, cabin_class: cabin }),
    [origin, destination, date, passengers, cabin],
    hasSearch,
  );

  // --- client-side filters
  const [slots, setSlots] = React.useState<string[]>([]);
  const [maxPrice, setMaxPrice] = React.useState<number | null>(null);
  const [sort, setSort] = React.useState("time");

  const prices = (data ?? []).map((f) => Number(f.price));
  const highest = prices.length ? Math.ceil(Math.max(...prices)) : 0;
  const lowest = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const limit = maxPrice ?? highest;

  React.useEffect(() => setMaxPrice(null), [origin, destination, date, cabin]);

  const visible = React.useMemo(() => {
    let list = (data ?? []).filter((f: FlightSearchResult) => Number(f.price) <= limit);
    if (slots.length) {
      list = list.filter((f) => {
        const h = hourInCambodia(f.departure_datetime);
        return TIME_SLOTS.some((s) => slots.includes(s.key) && h >= s.from && h < s.to);
      });
    }
    return [...list].sort((a, b) => (sort === "price" ? Number(a.price) - Number(b.price) : a.departure_datetime.localeCompare(b.departure_datetime)));
  }, [data, limit, slots, sort]);

  const initial = hasSearch ? { origin, destination, date, passengers, cabin_class: cabin } : undefined;

  return (
    <div className="container py-8">
      <FlightSearchForm initial={initial} compact />

      {!hasSearch ? (
        <EmptyState
          className="mt-8"
          icon={PlaneTakeoff}
          title="Where would you like to fly?"
          description="Choose your origin, destination and date above to see available flights."
        />
      ) : (
        <>
          <div className="mt-8">
            <h1 className="text-2xl font-bold">
              {origin} → {destination}
            </h1>
            <p className="text-muted-foreground">
              {formatLongDate(parseISODate(date).toISOString())} · {passengers} Passenger{passengers > 1 ? "s" : ""} · {titleCase(cabin)}
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside>
              <Card>
                <CardContent className="space-y-6 p-5">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Departure time</h3>
                    <div className="space-y-2">
                      {TIME_SLOTS.map((s) => (
                        <label key={s.key} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[hsl(var(--primary))]"
                            checked={slots.includes(s.key)}
                            onChange={(e) => setSlots((cur) => (e.target.checked ? [...cur, s.key] : cur.filter((k) => k !== s.key)))}
                          />
                          <span>{s.label}</span>
                          <span className="text-xs text-muted-foreground">{s.sub}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Price per passenger</h3>
                    {highest > 0 ? (
                      <>
                        <input
                          type="range"
                          min={lowest}
                          max={highest}
                          value={limit}
                          onChange={(e) => setMaxPrice(Number(e.target.value))}
                          className="w-full accent-[hsl(var(--primary))]"
                          aria-label="Maximum price"
                        />
                        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                          <span>{formatMoney(lowest)}</span>
                          <span>up to {formatMoney(limit)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No prices to filter yet.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Cabin class</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ECONOMY", "BUSINESS"] as CabinClass[]).map((c) => (
                        <Button key={c} asChild size="sm" variant={c === cabin ? "default" : "outline"}>
                          <Link href={`/flights?origin=${origin}&destination=${destination}&date=${date}&passengers=${passengers}&cabin_class=${c}`}>{titleCase(c)}</Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>

            <section>
              {!loading && !error && (
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {visible.length} flight{visible.length === 1 ? "" : "s"} found
                  </p>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Earliest departure</SelectItem>
                      <SelectItem value="price">Lowest price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {loading && <CardListSkeleton rows={3} />}
              {error && <ErrorState message={error.message} onRetry={reload} />}
              {!loading && !error && data && data.length === 0 && (
                <NoResults
                  title="No flights found for your selected route and date."
                  description="Try a different date, fewer passengers or another cabin class."
                />
              )}
              {!loading && !error && data && data.length > 0 && visible.length === 0 && (
                <NoResults title="No flights match your filters." description="Adjust the departure time or price filter." />
              )}
              <div className="space-y-4">
                {!loading && !error && visible.map((f) => <FlightCard key={f.id} flight={f} passengers={passengers} />)}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default function FlightsPage() {
  return (
    <React.Suspense fallback={<div className="container py-8"><CardListSkeleton /></div>}>
      <FlightsContent />
    </React.Suspense>
  );
}
