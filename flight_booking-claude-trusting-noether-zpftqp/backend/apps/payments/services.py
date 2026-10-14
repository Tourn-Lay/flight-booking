from django.utils import timezone

from common.exceptions import BusinessError

from .models import Payment


def mark_paid(payment, method=None):
    from apps.bookings.models import Booking

    if payment.booking.status == Booking.Status.CANCELLED:
        raise BusinessError("A cancelled booking cannot be paid.")
    if payment.status == Payment.Status.PAID:
        raise BusinessError("This payment is already marked as paid.")
    if payment.status == Payment.Status.REFUNDED:
        raise BusinessError("A refunded payment cannot be marked as paid.")
    if method:
        payment.payment_method = method
    payment.status = Payment.Status.PAID
    payment.paid_at = timezone.now()
    payment.save()
    return payment
