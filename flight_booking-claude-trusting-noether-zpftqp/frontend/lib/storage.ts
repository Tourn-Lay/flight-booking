// Thin, SSR-safe wrapper around localStorage / sessionStorage.
const ACCESS = "fb_access";
const REFRESH = "fb_refresh";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return typeof window === "undefined" ? fallback : fn();
  } catch {
    return fallback;
  }
}

export const tokenStorage = {
  getAccess: () => safe(() => localStorage.getItem(ACCESS), null),
  getRefresh: () => safe(() => localStorage.getItem(REFRESH), null),
  set: (access: string, refresh?: string) =>
    safe(() => {
      localStorage.setItem(ACCESS, access);
      if (refresh) localStorage.setItem(REFRESH, refresh);
    }, undefined),
  clear: () =>
    safe(() => {
      localStorage.removeItem(ACCESS);
      localStorage.removeItem(REFRESH);
    }, undefined),
};
