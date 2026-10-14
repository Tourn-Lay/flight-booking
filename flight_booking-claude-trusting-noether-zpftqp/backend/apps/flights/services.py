"""Flight business logic: validation, seat availability and search."""
from collections import defaultdict
from datetime import datetime, time, timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import serializers

from apps.aircraft.models import Aircraft, Seat

from .models import Flight


# ---------------------------------------------------------------- validation
def validate_flight_data(data, instance=None):
    """Business rules for creating / editing a flight. Raises DRF ValidationError."""

    def pick(name):
        return data[name] if name in data else getattr(instance, name, None)

    errors = {}
    origin, destination = pick("origin"), pick("destination")
    if origin and destination and origin == destination:
        errors["destination"] = "Origin and destination must be different."

    departure, arrival = pick("departure_datetime"), pick("arrival_datetime")
    if departure and arrival and arrival <= departure:
        errors["arrival_datetime"] = "Arrival must be after departure."

    # Only enforce "future departure" when the schedule is being created / moved
    if "departure_datetime" in data and departure:
        changed = instance is None or instance.departure_datetime != departure
        if changed and departure <= timezone.now():
            errors["departure_datetime"] = "Departure must be in the future."

    aircraft = pick("aircraft")
    if aircraft and ("aircraft" in data) and (instance is None or instance.aircraft_id != aircraft.id):
        if aircraft.status != Aircraft.Status.ACTIVE:
            errors["aircraft"] = "Aircraft must be ACTIVE to be scheduled on a flight."

    for field in ("economy_price", "business_price"):
        value = pick(field)
        if value is not None and value <= 0:
            errors[field] = "Price must be greater than zero."

    if instance and "aircraft" in data and instance.aircraft_id != data["aircraft"].id:
        if instance.booking_passengers.filter(active_lock=1).exists():
            errors["aircraft"] = "The aircraft cannot be changed while the flight has active bookings."

    if errors:
        raise serializers.ValidationError(errors)


# ------------------------------------------------------------- availability
def seat_availability(flight_ids):
    """Return {flight_id: {"ECONOMY": n, "BUSINESS": n}} of seats still free.

    available = active seats of the aircraft in that class
                - seats already held by active bookings on THAT flight
    """
    from apps.bookings.models import BookingPassenger  # local import avoids a circular import

    flights = list(Flight.objects.filter(id__in=flight_ids).values("id", "aircraft_id"))
    aircraft_ids = {f["aircraft_id"] for f in flights}

    totals = defaultdict(lambda: defaultdict(int))
    for row in (
        Seat.objects.filter(aircraft_id__in=aircraft_ids, status=Seat.Status.ACTIVE)
        .values("aircraft_id", "seat_class")
        .annotate(n=Count("id"))
    ):
        totals[row["aircraft_id"]][row["seat_class"]] = row["n"]

    booked = defaultdict(lambda: defaultdict(int))
    for row in (
        BookingPassenger.objects.filter(flight_id__in=flight_ids, active_lock=1, seat__status=Seat.Status.ACTIVE)
        .values("flight_id", "seat__seat_class")
        .annotate(n=Count("id"))
    ):
        booked[row["flight_id"]][row["seat__seat_class"]] = row["n"]

    result = {}
    for f in flights:
        result[f["id"]] = {
            cabin: max(0, totals[f["aircraft_id"]][cabin] - booked[f["id"]][cabin])
            for cabin in (Seat.SeatClass.ECONOMY.value, Seat.SeatClass.BUSINESS.value)
        }
    return result


def seat_map(flight):
    """All seats of the flight's aircraft with their status for THIS flight."""
    from apps.bookings.models import BookingPassenger

    reserved = set(
        BookingPassenger.objects.filter(flight=flight, active_lock=1).values_list("seat_id", flat=True)
    )
    seats = []
    for seat in flight.aircraft.seats.all():
        if seat.status != Seat.Status.ACTIVE:
            state = "INACTIVE"
        elif seat.id in reserved:
            state = "RESERVED"
        else:
            state = "AVAILABLE"
        seats.append(
            {
                "id": seat.id,
                "seat_number": seat.seat_number,
                "row": seat.row,
                "column": seat.column,
                "seat_class": seat.seat_class,
                "status": state,
            }
        )
    return seats


# -------------------------------------------------------------------- search
def day_bounds(day):
    """[start, end) of a local calendar day as aware datetimes."""
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(day, time.min), tz)
    return start, start + timedelta(days=1)


def search_flights(origin_code, destination_code, day, passengers=1, cabin_class=None):
    """Bookable flights on a route/day with enough free seats in the requested cabin.

    Returns a list of (flight, availability_dict).
    """
    start, end = day_bounds(day)
    qs = Flight.objects.select_related("origin", "destination", "aircraft").filter(
        origin__code__iexact=origin_code,
        destination__code__iexact=destination_code,
        origin__status="ACTIVE",
        destination__status="ACTIVE",
        departure_datetime__gte=start,
        departure_datetime__lt=end,
        status__in=Flight.BOOKABLE_STATUSES,
        departure_datetime__gt=timezone.now(),
    )
    flights = list(qs.order_by("departure_datetime"))
    availability = seat_availability([f.id for f in flights])
    results = []
    for flight in flights:
        avail = availability.get(flight.id, {})
        if cabin_class:
            if avail.get(cabin_class, 0) < passengers:
                continue
        elif max(avail.values(), default=0) < passengers:
            continue
        results.append((flight, avail))
    return results
