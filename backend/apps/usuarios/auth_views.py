from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView


def normalizar_rut(rut: str) -> str:
    return (rut or "").replace(".", "").replace("-", "").upper().strip()


class RutTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_field = self.username_field
        attrs[username_field] = normalizar_rut(attrs.get(username_field, ""))
        return super().validate(attrs)


class RutTokenObtainPairView(TokenObtainPairView):
    serializer_class = RutTokenObtainPairSerializer
    throttle_scope = "auth_login"


class ScopedTokenRefreshView(TokenRefreshView):
    throttle_scope = "auth_refresh"
