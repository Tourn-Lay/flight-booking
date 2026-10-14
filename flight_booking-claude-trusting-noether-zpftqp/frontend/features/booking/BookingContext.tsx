"use client";
import * as React from "react";
import type { CabinClass, PassengerInput, PaymentMethod } from "@/types";

export interface SelectedSeat {
  id: number;
  seat_number: string;
}

export interface BookingDraft {
  flightId: number | null;
  cabin: CabinClass;
  passengerCount: number;
  seats: SelectedSeat[];
  passengers: PassengerInput[];
  paymentMethod: PaymentMethod;
}

const EMPTY: BookingDraft = {
  flightId: null,
  cabin: "ECONOMY",
  passengerCount: 1,
  seats: [],
  passengers: [],
  paymentMethod: "PAY_LATER",
};

const KEY = "fb_booking_draft";

interface Ctx {
  draft: BookingDraft;
  ready: boolean;
  update: (patch: Partial<BookingDraft>) => void;
  /** Start (or continue) a draft for this flight; resets when the flight/cabin/party size changed. */
  start: (flightId: number, cabin: CabinClass, passengerCount: number) => void;
  reset: () => void;
}

const BookingContext = React.createContext<Ctx | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = React.useState<BookingDraft>(EMPTY);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setDraft({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* ignore broken storage */
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, ready]);

  const update = React.useCallback((patch: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const reset = React.useCallback(() => setDraft(EMPTY), []);
  const start = React.useCallback((flightId: number, cabin: CabinClass, passengerCount: number) => {
    setDraft((d) =>
      d.flightId === flightId && d.cabin === cabin && d.passengerCount === passengerCount
        ? d
        : { ...EMPTY, flightId, cabin, passengerCount },
    );
  }, []);

  const value = React.useMemo(() => ({ draft, ready, update, start, reset }), [draft, ready, update, start, reset]);
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBookingDraft() {
  const ctx = React.useContext(BookingContext);
  if (!ctx) throw new Error("useBookingDraft must be used inside <BookingProvider>");
  return ctx;
}
