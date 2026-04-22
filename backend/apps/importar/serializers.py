from rest_framework import serializers

from .models import ImportacionMensual


class ImportacionDerivacionesSerializer(serializers.Serializer):
    archivo = serializers.FileField()
    mes = serializers.IntegerField(min_value=1, max_value=12, required=False)
    anio = serializers.IntegerField(min_value=2000, max_value=2100, required=False)


class ImportacionMensualSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportacionMensual
        fields = "__all__"
