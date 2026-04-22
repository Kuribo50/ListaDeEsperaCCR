from rest_framework import serializers

from .models import DiagnosticoCatalogo, MovimientoPaciente, Paciente


class PacienteSerializer(serializers.ModelSerializer):
    kine_asignado_nombre = serializers.CharField(source="kine_asignado.nombre", read_only=True)
    dias_en_lista = serializers.SerializerMethodField()

    class Meta:
        model = Paciente
        fields = (
            "id",
            "id_ccr",
            "fecha_derivacion",
            "percapita_desde",
            "nombre",
            "rut",
            "edad",
            "diagnostico",
            "profesional",
            "prioridad",
            "categoria",
            "mayor_60",
            "kine_asignado",
            "kine_asignado_nombre",
            "estado",
            "fecha_cambio_estado",
            "n_intentos_contacto",
            "observaciones",
            "dias_en_lista",
            "n_meses_espera",
            "creado_en",
            # Contacto y seguimiento
            "fecha_nacimiento",
            "telefono",
            "telefono_recados",
            "email",
            "fecha_ingreso",
            "fecha_siguiente_cita",
            "proxima_atencion",
            "fecha_egreso",
        )
        read_only_fields = (
            "id",
            "id_ccr",
            "mayor_60",
            "fecha_cambio_estado",
            "n_intentos_contacto",
            "dias_en_lista",
        )

    def get_dias_en_lista(self, obj: Paciente) -> int:
        return (self.context["today"] - obj.fecha_derivacion).days


class PacienteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paciente
        fields = (
            "id",
            "fecha_derivacion",
            "percapita_desde",
            "nombre",
            "rut",
            "edad",
            "diagnostico",
            "profesional",
            "prioridad",
            "categoria",
            "observaciones",
            "fecha_nacimiento",
            "telefono",
            "email",
        )
        read_only_fields = ("id",)


class CambiarEstadoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=Paciente.Estado.choices)
    notas = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        estado = attrs["estado"]
        notas = (attrs.get("notas") or "").strip()
        if estado in {
            Paciente.Estado.ABANDONO,
            Paciente.Estado.ALTA_MEDICA,
            Paciente.Estado.EGRESO_VOLUNTARIO,
        } and not notas:
            raise serializers.ValidationError(
                {"notas": "Este cambio de estado requiere notas obligatorias."}
            )
        attrs["notas"] = notas
        return attrs


class ProgramarAtencionSerializer(serializers.Serializer):
    fecha_hora = serializers.DateTimeField(required=True)


class RegistrarLlamadoSerializer(serializers.Serializer):
    contesto = serializers.BooleanField()
    notas = serializers.CharField(required=False, allow_blank=True, default="")


class MovimientoPacienteSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source="usuario.nombre", read_only=True)

    class Meta:
        model = MovimientoPaciente
        fields = (
            "id",
            "paciente",
            "usuario",
            "usuario_nombre",
            "estado_anterior",
            "estado_nuevo",
            "fecha",
            "notas",
        )


class DiagnosticoCatalogoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticoCatalogo
        fields = ("id", "categoria", "diagnostico")
