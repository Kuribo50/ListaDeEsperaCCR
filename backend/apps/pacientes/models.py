from django.conf import settings
from django.db import models


class Paciente(models.Model):
    class Prioridad(models.TextChoices):
        ALTA = "ALTA", "Alta"
        MEDIANA = "MEDIANA", "Mediana"
        MODERADA = "MODERADA", "Moderada"
        LICENCIA_MEDICA = "LICENCIA_MEDICA", "Licencia Medica"

    class Categoria(models.TextChoices):
        BORRADOR = "BORRADOR", "Borrador"
        MAS65 = "MAS65", "Mayor o igual 65"
        OA_MENOS65 = "OA_MENOS65", "OA menor 65"
        HOMBROS = "HOMBROS", "Hombros"
        LUMBAGOS = "LUMBAGOS", "Lumbagos"
        SDNT = "SDNT", "SDNT"
        SDT = "SDT", "SDT"
        OTROS_NEUROS = "OTROS_NEUROS", "Otros neuros"
        AATT = "AATT", "AATT"
        DUPLA = "DUPLA", "Dupla"

    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        INGRESADO = "INGRESADO", "Ingresado"
        RESCATE = "RESCATE", "Rescate"
        ABANDONO = "ABANDONO", "Abandono"
        ALTA_MEDICA = "ALTA_MEDICA", "Alta medica"
        EGRESO_VOLUNTARIO = "EGRESO_VOLUNTARIO", "Egreso voluntario"
        DERIVADO = "DERIVADO", "Derivado"

    id_ccr = models.CharField(max_length=12, unique=True, blank=True, editable=False)
    fecha_derivacion = models.DateField()
    percapita_desde = models.CharField(max_length=150, blank=True)
    nombre = models.CharField(max_length=160)
    rut = models.CharField(max_length=12, db_index=True)
    edad = models.PositiveIntegerField()
    diagnostico = models.TextField()
    profesional = models.CharField(max_length=160)
    prioridad = models.CharField(max_length=20, choices=Prioridad.choices)
    categoria = models.CharField(max_length=20, choices=Categoria.choices)
    mayor_60 = models.BooleanField(default=False, editable=False)
    kine_asignado = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pacientes_asignados",
    )
    estado = models.CharField(
        max_length=20, choices=Estado.choices, default=Estado.PENDIENTE, db_index=True
    )
    fecha_cambio_estado = models.DateTimeField(auto_now_add=True)
    n_intentos_contacto = models.PositiveIntegerField(default=0)
    n_meses_espera = models.PositiveIntegerField(default=1, help_text="Veces que ha aparecido en listas mensuales")
    observaciones = models.TextField(blank=True)
    # Datos de contacto y seguimiento
    fecha_nacimiento = models.DateField(null=True, blank=True)
    telefono = models.CharField(max_length=20, blank=True, default='')
    telefono_recados = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    fecha_ingreso = models.DateField(null=True, blank=True)
    fecha_siguiente_cita = models.DateField(null=True, blank=True)
    proxima_atencion = models.DateTimeField(null=True, blank=True)
    fecha_egreso = models.DateField(null=True, blank=True)
    importacion_origen = models.ForeignKey(
        "importar.ImportacionMensual",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pacientes_creados"
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = []
        indexes = [
            models.Index(fields=["rut", "fecha_derivacion"]),
            models.Index(fields=["categoria"]),
            models.Index(fields=["prioridad"]),
            models.Index(fields=["estado"]),
        ]

    def save(self, *args, **kwargs):
        self.rut = self.rut.replace(".", "").replace("-", "").upper().strip()
        self.mayor_60 = self.edad >= 60
        is_new = self.pk is None
        if is_new and not self.id_ccr:
            super().save(*args, **kwargs)
            self.id_ccr = f"CCR-{self.pk:04d}"
            super().save(update_fields=["id_ccr"])
            return
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id_ccr or 'CCR-SIN-ID'} - {self.nombre}"


class MovimientoPaciente(models.Model):
    paciente = models.ForeignKey(
        Paciente, on_delete=models.CASCADE, related_name="movimientos"
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    estado_anterior = models.CharField(max_length=20, blank=True, null=True)
    estado_nuevo = models.CharField(max_length=20)
    fecha = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True)

    class Meta:
        ordering = ["-fecha", "-id"]

    def __str__(self):
        return f"{self.paciente_id}: {self.estado_anterior} -> {self.estado_nuevo}"


class DiagnosticoCatalogo(models.Model):
    categoria = models.CharField(max_length=20, choices=Paciente.Categoria.choices)
    diagnostico = models.CharField(max_length=255, unique=True)

    class Meta:
        ordering = ["categoria", "diagnostico"]

    def __str__(self):
        return f"{self.categoria} - {self.diagnostico}"
