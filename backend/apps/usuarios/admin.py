from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    list_display = ("id", "rut", "nombre", "rol", "is_active", "is_staff")
    search_fields = ("rut", "nombre")
    ordering = ("id",)
    fieldsets = (
        (None, {"fields": ("rut", "password")}),
        ("Datos", {"fields": ("nombre", "rol")}),
        (
            "Permisos",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Fechas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("rut", "nombre", "rol", "password1", "password2"),
            },
        ),
    )
