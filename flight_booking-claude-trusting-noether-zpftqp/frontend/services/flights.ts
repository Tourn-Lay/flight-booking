import { http, request } from "@/lib/api";
import type { CabinClass, Flight, FlightSearchResult, FlightStatus, Paginated, SeatState } from "@/types";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  cabin_class: CabinClass;
}

export const flightService = {
  search: (params: FlightSearchParams) => request<FlightSearchResult[]>(http.get("/flights/search/", { params })),
  get: (id: number | string) => request<Flight>(http.get(`/flights/${id}/`)),
  seats: (id: number | string) => request<{ flight: Flight; seats: SeatState[] }>(http.get(`/flights/${id}/seats/`)),
  list: (params: Record<string, unknown> = {}) => request<Paginated<Flight>>(http.get("/flights/", { params })),
  create: (payload: Record<string, unknown>) => request<Flight>(http.post("/flights/", payload)),
  update: (id: number, payload: Record<string, unknown>) => request<Flight>(http.put(`/flights/${id}/`, payload)),
  updateStatus: (id: number, status: FlightStatus) => request<Flight>(http.patch(`/flights/${id}/status/`, { status })),
};
