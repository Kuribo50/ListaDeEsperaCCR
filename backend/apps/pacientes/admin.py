from django.contrib import admin

from .models import DiagnosticoCatalogo, MovimientoPaciente, Paciente


@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = (
        "id_ccr",
        "nombre",
        "rut",
        "prioridad",
        "categoria",
        "estado",
        "kine_asignado",
    )
    search_fields = ("id_ccr", "nombre", "rut", "diagnostico")
    list_filter = ("prioridad", "categoria", "estado")


@admin.register(MovimientoPaciente)
class MovimientoPacienteAdmin(admin.ModelAdmin):
    list_display = (
        "paciente",
        "estado_anterior",
        "estado_nuevo",
        "usuario",
        "fecha",
    )
    list_filter = ("estado_nuevo",)
    search_fields = ("paciente__id_ccr", "paciente__nombre")


@admin.register(DiagnosticoCatalogo)
class DiagnosticoCatalogoAdmin(admin.ModelAdmin):
    list_display = ("categoria", "diagnostico")
    search_fields = ("diagnostico",)
    list_filter = ("categoria",)
