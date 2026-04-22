from rest_framework.permissions import BasePermission

from .models import Usuario


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.rol == Usuario.Rol.ADMIN)


class IsAdminOrAdministrativoRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.rol in {Usuario.Rol.ADMIN, Usuario.Rol.ADMINISTRATIVO}
        )
