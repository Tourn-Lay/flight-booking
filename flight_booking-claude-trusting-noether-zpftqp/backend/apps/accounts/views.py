from django.db.models import Count
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView

from common.permissions import IsAdminRole
from common.responses import success

from .filters import CustomerFilter
from .models import User
from .serializers import CustomerSerializer, LoginSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        data = {"user": UserSerializer(user).data, **serializer.tokens_for(user)}
        return success(data, "Registration successful.", status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        response.message = "Login successful."
        return response


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        return success(self.get_serializer(request.user).data, "Profile loaded.")

    def put(self, request, *args, **kwargs):
        # PUT behaves like PATCH so the form may send only the editable fields.
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success(serializer.data, "Profile updated successfully.")

    patch = put


class CustomerViewSet(viewsets.ModelViewSet):
    """Admin: list / view customers and activate / deactivate them."""

    permission_classes = [IsAdminRole]
    serializer_class = CustomerSerializer
    filterset_class = CustomerFilter
    search_fields = ["email", "first_name", "last_name", "phone"]
    ordering_fields = ["date_joined", "email", "total_bookings"]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return User.objects.filter(role=User.Role.CUSTOMER).annotate(total_bookings=Count("bookings"))
