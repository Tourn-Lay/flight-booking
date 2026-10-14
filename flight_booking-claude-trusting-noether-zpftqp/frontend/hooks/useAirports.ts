"use client";
import { airportService } from "@/services/airports";
import { useFetch } from "./useFetch";

/** Active airports for dropdowns (customers only ever receive active ones from the API). */
export function useAirports() {
  const { data, loading, error } = useFetch(() => airportService.list({ page_size: 100 }), []);
  return { airports: data?.results ?? [], loading, error };
}
