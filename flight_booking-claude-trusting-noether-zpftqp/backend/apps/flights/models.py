from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class Flight(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        BOARDING = "BOARDING", "Boarding"
        DEPARTED = "DEPARTED", "Departed"
        ARRIVED = "ARRIVED", "Arrived"
        DELAYED = "DELAYED", "Delayed"
        CANCELLED = "CANCELLED", "Cancelled"

    # Statuses in which customers may still book the flight (departure must also be in the future)
    BOOKABLE_STATUSES = (Status.SCHEDULED, Status.DELAYED)

    # Format: two letters/digits, dash, 3-4 digits (e.g. G7-101). A flight number may repeat on
    # different dates, so uniqueness is (flight_number, departure_datetime).
    flight_number = models.CharField(
        max_length=10,
        validators=[RegexValidator(r"^[A-Z0-9]{2}-\d{3,4}$", "Use the format XX-123 (e.g. G7-101).")],
    )
    aircraft = models.ForeignKey("aircraft.Aircraft", on_delete=models.PROTECT, related_name="flights")
    origin = models.ForeignKey("airports.Airport", on_delete=models.PROTECT, related_name="departing_flights")
    destination = models.ForeignKey("airports.Airport", on_delete=models.PROTECT, related_name="arriving_flights")
    departure_datetime = models.DateTimeField(db_index=True)
    arrival_datetime = models.DateTimeField()
    economy_price = models.DecimalField(max_digits=10, decimal_places=2)
    business_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["departure_datetime"]
        constraints = [
            models.UniqueConstraint(fields=["flight_number", "departure_datetime"], name="uniq_flight_number_departure"),
            models.CheckConstraint(
                condition=models.Q(arrival_datetime__gt=models.F("departure_datetime")), name="flight_arrival_after_departure"
            ),
            models.CheckConstraint(
                condition=models.Q(economy_price__gt=0, business_price__gt=0), name="flight_prices_positive"
            ),
        ]

    def __str__(self):
        return f"{self.flight_number} {self.origin.code}->{self.destination.code}"

    @property
    def duration_minutes(self):
        return int((self.arrival_datetime - self.departure_datetime).total_seconds() // 60)

    @property
    def is_bookable(self):
        return self.status in self.BOOKABLE_STATUSES and self.departure_datetime > timezone.now()

    def price_for(self, cabin_class):
        if cabin_class == "BUSINESS":
            return self.business_price
        return self.economy_price
