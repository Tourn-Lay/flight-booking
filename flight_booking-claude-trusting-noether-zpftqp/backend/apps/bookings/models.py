from django.conf import settings
from django.db import models
from django.utils import timezone


class Passenger(models.Model):
    class Gender(models.TextChoices):
        MALE = "M", "Male"
        FEMALE = "F", "Female"
        OTHER = "O", "Other"

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=Gender.choices)
    date_of_birth = models.DateField()
    nationality = models.CharField(max_length=100)
    passport_number = models.CharField(max_length=30, blank=True)
    passport_expiry = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return self.full_name


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"
        COMPLETED = "COMPLETED", "Completed"

    # Allowed status workflow. CANCELLED and COMPLETED are terminal.
    TRANSITIONS = {
        Status.PENDING: {Status.CONFIRMED, Status.CANCELLED},
        Status.CONFIRMED: {Status.CANCELLED, Status.COMPLETED},
        Status.CANCELLED: set(),
        Status.COMPLETED: set(),
    }

    booking_reference = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bookings")
    flight = models.ForeignKey("flights.Flight", on_delete=models.PROTECT, related_name="bookings")
    cabin_class = models.CharField(max_length=12, default="ECONOMY")
    number_of_passengers = models.PositiveSmallIntegerField()
    # Price snapshot: later flight price changes never alter historical bookings
    ticket_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=4)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.booking_reference

    def can_transition_to(self, new_status):
        return new_status in self.TRANSITIONS.get(self.status, set())

    @property
    def is_cancellable(self):
        """Pending / confirmed bookings on flights that have not departed yet."""
        from apps.flights.models import Flight

        return (
            self.status in (self.Status.PENDING, self.Status.CONFIRMED)
            and self.flight.departure_datetime > timezone.now()
            and self.flight.status not in (Flight.Status.DEPARTED, Flight.Status.ARRIVED, Flight.Status.CANCELLED)
        )


class BookingPassenger(models.Model):
    """Passenger X travels on booking Y in seat Z (of flight F)."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="booking_passengers")
    passenger = models.OneToOneField(Passenger, on_delete=models.CASCADE, related_name="booking_passenger")
    # Denormalised so the database itself can enforce "one seat per flight"
    flight = models.ForeignKey("flights.Flight", on_delete=models.PROTECT, related_name="booking_passengers")
    seat = models.ForeignKey("aircraft.Seat", on_delete=models.PROTECT, related_name="booking_passengers")
    ticket_price = models.DecimalField(max_digits=10, decimal_places=2)
    # 1 while the booking is active, NULL once cancelled. NULLs never collide in a UNIQUE index,
    # so (flight, seat, active_lock) is unique only among ACTIVE reservations (works on MySQL,
    # which has no partial indexes).
    active_lock = models.PositiveSmallIntegerField(null=True, default=1, editable=False)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["flight", "seat", "active_lock"], name="uniq_active_flight_seat"),
        ]

    def __str__(self):
        return f"{self.passenger} - {self.seat.seat_number}"
