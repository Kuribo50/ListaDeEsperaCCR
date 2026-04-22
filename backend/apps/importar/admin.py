from django.contrib import admin

from .models import ImportacionMensual


@admin.register(ImportacionMensual)
class ImportacionMensualAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "mes",
        "anio",
        "usuario",
        "estado",
        "total_registros",
        "registros_importados",
        "fecha_subida",
    )
    list_filter = ("mes", "anio", "estado")
