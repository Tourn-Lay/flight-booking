from rest_framework import viewsets
from rest_framework.decorators import action

from common.permissions import IsAdminRole
from common.responses import success

from .filters import PaymentFilter
from .models import Payment
from .serializers import PaymentSerializer
from .services import mark_paid


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Customers may read their own payment; only admins list and mark paid."""

    serializer_class = PaymentSerializer
    filterset_class = PaymentFilter
    search_fields = ["booking__booking_reference"]

    def get_queryset(self):
        qs = Payment.objects.select_related("booking")
        user = self.request.user
        return qs if user.is_admin_role else qs.filter(booking__customer=user)

    def get_permissions(self):
        if self.action in ("list", "mark_paid"):
            return [IsAdminRole()]
        return super().get_permissions()

    @action(detail=True, methods=["patch"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        payment = mark_paid(self.get_object(), request.data.get("payment_method"))
        return success(PaymentSerializer(payment).data, "Payment marked as paid.")
