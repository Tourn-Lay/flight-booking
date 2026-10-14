from django.contrib import admin

from .models import Flight


@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = ("flight_number", "origin", "destination", "departure_datetime", "status")
    list_filter = ("status", "origin", "destination")
    search_fields = ("flight_number",)
