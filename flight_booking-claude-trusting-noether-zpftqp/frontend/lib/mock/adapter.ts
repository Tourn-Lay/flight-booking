/**
 * In-browser mock API.
 *
 * When enabled (see `MOCK_ENABLED` in lib/api.ts) axios talks to this adapter instead of the network, so the
 * whole site works with sample data and no Django / MySQL backend. State lives in memory and is persisted to
 * localStorage so registrations and bookings survive a page refresh.
 *
 * Demo logins:   customer@flight.local / Customer123!     admin@flight.local / Admin123!
 */
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import type {
  Aircraft, AircraftSeat, Airport, Booking, BookingPassenger, BookingStatus, CabinClass, Customer, DashboardStats,
  Flight, FlightBrief, FlightStatus, PassengerRecord, PaymentMethod, PaymentStatus, SeatState, User,
} from "@/types";

const STORAGE_KEY = "fb_mock_db_v1";
const TAX_RATE = 0.1;
const DAY = 86_400_000;

// ------------------------------------------------------------------ internal models
interface MockUser extends User { password: string; is_active: boolean }
interface MockBooking {
  id: number; reference: string; customer_id: number; flight_id: number; cabin: CabinClass; status: BookingStatus;
  payment: { id: number; method: PaymentMethod; status: PaymentStatus; paid_at: string | null };
  passengers: { first_name: string; last_name: string; gender: string; date_of_birth: string; nationality: string;
    passport_number: string; passport_expiry: string | null; seat_id: number; ticket_price: number }[];
  created_at: string;
}
interface MockFlight {
  id: number; flight_number: string; aircraft: number; origin: number; destination: number;
  departure_datetime: string; arrival_datetime: string; economy_price: number; business_price: number; status: FlightStatus;
}
interface Db {
  seq: { user: number; airport: number; aircraft: number; flight: number; booking: number; payment: number };
  users: MockUser[]; airports: Airport[]; aircraft: (Aircraft & { business_seats: number })[];
  seatOverrides: Record<number, "ACTIVE" | "INACTIVE">; flights: MockFlight[]; bookings: MockBooking[];
}

