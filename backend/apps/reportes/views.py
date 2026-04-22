from datetime import date

from django.db.models import Count, Q
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.pacientes.models import Paciente
from apps.usuarios.models import Usuario


def obtener_mes_anio(request):
    hoy = date.today()
    try:
        mes = int(request.query_params.get("mes", hoy.month))
        anio = int(request.query_params.get("año", request.query_params.get("anio", hoy.year)))
    except ValueError:
        mes = hoy.month
        anio = hoy.year
    return mes, anio


class ResumenReporteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mes, anio = obtener_mes_anio(request)
        qs = Paciente.objects.filter(fecha_derivacion__month=mes, fecha_derivacion__year=anio)
        estado = qs.values("estado").annotate(total=Count("id")).order_by("estado")
        prioridad = qs.values("prioridad").annotate(total=Count("id")).order_by("prioridad")
        return Response(
            {
                "mes": mes,
                "anio": anio,
                "total_pacientes": qs.count(),
                "por_estado": list(estado),
                "por_prioridad": list(prioridad),
            }
        )


class PorKineReporteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mes, anio = obtener_mes_anio(request)
        qs = (
            Paciente.objects.filter(fecha_derivacion__month=mes, fecha_derivacion__year=anio)
            .values("kine_asignado", "kine_asignado__nombre")
            .annotate(
                total=Count("id"),
                pendientes=Count("id", filter=Q(estado=Paciente.Estado.PENDIENTE)),
                ingresados=Count("id", filter=Q(estado=Paciente.Estado.INGRESADO)),
                rescate=Count("id", filter=Q(estado=Paciente.Estado.RESCATE)),
                altas=Count("id", filter=Q(estado=Paciente.Estado.ALTA_MEDICA)),
            )
            .order_by("kine_asignado__nombre")
        )

        kines_sin_paciente = Usuario.objects.filter(rol=Usuario.Rol.KINE).exclude(
            id__in=[row["kine_asignado"] for row in qs if row["kine_asignado"]]
        )
        extras = [
            {
                "kine_asignado": k.id,
                "kine_asignado__nombre": k.nombre,
                "total": 0,
                "pendientes": 0,
                "ingresados": 0,
                "rescate": 0,
                "altas": 0,
            }
            for k in kines_sin_paciente
        ]

        return Response({"mes": mes, "anio": anio, "kines": list(qs) + extras})
