"use client";
import * as React from "react";
import { ApiError } from "@/lib/api";

/** Minimal data-fetching hook: { data, error, loading, reload }. Re-runs when `deps` change. */
export function useFetch<T>(fetcher: () => Promise<T>, deps: React.DependencyList = [], enabled = true) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [loading, setLoading] = React.useState(enabled);
  const [tick, setTick] = React.useState(0);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((d) => active && setData(d))
      .catch((e: ApiError) => active && setError(e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

export function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
