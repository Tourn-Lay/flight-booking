from django.core.validators import RegexValidator
from django.db import models


class Airport(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    code = models.CharField(
        max_length=4, unique=True,
        validators=[RegexValidator(r"^[A-Z]{3,4}$", "Airport code must be 3-4 uppercase letters.")],
    )
    name = models.CharField(max_length=150)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def save(self, *args, **kwargs):
        self.code = (self.code or "").upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.name}"
