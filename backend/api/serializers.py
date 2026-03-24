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

class PartidoClasicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartidoClasico
        fields = '__all__'

class MiniPartidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MiniPartido
        fields = '__all__'

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

class SesionSerializer(serializers.ModelSerializer):
    grupo_nombre = serializers.ReadOnlyField(source='grupo.nombre')
    
    # Anidamos las relaciones inversas usando el nombre por defecto de Django (_set)
    asistentes = AsistenteSesionSerializer(source='asistentesesion_set', many=True, read_only=True)
    pagos = PagoSerializer(source='pago_set', many=True, read_only=True)
    partidos_clasicos = PartidoClasicoSerializer(source='partidoclasico_set', many=True, read_only=True)
    mini_partidos = MiniPartidoSerializer(source='minipartido_set', many=True, read_only=True)

    class Meta:
        model = Sesion
        # Añadimos los nuevos campos anidados al array de fields
        fields = [
            'id', 'grupo', 'grupo_nombre', 'fecha_hora', 'lugar', 'coste_total', 'estado',
            'asistentes', 'pagos', 'partidos_clasicos', 'mini_partidos'
        ]