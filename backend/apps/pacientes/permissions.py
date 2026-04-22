from rest_framework.permissions import BasePermission

from apps.usuarios.models import Usuario
from .models import Paciente


class PuedeAsignarPaciente(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return request.user.rol == Usuario.Rol.KINE


class PuedeCambiarEstado(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        rol = request.user.rol
        if rol in {Usuario.Rol.KINE, Usuario.Rol.ADMIN}:
            return True
        return obj.kine_asignado_id is not None and rol == Usuario.Rol.ADMINISTRATIVO


class PuedeRegistrarLlamado(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.rol in {Usuario.Rol.ADMINISTRATIVO, Usuario.Rol.ADMIN, Usuario.Rol.KINE}


class PuedeProgramarAtencion(BasePermission):
    ESTADOS_PROGRAMABLES = {
        Paciente.Estado.PENDIENTE,
        Paciente.Estado.RESCATE,
        Paciente.Estado.INGRESADO,
    }

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.rol in {Usuario.Rol.KINE, Usuario.Rol.ADMIN}

    def has_object_permission(self, request, view, obj):
        if obj.estado not in self.ESTADOS_PROGRAMABLES:
            return False
        if obj.kine_asignado_id is None:
            return False
        if request.user.rol == Usuario.Rol.KINE:
            return obj.kine_asignado_id == request.user.id
        return request.user.rol == Usuario.Rol.ADMIN
