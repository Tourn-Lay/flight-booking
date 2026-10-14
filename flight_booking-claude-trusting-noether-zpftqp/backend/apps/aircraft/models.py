from django.db import models


class Aircraft(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        INACTIVE = "INACTIVE", "Inactive"

    aircraft_code = models.CharField(max_length=20, unique=True)
    manufacturer = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    total_seats = models.PositiveIntegerField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["aircraft_code"]
        verbose_name_plural = "aircraft"

    def __str__(self):
        return f"{self.aircraft_code} ({self.manufacturer} {self.model})"


class Seat(models.Model):
    """A seat in the aircraft *template*. Whether it is free depends on the flight."""

    class SeatClass(models.TextChoices):
        ECONOMY = "ECONOMY", "Economy"
        BUSINESS = "BUSINESS", "Business"
        FIRST_CLASS = "FIRST_CLASS", "First class"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, related_name="seats")
    seat_number = models.CharField(max_length=5)  # e.g. 10A
    row = models.PositiveSmallIntegerField()
    column = models.CharField(max_length=2)
    seat_class = models.CharField(max_length=12, choices=SeatClass.choices, default=SeatClass.ECONOMY)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["row", "column"]
        constraints = [
            models.UniqueConstraint(fields=["aircraft", "seat_number"], name="uniq_aircraft_seat_number"),
        ]

    def __str__(self):
        return f"{self.aircraft.aircraft_code} {self.seat_number}"
