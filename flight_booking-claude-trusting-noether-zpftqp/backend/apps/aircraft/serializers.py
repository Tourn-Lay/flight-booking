from rest_framework import serializers

from .models import Aircraft, Seat
from .services import generate_seats


class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ["id", "aircraft", "seat_number", "row", "column", "seat_class", "status"]
        read_only_fields = ["id", "aircraft", "seat_number", "row", "column", "seat_class"]


class AircraftSerializer(serializers.ModelSerializer):
    # Optional input used to build the seat template (multiple of 4 recommended)
    business_seats = serializers.IntegerField(write_only=True, required=False, min_value=0)
    economy_seat_count = serializers.SerializerMethodField()
    business_seat_count = serializers.SerializerMethodField()
    flights_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Aircraft
        fields = [
            "id", "aircraft_code", "manufacturer", "model", "total_seats", "status",
            "business_seats", "economy_seat_count", "business_seat_count", "flights_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_economy_seat_count(self, obj):
        return sum(1 for s in obj.seats.all() if s.seat_class == Seat.SeatClass.ECONOMY)

    def get_business_seat_count(self, obj):
        return sum(1 for s in obj.seats.all() if s.seat_class == Seat.SeatClass.BUSINESS)

    def validate_total_seats(self, value):
        if value < 1 or value > 600:
            raise serializers.ValidationError("Total seats must be between 1 and 600.")
        return value

    def validate(self, attrs):
        total = attrs.get("total_seats", getattr(self.instance, "total_seats", None))
        business = attrs.get("business_seats")
        if business is not None and total is not None and business > total:
            raise serializers.ValidationError({"business_seats": "Business seats cannot exceed total seats."})
        if self.instance:
            layout_changed = ("total_seats" in attrs and attrs["total_seats"] != self.instance.total_seats) or (
                business is not None
            )
            if layout_changed and self.instance.flights.exists():
                raise serializers.ValidationError(
                    "The seat layout cannot be changed once the aircraft is assigned to flights."
                )
        return attrs

    def create(self, validated_data):
        business = validated_data.pop("business_seats", None)
        aircraft = super().create(validated_data)
        generate_seats(aircraft, business)
        return aircraft

    def update(self, instance, validated_data):
        business = validated_data.pop("business_seats", None)
        old_total = instance.total_seats
        aircraft = super().update(instance, validated_data)
        if aircraft.total_seats != old_total or business is not None:
            generate_seats(aircraft, business)
        return aircraft


class AircraftMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aircraft
        fields = ["id", "aircraft_code", "manufacturer", "model", "total_seats"]
