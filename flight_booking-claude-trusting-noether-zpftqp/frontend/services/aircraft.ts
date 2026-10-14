import { http, request } from "@/lib/api";
import type { Aircraft, AircraftSeat, Paginated } from "@/types";

export const aircraftService = {
  list: (params: Record<string, unknown> = {}) =>
    request<Paginated<Aircraft>>(http.get("/aircraft/", { params: { page_size: 100, ...params } })),
  create: (payload: Partial<Aircraft> & { business_seats?: number }) => request<Aircraft>(http.post("/aircraft/", payload)),
  update: (id: number, payload: Partial<Aircraft> & { business_seats?: number }) =>
    request<Aircraft>(http.patch(`/aircraft/${id}/`, payload)),
  seats: (id: number) => request<AircraftSeat[]>(http.get(`/aircraft/${id}/seats/`)),
  updateSeat: (seatId: number, status: "ACTIVE" | "INACTIVE") =>
    request<AircraftSeat>(http.patch(`/aircraft/seats/${seatId}/`, { status })),
};
