"""Booking business logic: pricing, seat validation, atomic creation and status workflow."""
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.aircraft.models import Seat
from apps.flights.models import Flight
from apps.payments.models import Payment
from common.exceptions import BusinessError, SeatUnavailableError

from .models import Booking, BookingPassenger, Passenger

CENT = Decimal("0.01")


def money(value):
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


# ------------------------------------------------------------------ pricing
def calculate_price(unit_price, passengers, tax_rate=None):
    """Subtotal = price x passengers; tax = subtotal x rate; total = subtotal + tax."""
    tax_rate = settings.BOOKING_TAX_RATE if tax_rate is None else Decimal(tax_rate)
    subtotal = money(Decimal(unit_price) * passengers)
    tax = money(subtotal * tax_rate)
    return {"unit_price": money(unit_price), "tax_rate": tax_rate, "subtotal": subtotal, "tax": tax, "total": subtotal + tax}


# --------------------------------------------------------------- references
def _next_reference(today):
    prefix = f"FB-{today:%Y%m%d}-"
    last = (
        Booking.objects.filter(booking_reference__startswith=prefix)
        .order_by("-booking_reference")
        .values_list("booking_reference", flat=True)
        .first()
    )
    number = int(last.rsplit("-", 1)[1]) + 1 if last else 1
    return f"{prefix}{number:03d}"


# ----------------------------------------------------------------- creation
def _validate_passenger_fields(passengers, flight):
    departure_day = timezone.localtime(flight.departure_datetime).date()
    today = timezone.localdate()
    for index, p in enumerate(passengers, start=1):
        label = f"Passenger {index}"
        if p["date_of_birth"] > today:
            raise BusinessError(f"{label}: date of birth cannot be in the future.")
        number, expiry = p.get("passport_number") or "", p.get("passport_expiry")
        if number and not expiry:
            raise BusinessError(f"{label}: passport expiry is required when a passport number is given.")
        if expiry and expiry <= departure_day:
            raise BusinessError(f"{label}: passport must be valid after the departure date.")


def create_booking(customer, flight_id, cabin_class, passengers, payment_method=Payment.Method.PAY_LATER,
                   enforce_bookable=True):
    """Create a PENDING booking atomically.

    ``passengers`` is a list of dicts with the passenger fields plus ``seat_id``.
    Availability is re-checked here, inside the transaction, with the flight row locked.
    The UNIQUE(flight, seat, active_lock) constraint is the final database-level guard.
    """
    count = len(passengers)
    if count < 1:
        raise BusinessError("At least one passenger is required.")
    if count > settings.MAX_PASSENGERS_PER_BOOKING:
        raise BusinessError(f"A booking can have at most {settings.MAX_PASSENGERS_PER_BOOKING} passengers.")
    if cabin_class not in (Seat.SeatClass.ECONOMY, Seat.SeatClass.BUSINESS):
        raise BusinessError("Cabin class must be ECONOMY or BUSINESS.")

    seat_ids = [p["seat_id"] for p in passengers]
    if len(set(seat_ids)) != len(seat_ids):
        raise BusinessError("The same seat was selected for more than one passenger.")

    try:
        with transaction.atomic():
            # Lock the flight row: concurrent bookings for the same flight are serialised here
            try:
                flight = Flight.objects.select_for_update().select_related("aircraft", "origin", "destination").get(
                    pk=flight_id
                )
            except Flight.DoesNotExist:
                raise BusinessError("Flight not found.", status_code=404)

            if enforce_bookable:
                if flight.status == Flight.Status.CANCELLED:
                    raise BusinessError("This flight has been cancelled and cannot be booked.")
                if not flight.is_bookable:
                    raise BusinessError("This flight is no longer open for booking.")

            _validate_passenger_fields(passengers, flight)

            seats = {s.id: s for s in Seat.objects.filter(id__in=seat_ids, aircraft=flight.aircraft)}
            if len(seats) != len(seat_ids):
                raise BusinessError("One or more selected seats do not exist on this flight's aircraft.")
            for seat in seats.values():
                if seat.status != Seat.Status.ACTIVE:
                    raise SeatUnavailableError(f"Seat {seat.seat_number} is not available. Please select another seat.")
                if seat.seat_class != cabin_class:
                    raise BusinessError(f"Seat {seat.seat_number} is not in the selected {cabin_class.lower()} cabin.")

            taken = list(
                BookingPassenger.objects.filter(flight=flight, seat_id__in=seat_ids, active_lock=1)
                .select_related("seat")
                .values_list("seat__seat_number", flat=True)
            )
            if taken:
                raise _seat_conflict(taken)

            price = calculate_price(flight.price_for(cabin_class), count)
            today = timezone.localdate()
            booking = None
            try:
                with transaction.atomic():  # savepoint so an IntegrityError doesn't poison the outer transaction
                    booking = Booking.objects.create(
                        booking_reference=_next_reference(today),
                        customer=customer,
                        flight=flight,
                        cabin_class=cabin_class,
                        number_of_passengers=count,
                        ticket_price=price["unit_price"],
                        tax_rate=price["tax_rate"],
                        subtotal=price["subtotal"],
                        tax=price["tax"],
                        total_amount=price["total"],
                        status=Booking.Status.PENDING,
                    )
                    for data in passengers:
                        fields = {k: v for k, v in data.items() if k != "seat_id"}
                        passenger = Passenger.objects.create(**fields)
                        BookingPassenger.objects.create(
                            booking=booking,
                            passenger=passenger,
                            flight=flight,
                            seat=seats[data["seat_id"]],
                            ticket_price=price["unit_price"],
                        )
                    Payment.objects.create(booking=booking, payment_method=payment_method, amount=price["total"])
            except IntegrityError:
                # Either a seat was grabbed by a concurrent transaction or the reference collided
                clash = list(
                    BookingPassenger.objects.filter(flight=flight, seat_id__in=seat_ids, active_lock=1)
                    .values_list("seat__seat_number", flat=True)
                )
                if clash:
                    raise _seat_conflict(clash)
                raise BusinessError("Could not create the booking. Please try again.")
            return booking
    except SeatUnavailableError:
        raise