// ------------------------------------------------------------------ seed data
const iso = (ms: number) => new Date(ms).toISOString();
/** yyyy-mm-dd in the visitor's local time zone (matches what the date picker sends). */
const localDate = (isoString: string) => {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const money = (n: number) => n.toFixed(2);

function buildSeed(): Db {
  const airports: Airport[] = ([
    ["PNH", "Phnom Penh International Airport", "Phnom Penh", "Cambodia", "ACTIVE"],
    ["SAI", "Siem Reap-Angkor International Airport", "Siem Reap", "Cambodia", "ACTIVE"],
    ["BKK", "Suvarnabhumi Airport", "Bangkok", "Thailand", "ACTIVE"],
    ["SIN", "Singapore Changi Airport", "Singapore", "Singapore", "ACTIVE"],
    ["KUL", "Kuala Lumpur International Airport", "Kuala Lumpur", "Malaysia", "ACTIVE"],
    ["SGN", "Tan Son Nhat International Airport", "Ho Chi Minh City", "Vietnam", "ACTIVE"],
    ["HAN", "Noi Bai International Airport", "Hanoi", "Vietnam", "ACTIVE"],
    ["ICN", "Incheon International Airport", "Seoul", "South Korea", "ACTIVE"],
    ["NRT", "Narita International Airport", "Tokyo", "Japan", "INACTIVE"],
  ] as const).map(([code, name, city, country, status], i) => ({
    id: i + 1, code, name, city, country, status, created_at: iso(Date.now() - 90 * DAY),
  }));
  const apId = (code: string) => airports.find((a) => a.code === code)!.id;

  const aircraft = ([
    ["AC-001", "Airbus", "A320", 180, 12, "ACTIVE"],
    ["AC-002", "Boeing", "737-800", 162, 12, "ACTIVE"],
    ["AC-003", "ATR", "72-600", 72, 8, "ACTIVE"],
    ["AC-004", "Airbus", "A321", 200, 16, "MAINTENANCE"],
  ] as const).map(([aircraft_code, manufacturer, model, total_seats, business_seats, status], i) => ({
    id: i + 1, aircraft_code, manufacturer, model, total_seats, business_seats, status,
  })) as Db["aircraft"];

  // Daily recurring routes so any date in the next ~6 weeks returns results.
  // number, from, to, aircraft id, departure hour, minute, duration (min), economy, business
  const routes = [
    ["G7-101", "PNH", "BKK", 1, 8, 0, 75, 95, 220], ["G7-102", "BKK", "PNH", 1, 11, 0, 75, 98, 225],
    ["G7-103", "PNH", "BKK", 2, 15, 30, 75, 89, 210], ["G7-201", "PNH", "SIN", 2, 9, 0, 130, 140, 360],
    ["G7-202", "SIN", "PNH", 2, 14, 0, 130, 145, 365], ["G7-301", "PNH", "KUL", 1, 13, 0, 180, 120, 300],
    ["G7-302", "KUL", "PNH", 1, 17, 30, 180, 125, 305], ["G7-401", "PNH", "SGN", 3, 10, 0, 60, 70, 160],
    ["G7-402", "SGN", "PNH", 3, 14, 0, 60, 72, 165], ["G7-501", "PNH", "SAI", 3, 7, 30, 50, 55, 130],
    ["G7-502", "SAI", "PNH", 3, 18, 0, 50, 58, 135], ["G7-601", "PNH", "HAN", 2, 7, 45, 135, 130, 330],
    ["G7-701", "PNH", "ICN", 1, 23, 0, 330, 380, 900],
  ] as const;

  const flights: MockFlight[] = [];
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  for (let day = 1; day <= 45; day++) {
    for (const [no, o, d, ac, h, m, mins, eco, biz] of routes) {
      const dep = midnight.getTime() + day * DAY + (h * 60 + m) * 60_000;
      flights.push({
        id: flights.length + 1, flight_number: no, aircraft: ac, origin: apId(o), destination: apId(d),
        departure_datetime: iso(dep), arrival_datetime: iso(dep + mins * 60_000),
        economy_price: eco, business_price: biz, status: "SCHEDULED",
      });
    }
  }
  // A few flights in other states so the admin dashboard has variety.
  const extra: [string, string, string, number, number, number, number, number, FlightStatus][] = [
    ["G7-001", "BKK", "PNH", 1, -3 * DAY + 9 * 3_600_000, 75, 92, 215, "ARRIVED"],
    ["G7-002", "PNH", "SIN", 2, -3_600_000, 130, 138, 355, "DEPARTED"],
    ["G7-503", "PNH", "SAI", 3, 2 * 3_600_000, 50, 55, 130, "BOARDING"],
    ["G7-403", "SGN", "PNH", 3, DAY * 1 + 5 * 3_600_000, 60, 72, 165, "DELAYED"],
    ["G7-702", "PNH", "ICN", 1, 12 * DAY, 330, 380, 900, "CANCELLED"],
  ];
  for (const [no, o, d, ac, offset, mins, eco, biz, status] of extra) {
    const base = no === "G7-001" ? midnight.getTime() : Date.now();
    const dep = base + offset;
    flights.push({
      id: flights.length + 1, flight_number: no, aircraft: ac, origin: apId(o), destination: apId(d),
      departure_datetime: iso(dep), arrival_datetime: iso(dep + mins * 60_000),
      economy_price: eco, business_price: biz, status,
    });
  }

  const mk = (id: number, email: string, first: string, last: string, phone: string, role: "CUSTOMER" | "ADMIN", pw: string): MockUser => ({
    id, email, first_name: first, last_name: last, full_name: `${first} ${last}`, phone, role, password: pw,
    date_joined: iso(Date.now() - (60 - id * 7) * DAY), is_active: true,
  });
  const users = [
    mk(1, "admin@flight.local", "System", "Admin", "", "ADMIN", "Admin123!"),
    mk(2, "customer@flight.local", "Sokha", "Chan", "+855 12 345 678", "CUSTOMER", "Customer123!"),
    mk(3, "dara.kim@example.com", "Dara", "Kim", "+855 97 111 2222", "CUSTOMER", "Customer123!"),
    mk(4, "sophea.lim@example.com", "Sophea", "Lim", "+855 96 333 4444", "CUSTOMER", "Customer123!"),
  ];

  const db: Db = {
    seq: { user: 5, airport: airports.length + 1, aircraft: aircraft.length + 1, flight: flights.length + 1, booking: 1, payment: 1 },
    users, airports, aircraft, seatOverrides: {}, flights, bookings: [],
  };

  // Seed bookings on the first G7-101 flight.
  const f101 = flights.find((f) => f.flight_number === "G7-101")!;
  const f201 = flights.find((f) => f.flight_number === "G7-201")!;
  const p = (first: string, last: string, g: string, dob: string, pass: string) => ({
    first_name: first, last_name: last, gender: g, date_of_birth: dob, nationality: "Cambodian",
    passport_number: pass, passport_expiry: pass ? "2031-06-30" : null,
  });
  seedBooking(db, 2, f101, "ECONOMY", [p("Sokha", "Chan", "F", "1992-04-12", "N1002003"), p("Rithy", "Chan", "M", "1990-09-03", "N1002004")], ["8A", "8B"], "CONFIRMED", "PAID", "CARD");
  seedBooking(db, 2, f201, "BUSINESS", [p("Sokha", "Chan", "F", "1992-04-12", "N1002003")], ["2A"], "PENDING", "UNPAID", "PAY_LATER");
  seedBooking(db, 3, f101, "ECONOMY", [p("Dara", "Kim", "M", "1988-01-25", "N2003001")], ["12C"], "PENDING", "UNPAID", "CARD");
  seedBooking(db, 4, f101, "ECONOMY", [p("Sophea", "Lim", "F", "1995-11-02", "")], ["3A"], "CANCELLED", "REFUNDED", "CARD");
  return db;
}

function seedBooking(db: Db, customer: number, flight: MockFlight, cabin: CabinClass, people: any[], seats: string[], status: BookingStatus, pay: PaymentStatus, method: PaymentMethod) {
  const seatList = seatsFor(db, flight.aircraft);
  const price = cabin === "BUSINESS" ? flight.business_price : flight.economy_price;
  db.bookings.push({
    id: db.seq.booking, reference: makeRef(db.seq.booking), customer_id: customer, flight_id: flight.id, cabin, status,
    payment: { id: db.seq.payment++, method, status: pay, paid_at: pay === "PAID" || pay === "REFUNDED" ? iso(Date.now() - DAY) : null },
    passengers: people.map((x, i) => ({ ...x, seat_id: seatList.find((s) => s.seat_number === seats[i])!.id, ticket_price: price })),
    created_at: iso(Date.now() - 2 * DAY),
  });
  db.seq.booking++;
}

function makeRef(n: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  let x = n * 7919 + 104729;
  for (let i = 0; i < 6; i++) { s += chars[x % chars.length]; x = Math.floor(x / chars.length) + 13 * (i + 1); }
  return `FB${s}`;
}

// ------------------------------------------------------------------ seats
// Business rows first (2-2, columns ABCD), economy after (3-3, columns ABCDEF) - same as the Django backend.
function seatsFor(db: Db, aircraftId: number): (AircraftSeat & { id: number })[] {
  const ac = db.aircraft.find((a) => a.id === aircraftId);
  if (!ac) return [];
  const out: (AircraftSeat & { id: number })[] = [];
  let row = 1;
  let id = aircraftId * 10_000;
  const add = (cols: string, cls: string, limit: number) => {
    let n = 0;
    while (n < limit) {
      for (const col of cols) {
        if (n >= limit) break;
        id++; n++;
        out.push({ id, seat_number: `${row}${col}`, row, column: col, seat_class: cls, status: db.seatOverrides[id] ?? "ACTIVE" });
      }
      row++;
    }
  };
  const biz = Math.max(0, Math.min(ac.business_seats, ac.total_seats));
  add("ABCD", "BUSINESS", biz);
  add("ABCDEF", "ECONOMY", ac.total_seats - biz);
  return out;
}

// ------------------------------------------------------------------ persistence
let db: Db | null = null;
function getDb(): Db {
  if (db) return db;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const stored = JSON.parse(raw) as Db;
      const lastDeparture = Math.max(...stored.flights.map((f) => Date.parse(f.departure_datetime)));
      if (lastDeparture > Date.now() + 14 * DAY) { db = stored; return db; } // else sample flights ran out: reseed
    }
  } catch { /* fall through to a fresh seed */ }
  db = buildSeed();
  return db;
}
function save() {
  try { if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* storage may be full/blocked */ }
}

