from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler


class BusinessError(APIException):
    """A business rule was violated (HTTP 400 by default)."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The request could not be completed."
    default_code = "business_error"

    def __init__(self, message=None, errors=None, status_code=None):
        super().__init__(detail=message)
        self.message = str(message or self.default_detail)
        self.errors = errors or {}
        if status_code:
            self.status_code = status_code


class ConflictError(BusinessError):
    status_code = status.HTTP_409_CONFLICT
    default_code = "conflict"


class SeatUnavailableError(ConflictError):
    default_detail = "One or more selected seats are no longer available."
    default_code = "seat_unavailable"


def _first_message(value):
    """Dig out the first human readable string from DRF error data."""
    if isinstance(value, (list, tuple)):
        for item in value:
            msg = _first_message(item)
            if msg:
                return msg
        return None
    if isinstance(value, dict):
        for key, item in value.items():
            msg = _first_message(item)
            if msg:
                if str(key) in ("non_field_errors", "detail", "__all__"):
                    return msg
                return f"{str(key).replace('_', ' ').capitalize()}: {msg}"
        return None
    return str(value) if value else None


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, BusinessError):
        message, errors = exc.message, exc.errors
    elif isinstance(exc, ValidationError):
        errors = response.data
        message = _first_message(errors) or "Validation failed."
    else:
        detail = response.data.get("detail") if isinstance(response.data, dict) else None
        message = str(detail) if detail else "Request failed."
        errors = {}

    response.data = {"success": False, "message": message, "errors": errors}
    return response
