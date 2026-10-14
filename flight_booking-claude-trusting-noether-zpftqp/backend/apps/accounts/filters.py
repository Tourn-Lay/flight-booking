import django_filters

from .models import User


class CustomerFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(method="filter_status")

    class Meta:
        model = User
        fields = ["status"]

    def filter_status(self, queryset, name, value):
        value = value.upper()
        if value == "ACTIVE":
            return queryset.filter(is_active=True)
        if value == "INACTIVE":
            return queryset.filter(is_active=False)
        return queryset
