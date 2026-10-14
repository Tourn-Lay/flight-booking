from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    booking_reference = serializers.CharField(source="booking.booking_reference", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id", "booking", "booking_reference", "payment_method", "amount", "status",
            "paid_at", "created_at", "updated_at",
        ]
        read_only_fields = fields
