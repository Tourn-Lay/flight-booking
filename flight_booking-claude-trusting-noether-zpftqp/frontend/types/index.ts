export type Role = "CUSTOMER" | "ADMIN";
export type CabinClass = "ECONOMY" | "BUSINESS";
export type FlightStatus = "SCHEDULED" | "BOARDING" | "DEPARTED" | "ARRIVED" | "DELAYED" | "CANCELLED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";
export type PaymentMethod = "CARD" | "CASH" | "PAY_LATER";
export type AircraftStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, unknown>;
}

export interface Paginated<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: Role;
  date_joined: string;
}

export interface Airport {
  id: number;
  code: string;
  name: string;
  city: string;
  country: string;
  status?: "ACTIVE" | "INACTIVE";
  created_at?: string;
}

export interface Aircraft {
  id: number;
  aircraft_code: string;
  manufacturer: string;
  model: string;
  total_seats: number;
  status: AircraftStatus;
  economy_seat_count?: number;
  business_seat_count?: number;
  flights_count?: number;
}

export interface AircraftSeat {
  id: number;
  seat_number: string;
  row: number;
  column: string;
  seat_class: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface Flight {
  id: number;
  flight_number: string;
  aircraft: number;
  origin: number;
  destination: number;
  origin_info: Airport;
  destination_info: Airport;
  aircraft_info: Pick<Aircraft, "id" | "aircraft_code" | "manufacturer" | "model" | "total_seats">;
  departure_datetime: string;
  arrival_datetime: string;
  economy_price: string;
  business_price: string;
  status: FlightStatus;
  duration_minutes: number;
  is_bookable: boolean;
  available_seats: { economy: number; business: number };
}

export interface FlightSearchResult extends Flight {
  cabin_class: CabinClass;
  price: string;
  available_seats_in_cabin: number;
}

export interface FlightBrief {
  id: number;
  flight_number: string;
  origin: Airport;
  destination: Airport;
  departure_datetime: string;
  arrival_datetime: string;
  status: FlightStatus;
  aircraft_code: string;
}

export interface SeatState {
  id: number;
  seat_number: string;
  row: number;
  column: string;
  seat_class: string;
  status: "AVAILABLE" | "RESERVED" | "INACTIVE";
}

export interface PassengerInput {
  first_name: string;
  last_name: string;
  gender: "M" | "F" | "O";
  date_of_birth: string;
  nationality: string;
  passport_number?: string;
  passport_expiry?: string | null;
}

export interface BookingPassenger {
  id: number;
  passenger_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  passport_expiry: string | null;
  seat_number: string;
  seat_class: string;
  ticket_price: string;
}

export interface Payment {
  id: number;
  payment_method: PaymentMethod;
  amount: string;
  status: PaymentStatus;
  paid_at: string | null;
}

export interface Booking {
  id: number;
  booking_reference: string;
  customer: { id: number; full_name: string; email: string; phone: string };
  flight: FlightBrief;
  cabin_class: CabinClass;
  number_of_passengers: number;
  ticket_price: string;
  tax_rate: string;
  subtotal: string;
  tax: string;
  total_amount: string;
  status: BookingStatus;
  payment: Payment;
  passengers: BookingPassenger[];
  can_cancel: boolean;
  created_at: string;
}

export interface PassengerRecord {
  id: number;
  passenger_id: number;
  full_name: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  passport_expiry: string | null;
  booking_id: number;
  booking_reference: string;
  booking_status: BookingStatus;
  customer_email: string;
  flight: FlightBrief;
  seat_number: string;
  seat_class: string;
}

export interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  total_bookings: number;
  date_joined: string;
  is_active: boolean;
}

export interface DashboardStats {
  total_flights: number;
  todays_flights: number;
  scheduled_flights: number;
  total_bookings: number;
  total_passengers: number;
  total_customers: number;
  recent_bookings: Booking[];
  upcoming_flights: FlightBrief[];
  flight_status_overview: Record<FlightStatus, number>;
  booking_status_overview: Record<BookingStatus, number>;
}
