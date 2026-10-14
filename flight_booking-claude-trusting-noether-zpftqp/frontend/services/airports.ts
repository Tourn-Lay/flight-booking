import { http, request } from "@/lib/api";
import type { Airport, Paginated } from "@/types";

export const airportService = {
  list: (params: Record<string, unknown> = {}) =>
    request<Paginated<Airport>>(http.get("/airports/", { params: { page_size: 100, ...params } })),
  create: (payload: Partial<Airport>) => request<Airport>(http.post("/airports/", payload)),
  update: (id: number, payload: Partial<Airport>) => request<Airport>(http.patch(`/airports/${id}/`, payload)),
  remove: (id: number) => request<null>(http.delete(`/airports/${id}/`)),
};
