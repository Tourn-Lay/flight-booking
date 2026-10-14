from django.db.models import ProtectedError
from rest_framework import viewsets

from common.exceptions import ConflictError
from common.permissions import IsAdminOrReadOnly
from common.responses import success

from .filters import AirportFilter
from .models import Airport
from .serializers import AirportSerializer


class AirportViewSet(viewsets.ModelViewSet):
    """Public read (active airports only for non-admins); admin write."""

    serializer_class = AirportSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = AirportFilter
    search_fields = ["code", "name", "city", "country"]
    ordering_fields = ["code", "name", "city", "country", "status"]

    def get_queryset(self):
        qs = Airport.objects.all()
        user = self.request.user
        if not (user.is_authenticated and user.is_admin_role):
            qs = qs.filter(status=Airport.Status.ACTIVE)
        return qs

    def destroy(self, request, *args, **kwargs):
        airport = self.get_object()
        try:
            airport.delete()
        except ProtectedError:
            raise ConflictError("This airport is used by flights. Deactivate it instead of deleting it.")
        return success(None, "Airport deleted successfully.")
