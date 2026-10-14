"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Headphones, Plane, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlightSearchForm } from "@/components/flights/FlightSearchForm";
import { toISODate } from "@/lib/utils";

const DESTINATIONS = [
  { from: "PNH", to: "BKK", fromCity: "Phnom Penh", toCity: "Bangkok", price: 89, tone: "from-sky-500 to-blue-700" },
  { from: "PNH", to: "SIN", fromCity: "Phnom Penh", toCity: "Singapore", price: 140, tone: "from-emerald-500 to-teal-700" },
  { from: "PNH", to: "KUL", fromCity: "Phnom Penh", toCity: "Kuala Lumpur", price: 120, tone: "from-indigo-500 to-violet-700" },
  { from: "PNH", to: "SGN", fromCity: "Phnom Penh", toCity: "Ho Chi Minh City", price: 70, tone: "from-orange-500 to-rose-600" },
];

const BENEFITS = [
  { icon: BadgeDollarSign, title: "Transparent prices", text: "See the ticket price, taxes and total before you confirm. No surprises." },
  { icon: Zap, title: "Fast booking", text: "Search, pick your seat and get a booking reference in a few clicks." },
  { icon: ShieldCheck, title: "Seats guaranteed", text: "Every seat is re-checked when you confirm, so two travellers never share a seat." },
  { icon: Headphones, title: "Manage anytime", text: "View, track and cancel your bookings from your account whenever you need." },
];

export default function HomePage() {
  const [defaultDate, setDefaultDate] = React.useState("");
  React.useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDefaultDate(toISODate(d));
  }, []);

  return (
    <>
      <section className="relative bg-gradient-to-b from-primary to-blue-900 pb-24 pt-16 text-primary-foreground">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Plane className="h-3.5 w-3.5 -rotate-45" /> Fly across Southeast Asia
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Where do you want to go?</h1>
            <p className="mt-3 text-blue-100">Compare flights, pick your favourite seat and book in minutes.</p>
          </div>
        </div>
      </section>

      <div className="container -mt-16 relative z-10">
        <FlightSearchForm />
      </div>

      <section className="container mt-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Popular destinations</h2>
            <p className="text-sm text-muted-foreground">Top routes from Phnom Penh</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.to}
              href={`/flights?origin=${d.from}&destination=${d.to}&date=${defaultDate}&passengers=1&cabin_class=ECONOMY`}
              className="group"
            >
              <Card className="overflow-hidden transition-shadow group-hover:shadow-md">
                <div className={`flex h-28 items-end bg-gradient-to-br ${d.tone} p-4 text-white`}>
                  <div className="text-2xl font-bold">{d.to}</div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {d.fromCity} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {d.toCity}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    from <span className="font-semibold text-primary">${d.price}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mt-16">
        <h2 className="mb-6 text-2xl font-bold">Why book with us?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="space-y-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mt-16">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-secondary p-8 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-2xl font-bold">Ready for your next trip?</h2>
            <p className="text-muted-foreground">Create a free account to book flights and manage your trips.</p>
          </div>
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/register">Create account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/flights">Browse flights</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
