"""Small factory helpers shared by the test-suites."""
from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone

from apps.accounts.models import User
from apps.aircraft.models import Aircraft
from apps.aircraft.services import generate_seats
from apps.airports.models import Airport
from apps.flights.models import Flight

_counter = {"n": 0}


def make_admin(email="admin@test.local", password="Admin123!"):
    return User.objects.create_user(
        email=email, password=password, first_name="Ada", last_name="Admin", role=User.Role.ADMIN
    )


def make_customer(email="cust@test.local", password="Customer123!"):
    return User.objects.create_user(email=email, password=password, first_name="Cora", last_name="Customer")


def make_airport(code, city=None, country="Cambodia", status=Airport.Status.ACTIVE):
    return Airport.objects.create(
        code=code, name=f"{code} International Airport", city=city or code, country=country, status=status
    )


def make_aircraft(code="AC-T01", total_seats=40, business_seats=8, status=Aircraft.Status.ACTIVE):
    aircraft = Aircraft.objects.create(
        aircraft_code=code, manufacturer="Airbus", model="A320", total_seats=total_seats, status=status
    )
    generate_seats(aircraft, business_seats)
    return aircraft


def make_flight(aircraft=None, origin=None, destination=None, days=7, **kwargs):
    _counter["n"] += 1
    aircraft = aircraft or make_aircraft(code=f"AC-{_counter['n']:03d}")
    origin = origin or make_airport(f"O{_counter['n']:02d}")
    destination = destination or make_airport(f"D{_counter['n']:02d}", country="Thailand")
    departure = kwargs.pop("departure_datetime", timezone.now() + timedelta(days=days))
    defaults = dict(
        flight_number=f"G7-{100 + _counter['n']}",
        aircraft=aircraft,
        origin=origin,
        destination=destination,
        departure_datetime=departure,
        arrival_datetime=departure + timedelta(hours=1, minutes=15),
        economy_price=Decimal("95.00"),
        business_price=Decimal("220.00"),
        status=Flight.Status.SCHEDULED,
    )
    defaults.update(kwargs)
    return Flight.objects.create(**defaults)


def passenger_payload(seat_id, first="John", last="Doe"):
    return {
        "first_name": first,
        "last_name": last,
        "gender": "M",
        "date_of_birth": date(1990, 1, 1),
        "nationality": "Cambodian",
        "passport_number": "N1234567",
        "passport_expiry": timezone.now().date() + timedelta(days=3650),
        "seat_id": seat_id,
    }
