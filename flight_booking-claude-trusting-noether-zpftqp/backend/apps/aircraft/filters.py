import django_filters

from .models import Aircraft


class AircraftFilter(django_filters.FilterSet):
    class Meta:
        model = Aircraft
        fields = ["status", "manufacturer"]
