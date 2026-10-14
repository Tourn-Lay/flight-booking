from rest_framework import status as http_status
from rest_framework.response import Response


def success(data=None, message="Request successful.", status=http_status.HTTP_200_OK):
    """Return a Response whose message is picked up by EnvelopeRenderer."""
    response = Response(data, status=status)
    response.message = message
    return response
