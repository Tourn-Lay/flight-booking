from django.contrib import admin

from .models import Aircraft, Seat


@admin.register(Aircraft)
class AircraftAdmin(admin.ModelAdmin):
    list_display = ("aircraft_code", "manufacturer", "model", "total_seats", "status")
    list_filter = ("status", "manufacturer")
    search_fields = ("aircraft_code", "model")


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ("aircraft", "seat_number", "seat_class", "status")
    list_filter = ("seat_class", "status", "aircraft")
