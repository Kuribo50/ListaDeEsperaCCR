from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import Usuario


class LoginSerializer(serializers.Serializer):
    rut = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        rut = attrs.get("rut")
        password = attrs.get("password")
        request = self.context.get("request")
        user = authenticate(request=request, rut=rut, password=password)
        if not user:
            raise serializers.ValidationError("Credenciales inválidas.")
        if not user.is_active:
            raise serializers.ValidationError("Usuario inactivo.")
        attrs["user"] = user
        return attrs


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ("id", "rut", "nombre", "rol", "is_active", "date_joined")
        read_only_fields = ("id", "date_joined")


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ("id", "rut", "nombre", "rol", "password", "is_active")
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = Usuario.objects.create_user(password=password, **validated_data)
        return user


class UsuarioPatchSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = Usuario
        fields = ("nombre", "rol", "is_active", "password")

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
