import { http, request } from "@/lib/api";
import type {
  Booking,
  CabinClass,
  Customer,
  DashboardStats,
  PassengerInput,
  PassengerRecord,
  Paginated,
  Payment,
  PaymentMethod,
} from "@/types";

export interface CreateBookingPayload {
  flight: number;
  cabin_class: CabinClass;
  payment_method: PaymentMethod;
  passengers: (PassengerInput & { seat_id: number })[];
}

export const bookingService = {
  create: (payload: CreateBookingPayload) => request<Booking>(http.post("/bookings/", payload)),
  myBookings: () => request<Booking[]>(http.get("/bookings/my-bookings/")),
  get: (id: number | string) => request<Booking>(http.get(`/bookings/${id}/`)),
  cancel: (id: number) => request<Booking>(http.patch(`/bookings/${id}/cancel/`)),
  // admin
  list: (params: Record<string, unknown> = {}) => request<Paginated<Booking>>(http.get("/bookings/", { params })),
  confirm: (id: number) => request<Booking>(http.patch(`/bookings/${id}/confirm/`)),
  complete: (id: number) => request<Booking>(http.patch(`/bookings/${id}/complete/`)),
  markPaid: (paymentId: number) => request<Payment>(http.patch(`/payments/${paymentId}/mark-paid/`)),
};

export const adminService = {
  dashboard: () => request<DashboardStats>(http.get("/dashboard/stats/")),
  passengers: (params: Record<string, unknown> = {}) =>
    request<Paginated<PassengerRecord>>(http.get("/passengers/", { params })),
  customers: (params: Record<string, unknown> = {}) => request<Paginated<Customer>>(http.get("/customers/", { params })),
  setCustomerActive: (id: number, is_active: boolean) => request<Customer>(http.patch(`/customers/${id}/`, { is_active })),
};
