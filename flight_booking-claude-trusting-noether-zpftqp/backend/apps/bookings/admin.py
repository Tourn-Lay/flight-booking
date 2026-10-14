from django.contrib import admin

from .models import Booking, BookingPassenger, Passenger


class BookingPassengerInline(admin.TabularInline):
    model = BookingPassenger
    extra = 0


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("booking_reference", "customer", "flight", "number_of_passengers", "total_amount", "status")
    list_filter = ("status",)
    search_fields = ("booking_reference", "customer__email")
    inlines = [BookingPassengerInline]


@admin.register(Passenger)
class PassengerAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "nationality", "passport_number")
    search_fields = ("first_name", "last_name", "passport_number")
