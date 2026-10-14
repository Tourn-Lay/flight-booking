from django.db.models import Count
from rest_framework import mixins, viewsets
from rest_framework.decorators import action

from common.permissions import IsAdminRole
from common.responses import success

from .filters import AircraftFilter
from .models import Aircraft, Seat
from .serializers import AircraftSerializer, SeatSerializer


class AircraftViewSet(viewsets.ModelViewSet):
    """Admin only: create / view / edit aircraft and change their status."""

    permission_classes = [IsAdminRole]
    serializer_class = AircraftSerializer
    filterset_class = AircraftFilter
    search_fields = ["aircraft_code", "manufacturer", "model"]
    ordering_fields = ["aircraft_code", "manufacturer", "model", "total_seats", "status"]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]  # no DELETE: use status INACTIVE

    def get_queryset(self):
        return Aircraft.objects.annotate(flights_count=Count("flights")).prefetch_related("seats")

    @action(detail=True, methods=["get"])
    def seats(self, request, pk=None):
        aircraft = self.get_object()
        data = SeatSerializer(aircraft.seats.all(), many=True).data
        return success(data, "Seats loaded.")


class SeatViewSet(mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Admin can activate / deactivate an individual seat of the aircraft template."""

    permission_classes = [IsAdminRole]
    serializer_class = SeatSerializer
    queryset = Seat.objects.all()
    http_method_names = ["patch", "options"]
