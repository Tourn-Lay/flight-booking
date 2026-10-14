"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/flights", label: "Flights" },
  { href: "/my-bookings", label: "My Bookings" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = React.useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive(l.href) && "bg-secondary text-foreground",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!loading && !user && (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
          {user && <UserMenu />}
          <Button variant="outline" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left">
          <SheetTitle className="mb-6">
            <Logo />
          </SheetTitle>
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <SheetClose asChild key={l.href}>
                <Link
                  href={l.href}
                  className={cn("rounded-md px-3 py-2.5 text-sm font-medium hover:bg-secondary", isActive(l.href) && "bg-secondary")}
                >
                  {l.label}
                </Link>
              </SheetClose>
            ))}
            {!user && (
              <>
                <SheetClose asChild>
                  <Link href="/login" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-secondary">
                    Login
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/register" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-secondary">
                    Register
                  </Link>
                </SheetClose>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
