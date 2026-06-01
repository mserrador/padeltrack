from rest_framework import serializers
from .models import Usuario, Grupo, Sesion, AsistenteSesion, Pago, PartidoClasico, MiniPartido, Liquidacion, MiembroGrupo

# Serializer para el Usuario (sin mostrar la contraseña por seguridad)
class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email']

# Serializer para los Grupos
class GrupoSerializer(serializers.ModelSerializer):
    def validate_nombre(self, value):
        nombre_limpio = value.strip()
        if len(nombre_limpio) < 3:
            raise serializers.ValidationError('El nombre del grupo debe tener al menos 3 caracteres.')
        return nombre_limpio

    class Meta:
        model = Grupo
        fields = '__all__'


class RegistroUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=True)

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'password']

    def validate_username(self, value):
        username_limpio = value.strip()
        if len(username_limpio) < 3:
            raise serializers.ValidationError('El nombre de usuario debe tener al menos 3 caracteres.')

        if Usuario.objects.filter(username__iexact=username_limpio).exists():
            raise serializers.ValidationError('Este nombre de usuario ya está en uso.')

        return username_limpio

    def validate_email(self, value):
        email_limpio = value.strip().lower()
        if Usuario.objects.filter(email__iexact=email_limpio).exists():
            raise serializers.ValidationError('Este correo ya está registrado.')
        return email_limpio

    def create(self, validated_data):
        return Usuario.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )

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
    usuario = serializers.PrimaryKeyRelatedField(queryset=Usuario.objects.all(), required=False)
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')

    def validate(self, attrs):
        sesion = attrs.get('sesion', getattr(self.instance, 'sesion', None))
        usuario = attrs.get('usuario', getattr(self.instance, 'usuario', None))

        if not usuario:
            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated:
                usuario = request.user
                attrs['usuario'] = usuario

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
        extra_kwargs = {
            'usuario': {'required': False},
        }

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
    creado_por = serializers.ReadOnlyField(source='creado_por.id')
    creado_por_username = serializers.ReadOnlyField(source='creado_por.username')
    
    # Anidamos las relaciones inversas usando el nombre por defecto de Django (_set)
    asistentes = AsistenteSesionSerializer(source='asistentesesion_set', many=True, read_only=True)
    pagos = PagoSerializer(source='pago_set', many=True, read_only=True)
    partidos_clasicos = PartidoClasicoSerializer(source='partidoclasico_set', many=True, read_only=True)
    mini_partidos = MiniPartidoSerializer(source='minipartido_set', many=True, read_only=True)

    class Meta:
        model = Sesion
        # Añadimos los nuevos campos anidados al array de fields
        fields = [
            'id', 'grupo', 'grupo_nombre', 'creado_por', 'creado_por_username', 'fecha_hora', 'lugar', 'coste_total', 'estado',
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


class MiembroGrupoSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='usuario.username')
    email = serializers.ReadOnlyField(source='usuario.email')

    class Meta:
        model = MiembroGrupo
        fields = ['id', 'grupo', 'usuario', 'username', 'email', 'es_admin']
