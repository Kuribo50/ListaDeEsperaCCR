from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import MovimientoPaciente, Paciente


@receiver(pre_save, sender=Paciente)
def paciente_pre_save(sender, instance: Paciente, **kwargs):
    if not instance.pk:
        instance._estado_anterior = None
        return
    try:
        previo = Paciente.objects.only("estado").get(pk=instance.pk)
        instance._estado_anterior = previo.estado
    except Paciente.DoesNotExist:
        instance._estado_anterior = None


@receiver(post_save, sender=Paciente)
def paciente_post_save(sender, instance: Paciente, created: bool, **kwargs):
    estado_anterior = getattr(instance, "_estado_anterior", None)
    if created or estado_anterior == instance.estado:
        return

    Paciente.objects.filter(pk=instance.pk).update(fecha_cambio_estado=timezone.now())
    MovimientoPaciente.objects.create(
        paciente=instance,
        usuario=getattr(instance, "_movimiento_usuario", None),
        estado_anterior=estado_anterior,
        estado_nuevo=instance.estado,
        notas=getattr(instance, "_movimiento_notas", ""),
    )
