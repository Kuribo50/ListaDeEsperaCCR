from django.apps import AppConfig


class PacientesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.pacientes"
    label = "pacientes"

    def ready(self):
        from . import signals  # noqa: F401
