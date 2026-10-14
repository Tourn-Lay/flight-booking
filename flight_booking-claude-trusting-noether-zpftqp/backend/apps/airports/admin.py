from django.contrib import admin

from .models import Airport


@admin.register(Airport)
class AirportAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "city", "country", "status")
    list_filter = ("status", "country")
    search_fields = ("code", "name", "city")
