import django_filters

from .models import Airport


class AirportFilter(django_filters.FilterSet):
    class Meta:
        model = Airport
        fields = ["status", "country", "city"]
