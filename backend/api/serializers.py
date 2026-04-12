from rest_framework import serializers
from .models import Usuario, Grupo, Sesion, AsistenteSesion, Pago, PartidoClasico, MiniPartido, Liquidacion

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
    def validate(self, attrs):
        jugadores = [
            attrs.get('jugador1_A', getattr(self.instance, 'jugador1_A', None)),
            attrs.get('jugador2_A', getattr(self.instance, 'jugador2_A', None)),
            attrs.get('jugador1_B', getattr(self.instance, 'jugador1_B', None)),
            attrs.get('jugador2_B', getattr(self.instance, 'jugador2_B', None)),
        ]

        if all(jugadores):
            ids = [jugador.id for jugador in jugadores]
            if len(set(ids)) != len(ids):
                raise serializers.ValidationError('No se puede repetir jugador en un partido clásico.')

        return attrs

    class Meta:
        model = PartidoClasico
        fields = '__all__'

class MiniPartidoSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        jugadores = [
            attrs.get('jugador1_A', getattr(self.instance, 'jugador1_A', None)),
            attrs.get('jugador2_A', getattr(self.instance, 'jugador2_A', None)),
            attrs.get('jugador1_B', getattr(self.instance, 'jugador1_B', None)),
            attrs.get('jugador2_B', getattr(self.instance, 'jugador2_B', None)),
        ]

        if all(jugadores):
            ids = [jugador.id for jugador in jugadores]
            if len(set(ids)) != len(ids):
                raise serializers.ValidationError('No se puede repetir jugador en un mini partido.')

        return attrs

    class Meta:
        model = MiniPartido
        fields = '__all__'

# Serializer para la Asistencia (RSVP)
class AsistenteSesionSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')

    def validate(self, attrs):
        sesion = attrs.get('sesion', getattr(self.instance, 'sesion', None))
        usuario = attrs.get('usuario', getattr(self.instance, 'usuario', None))

        if sesion and usuario:
            qs = AsistenteSesion.objects.filter(sesion=sesion, usuario=usuario)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError('Este jugador ya tiene asistencia registrada en la sesión.')

        return attrs

    class Meta:
        model = AsistenteSesion
        fields = ['id', 'sesion', 'usuario', 'usuario_nombre', 'estado_asistencia']

# Serializer para los Pagos
class PagoSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        sesion = attrs.get('sesion', getattr(self.instance, 'sesion', None))

        if sesion:
            qs = Pago.objects.filter(sesion=sesion)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError('Ya existe un pagador registrado para esta sesión.')

        return attrs

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

class LiquidacionSerializer(serializers.ModelSerializer):
    pagador_nombre = serializers.ReadOnlyField(source='pagador.username')
    receptor_nombre = serializers.ReadOnlyField(source='receptor.username')

    def validate(self, attrs):
        pagador = attrs.get('pagador', getattr(self.instance, 'pagador', None))
        receptor = attrs.get('receptor', getattr(self.instance, 'receptor', None))

        if pagador and receptor and pagador.id == receptor.id:
            raise serializers.ValidationError('El pagador y el receptor deben ser distintos.')

        return attrs

    class Meta:
        model = Liquidacion
        fields = ['id', 'grupo', 'pagador', 'pagador_nombre', 'receptor', 'receptor_nombre', 'cantidad', 'fecha']
