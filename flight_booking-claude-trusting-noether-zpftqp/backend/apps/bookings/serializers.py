from rest_framework import serializers

from apps.flights.serializers import FlightBriefSerializer
from apps.payments.models import Payment

from .models import Booking, BookingPassenger, Passenger


class PassengerInputSerializer(serializers.ModelSerializer):
    seat_id = serializers.IntegerField()

    class Meta:
        model = Passenger
        fields = [
            "first_name", "last_name", "gender", "date_of_birth", "nationality",
            "passport_number", "passport_expiry", "seat_id",
        ]
        extra_kwargs = {"passport_number": {"required": False}, "passport_expiry": {"required": False}}


class BookingCreateSerializer(serializers.Serializer):
    flight = serializers.IntegerField()
    cabin_class = serializers.ChoiceField(choices=["ECONOMY", "BUSINESS"])
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices, default=Payment.Method.PAY_LATER)
    passengers = PassengerInputSerializer(many=True, allow_empty=False)
    # NOTE: no price / total fields on purpose - the backend always calculates them.


class BookingPassengerSerializer(serializers.ModelSerializer):
    """A passenger as shown on a booking: personal data + seat."""

    passenger_id = serializers.IntegerField(source="passenger.id", read_only=True)
    first_name = serializers.CharField(source="passenger.first_name", read_only=True)
    last_name = serializers.CharField(source="passenger.last_name", read_only=True)
    full_name = serializers.CharField(source="passenger.full_name", read_only=True)
    gender = serializers.CharField(source="passenger.gender", read_only=True)
    date_of_birth = serializers.DateField(source="passenger.date_of_birth", read_only=True)
    nationality = serializers.CharField(source="passenger.nationality", read_only=True)
    passport_number = serializers.CharField(source="passenger.passport_number", read_only=True)
    passport_expiry = serializers.DateField(source="passenger.passport_expiry", read_only=True)
    seat_number = serializers.CharField(source="seat.seat_number", read_only=True)
    seat_class = serializers.CharField(source="seat.seat_class", read_only=True)

    class Meta:
        model = BookingPassenger
        fields = [
            "id", "passenger_id", "first_name", "last_name", "full_name", "gender", "date_of_birth",
            "nationality", "passport_number", "passport_expiry", "seat_number", "seat_class", "ticket_price",
        ]


class BookingPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "payment_method", "amount", "status", "paid_at"]


class BookingCustomerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()


class BookingSerializer(serializers.ModelSerializer):
    customer = BookingCustomerSerializer(read_only=True)
    flight = FlightBriefSerializer(read_only=True)
    payment = BookingPaymentSerializer(read_only=True)
    passengers = BookingPassengerSerializer(source="booking_passengers", many=True, read_only=True)
    can_cancel = serializers.BooleanField(source="is_cancellable", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id", "booking_reference", "customer", "flight", "cabin_class", "number_of_passengers",
            "ticket_price", "tax_rate", "subtotal", "tax", "total_amount", "status", "payment",
            "passengers", "can_cancel", "cancelled_at", "created_at", "updated_at",
        ]


class PassengerRecordSerializer(serializers.ModelSerializer):
    """Flat row for the admin passenger list."""

    passenger_id = serializers.IntegerField(source="passenger.id", read_only=True)
    full_name = serializers.CharField(source="passenger.full_name", read_only=True)
    gender = serializers.CharField(source="passenger.gender", read_only=True)
    date_of_birth = serializers.DateField(source="passenger.date_of_birth", read_only=True)
    nationality = serializers.CharField(source="passenger.nationality", read_only=True)
    passport_number = serializers.CharField(source="passenger.passport_number", read_only=True)
    passport_expiry = serializers.DateField(source="passenger.passport_expiry", read_only=True)
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    booking_reference = serializers.CharField(source="booking.booking_reference", read_only=True)
    booking_status = serializers.CharField(source="booking.status", read_only=True)
    customer_email = serializers.CharField(source="booking.customer.email", read_only=True)
    flight = FlightBriefSerializer(read_only=True)
    seat_number = serializers.CharField(source="seat.seat_number", read_only=True)
    seat_class = serializers.CharField(source="seat.seat_class", read_only=True)

    class Meta:
        model = BookingPassenger
        fields = [
            "id", "passenger_id", "full_name", "gender", "date_of_birth", "nationality", "passport_number",
            "passport_expiry", "booking_id", "booking_reference", "booking_status", "customer_email",
            "flight", "seat_number", "seat_class",
        ]
