from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.flights.models import Flight
from apps.flights.serializers import FlightBriefSerializer
from common.permissions import IsAdminRole
from common.responses import success

from . import services
from .filters import BookingFilter, PassengerRecordFilter
from .models import Booking, BookingPassenger, Passenger
from .serializers import (
    BookingCreateSerializer,
    BookingSerializer,
    PassengerRecordSerializer,
)


class BookingViewSet(viewsets.ModelViewSet):
    """Customers see and manage ONLY their own bookings; admins see everything."""

    serializer_class = BookingSerializer
    filterset_class = BookingFilter
    search_fields = ["booking_reference", "customer__email", "flight__flight_number"]
    ordering_fields = ["created_at", "total_amount", "status", "flight__departure_datetime"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = Booking.objects.select_related(
            "customer", "payment", "flight__origin", "flight__destination", "flight__aircraft"
        ).prefetch_related("booking_passengers__passenger", "booking_passengers__seat")
        user = self.request.user
        return qs if user.is_admin_role else qs.filter(customer=user)

    def get_permissions(self):
        if self.action in ("list", "confirm", "complete", "partial_update"):
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        booking = services.create_booking(
            customer=request.user,
            flight_id=data["flight"],
            cabin_class=data["cabin_class"],
            passengers=[dict(p) for p in data["passengers"]],
            payment_method=data["payment_method"],
        )
        booking = self.get_queryset().get(pk=booking.pk)
        return success(BookingSerializer(booking).data, "Booking created successfully.", status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        # Status changes go through the dedicated confirm / cancel / complete actions
        from common.exceptions import BusinessError

        raise BusinessError("Use the confirm, cancel or complete actions to change a booking.", status_code=405)

    @action(detail=False, methods=["get"], url_path="my-bookings", pagination_class=None)
    def my_bookings(self, request):
        qs = self.get_queryset().filter(customer=request.user)
        return success(BookingSerializer(qs, many=True).data, "Your bookings.")

    @action(detail=True, methods=["patch"])
    def confirm(self, request, pk=None):
        booking = services.confirm_booking(self.get_object())
        return success(BookingSerializer(booking).data, "Booking confirmed.")

    @action(detail=True, methods=["patch"])
    def cancel(self, request, pk=None):
        booking = services.cancel_booking(self.get_object())
        return success(BookingSerializer(booking).data, "Booking cancelled.")

    @action(detail=True, methods=["patch"])
    def complete(self, request, pk=None):
        booking = services.complete_booking(self.get_object())
        return success(BookingSerializer(booking).data, "Booking marked as completed.")


class PassengerRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin: every passenger on every booking (with seat, flight and booking reference)."""

    permission_classes = [IsAdminRole]
    serializer_class = PassengerRecordSerializer
    filterset_class = PassengerRecordFilter
    search_fields = [
        "passenger__first_name", "passenger__last_name", "passenger__passport_number",
        "booking__booking_reference", "flight__flight_number",
    ]
    ordering_fields = ["id", "passenger__last_name"]

    def get_queryset(self):
        return BookingPassenger.objects.select_related(
            "passenger", "seat", "booking__customer", "flight__origin", "flight__destination", "flight__aircraft"
        ).order_by("-booking__created_at", "id")


class DashboardView(APIView):
    """Admin dashboard statistics."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        from apps.flights.services import day_bounds

        now = timezone.now()
        start, end = day_bounds(timezone.localdate())
        flights = Flight.objects.select_related("origin", "destination", "aircraft")
        status_counts = {s: 0 for s in Flight.Status.values}
        for row in Flight.objects.values("status").annotate(n=Count("id")):
            status_counts[row["status"]] = row["n"]
        booking_counts = {s: 0 for s in Booking.Status.values}
        for row in Booking.objects.values("status").annotate(n=Count("id")):
            booking_counts[row["status"]] = row["n"]

        recent = Booking.objects.select_related(
            "customer", "payment", "flight__origin", "flight__destination", "flight__aircraft"
        ).prefetch_related("booking_passengers__passenger", "booking_passengers__seat")[:5]
        upcoming = flights.filter(departure_datetime__gte=now).exclude(status=Flight.Status.CANCELLED)[:5]

        data = {
            "total_flights": Flight.objects.count(),
            "todays_flights": Flight.objects.filter(departure_datetime__gte=start, departure_datetime__lt=end).count(),
            "scheduled_flights": Flight.objects.filter(status=Flight.Status.SCHEDULED).count(),
            "total_bookings": Booking.objects.count(),
            "total_passengers": Passenger.objects.count(),
            "total_customers": User.objects.filter(role=User.Role.CUSTOMER).count(),
            "recent_bookings": BookingSerializer(recent, many=True).data,
            "upcoming_flights": FlightBriefSerializer(upcoming, many=True).data,
            "flight_status_overview": status_counts,
            "booking_status_overview": booking_counts,
        }
        return success(data, "Dashboard statistics.")
