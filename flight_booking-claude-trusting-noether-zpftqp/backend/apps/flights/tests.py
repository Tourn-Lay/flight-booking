from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.aircraft.models import Aircraft
from apps.bookings.services import create_booking
from common.exceptions import BusinessError
from common.testing import make_admin, make_aircraft, make_airport, make_customer, make_flight, passenger_payload

from .models import Flight


class FlightValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(make_admin())
        self.a, self.b = make_airport("PNH"), make_airport("BKK", country="Thailand")
        self.aircraft = make_aircraft("AC-V01")
        dep = timezone.now() + timedelta(days=5)
        self.payload = {
            "flight_number": "G7-555", "aircraft": self.aircraft.id, "origin": self.a.id, "destination": self.b.id,
            "departure_datetime": dep.isoformat(), "arrival_datetime": (dep + timedelta(hours=1)).isoformat(),
            "economy_price": "95.00", "business_price": "220.00",
        }

    def post(self, **changes):
        return self.client.post("/api/flights/", {**self.payload, **changes}, format="json")

    def test_valid_flight(self):
        res = self.post()
        self.assertEqual(res.status_code, 201, res.content)

    def test_origin_must_differ_from_destination(self):
        res = self.post(destination=self.a.id)
        self.assertEqual(res.status_code, 400)
        self.assertIn("destination", res.json()["errors"])

    def test_arrival_must_be_after_departure(self):
        dep = timezone.now() + timedelta(days=5)
        res = self.post(departure_datetime=dep.isoformat(), arrival_datetime=(dep - timedelta(hours=1)).isoformat())
        self.assertEqual(res.status_code, 400)
        self.assertIn("arrival_datetime", res.json()["errors"])

    def test_aircraft_must_be_active(self):
        self.aircraft.status = Aircraft.Status.MAINTENANCE
        self.aircraft.save()
        res = self.post()
        self.assertEqual(res.status_code, 400)
        self.assertIn("aircraft", res.json()["errors"])

    def test_prices_must_be_positive(self):
        self.assertEqual(self.post(economy_price="0").status_code, 400)
        self.assertEqual(self.post(business_price="-5").status_code, 400)

    def test_customer_cannot_create_flight(self):
        self.client.force_authenticate(make_customer())
        self.assertEqual(self.post().status_code, 403)

    def test_cancelled_flight_cannot_be_booked(self):
        flight = make_flight(status=Flight.Status.CANCELLED)
        seat = flight.aircraft.seats.filter(seat_class="ECONOMY").first()
        with self.assertRaises(BusinessError):
            create_booking(make_customer(), flight.id, "ECONOMY", [passenger_payload(seat.id)])


class FlightSearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.origin, self.dest = make_airport("PNH"), make_airport("BKK", country="Thailand")
        self.flight = make_flight(origin=self.origin, destination=self.dest, days=3)
        self.day = timezone.localtime(self.flight.departure_datetime).date().isoformat()

    def search(self, **extra):
        params = {"origin": "PNH", "destination": "BKK", "date": self.day, "passengers": 1,
                  "cabin_class": "ECONOMY", **extra}
        return self.client.get("/api/flights/search/", params)

    def test_search_finds_flight_without_login(self):
        res = self.search()
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["price"], "95.00")
        self.assertEqual(data[0]["available_seats_in_cabin"], 32)  # 40 seats - 8 business

    def test_cancelled_flight_hidden(self):
        self.flight.status = Flight.Status.CANCELLED
        self.flight.save()
        self.assertEqual(self.search().json()["data"], [])

    def test_not_enough_seats_hides_flight(self):
        """Capacity 32 economy; fill 31 -> a party of 2 no longer fits, a single traveller does."""
        customer = make_customer()
        seats = list(self.flight.aircraft.seats.filter(seat_class="ECONOMY"))
        for seat in seats[:31]:
            create_booking(customer, self.flight.id, "ECONOMY", [passenger_payload(seat.id)])
        self.assertEqual(self.search(passengers=2).json()["data"], [])
        self.assertEqual(len(self.search(passengers=1).json()["data"]), 1)

    def test_seat_map_marks_reserved(self):
        seat = self.flight.aircraft.seats.filter(seat_class="ECONOMY").first()
        create_booking(make_customer(), self.flight.id, "ECONOMY", [passenger_payload(seat.id)])
        res = self.client.get(f"/api/flights/{self.flight.id}/seats/")
        by_number = {s["seat_number"]: s["status"] for s in res.json()["data"]["seats"]}
        self.assertEqual(by_number[seat.seat_number], "RESERVED")
        self.assertEqual(list(by_number.values()).count("AVAILABLE"), 39)

    def test_search_validation(self):
        res = self.client.get("/api/flights/search/", {"origin": "PNH", "destination": "PNH", "date": self.day})
        self.assertEqual(res.status_code, 400)
