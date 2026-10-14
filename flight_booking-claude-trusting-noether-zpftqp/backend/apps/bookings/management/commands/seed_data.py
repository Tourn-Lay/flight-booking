"""Create realistic, logically connected demo data.

    python manage.py seed_data            # seeds only when the database is empty
    python manage.py seed_data --reset    # wipes demo data first
"""
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.aircraft.models import Aircraft, Seat
from apps.aircraft.services import generate_seats
from apps.airports.models import Airport
from apps.bookings.models import Booking, BookingPassenger, Passenger
from apps.bookings.services import create_booking
from apps.flights.models import Flight
from apps.payments.models import Payment

ADMIN = ("admin@flight.local", "Admin123!")
CUSTOMER_PASSWORD = "Customer123!"

AIRPORTS = [
    ("PNH", "Phnom Penh International Airport", "Phnom Penh", "Cambodia", "ACTIVE"),
    ("SAI", "Siem Reap-Angkor International Airport", "Siem Reap", "Cambodia", "ACTIVE"),
    ("BKK", "Suvarnabhumi Airport", "Bangkok", "Thailand", "ACTIVE"),
    ("SIN", "Singapore Changi Airport", "Singapore", "Singapore", "ACTIVE"),
    ("KUL", "Kuala Lumpur International Airport", "Kuala Lumpur", "Malaysia", "ACTIVE"),
    ("SGN", "Tan Son Nhat International Airport", "Ho Chi Minh City", "Vietnam", "ACTIVE"),
    ("HAN", "Noi Bai International Airport", "Hanoi", "Vietnam", "ACTIVE"),
    ("ICN", "Incheon International Airport", "Seoul", "South Korea", "ACTIVE"),
    ("NRT", "Narita International Airport", "Tokyo", "Japan", "INACTIVE"),  # inactive: hidden from customers
]

# code, manufacturer, model, total seats, business seats, status
AIRCRAFT = [
    ("AC-001", "Airbus", "A320", 180, 12, "ACTIVE"),
    ("AC-002", "Boeing", "737-800", 162, 12, "ACTIVE"),
    ("AC-003", "ATR", "72-600", 72, 8, "ACTIVE"),
    ("AC-004", "Airbus", "A321", 200, 16, "MAINTENANCE"),
]

CUSTOMERS = [
    ("customer@flight.local", "Sokha", "Chan", "+855 12 345 678"),
    ("dara.kim@example.com", "Dara", "Kim", "+855 97 111 2222"),
    ("sophea.lim@example.com", "Sophea", "Lim", "+855 96 333 4444"),
    ("vannak.sok@example.com", "Vannak", "Sok", "+855 15 555 6666"),
    ("mey.tan@example.com", "Mey", "Tan", "+855 17 777 8888"),
]


def passenger(first, last, gender, dob, nationality, passport=""):
    return {
        "first_name": first, "last_name": last, "gender": gender, "date_of_birth": dob,
        "nationality": nationality, "passport_number": passport,
        "passport_expiry": date(2031, 6, 30) if passport else None,
    }


