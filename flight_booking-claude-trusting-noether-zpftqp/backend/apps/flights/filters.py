import django_filters

from .models import Flight
from .services import day_bounds


class FlightFilter(django_filters.FilterSet):
    origin = django_filters.CharFilter(field_name="origin__code", lookup_expr="iexact")
    destination = django_filters.CharFilter(field_name="destination__code", lookup_expr="iexact")
    date = django_filters.DateFilter(method="filter_date")

    class Meta:
        model = Flight
        fields = ["origin", "destination", "date", "status", "aircraft"]

    def filter_date(self, queryset, name, value):
        start, end = day_bounds(value)
        return queryset.filter(departure_datetime__gte=start, departure_datetime__lt=end)
