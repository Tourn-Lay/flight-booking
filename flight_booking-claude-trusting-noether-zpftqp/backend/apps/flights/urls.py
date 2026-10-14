from rest_framework.routers import DefaultRouter

from .views import FlightViewSet

router = DefaultRouter()
router.register("", FlightViewSet, basename="flight")
urlpatterns = router.urls
