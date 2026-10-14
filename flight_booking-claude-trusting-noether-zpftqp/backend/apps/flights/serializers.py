from rest_framework import serializers

from apps.aircraft.serializers import AircraftMiniSerializer
from apps.airports.serializers import AirportMiniSerializer

from .models import Flight
from .services import seat_availability, validate_flight_data


class FlightSerializer(serializers.ModelSerializer):
    origin_info = AirportMiniSerializer(source="origin", read_only=True)
    destination_info = AirportMiniSerializer(source="destination", read_only=True)
    aircraft_info = AircraftMiniSerializer(source="aircraft", read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    is_bookable = serializers.BooleanField(read_only=True)
    available_seats = serializers.SerializerMethodField()

    class Meta:
        model = Flight
        fields = [
            "id", "flight_number", "aircraft", "origin", "destination",
            "departure_datetime", "arrival_datetime", "economy_price", "business_price", "status",
            "origin_info", "destination_info", "aircraft_info",
            "duration_minutes", "is_bookable", "available_seats", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        # Unique-together is validated by us with a friendlier message
        validators = []

    def get_available_seats(self, obj):
        cache = self.context.get("availability")
        if cache is None:
            cache = self.context["availability"] = {}
        if obj.id not in cache:
            cache.update(seat_availability([obj.id]))
        data = cache.get(obj.id, {})
        return {"economy": data.get("ECONOMY", 0), "business": data.get("BUSINESS", 0)}

    def validate_flight_number(self, value):
        return value.upper()

    def validate(self, attrs):
        validate_flight_data(attrs, self.instance)
        number = attrs.get("flight_number", getattr(self.instance, "flight_number", None))
        departure = attrs.get("departure_datetime", getattr(self.instance, "departure_datetime", None))
        duplicates = Flight.objects.filter(flight_number=number, departure_datetime=departure)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError({"flight_number": "This flight number already exists for that departure."})
        return attrs


class FlightBriefSerializer(serializers.ModelSerializer):
    """Compact flight used inside bookings."""

    origin = AirportMiniSerializer(read_only=True)
    destination = AirportMiniSerializer(read_only=True)
    aircraft_code = serializers.CharField(source="aircraft.aircraft_code", read_only=True)

    class Meta:
        model = Flight
        fields = [
            "id", "flight_number", "origin", "destination", "departure_datetime",
            "arrival_datetime", "status", "aircraft_code",
        ]


class FlightStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Flight.Status.choices)
