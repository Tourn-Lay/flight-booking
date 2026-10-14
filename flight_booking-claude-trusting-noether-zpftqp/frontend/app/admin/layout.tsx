import { AdminShell } from "@/components/admin/AdminShell";
import { RequireAuth } from "@/components/layout/RequireAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="ADMIN">
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
