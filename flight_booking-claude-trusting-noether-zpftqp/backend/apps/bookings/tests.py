from datetime import timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.aircraft.models import Seat
from apps.bookings.models import Booking, BookingPassenger
from apps.bookings.services import calculate_price, cancel_booking, create_booking
from apps.flights.models import Flight
from apps.payments.models import Payment
from common.exceptions import BusinessError, SeatUnavailableError
from common.testing import make_admin, make_customer, make_flight, passenger_payload


class BookingBase(TestCase):
    def setUp(self):
        self.customer = make_customer()
        self.flight = make_flight()
        self.economy = list(self.flight.aircraft.seats.filter(seat_class="ECONOMY"))
        self.business = list(self.flight.aircraft.seats.filter(seat_class="BUSINESS"))

    def book(self, seats, cabin="ECONOMY", customer=None, flight=None):
        return create_booking(
            customer or self.customer, (flight or self.flight).id, cabin,
            [passenger_payload(s.id, first=f"P{i}") for i, s in enumerate(seats)],
        )


class PriceTests(BookingBase):
    def test_calculate_price(self):
        price = calculate_price(Decimal("95"), 2, Decimal("0.10"))
        self.assertEqual(price["subtotal"], Decimal("190.00"))
        self.assertEqual(price["tax"], Decimal("19.00"))
        self.assertEqual(price["total"], Decimal("209.00"))

    def test_booking_stores_backend_price_and_snapshot(self):
        booking = self.book(self.economy[:2])
        self.assertEqual(booking.subtotal, Decimal("190.00"))
        self.assertEqual(booking.tax, Decimal("19.00"))
        self.assertEqual(booking.total_amount, Decimal("209.00"))
        self.assertEqual(booking.payment.amount, Decimal("209.00"))
        # Changing the flight price later must not alter the historical booking
        self.flight.economy_price = Decimal("500.00")
        self.flight.save()
        booking.refresh_from_db()
        self.assertEqual(booking.total_amount, Decimal("209.00"))

    def test_business_cabin_price(self):
        booking = self.book(self.business[:1], cabin="BUSINESS")
        self.assertEqual(booking.subtotal, Decimal("220.00"))
        self.assertEqual(booking.total_amount, Decimal("242.00"))

    def test_client_cannot_inject_total(self):
        client = APIClient()
        client.force_authenticate(self.customer)
        body = {
            "flight": self.flight.id, "cabin_class": "ECONOMY", "total_amount": "1.00", "subtotal": "1.00",
            "passengers": [passenger_payload(self.economy[0].id)],
        }
        res = client.post("/api/bookings/", body, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["data"]["total_amount"], "104.50")


class SeatRuleTests(BookingBase):
    def test_available_seat_allowed(self):
        self.assertEqual(self.book(self.economy[:1]).status, Booking.Status.PENDING)

    def test_reserved_seat_rejected(self):
        self.book(self.economy[:1])
        with self.assertRaises(SeatUnavailableError) as ctx:
            self.book(self.economy[:1], customer=make_customer("other@test.local"))
        self.assertIn("no longer available", ctx.exception.message)

    def test_inactive_seat_rejected(self):
        seat = self.economy[0]
        seat.status = Seat.Status.INACTIVE
        seat.save()
        with self.assertRaises(BusinessError):
            self.book([seat])

    def test_incompatible_cabin_rejected(self):
        with self.assertRaises(BusinessError):
            self.book(self.business[:1], cabin="ECONOMY")

    def test_seat_from_other_aircraft_rejected(self):
        other = make_flight()
        foreign_seat = other.aircraft.seats.filter(seat_class="ECONOMY").first()
        with self.assertRaises(BusinessError):
            self.book([foreign_seat])

    def test_same_seat_for_two_passengers_rejected(self):
        with self.assertRaises(BusinessError):
            self.book([self.economy[0], self.economy[0]])

    def test_same_seat_is_free_on_another_flight(self):
        second = make_flight(aircraft=self.flight.aircraft, flight_number="G7-999")
        self.book(self.economy[:1])
        self.assertTrue(self.book(self.economy[:1], flight=second))

    def test_database_constraint_blocks_duplicate_active_seat(self):
        booking = self.book(self.economy[:1])
        bp = booking.booking_passengers.first()
        with self.assertRaises(IntegrityError), transaction.atomic():
            BookingPassenger.objects.create(
                booking=booking, passenger=bp.passenger.__class__.objects.create(
                    first_name="X", last_name="Y", gender="M", date_of_birth="1990-01-01", nationality="KH"),
                flight=self.flight, seat=bp.seat, ticket_price=Decimal("1"),
            )


