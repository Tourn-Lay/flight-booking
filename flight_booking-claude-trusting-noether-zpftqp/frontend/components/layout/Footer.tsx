import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="container grid gap-8 py-10 md:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            A school project: a full-stack flight booking system built with Next.js, Django REST Framework and MySQL.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/flights" className="hover:text-foreground">Search flights</Link></li>
            <li><Link href="/my-bookings" className="hover:text-foreground">My bookings</Link></li>
            <li><Link href="/profile" className="hover:text-foreground">Profile</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Account</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/login" className="hover:text-foreground">Login</Link></li>
            <li><Link href="/register" className="hover:text-foreground">Create an account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SkyBook Flight Booking Management System - academic project. Payments are simulated.
      </div>
    </footer>
  );
}
