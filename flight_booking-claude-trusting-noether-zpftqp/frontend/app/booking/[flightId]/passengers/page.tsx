"use client";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingSteps } from "@/components/bookings/BookingSteps";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { useBookingDraft } from "@/features/booking/BookingContext";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import { flightService } from "@/services/flights";
import { passengersFormSchema } from "@/lib/validators";
import type { PassengerInput } from "@/types";

type FormValues = { passengers: PassengerInput[] };

const blank = (): PassengerInput => ({
  first_name: "",
  last_name: "",
  gender: "" as unknown as "M",
  date_of_birth: "",
  nationality: "",
  passport_number: "",
  passport_expiry: "",
});

function PassengerDetails() {
  const { flightId } = useParams<{ flightId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { draft, ready, update } = useBookingDraft();
  const { data: flight, loading, error, reload } = useFetch(() => flightService.get(flightId), [flightId]);
  const cabin = params.get("cabin_class") ?? draft.cabin;

  const international = flight ? flight.origin_info.country !== flight.destination_info.country : false;
  const seats = draft.flightId === Number(flightId) ? draft.seats : [];
  const schema = React.useMemo(() => passengersFormSchema(international), [international]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: { passengers: [] },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "passengers" });

  // initialise once the draft is loaded
  React.useEffect(() => {
    if (!ready || seats.length === 0 || fields.length > 0) return;
    const saved = draft.passengers;
    replace(
      seats.map((_, i) => {
        if (saved[i]) return { ...blank(), ...saved[i] };
        const p = blank();
        if (i === 0 && user) {
          p.first_name = user.first_name;
          p.last_name = user.last_name;
        }
        return p;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, seats.length]);

  if (loading || !ready) return <PageSkeleton />;
  if (error || !flight) return <div className="container py-10"><ErrorState message={error?.message ?? "Flight not found."} onRetry={reload} /></div>;

  if (seats.length === 0) {
    return (
      <div className="container py-10">
        <ErrorState message="Please choose your seats first." />
        <div className="mt-4 text-center">
          <Button asChild><Link href={`/booking/${flightId}/seats?cabin_class=${cabin}&passengers=${draft.passengerCount}`}>Choose seats</Link></Button>
        </div>
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    update({ passengers: values.passengers });
    router.push(`/booking/${flightId}/review?cabin_class=${cabin}&passengers=${seats.length}`);
  }

  return (
    <div className="container max-w-3xl py-8">
      <BookingSteps current={1} />
      <h1 className="mb-1 text-2xl font-bold">Passenger details</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter the details exactly as shown on the travel document.
        {international ? " Passport details are required for this international flight." : " Passport details are optional for domestic routes."}
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {fields.map((f, i) => (
            <Card key={f.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Passenger {i + 1}</CardTitle>
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">Seat {seats[i]?.seat_number}</span>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name={`passengers.${i}.first_name`} render={({ field }) => (
                  <FormItem><FormLabel>First name</FormLabel><FormControl><Input autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={`passengers.${i}.last_name`} render={({ field }) => (
                  <FormItem><FormLabel>Last name</FormLabel><FormControl><Input autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={`passengers.${i}.gender`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="O">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`passengers.${i}.date_of_birth`} render={({ field }) => (
                  <FormItem><FormLabel>Date of birth</FormLabel><FormControl><Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={`passengers.${i}.nationality`} render={({ field }) => (
                  <FormItem><FormLabel>Nationality</FormLabel><FormControl><Input placeholder="e.g. Cambodian" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="hidden sm:block" />
                <FormField control={form.control} name={`passengers.${i}.passport_number`} render={({ field }) => (
                  <FormItem><FormLabel>Passport number{international ? "" : " (optional)"}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={`passengers.${i}.passport_expiry`} render={({ field }) => (
                  <FormItem><FormLabel>Passport expiry{international ? "" : " (optional)"}</FormLabel><FormControl><Input type="date" min={new Date().toISOString().slice(0, 10)} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-between">
            <Button asChild variant="outline">
              <Link href={`/booking/${flightId}/seats?cabin_class=${cabin}&passengers=${seats.length}`}>Back</Link>
            </Button>
            <Button type="submit" size="lg">Continue to Review</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function PassengersPage() {
  return (
    <React.Suspense fallback={<PageSkeleton />}>
      <PassengerDetails />
    </React.Suspense>
  );
}

