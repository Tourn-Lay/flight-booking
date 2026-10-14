from rest_framework.routers import DefaultRouter

from .views import AircraftViewSet, SeatViewSet

router = DefaultRouter()
router.register("seats", SeatViewSet, basename="seat")
router.register("", AircraftViewSet, basename="aircraft")
urlpatterns = router.urls