class Command(BaseCommand):
    help = "Seed the database with demo data."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing data first.")

    def handle(self, *args, **options):
        if options["reset"]:
            self.reset()
        elif User.objects.filter(email=ADMIN[0]).exists():
            self.stdout.write("Demo data already present - skipping (use --reset to rebuild).")
            return

        with transaction.atomic():
            customers = self.create_users()
            airports = self.create_airports()
            aircraft = self.create_aircraft()
            flights = self.create_flights(airports, aircraft)
            self.create_bookings(customers, flights)

        self.stdout.write(self.style.SUCCESS("Demo data created."))
        self.stdout.write(f"  Admin:    {ADMIN[0]} / {ADMIN[1]}")
        self.stdout.write(f"  Customer: {CUSTOMERS[0][0]} / {CUSTOMER_PASSWORD}")

    # ------------------------------------------------------------------ reset
    def reset(self):
        self.stdout.write("Deleting existing data...")
        with transaction.atomic():
            Payment.objects.all().delete()
            BookingPassenger.objects.all().delete()
            Passenger.objects.all().delete()
            Booking.objects.all().delete()
            Flight.objects.all().delete()
            Seat.objects.all().delete()
            Aircraft.objects.all().delete()
            Airport.objects.all().delete()
            User.objects.all().delete()

    # ------------------------------------------------------------------ users
    def create_users(self):
        User.objects.create_user(
            email=ADMIN[0], password=ADMIN[1], first_name="System", last_name="Admin",
            role=User.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        return [
            User.objects.create_user(email=e, password=CUSTOMER_PASSWORD, first_name=f, last_name=l, phone=p)
            for e, f, l, p in CUSTOMERS
        ]

    def create_airports(self):
        return {
            code: Airport.objects.create(code=code, name=name, city=city, country=country, status=status)
            for code, name, city, country, status in AIRPORTS
        }

    def create_aircraft(self):
        result = {}
        for code, maker, model, total, business, status in AIRCRAFT:
            aircraft = Aircraft.objects.create(
                aircraft_code=code, manufacturer=maker, model=model, total_seats=total, status=status
            )
            generate_seats(aircraft, business)
            result[code] = aircraft
        return result

    # ---------------------------------------------------------------- flights
    def create_flights(self, airports, aircraft):
        today = timezone.localdate()
        tz = timezone.get_current_timezone()

        def at(day_offset, hour, minute=0):
            day = today + timedelta(days=day_offset)
            return timezone.make_aware(datetime.combine(day, time(hour, minute)), tz)

        now = timezone.now()
        rows = [
            # number, from, to, aircraft, departure, duration min, economy, business, status
            ("G7-101", "PNH", "BKK", "AC-001", at(7, 8, 0), 75, 95, 220, "SCHEDULED"),
            ("G7-102", "BKK", "PNH", "AC-001", at(7, 11, 0), 75, 98, 225, "SCHEDULED"),
            ("G7-103", "PNH", "BKK", "AC-002", at(7, 15, 30), 75, 89, 210, "SCHEDULED"),
            ("G7-201", "PNH", "SIN", "AC-002", at(8, 9, 0), 130, 140, 360, "SCHEDULED"),
            ("G7-301", "PNH", "KUL", "AC-001", at(9, 13, 0), 180, 120, 300, "SCHEDULED"),
            ("G7-401", "PNH", "SGN", "AC-003", at(5, 10, 0), 60, 70, 160, "SCHEDULED"),
            ("G7-402", "SGN", "PNH", "AC-003", at(5, 14, 0), 60, 72, 165, "DELAYED"),
            ("G7-501", "PNH", "SAI", "AC-003", now + timedelta(hours=2), 50, 55, 130, "BOARDING"),
            ("G7-601", "PNH", "HAN", "AC-002", at(10, 7, 45), 135, 130, 330, "SCHEDULED"),
            ("G7-701", "PNH", "ICN", "AC-001", at(12, 23, 0), 330, 380, 900, "CANCELLED"),
            ("G7-001", "BKK", "PNH", "AC-001", at(-3, 9, 0), 75, 92, 215, "ARRIVED"),
            ("G7-002", "PNH", "SIN", "AC-002", now - timedelta(hours=1), 130, 138, 355, "DEPARTED"),
        ]
        flights = {}
        for number, o, d, ac, dep, minutes, eco, biz, status in rows:
            flights[number] = Flight.objects.create(
                flight_number=number, origin=airports[o], destination=airports[d], aircraft=aircraft[ac],
                departure_datetime=dep, arrival_datetime=dep + timedelta(minutes=minutes),
                economy_price=Decimal(eco), business_price=Decimal(biz), status=status,
            )
        return flights

    # --------------------------------------------------------------- bookings
    def create_bookings(self, customers, flights):
        c1, c2, c3, c4, c5 = customers

        def seats(flight, *numbers):
            found = {s.seat_number: s.id for s in flight.aircraft.seats.filter(seat_number__in=numbers)}
            return [found[n] for n in numbers]

        def book(customer, number, cabin, people, seat_numbers, status, pay_status, method):
            flight = flights[number]
            data = [dict(p, seat_id=sid) for p, sid in zip(people, seats(flight, *seat_numbers))]
            # enforce_bookable=False so we can also create history on past flights
            booking = create_booking(customer, flight.id, cabin, data, method, enforce_bookable=False)
            booking.status = status
            booking.save()
            payment = booking.payment
            payment.status = pay_status
            if pay_status in ("PAID", "REFUNDED"):
                payment.paid_at = timezone.now() - timedelta(days=1)
            payment.save()
            if status == "CANCELLED":
                booking.cancelled_at = timezone.now()
                booking.save()
                booking.booking_passengers.update(active_lock=None)  # release the seats
            return booking

        # NOTE: seat 10A on G7-101 is intentionally left free for the live demo.
        book(c1, "G7-101", "ECONOMY",
             [passenger("Sokha", "Chan", "F", date(1992, 4, 12), "Cambodian", "N1002003"),
              passenger("Rithy", "Chan", "M", date(1990, 9, 3), "Cambodian", "N1002004")],
             ["8A", "8B"], "CONFIRMED", "PAID", "CARD")
        book(c1, "G7-201", "BUSINESS",
             [passenger("Sokha", "Chan", "F", date(1992, 4, 12), "Cambodian", "N1002003")],
             ["2A"], "PENDING", "UNPAID", "PAY_LATER")
        book(c2, "G7-101", "ECONOMY",
             [passenger("Dara", "Kim", "M", date(1988, 1, 25), "Cambodian", "N2003001")],
             ["12C"], "PENDING", "UNPAID", "CARD")
        book(c2, "G7-301", "ECONOMY",
             [passenger("Dara", "Kim", "M", date(1988, 1, 25), "Cambodian", "N2003001"),
              passenger("Lina", "Kim", "F", date(1991, 7, 8), "Cambodian", "N2003002")],
             ["6A", "6B"], "CONFIRMED", "PAID", "CASH")
        book(c3, "G7-001", "ECONOMY",
             [passenger("Sophea", "Lim", "F", date(1995, 11, 2), "Cambodian", "N3004001")],
             ["7A"], "COMPLETED", "PAID", "CARD")
        book(c3, "G7-401", "ECONOMY",
             [passenger("Sophea", "Lim", "F", date(1995, 11, 2), "Cambodian"),
              passenger("Bopha", "Lim", "F", date(2010, 3, 19), "Cambodian")],
             ["3A", "3B"], "CANCELLED", "REFUNDED", "CARD")
        book(c4, "G7-103", "BUSINESS",
             [passenger("Vannak", "Sok", "M", date(1985, 5, 30), "Cambodian", "N4005001"),
              passenger("Chantha", "Sok", "F", date(1987, 8, 14), "Cambodian", "N4005002")],
             ["1A", "1B"], "CONFIRMED", "UNPAID", "PAY_LATER")
        book(c5, "G7-601", "ECONOMY",
             [passenger("Mey", "Tan", "F", date(1999, 12, 24), "Cambodian", "N5006001")],
             ["15F"], "PENDING", "UNPAID", "PAY_LATER")