def _seat_conflict(seat_numbers):
    seat_numbers = sorted(seat_numbers)
    if len(seat_numbers) == 1:
        message = f"Seat {seat_numbers[0]} is no longer available. Please select another seat."
    else:
        message = f"Seats {', '.join(seat_numbers)} are no longer available. Please select other seats."
    return SeatUnavailableError(message, errors={"seats": seat_numbers})


# ------------------------------------------------------------ status workflow
def _change_status(booking, new_status):
    if not booking.can_transition_to(new_status):
        raise BusinessError(
            f"A {booking.get_status_display().lower()} booking cannot be changed to {new_status.lower()}."
        )
    booking.status = new_status


def confirm_booking(booking):
    _change_status(booking, Booking.Status.CONFIRMED)
    booking.save()
    return booking


def cancel_booking(booking, force=False):
    """Cancel a booking, release its seats and refund a paid payment.

    ``force`` skips the departure-time rule (used when the whole flight is cancelled).
    """
    if not booking.can_transition_to(Booking.Status.CANCELLED):
        raise BusinessError(f"A {booking.get_status_display().lower()} booking cannot be cancelled.")
    if not force and not booking.is_cancellable:
        raise BusinessError("This booking can no longer be cancelled because the flight has already departed.")
    with transaction.atomic():
        booking.status = Booking.Status.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.save()
        booking.booking_passengers.update(active_lock=None)  # frees the seats
        payment = getattr(booking, "payment", None)
        if payment and payment.status == Payment.Status.PAID:
            payment.status = Payment.Status.REFUNDED
            payment.save()
    return booking


def complete_booking(booking):
    flight = booking.flight
    if booking.status == Booking.Status.CONFIRMED and not (
        flight.status == Flight.Status.ARRIVED or flight.arrival_datetime <= timezone.now()
    ):
        raise BusinessError("A booking can only be completed after the flight has arrived.")
    _change_status(booking, Booking.Status.COMPLETED)
    booking.save()
    return booking


def apply_flight_status(flight, new_status):
    """Change a flight's status and cascade to its bookings where it makes sense."""
    with transaction.atomic():
        flight.status = new_status
        flight.save()
        if new_status == Flight.Status.CANCELLED:
            for booking in flight.bookings.filter(status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED]):
                cancel_booking(booking, force=True)
        elif new_status == Flight.Status.ARRIVED:
            for booking in flight.bookings.filter(status=Booking.Status.CONFIRMED):
                booking.status = Booking.Status.COMPLETED
                booking.save()
    return flight
