"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, Search } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAirports } from "@/hooks/useAirports";
import { searchSchema } from "@/lib/validators";
import { cn } from "@/lib/utils";

type SearchValues = z.infer<typeof searchSchema>;

export function FlightSearchForm({
  initial,
  className,
  compact = false,
}: {
  initial?: Partial<SearchValues>;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { airports } = useAirports();
  const form = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      origin: initial?.origin ?? "",
      destination: initial?.destination ?? "",
      date: initial?.date ?? "",
      passengers: initial?.passengers ?? 1,
      cabin_class: initial?.cabin_class ?? "ECONOMY",
    },
  });
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // keep the form in sync when the URL (initial) changes
  React.useEffect(() => {
    if (initial) form.reset({ ...form.getValues(), ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.origin, initial?.destination, initial?.date, initial?.passengers, initial?.cabin_class]);

  function onSubmit(v: SearchValues) {
    const qs = new URLSearchParams({
      origin: v.origin,
      destination: v.destination,
      date: v.date,
      passengers: String(v.passengers),
      cabin_class: v.cabin_class,
    });
    router.push(`/flights?${qs.toString()}`);
  }

  function swap() {
    const { origin, destination } = form.getValues();
    form.setValue("origin", destination);
    form.setValue("destination", origin);
  }

  const airportSelect = (name: "origin" | "destination", label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select airport" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {airports.map((a) => (
                <SelectItem key={a.id} value={a.code}>
                  {a.city} ({a.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "grid gap-4 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_130px_150px_auto] lg:items-start",
          compact && "shadow-none",
          className,
        )}
      >
        {airportSelect("origin", "From")}
        <Button type="button" variant="ghost" size="icon" onClick={swap} className="mt-6 hidden self-start lg:inline-flex" aria-label="Swap airports">
          <ArrowLeftRight />
        </Button>
        {airportSelect("destination", "To")}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departure date</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} minDate={today} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="passengers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passengers</FormLabel>
              <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "passenger" : "passengers"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cabin_class"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cabin class</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ECONOMY">Economy</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" variant="accent" className="mt-0 md:col-span-2 lg:col-span-1 lg:mt-6">
          <Search /> Search Flights
        </Button>
      </form>
    </Form>
  );
}
