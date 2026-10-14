import { http, request } from "@/lib/api";
import type { User } from "@/types";

export interface AuthResult {
  access: string;
  refresh: string;
  user: User;
}

export const authService = {
  login: (email: string, password: string) =>
    request<AuthResult>(http.post("/auth/login/", { email, password })),
  register: (payload: { email: string; password: string; first_name: string; last_name: string; phone?: string }) =>
    request<{ user: User; access: string; refresh: string }>(http.post("/auth/register/", payload)),
  profile: () => request<User>(http.get("/auth/profile/")),
  updateProfile: (payload: Partial<Pick<User, "first_name" | "last_name" | "email" | "phone">>) =>
    request<User>(http.put("/auth/profile/", payload)),
};