class BookingCreationTests(BookingBase):
    def test_valid_multi_passenger_booking(self):
        booking = self.book(self.economy[:3])
        self.assertEqual(booking.number_of_passengers, 3)
        self.assertEqual(booking.booking_passengers.count(), 3)
        self.assertEqual(booking.payment.status, Payment.Status.UNPAID)
        self.assertRegex(booking.booking_reference, r"^FB-\d{8}-\d{3}$")

    def test_references_are_unique_and_sequential(self):
        a, b = self.book(self.economy[:1]), self.book(self.economy[1:2])
        self.assertNotEqual(a.booking_reference, b.booking_reference)
        self.assertTrue(a.booking_reference.endswith("-001"))
        self.assertTrue(b.booking_reference.endswith("-002"))

    def test_no_passengers_rejected(self):
        with self.assertRaises(BusinessError):
            create_booking(self.customer, self.flight.id, "ECONOMY", [])

    def test_too_many_passengers_rejected(self):
        with self.assertRaises(BusinessError):
            self.book(self.economy[:10])

    def test_api_requires_one_seat_per_passenger(self):
        client = APIClient()
        client.force_authenticate(self.customer)
        passenger = passenger_payload(self.economy[0].id)
        del passenger["seat_id"]
        res = client.post(
            "/api/bookings/", {"flight": self.flight.id, "cabin_class": "ECONOMY", "passengers": [passenger]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_departed_flight_not_bookable(self):
        flight = make_flight(departure_datetime=timezone.now() - timedelta(hours=2))
        seat = flight.aircraft.seats.filter(seat_class="ECONOMY").first()
        with self.assertRaises(BusinessError):
            self.book([seat], flight=flight)

    def test_customer_only_sees_own_bookings(self):
        mine = self.book(self.economy[:1])
        other_user = make_customer("other@test.local")
        theirs = self.book(self.economy[1:2], customer=other_user)
        client = APIClient()
        client.force_authenticate(self.customer)
        ids = [b["id"] for b in client.get("/api/bookings/my-bookings/").json()["data"]]
        self.assertEqual(ids, [mine.id])
        self.assertEqual(client.get(f"/api/bookings/{theirs.id}/").status_code, 404)
        self.assertEqual(client.patch(f"/api/bookings/{theirs.id}/cancel/").status_code, 404)


class DoubleBookingTests(BookingBase):
    def test_booking_b_cannot_take_seat_reserved_by_booking_a(self):
        """Booking A holds flight G7-xxx / seat 1 -> Booking B on the same flight+seat is rejected."""
        seat = self.economy[0]
        self.book([seat])
        client = APIClient()
        client.force_authenticate(make_customer("b@test.local"))
        res = client.post(
            "/api/bookings/",
            {"flight": self.flight.id, "cabin_class": "ECONOMY", "passengers": [passenger_payload(seat.id)]},
            format="json",
        )
        self.assertEqual(res.status_code, 409)
        body = res.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["message"], f"Seat {seat.seat_number} is no longer available. Please select another seat.")
        self.assertEqual(BookingPassenger.objects.filter(flight=self.flight, active_lock=1).count(), 1)

    def test_failed_booking_leaves_no_partial_data(self):
        taken, free = self.economy[0], self.economy[1]
        self.book([taken])
        before = Booking.objects.count()
        with self.assertRaises(SeatUnavailableError):
            self.book([free, taken], customer=make_customer("b@test.local"))
        self.assertEqual(Booking.objects.count(), before)
        # the free seat was not held by the failed attempt
        self.assertTrue(self.book([free], customer=make_customer("c@test.local")))


class CancellationAndWorkflowTests(BookingBase):
    def test_cancel_releases_seats_and_refunds(self):
        seat = self.economy[0]
        booking = self.book([seat])
        booking.payment.status = Payment.Status.PAID
        booking.payment.save()
        cancel_booking(booking)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)
        self.assertEqual(booking.payment.status, Payment.Status.REFUNDED)
        # seat can be booked again
        self.assertTrue(self.book([seat], customer=make_customer("b@test.local")))

    def test_cancel_via_api_and_double_cancel(self):
        booking = self.book(self.economy[:1])
        client = APIClient()
        client.force_authenticate(self.customer)
        self.assertEqual(client.patch(f"/api/bookings/{booking.id}/cancel/").status_code, 200)
        self.assertEqual(client.patch(f"/api/bookings/{booking.id}/cancel/").status_code, 400)

    def test_cannot_cancel_after_departure(self):
        flight = make_flight(departure_datetime=timezone.now() + timedelta(hours=1))
        seat = flight.aircraft.seats.filter(seat_class="ECONOMY").first()
        booking = self.book([seat], flight=flight)
        Flight.objects.filter(pk=flight.pk).update(departure_datetime=timezone.now() - timedelta(minutes=5))
        booking.refresh_from_db()
        with self.assertRaises(BusinessError):
            cancel_booking(booking)

    def test_status_transitions(self):
        booking = self.book(self.economy[:1])
        admin = APIClient()
        admin.force_authenticate(make_admin())
        self.assertEqual(admin.patch(f"/api/bookings/{booking.id}/confirm/").status_code, 200)
        self.assertEqual(admin.patch(f"/api/bookings/{booking.id}/confirm/").status_code, 400)  # already confirmed
        # cannot complete before the flight arrived
        self.assertEqual(admin.patch(f"/api/bookings/{booking.id}/complete/").status_code, 400)
        self.assertEqual(admin.patch(f"/api/bookings/{booking.id}/cancel/").status_code, 200)
        self.assertEqual(admin.patch(f"/api/bookings/{booking.id}/confirm/").status_code, 400)  # cancelled is final

    def test_customer_cannot_confirm_or_mark_paid(self):
        booking = self.book(self.economy[:1])
        client = APIClient()
        client.force_authenticate(self.customer)
        self.assertEqual(client.patch(f"/api/bookings/{booking.id}/confirm/").status_code, 403)
        self.assertEqual(client.patch(f"/api/payments/{booking.payment.id}/mark-paid/").status_code, 403)

    def test_admin_marks_payment_paid(self):
        booking = self.book(self.economy[:1])
        admin = APIClient()
        admin.force_authenticate(make_admin())
        res = admin.patch(f"/api/payments/{booking.payment.id}/mark-paid/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data"]["status"], "PAID")
        self.assertEqual(admin.patch(f"/api/payments/{booking.payment.id}/mark-paid/").status_code, 400)

    def test_cancelling_flight_cancels_bookings(self):
        booking = self.book(self.economy[:1])
        admin = APIClient()
        admin.force_authenticate(make_admin())
        res = admin.patch(f"/api/flights/{self.flight.id}/status/", {"status": "CANCELLED"}, format="json")
        self.assertEqual(res.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)
