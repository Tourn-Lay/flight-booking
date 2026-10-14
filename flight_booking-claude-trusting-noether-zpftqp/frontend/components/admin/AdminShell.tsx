"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Menu, Plane, PlaneTakeoff, Ticket, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/Logo";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/airports", label: "Airports", icon: Building2 },
  { href: "/admin/aircraft", label: "Aircraft", icon: Plane },
  { href: "/admin/flights", label: "Flights", icon: PlaneTakeoff },
  { href: "/admin/bookings", label: "Bookings", icon: Ticket },
  { href: "/admin/passengers", label: "Passengers", icon: Users },
  { href: "/admin/customers", label: "Customers", icon: UserRound },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="min-h-screen bg-secondary/40">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-card p-4 lg:flex">
        <div className="mb-6 px-2">
          <Logo href="/admin" />
          <p className="mt-1 text-xs text-muted-foreground">Admin console</p>
        </div>
        <NavLinks />
        <div className="mt-auto px-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">← View customer site</Link>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <div className="hidden text-sm font-medium text-muted-foreground lg:block">Flight Booking Management</div>
          <UserMenu />
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left">
          <SheetTitle className="mb-6"><Logo href="/admin" /></SheetTitle>
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
