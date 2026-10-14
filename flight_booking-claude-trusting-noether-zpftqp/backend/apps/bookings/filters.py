import django_filters
from django.db.models import Q

from apps.flights.services import day_bounds

from .models import Booking, BookingPassenger


class BookingFilter(django_filters.FilterSet):
    reference = django_filters.CharFilter(field_name="booking_reference", lookup_expr="icontains")
    customer = django_filters.CharFilter(method="filter_customer")
    flight = django_filters.CharFilter(field_name="flight__flight_number", lookup_expr="icontains")
    date = django_filters.DateFilter(method="filter_date")  # flight departure date
    payment_status = django_filters.CharFilter(field_name="payment__status", lookup_expr="iexact")

    class Meta:
        model = Booking
        fields = ["reference", "customer", "flight", "date", "status", "payment_status"]

    def filter_customer(self, queryset, name, value):
        return queryset.filter(
            Q(customer__email__icontains=value)
            | Q(customer__first_name__icontains=value)
            | Q(customer__last_name__icontains=value)
        )

    def filter_date(self, queryset, name, value):
        start, end = day_bounds(value)
        return queryset.filter(flight__departure_datetime__gte=start, flight__departure_datetime__lt=end)


class PassengerRecordFilter(django_filters.FilterSet):
    flight = django_filters.CharFilter(field_name="flight__flight_number", lookup_expr="icontains")
    reference = django_filters.CharFilter(field_name="booking__booking_reference", lookup_expr="icontains")

    class Meta:
        model = BookingPassenger
        fields = ["flight", "reference"]
