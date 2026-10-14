import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { BookingProvider } from "@/features/booking/BookingContext";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "SkyBook - Flight Booking",
  description: "Search flights, choose your seat and manage your bookings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <BookingProvider>
            {children}
            <Toaster />
          </BookingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
