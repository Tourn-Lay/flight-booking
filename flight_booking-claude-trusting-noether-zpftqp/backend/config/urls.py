from django.contrib import admin
from django.urls import include, path

from apps.bookings import urls as booking_urls

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/customers/", include("apps.accounts.customer_urls")),
    path("api/airports/", include("apps.airports.urls")),
    path("api/aircraft/", include("apps.aircraft.urls")),
    path("api/flights/", include("apps.flights.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/passengers/", include(booking_urls.passenger_urlpatterns)),
    path("api/dashboard/", include(booking_urls.dashboard_urlpatterns)),
    path("api/payments/", include("apps.payments.urls")),
]
