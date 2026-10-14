"use client";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageSkeleton, Unauthorized } from "@/components/ui/states";
import type { Role } from "@/types";

/** Client-side route guard. (The real enforcement is on the Django API.) */
export function RequireAuth({ role, children }: { role?: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) return <PageSkeleton />;
  if (role && user.role !== role) return <Unauthorized message="This area is for administrators only." />;
  return <>{children}</>;
}
