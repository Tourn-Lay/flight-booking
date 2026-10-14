from rest_framework.renderers import JSONRenderer


class EnvelopeRenderer(JSONRenderer):
    """Wrap every API response in the project's standard envelope.

    success -> {"success": true,  "message": "...", "data": ...}
    error   -> {"success": false, "message": "...", "errors": {...}}
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = (renderer_context or {}).get("response")
        if response is None:
            return super().render(data, accepted_media_type, renderer_context)

        # Already an envelope (produced by the exception handler)
        if isinstance(data, dict) and "success" in data and "message" in data:
            return super().render(data, accepted_media_type, renderer_context)

        if response.status_code >= 400:
            payload = {"success": False, "message": "Request failed.", "errors": data or {}}
        else:
            message = getattr(response, "message", None) or "Request successful."
            payload = {"success": True, "message": message, "data": data}
        return super().render(payload, accepted_media_type, renderer_context)
