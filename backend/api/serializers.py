from rest_framework import serializers
from .models import Usuario, Grupo, Sesion, AsistenteSesion, Pago, PartidoClasico, MiniPartido

# Serializer para el Usuario (sin mostrar la contraseña por seguridad)
class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email']

# Serializer para los Grupos
class GrupoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grupo
        fields = '__all__'

class SesionSerializer(serializers.ModelSerializer):
    grupo_nombre = serializers.ReadOnlyField(source='grupo.nombre')

    class Meta:
        model = Sesion
        fields = ['id', 'grupo', 'grupo_nombre', 'fecha_hora', 'lugar', 'coste_total', 'estado']

# Serializer para la Asistencia (RSVP)
class AsistenteSesionSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = AsistenteSesion
        fields = ['id', 'sesion', 'usuario', 'usuario_nombre', 'estado_asistencia']

# Serializer para los Pagos
class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = '__all__'