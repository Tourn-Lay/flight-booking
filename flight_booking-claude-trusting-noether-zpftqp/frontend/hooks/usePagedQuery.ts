"use client";
import * as React from "react";
import type { Paginated } from "@/types";
import { useFetch } from "./useFetch";

/** Server-side pagination + filters. Filter changes reset to page 1. */
export function usePagedQuery<T>(
  fetcher: (params: Record<string, unknown>) => Promise<Paginated<T>>,
  filters: Record<string, string | number | undefined>,
  pageSize = 10,
) {
  const [page, setPage] = React.useState(1);
  const key = JSON.stringify(filters);

  React.useEffect(() => setPage(1), [key]);

  const clean = React.useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== "" && v !== "ALL")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const query = useFetch(() => fetcher({ ...clean, page, page_size: pageSize }), [key, page]);
  return { ...query, page, setPage, totalPages: query.data?.total_pages ?? 1 };
}
