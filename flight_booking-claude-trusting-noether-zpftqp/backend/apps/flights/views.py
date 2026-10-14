from datetime import date as date_type

from django.db.models import ProtectedError
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from common.exceptions import BusinessError, ConflictError
from common.permissions import IsAdminOrReadOnly, IsAdminRole
from common.responses import success

from . import services
from .filters import FlightFilter
from .models import Flight
from .serializers import FlightSerializer, FlightStatusSerializer


class FlightViewSet(viewsets.ModelViewSet):
    """Public read, admin write. Also hosts /search/, /{id}/seats/ and /{id}/status/."""

    serializer_class = FlightSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = FlightFilter
    search_fields = ["flight_number", "origin__code", "origin__city", "destination__code", "destination__city"]
    ordering_fields = ["departure_datetime", "arrival_datetime", "economy_price", "business_price", "flight_number", "status"]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Flight.objects.select_related("origin", "destination", "aircraft")

    def paginate_queryset(self, queryset):
        page = super().paginate_queryset(queryset)
        if page is not None:
            self._prefetch_availability(page)
        return page

    def _prefetch_availability(self, flights):
        # One pair of aggregate queries for the whole page instead of N+1
        self._availability = services.seat_availability([f.id for f in flights])

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if getattr(self, "_availability", None) is not None:
            context["availability"] = self._availability
        return context

    def destroy(self, request, *args, **kwargs):
        flight = self.get_object()
        try:
            flight.delete()
        except ProtectedError:
            raise ConflictError("This flight has bookings and cannot be deleted. Cancel it instead.")
        return success(None, "Flight deleted successfully.")

    # --------------------------------------------------------------- search
    @action(detail=False, methods=["get"], permission_classes=[AllowAny], pagination_class=None)
    def search(self, request):
        params = request.query_params
        origin, destination = params.get("origin"), params.get("destination")
        if not origin or not destination or not params.get("date"):
            raise BusinessError("origin, destination and date are required.")
        if origin.upper() == destination.upper():
            raise BusinessError("Origin and destination must be different.")
        try:
            day = date_type.fromisoformat(params["date"])
        except ValueError:
            raise BusinessError("date must be in YYYY-MM-DD format.")
        try:
            passengers = int(params.get("passengers", 1))
        except ValueError:
            raise BusinessError("passengers must be a number.")
        if passengers < 1:
            raise BusinessError("passengers must be at least 1.")
        cabin = (params.get("cabin_class") or "ECONOMY").upper()
        if cabin not in ("ECONOMY", "BUSINESS"):
            raise BusinessError("cabin_class must be ECONOMY or BUSINESS.")

        results = services.search_flights(origin, destination, day, passengers, cabin)
        context = {"request": request, "availability": {f.id: a for f, a in results}}
        data = []
        for flight, avail in results:
            item = FlightSerializer(flight, context=context).data
            item["cabin_class"] = cabin
            item["price"] = str(flight.price_for(cabin))
            item["available_seats_in_cabin"] = avail.get(cabin, 0)
            data.append(item)
        return success(data, f"{len(data)} flight(s) found.")

    # ---------------------------------------------------------------- seats
    @action(detail=True, methods=["get"], permission_classes=[AllowAny], pagination_class=None)
    def seats(self, request, pk=None):
        flight = self.get_object()
        seats = services.seat_map(flight)
        data = {
            "flight": FlightSerializer(flight, context=self.get_serializer_context()).data,
            "seats": seats,
        }
        return success(data, "Seat map loaded.")

    # --------------------------------------------------------------- status
    @action(detail=True, methods=["patch"], permission_classes=[IsAdminRole], url_path="status")
    def update_status(self, request, pk=None):
        flight = self.get_object()
        serializer = FlightStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from apps.bookings.services import apply_flight_status  # local import: bookings depends on flights

        apply_flight_status(flight, serializer.validated_data["status"])
        flight.refresh_from_db()
        return success(FlightSerializer(flight, context=self.get_serializer_context()).data, "Flight status updated.")