// ------------------------------------------------------------------ helpers / serializers
class HttpError extends Error {
  constructor(public status: number, message: string, public errors: Record<string, unknown> = {}) { super(message); }
}
const publicUser = ({ password: _p, is_active: _a, ...u }: MockUser): User => u;

function airportOf(d: Db, id: number): Airport { return d.airports.find((a) => a.id === id)!; }
function bookedSeatIds(d: Db, flightId: number) {
  return new Set(d.bookings.filter((b) => b.flight_id === flightId && b.status !== "CANCELLED").flatMap((b) => b.passengers.map((p) => p.seat_id)));
}
function flightOut(d: Db, f: MockFlight): Flight {
  const ac = d.aircraft.find((a) => a.id === f.aircraft)!;
  const seats = seatsFor(d, f.aircraft).filter((s) => s.status === "ACTIVE");
  const taken = bookedSeatIds(d, f.id);
  const free = (cls: string) => seats.filter((s) => s.seat_class === cls && !taken.has(s.id)).length;
  const dur = Math.round((Date.parse(f.arrival_datetime) - Date.parse(f.departure_datetime)) / 60_000);
  return {
    id: f.id, flight_number: f.flight_number, aircraft: f.aircraft, origin: f.origin, destination: f.destination,
    origin_info: airportOf(d, f.origin), destination_info: airportOf(d, f.destination),
    aircraft_info: { id: ac.id, aircraft_code: ac.aircraft_code, manufacturer: ac.manufacturer, model: ac.model, total_seats: ac.total_seats },
    departure_datetime: f.departure_datetime, arrival_datetime: f.arrival_datetime,
    economy_price: money(f.economy_price), business_price: money(f.business_price), status: f.status, duration_minutes: dur,
    is_bookable: (f.status === "SCHEDULED" || f.status === "DELAYED") && Date.parse(f.departure_datetime) > Date.now(),
    available_seats: { economy: free("ECONOMY"), business: free("BUSINESS") },
  };
}
function flightBrief(d: Db, f: MockFlight): FlightBrief {
  return {
    id: f.id, flight_number: f.flight_number, origin: airportOf(d, f.origin), destination: airportOf(d, f.destination),
    departure_datetime: f.departure_datetime, arrival_datetime: f.arrival_datetime, status: f.status,
    aircraft_code: d.aircraft.find((a) => a.id === f.aircraft)!.aircraft_code,
  };
}
function bookingOut(d: Db, b: MockBooking): Booking {
  const f = d.flights.find((x) => x.id === b.flight_id)!;
  const u = d.users.find((x) => x.id === b.customer_id)!;
  const seatMap = new Map(seatsFor(d, f.aircraft).map((s) => [s.id, s]));
  const unit = b.cabin === "BUSINESS" ? f.business_price : f.economy_price;
  const subtotal = unit * b.passengers.length;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const passengers: BookingPassenger[] = b.passengers.map((p, i) => ({
    id: b.id * 100 + i, passenger_id: b.id * 100 + i, first_name: p.first_name, last_name: p.last_name,
    full_name: `${p.first_name} ${p.last_name}`, gender: p.gender, date_of_birth: p.date_of_birth, nationality: p.nationality,
    passport_number: p.passport_number, passport_expiry: p.passport_expiry,
    seat_number: seatMap.get(p.seat_id)?.seat_number ?? "-", seat_class: seatMap.get(p.seat_id)?.seat_class ?? b.cabin,
    ticket_price: money(p.ticket_price),
  }));
  const future = Date.parse(f.departure_datetime) - Date.now() > 2 * 3_600_000;
  return {
    id: b.id, booking_reference: b.reference,
    customer: { id: u.id, full_name: u.full_name, email: u.email, phone: u.phone },
    flight: flightBrief(d, f), cabin_class: b.cabin, number_of_passengers: b.passengers.length,
    ticket_price: money(unit), tax_rate: TAX_RATE.toFixed(2), subtotal: money(subtotal), tax: money(tax), total_amount: money(subtotal + tax),
    status: b.status,
    payment: { id: b.payment.id, payment_method: b.payment.method, amount: money(subtotal + tax), status: b.payment.status, paid_at: b.payment.paid_at },
    passengers, can_cancel: (b.status === "PENDING" || b.status === "CONFIRMED") && future, created_at: b.created_at,
  };
}
function customerOut(d: Db, u: MockUser): Customer {
  return {
    id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name, full_name: u.full_name, phone: u.phone,
    total_bookings: d.bookings.filter((b) => b.customer_id === u.id).length, date_joined: u.date_joined, is_active: u.is_active,
  };
}

