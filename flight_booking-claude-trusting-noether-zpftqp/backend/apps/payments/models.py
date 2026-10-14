from django.db import models


class Payment(models.Model):
    """Simulated payment tracking (no real gateway)."""

    class Method(models.TextChoices):
        CARD = "CARD", "Card"
        CASH = "CASH", "Cash"
        PAY_LATER = "PAY_LATER", "Pay later"

    class Status(models.TextChoices):
        UNPAID = "UNPAID", "Unpaid"
        PAID = "PAID", "Paid"
        REFUNDED = "REFUNDED", "Refunded"

    booking = models.OneToOneField("bookings.Booking", on_delete=models.CASCADE, related_name="payment")
    payment_method = models.CharField(max_length=10, choices=Method.choices, default=Method.PAY_LATER)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.UNPAID)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.booking.booking_reference} {self.status}"
