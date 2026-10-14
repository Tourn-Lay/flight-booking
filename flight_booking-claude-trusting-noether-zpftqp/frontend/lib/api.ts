import axios, { AxiosError } from "axios";
import type { ApiEnvelope } from "@/types";
import { tokenStorage } from "./storage";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const http = axios.create({ baseURL: API_URL, headers: { "Content-Type": "application/json" } });

/** Error thrown for every failed API call, carrying the backend's message and field errors. */
export class ApiError extends Error {
  status: number;
  errors: Record<string, unknown>;
  constructor(message: string, status = 0, errors: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

http.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- automatic access-token refresh on 401 -----------------------------------
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const res = await axios.post<ApiEnvelope<{ access: string }>>(`${API_URL}/auth/refresh/`, { refresh });
    const access = res.data.data.access;
    tokenStorage.set(access);
    return access;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const isAuthCall = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall && tokenStorage.getRefresh()) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
      if (typeof window !== "undefined") window.dispatchEvent(new Event("fb:session-expired"));
    }
    return Promise.reject(error);
  },
);

function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as Partial<ApiEnvelope<unknown>> | undefined;
    if (body?.message) return new ApiError(body.message, err.response?.status, (body.errors as Record<string, unknown>) ?? {});
    if (!err.response) return new ApiError("Cannot reach the server. Please check your connection and try again.", 0);
    return new ApiError(`Request failed (${err.response.status}).`, err.response.status);
  }
  return new ApiError(err instanceof Error ? err.message : "Unexpected error.");
}

/** Unwraps the {success, message, data} envelope and normalises errors. */
export async function request<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    const res = await promise;
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

/** Same as request() but also returns the success message (for toasts). */
export async function requestWithMessage<T>(promise: Promise<{ data: ApiEnvelope<T> }>) {
  try {
    const res = await promise;
    return { data: res.data.data, message: res.data.message };
  } catch (err) {
    throw toApiError(err);
  }
}