function paginate<T>(items: T[], params: Record<string, any>) {
  const page_size = Math.max(1, Number(params.page_size) || 10);
  const count = items.length;
  const total_pages = Math.max(1, Math.ceil(count / page_size));
  const page = Math.min(Math.max(1, Number(params.page) || 1), total_pages);
  return { count, page, page_size, total_pages, results: items.slice((page - 1) * page_size, page * page_size) };
}
const has = (hay: string, needle: unknown) => !needle || hay.toLowerCase().includes(String(needle).toLowerCase());

// ------------------------------------------------------------------ router
interface Ctx { method: string; params: Record<string, any>; body: any; user: MockUser | null; d: Db }
type Handler = (ctx: Ctx, m: RegExpMatchArray) => unknown;
type Route = [method: string, pattern: RegExp, handler: Handler, message?: string];

function requireUser(c: Ctx) { if (!c.user) throw new HttpError(401, "Authentication required."); return c.user; }
function requireAdmin(c: Ctx) { const u = requireUser(c); if (u.role !== "ADMIN") throw new HttpError(403, "Admin access required."); return u; }
const nid = (m: RegExpMatchArray, i = 1) => Number(m[i]);

function findFlight(d: Db, id: number) { const f = d.flights.find((x) => x.id === id); if (!f) throw new HttpError(404, "Flight not found."); return f; }
function findBooking(c: Ctx, id: number) {
  const b = c.d.bookings.find((x) => x.id === id);
  if (!b || (c.user?.role !== "ADMIN" && b.customer_id !== c.user?.id)) throw new HttpError(404, "Booking not found.");
  return b;
}

