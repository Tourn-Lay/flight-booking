from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BookingViewSet, DashboardView, PassengerRecordViewSet

router = DefaultRouter()
router.register("", BookingViewSet, basename="booking")
urlpatterns = router.urls

passenger_router = DefaultRouter()
passenger_router.register("", PassengerRecordViewSet, basename="passenger")
passenger_urlpatterns = passenger_router.urls

dashboard_urlpatterns = [path("stats/", DashboardView.as_view(), name="dashboard-stats")]