const routes: Route[] = [
  // ---- auth
  ["POST", /^\/auth\/login\/$/, (c) => {
    const u = c.d.users.find((x) => x.email.toLowerCase() === String(c.body.email ?? "").toLowerCase());
    if (!u || u.password !== c.body.password) throw new HttpError(401, "Invalid email or password.");
    if (!u.is_active) throw new HttpError(403, "This account has been deactivated.");
    return { access: `mock.${u.id}`, refresh: `mockr.${u.id}`, user: publicUser(u) };
  }, "Login successful."],
  ["POST", /^\/auth\/register\/$/, (c) => {
    const b = c.body;
    const errors: Record<string, unknown> = {};
    if (c.d.users.some((x) => x.email.toLowerCase() === String(b.email ?? "").toLowerCase())) errors.email = ["A user with this email already exists."];
    if (!b.password || String(b.password).length < 8) errors.password = ["Password must be at least 8 characters."];
    if (Object.keys(errors).length) throw new HttpError(400, "Registration failed.", errors);
    const id = c.d.seq.user++;
    const u: MockUser = {
      id, email: b.email, first_name: b.first_name, last_name: b.last_name, full_name: `${b.first_name} ${b.last_name}`,
      phone: b.phone ?? "", role: "CUSTOMER", password: b.password, date_joined: iso(Date.now()), is_active: true,
    };
    c.d.users.push(u);
    return { access: `mock.${id}`, refresh: `mockr.${id}`, user: publicUser(u) };
  }, "Account created successfully."],
  ["POST", /^\/auth\/refresh\/$/, (c) => {
    const id = Number(String(c.body.refresh ?? "").split(".")[1]);
    if (!c.d.users.some((u) => u.id === id)) throw new HttpError(401, "Invalid refresh token.");
    return { access: `mock.${id}` };
  }],
  ["GET", /^\/auth\/profile\/$/, (c) => publicUser(requireUser(c) as MockUser)],
  ["PUT", /^\/auth\/profile\/$/, (c) => {
    const u = requireUser(c) as MockUser;
    for (const k of ["first_name", "last_name", "email", "phone"] as const) if (c.body[k] !== undefined) (u as any)[k] = c.body[k];
    u.full_name = `${u.first_name} ${u.last_name}`;
    return publicUser(u);
  }, "Profile updated."],

  // ---- airports
  ["GET", /^\/airports\/$/, (c) => {
    const admin = c.user?.role === "ADMIN";
    let items = c.d.airports.filter((a) => admin || a.status === "ACTIVE");
    const { search, status } = c.params;
    if (status) items = items.filter((a) => a.status === status);
    if (search) items = items.filter((a) => has(`${a.code} ${a.name} ${a.city} ${a.country}`, search));
    return paginate(items, c.params);
  }],
  ["POST", /^\/airports\/$/, (c) => {
    requireAdmin(c);
    if (c.d.airports.some((a) => a.code === String(c.body.code).toUpperCase())) throw new HttpError(400, "Validation failed.", { code: ["Airport code already exists."] });
    const a: Airport = { id: c.d.seq.airport++, status: "ACTIVE", created_at: iso(Date.now()), ...c.body, code: String(c.body.code).toUpperCase() };
    c.d.airports.push(a);
    return a;
  }, "Airport created."],
  ["PATCH", /^\/airports\/(\d+)\/$/, (c, m) => {
    requireAdmin(c);
    const a = c.d.airports.find((x) => x.id === nid(m));
    if (!a) throw new HttpError(404, "Airport not found.");
    Object.assign(a, c.body);
    return a;
  }, "Airport updated."],
  ["DELETE", /^\/airports\/(\d+)\/$/, (c, m) => {
    requireAdmin(c);
    const id = nid(m);
    if (c.d.flights.some((f) => f.origin === id || f.destination === id)) throw new HttpError(400, "This airport is used by flights and cannot be deleted.");
    c.d.airports = c.d.airports.filter((a) => a.id !== id);
    return null;
  }, "Airport deleted."],

  // ---- aircraft
  ["GET", /^\/aircraft\/(\d+)\/seats\/$/, (c, m) => seatsFor(c.d, nid(m))],
  ["PATCH", /^\/aircraft\/seats\/(\d+)\/$/, (c, m) => {
    requireAdmin(c);
    const id = nid(m);
    c.d.seatOverrides[id] = c.body.status;
    const seat = seatsFor(c.d, Math.floor((id - 1) / 10_000)).find((s) => s.id === id);
    if (!seat) throw new HttpError(404, "Seat not found.");
    return seat;
  }, "Seat updated."],
  ["GET", /^\/aircraft\/$/, (c) => {
    let items = c.d.aircraft.map((a) => {
      const seats = seatsFor(c.d, a.id);
      return { ...a, economy_seat_count: seats.filter((s) => s.seat_class === "ECONOMY").length, business_seat_count: seats.filter((s) => s.seat_class === "BUSINESS").length, flights_count: c.d.flights.filter((f) => f.aircraft === a.id).length };
    });
    if (c.params.status) items = items.filter((a) => a.status === c.params.status);
    if (c.params.search) items = items.filter((a) => has(`${a.aircraft_code} ${a.manufacturer} ${a.model}`, c.params.search));
    return paginate(items, c.params);
  }],
  ["POST", /^\/aircraft\/$/, (c) => {
    requireAdmin(c);
    const a = { id: c.d.seq.aircraft++, status: "ACTIVE", business_seats: 0, ...c.body } as Db["aircraft"][number];
    c.d.aircraft.push(a);
    return a;
  }, "Aircraft created."],
  ["PATCH", /^\/aircraft\/(\d+)\/$/, (c, m) => {
    requireAdmin(c);
    const a = c.d.aircraft.find((x) => x.id === nid(m));
    if (!a) throw new HttpError(404, "Aircraft not found.");
    Object.assign(a, c.body);
    return a;
  }, "Aircraft updated."],

  // ---- flights
  ["GET", /^\/flights\/search\/$/, (c) => {
    const { origin, destination, date, passengers, cabin_class } = c.params;
    const cabin: CabinClass = cabin_class === "BUSINESS" ? "BUSINESS" : "ECONOMY";
    const need = Math.max(1, Number(passengers) || 1);
    const find = (v: string) => c.d.airports.find((a) => a.code.toLowerCase() === String(v).toLowerCase() || String(a.id) === String(v));
    const o = find(origin), dst = find(destination);
    if (!o || !dst) return [];
    return c.d.flights
      .filter((f) => f.origin === o.id && f.destination === dst.id && localDate(f.departure_datetime) === String(date))
      .filter((f) => Date.parse(f.departure_datetime) > Date.now() && (f.status === "SCHEDULED" || f.status === "DELAYED" || f.status === "BOARDING"))
      .map((f) => {
        const out = flightOut(c.d, f);
        return { ...out, cabin_class: cabin, price: cabin === "BUSINESS" ? out.business_price : out.economy_price, available_seats_in_cabin: cabin === "BUSINESS" ? out.available_seats.business : out.available_seats.economy };
      })
      .filter((f) => f.available_seats_in_cabin >= need)
      .sort((a, b) => Date.parse(a.departure_datetime) - Date.parse(b.departure_datetime));
  }],
  ["GET", /^\/flights\/(\d+)\/seats\/$/, (c, m) => {
    const f = findFlight(c.d, nid(m));
    const taken = bookedSeatIds(c.d, f.id);
    const seats: SeatState[] = seatsFor(c.d, f.aircraft).map((s) => ({
      id: s.id, seat_number: s.seat_number, row: s.row, column: s.column, seat_class: s.seat_class,
      status: s.status === "INACTIVE" ? "INACTIVE" : taken.has(s.id) ? "RESERVED" : "AVAILABLE",
    }));
    return { flight: flightOut(c.d, f), seats };
  }],
  ["PATCH", /^\/flights\/(\d+)\/status\/$/, (c, m) => {
    requireAdmin(c);
    const f = findFlight(c.d, nid(m));
    f.status = c.body.status;
    return flightOut(c.d, f);
  }, "Flight status updated."],
  ["GET", /^\/flights\/(\d+)\/$/, (c, m) => flightOut(c.d, findFlight(c.d, nid(m)))],
  ["PUT", /^\/flights\/(\d+)\/$/, (c, m) => {
    requireAdmin(c);
    const f = findFlight(c.d, nid(m));
    Object.assign(f, c.body, { economy_price: Number(c.body.economy_price ?? f.economy_price), business_price: Number(c.body.business_price ?? f.business_price) });
    return flightOut(c.d, f);
  }, "Flight updated."],
  ["GET", /^\/flights\/$/, (c) => {
    let items = [...c.d.flights].sort((a, b) => Date.parse(a.departure_datetime) - Date.parse(b.departure_datetime));
    const { status, search, date, origin, destination } = c.params;
    if (status) items = items.filter((f) => f.status === status);
    if (date) items = items.filter((f) => localDate(f.departure_datetime) === String(date));
    if (origin) items = items.filter((f) => f.origin === Number(origin));
    if (destination) items = items.filter((f) => f.destination === Number(destination));
    if (search) items = items.filter((f) => has(`${f.flight_number} ${airportOf(c.d, f.origin).code} ${airportOf(c.d, f.origin).city} ${airportOf(c.d, f.destination).code} ${airportOf(c.d, f.destination).city}`, search));
    const page = paginate(items, c.params);
    return { ...page, results: page.results.map((f) => flightOut(c.d, f)) };
  }],
  ["POST", /^\/flights\/$/, (c) => {
    requireAdmin(c);
    const f: MockFlight = { id: c.d.seq.flight++, status: "SCHEDULED", ...c.body, economy_price: Number(c.body.economy_price), business_price: Number(c.body.business_price) };
    c.d.flights.push(f);
    return flightOut(c.d, f);
  }, "Flight created."],

  // ---- bookings
  ["GET", /^\/bookings\/my-bookings\/$/, (c) => {
    const u = requireUser(c);
    return c.d.bookings.filter((b) => b.customer_id === u.id).sort((a, b) => b.id - a.id).map((b) => bookingOut(c.d, b));
  }],
  ["PATCH", /^\/bookings\/(\d+)\/cancel\/$/, (c, m) => {
    requireUser(c);
    const b = findBooking(c, nid(m));
    if (!bookingOut(c.d, b).can_cancel) throw new HttpError(400, "This booking can no longer be cancelled.");
    b.status = "CANCELLED";
    if (b.payment.status === "PAID") b.payment.status = "REFUNDED";
    return bookingOut(c.d, b);
  }, "Booking cancelled."],
  ["PATCH", /^\/bookings\/(\d+)\/confirm\/$/, (c, m) => { requireAdmin(c); const b = findBooking(c, nid(m)); b.status = "CONFIRMED"; return bookingOut(c.d, b); }, "Booking confirmed."],
  ["PATCH", /^\/bookings\/(\d+)\/complete\/$/, (c, m) => { requireAdmin(c); const b = findBooking(c, nid(m)); b.status = "COMPLETED"; return bookingOut(c.d, b); }, "Booking completed."],
  ["GET", /^\/bookings\/(\d+)\/$/, (c, m) => { requireUser(c); return bookingOut(c.d, findBooking(c, nid(m))); }],
  ["GET", /^\/bookings\/$/, (c) => {
    requireAdmin(c);
    const { reference, customer, flight, status, payment_status, date } = c.params;
    let items = c.d.bookings.map((b) => bookingOut(c.d, b)).sort((a, b) => b.id - a.id);
    if (reference) items = items.filter((b) => has(b.booking_reference, reference));
    if (customer) items = items.filter((b) => has(`${b.customer.full_name} ${b.customer.email}`, customer));
    if (flight) items = items.filter((b) => has(b.flight.flight_number, flight));
    if (status) items = items.filter((b) => b.status === status);
    if (payment_status) items = items.filter((b) => b.payment.status === payment_status);
    if (date) items = items.filter((b) => localDate(b.created_at) === String(date));
    return paginate(items, c.params);
  }],
  ["POST", /^\/bookings\/$/, (c) => {
    const u = requireUser(c);
    const { flight: flightId, cabin_class, payment_method, passengers } = c.body as { flight: number; cabin_class: CabinClass; payment_method: PaymentMethod; passengers: any[] };
    const f = findFlight(c.d, Number(flightId));
    if (!flightOut(c.d, f).is_bookable) throw new HttpError(400, "This flight is not open for booking.");
    const taken = bookedSeatIds(c.d, f.id);
    const seatList = seatsFor(c.d, f.aircraft);
    for (const p of passengers) {
      const seat = seatList.find((s) => s.id === Number(p.seat_id));
      if (!seat || seat.status !== "ACTIVE" || seat.seat_class !== cabin_class) throw new HttpError(400, "One of the selected seats is not available.");
      if (taken.has(seat.id)) throw new HttpError(409, `Seat ${seat.seat_number} was just taken. Please choose another seat.`);
    }
    const unit = cabin_class === "BUSINESS" ? f.business_price : f.economy_price;
    const id = c.d.seq.booking++;
    const paid = payment_method === "CARD";
    c.d.bookings.push({
      id, reference: makeRef(id + Date.now() % 997), customer_id: u.id, flight_id: f.id, cabin: cabin_class, status: paid ? "CONFIRMED" : "PENDING",
      payment: { id: c.d.seq.payment++, method: payment_method, status: paid ? "PAID" : "UNPAID", paid_at: paid ? iso(Date.now()) : null },
      passengers: passengers.map((p) => ({
        first_name: p.first_name, last_name: p.last_name, gender: p.gender, date_of_birth: p.date_of_birth, nationality: p.nationality,
        passport_number: p.passport_number ?? "", passport_expiry: p.passport_expiry ?? null, seat_id: Number(p.seat_id), ticket_price: unit,
      })),
      created_at: iso(Date.now()),
    });
    return bookingOut(c.d, c.d.bookings[c.d.bookings.length - 1]);
  }, "Booking created successfully."],
  ["PATCH", /^\/payments\/(\d+)\/mark-paid\/$/, (c, m) => {
    requireAdmin(c);
    const b = c.d.bookings.find((x) => x.payment.id === nid(m));
    if (!b) throw new HttpError(404, "Payment not found.");
    b.payment.status = "PAID"; b.payment.paid_at = iso(Date.now());
    return bookingOut(c.d, b).payment;
  }, "Payment marked as paid."],

  // ---- admin
  ["GET", /^\/dashboard\/stats\/$/, (c): DashboardStats => {
    requireAdmin(c);
    const d = c.d;
    const now = Date.now();
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const flightStatus = { SCHEDULED: 0, BOARDING: 0, DEPARTED: 0, ARRIVED: 0, DELAYED: 0, CANCELLED: 0 } as Record<FlightStatus, number>;
    d.flights.forEach((f) => flightStatus[f.status]++);
    const bookingStatus = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 } as Record<BookingStatus, number>;
    d.bookings.forEach((b) => bookingStatus[b.status]++);
    return {
      total_flights: d.flights.length,
      todays_flights: d.flights.filter((f) => { const t = Date.parse(f.departure_datetime); return t >= startOfDay.getTime() && t < startOfDay.getTime() + DAY; }).length,
      scheduled_flights: flightStatus.SCHEDULED,
      total_bookings: d.bookings.length,
      total_passengers: d.bookings.reduce((n, b) => n + b.passengers.length, 0),
      total_customers: d.users.filter((u) => u.role === "CUSTOMER").length,
      recent_bookings: [...d.bookings].sort((a, b) => b.id - a.id).slice(0, 5).map((b) => bookingOut(d, b)),
      upcoming_flights: d.flights.filter((f) => Date.parse(f.departure_datetime) > now).sort((a, b) => Date.parse(a.departure_datetime) - Date.parse(b.departure_datetime)).slice(0, 5).map((f) => flightBrief(d, f)),
      flight_status_overview: flightStatus, booking_status_overview: bookingStatus,
    };
  }],
  ["GET", /^\/passengers\/$/, (c) => {
    requireAdmin(c);
    let rows: PassengerRecord[] = c.d.bookings.flatMap((b) => {
      const out = bookingOut(c.d, b);
      return out.passengers.map((p) => ({
        id: p.id, passenger_id: p.passenger_id, full_name: p.full_name, gender: p.gender, date_of_birth: p.date_of_birth, nationality: p.nationality,
        passport_number: p.passport_number, passport_expiry: p.passport_expiry, booking_id: out.id, booking_reference: out.booking_reference,
        booking_status: out.status, customer_email: out.customer.email, flight: out.flight, seat_number: p.seat_number, seat_class: p.seat_class,
      }));
    });
    if (c.params.search) rows = rows.filter((r) => has(`${r.full_name} ${r.passport_number} ${r.booking_reference} ${r.customer_email}`, c.params.search));
    return paginate(rows, c.params);
  }],
  ["GET", /^\/customers\/$/, (c) => {
    requireAdmin(c);
    let rows = c.d.users.filter((u) => u.role === "CUSTOMER").map((u) => customerOut(c.d, u));
    if (c.params.search) rows = rows.filter((r) => has(`${r.full_name} ${r.email} ${r.phone}`, c.params.search));
    if (c.params.is_active !== undefined && c.params.is_active !== "") rows = rows.filter((r) => String(r.is_active) === String(c.params.is_active));
    return paginate(rows, c.params);
  }],
  ["PATCH", /^\/customers\/(\d+)\/$/, (c, m) => {
    requireAdmin(c);
    const u = c.d.users.find((x) => x.id === nid(m));
    if (!u) throw new HttpError(404, "Customer not found.");
    if (c.body.is_active !== undefined) u.is_active = Boolean(c.body.is_active);
    return customerOut(c.d, u);
  }, "Customer updated."],
];

// ------------------------------------------------------------------ axios adapter
export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const d = getDb();
  const method = (config.method ?? "get").toUpperCase();
  const url = String(config.url ?? "").replace(/^https?:\/\/[^/]+/, "").replace(/^\/api(?=\/)/, "").split("?")[0];
  const auth = String(config.headers?.Authorization ?? config.headers?.get?.("Authorization") ?? "");
  const uid = /^Bearer mock\.(\d+)$/.exec(auth)?.[1];
  const user = uid ? d.users.find((u) => u.id === Number(uid)) ?? null : null;
  let body: any = config.data;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const respond = (status: number, payload: unknown): AxiosResponse => ({ data: payload, status, statusText: String(status), headers: {}, config });
  await new Promise((r) => setTimeout(r, 150)); // feel like a real network call

  try {
    for (const [m, pattern, handler, message] of routes) {
      if (m !== method) continue;
      const match = url.match(pattern);
      if (!match) continue;
      const data = handler({ method, params: config.params ?? {}, body: body ?? {}, user, d }, match);
      if (method !== "GET") save();
      return respond(method === "POST" ? 201 : 200, { success: true, message: message ?? "OK", data });
    }
    throw new HttpError(404, `No mock route for ${method} ${url}`);
  } catch (err) {
    if (!(err instanceof HttpError)) throw err;
    const res = respond(err.status, { success: false, message: err.message, data: null, errors: err.errors });
    throw new AxiosError(err.message, "ERR_BAD_REQUEST", config, null, res);
  }
}
