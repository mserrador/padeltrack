import re

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers
from .models import Usuario, Grupo, Sesion, AsistenteSesion, Pago, PartidoClasico, MiniPartido, Liquidacion, MiembroGrupo, PROVINCIAS_ESPANA, SesionPublica, AsistenciaSesionPublica


def traducir_error_password(texto_error):
    if texto_error.startswith('This password is too short.'):
        return 'La nueva contraseña es demasiado corta. Debe tener al menos 8 caracteres.'
    if texto_error == 'This password is too common.':
        return 'La nueva contraseña es demasiado común.'
    if texto_error == 'This password is entirely numeric.':
        return 'La nueva contraseña no puede estar compuesta solo por números.'
    if texto_error.startswith('The password is too similar to the '):
        return 'La nueva contraseña es demasiado parecida a tus datos personales.'
    return texto_error


def validar_password_en_espanol(password, usuario):
    try:
        validate_password(password, usuario)
    except DjangoValidationError as error:
        raise serializers.ValidationError([traducir_error_password(mensaje) for mensaje in error.messages])

# Serializer para el Usuario (sin mostrar la contraseña por seguridad)
class UsuarioSerializer(serializers.ModelSerializer):
    total_grupos = serializers.SerializerMethodField()
    total_sesiones_creadas = serializers.SerializerMethodField()
    total_sesiones_confirmadas = serializers.SerializerMethodField()
    total_sesiones_finalizadas_jugadas = serializers.SerializerMethodField()
    total_pagado_pistas = serializers.SerializerMethodField()
    total_bizums_enviados = serializers.SerializerMethodField()
    total_bizums_recibidos = serializers.SerializerMethodField()

    def get_total_grupos(self, obj):
        return MiembroGrupo.objects.filter(usuario=obj).count()

    def get_total_sesiones_creadas(self, obj):
        return Sesion.objects.filter(creado_por=obj).count()

    def get_total_sesiones_confirmadas(self, obj):
        return AsistenteSesion.objects.filter(usuario=obj, estado_asistencia='CONFIRMADO').count()

    def get_total_sesiones_finalizadas_jugadas(self, obj):
        return AsistenteSesion.objects.filter(
            usuario=obj,
            estado_asistencia='CONFIRMADO',
            sesion__estado='FINALIZADA',
        ).count()

    def get_total_pagado_pistas(self, obj):
        total = Pago.objects.filter(usuario_pagador=obj).aggregate(total=Sum('cantidad'))['total'] or 0
        return f'{float(total):.2f}'

    def get_total_bizums_enviados(self, obj):
        total = Liquidacion.objects.filter(pagador=obj).aggregate(total=Sum('cantidad'))['total'] or 0
        return f'{float(total):.2f}'

    def get_total_bizums_recibidos(self, obj):
        total = Liquidacion.objects.filter(receptor=obj).aggregate(total=Sum('cantidad'))['total'] or 0
        return f'{float(total):.2f}'

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'email_verificado', 'date_joined',
            'provincia',
            'total_grupos', 'total_sesiones_creadas', 'total_sesiones_confirmadas',
            'total_sesiones_finalizadas_jugadas', 'total_pagado_pistas',
            'total_bizums_enviados', 'total_bizums_recibidos',
        ]


class ActualizarPerfilSerializer(serializers.ModelSerializer):
    provincia = serializers.ChoiceField(choices=PROVINCIAS_ESPANA)

    class Meta:
        model = Usuario
        fields = ['provincia']


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    nueva_password = serializers.CharField(write_only=True, min_length=8)
    confirmar_nueva_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        usuario = self.context['request'].user

        if not usuario.check_password(attrs['password_actual']):
            raise serializers.ValidationError({'password_actual': ['La contraseña actual no es correcta.']})

        if attrs['nueva_password'] != attrs['confirmar_nueva_password']:
            raise serializers.ValidationError({'confirmar_nueva_password': ['Las nuevas contraseñas no coinciden.']})

        validar_password_en_espanol(attrs['nueva_password'], usuario)
        return attrs


class SolicitarRestablecerPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class RestablecerPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    nueva_password = serializers.CharField(write_only=True, min_length=8)
    confirmar_nueva_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs['nueva_password'] != attrs['confirmar_nueva_password']:
            raise serializers.ValidationError({'confirmar_nueva_password': ['Las nuevas contraseñas no coinciden.']})

        return attrs

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
    provincia = serializers.ChoiceField(choices=PROVINCIAS_ESPANA)

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'password', 'provincia']

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
            provincia=validated_data['provincia'],
            password=validated_data['password'],
        )

class PartidoClasicoSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        sesion = attrs.get('sesion', getattr(self.instance, 'sesion', None))
        sesion_publica = attrs.get('sesion_publica', getattr(self.instance, 'sesion_publica', None))

        if bool(sesion) == bool(sesion_publica):
            raise serializers.ValidationError('El partido debe pertenecer a una sesión privada o a una sesión pública, pero no a ambas.')

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

        resultado = attrs.get('resultado', getattr(self.instance, 'resultado', ''))
        match = re.match(r'^\s*(\d+)\s*[-:]\s*(\d+)\s*$', str(resultado or ''))
        if not match:
            raise serializers.ValidationError({'resultado': ['El resultado debe tener formato X-Y, por ejemplo 6-2.']})

        puntos_a = int(match.group(1))
        puntos_b = int(match.group(2))

        if puntos_a < 0 or puntos_b < 0:
            raise serializers.ValidationError({'resultado': ['El resultado no puede tener valores negativos.']})

        if puntos_a == puntos_b:
            raise serializers.ValidationError({'resultado': ['El partido clásico no puede terminar en empate.']})

        return attrs

    class Meta:
        model = PartidoClasico
        fields = '__all__'

class MiniPartidoSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        sesion = attrs.get('sesion', getattr(self.instance, 'sesion', None))
        sesion_publica = attrs.get('sesion_publica', getattr(self.instance, 'sesion_publica', None))

        if bool(sesion) == bool(sesion_publica):
            raise serializers.ValidationError('El mini partido debe pertenecer a una sesión privada o a una sesión pública, pero no a ambas.')

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
    pagador = serializers.SerializerMethodField()
    coste_por_persona = serializers.SerializerMethodField()
    
    # Anidamos las relaciones inversas usando el nombre por defecto de Django (_set)
    asistentes = AsistenteSesionSerializer(source='asistentesesion_set', many=True, read_only=True)
    pagos = PagoSerializer(source='pago_set', many=True, read_only=True)
    partidos_clasicos = PartidoClasicoSerializer(source='partidoclasico_set', many=True, read_only=True)
    mini_partidos = MiniPartidoSerializer(source='minipartido_set', many=True, read_only=True)

    def validate(self, attrs):
        fecha_hora = attrs.get('fecha_hora', getattr(self.instance, 'fecha_hora', None))
        coste_total = attrs.get('coste_total', getattr(self.instance, 'coste_total', None))
        google_maps_url = attrs.get('google_maps_url', getattr(self.instance, 'google_maps_url', ''))

        if fecha_hora and fecha_hora < timezone.now():
            raise serializers.ValidationError({'fecha_hora': ['La fecha de la sesión no puede ser anterior al momento actual.']})

        if coste_total is not None and coste_total < 0:
            raise serializers.ValidationError({'coste_total': ['El coste total no puede ser negativo.']})

        if google_maps_url and not str(google_maps_url).startswith(('http://', 'https://')):
            raise serializers.ValidationError({'google_maps_url': ['La URL de Google Maps debe empezar por http:// o https://.']})

        if attrs.get('estado') == 'EN_CURSO':
            sesion = self.instance
            confirmados = 0

            if sesion:
                confirmados = sesion.asistentesesion_set.filter(estado_asistencia='CONFIRMADO').count()

            if confirmados < 4:
                raise serializers.ValidationError({'estado': ['Se necesitan al menos 4 jugadores confirmados para iniciar la sesión.']})

        return attrs

    def get_pagador(self, obj):
        pago = obj.pago_set.select_related('usuario_pagador').first()
        if not pago:
            return None
        return {
            'usuario_id': pago.usuario_pagador_id,
            'username': pago.usuario_pagador.username,
            'cantidad': f'{float(pago.cantidad):.2f}',
        }

    def get_coste_por_persona(self, obj):
        confirmados = obj.asistentesesion_set.filter(estado_asistencia='CONFIRMADO').count()
        if confirmados <= 0:
            return None
        return f'{float(obj.coste_total) / confirmados:.2f}'

    class Meta:
        model = Sesion
        # Añadimos los nuevos campos anidados al array de fields
        fields = [
            'id', 'grupo', 'grupo_nombre', 'creado_por', 'creado_por_username', 'fecha_hora', 'lugar', 'coste_total', 'estado',
            'google_maps_url', 'asistentes', 'pagos', 'pagador', 'coste_por_persona', 'partidos_clasicos', 'mini_partidos'
        ]

class LiquidacionSerializer(serializers.ModelSerializer):
    pagador_nombre = serializers.ReadOnlyField(source='pagador.username')
    receptor_nombre = serializers.ReadOnlyField(source='receptor.username')

    def validate(self, attrs):
        pagador = attrs.get('pagador', getattr(self.instance, 'pagador', None))
        receptor = attrs.get('receptor', getattr(self.instance, 'receptor', None))
        cantidad = attrs.get('cantidad', getattr(self.instance, 'cantidad', None))

        if pagador and receptor and pagador.id == receptor.id:
            raise serializers.ValidationError('El pagador y el receptor deben ser distintos.')

        if cantidad is not None and cantidad <= 0:
            raise serializers.ValidationError({'cantidad': ['La cantidad debe ser mayor que 0.']})

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


class AsistenciaSesionPublicaSerializer(serializers.ModelSerializer):
    usuario = serializers.PrimaryKeyRelatedField(queryset=Usuario.objects.all(), required=False)
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')

    def validate(self, attrs):
        sesion_publica = attrs.get('sesion_publica', getattr(self.instance, 'sesion_publica', None))
        usuario = attrs.get('usuario', getattr(self.instance, 'usuario', None))

        if not usuario:
            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated:
                usuario = request.user
                attrs['usuario'] = usuario

        if sesion_publica and usuario:
            qs = AsistenciaSesionPublica.objects.filter(sesion_publica=sesion_publica, usuario=usuario)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError('Este jugador ya tiene asistencia registrada en la sesión pública.')

        return attrs

    class Meta:
        model = AsistenciaSesionPublica
        fields = ['id', 'sesion_publica', 'usuario', 'usuario_nombre', 'estado_asistencia']
        extra_kwargs = {'usuario': {'required': False}}


class SesionPublicaSerializer(serializers.ModelSerializer):
    creado_por = serializers.ReadOnlyField(source='creado_por.id')
    creado_por_username = serializers.ReadOnlyField(source='creado_por.username')
    provincia = serializers.ReadOnlyField()
    asistentes = AsistenciaSesionPublicaSerializer(source='asistenciasesionpublica_set', many=True, read_only=True)
    partidos_clasicos = PartidoClasicoSerializer(source='partidoclasico_set', many=True, read_only=True)
    mini_partidos = MiniPartidoSerializer(source='minipartido_set', many=True, read_only=True)
    pagador_username = serializers.ReadOnlyField(source='pagador.username')
    confirmados = serializers.SerializerMethodField()
    plazas_disponibles = serializers.SerializerMethodField()
    coste_por_persona = serializers.SerializerMethodField()

    def validate(self, attrs):
        fecha_hora = attrs.get('fecha_hora', getattr(self.instance, 'fecha_hora', None))
        coste_total = attrs.get('coste_total', getattr(self.instance, 'coste_total', None))
        plazas_maximas = attrs.get('plazas_maximas', getattr(self.instance, 'plazas_maximas', None))
        google_maps_url = attrs.get('google_maps_url', getattr(self.instance, 'google_maps_url', ''))

        if fecha_hora and fecha_hora < timezone.now():
            raise serializers.ValidationError({'fecha_hora': ['La fecha de la sesión pública no puede ser anterior al momento actual.']})

        if coste_total is not None and coste_total < 0:
            raise serializers.ValidationError({'coste_total': ['El coste total no puede ser negativo.']})

        if plazas_maximas is not None and plazas_maximas < 2:
            raise serializers.ValidationError({'plazas_maximas': ['Debe haber al menos 2 plazas.']})

        if google_maps_url and not str(google_maps_url).startswith(('http://', 'https://')):
            raise serializers.ValidationError({'google_maps_url': ['La URL de Google Maps debe empezar por http:// o https://.']})

        return attrs

    def get_confirmados(self, obj):
        return obj.asistenciasesionpublica_set.filter(estado_asistencia='CONFIRMADO').count()

    def get_plazas_disponibles(self, obj):
        return max(obj.plazas_maximas - self.get_confirmados(obj), 0)

    def get_coste_por_persona(self, obj):
        confirmados = self.get_confirmados(obj)
        if confirmados <= 0:
            return None
        return f'{float(obj.coste_total) / confirmados:.2f}'

    class Meta:
        model = SesionPublica
        fields = [
            'id', 'creado_por', 'creado_por_username', 'provincia', 'fecha_hora', 'lugar', 'google_maps_url',
            'descripcion', 'coste_total', 'plazas_maximas', 'pagador', 'pagador_username', 'estado',
            'fecha_creacion', 'asistentes', 'confirmados', 'plazas_disponibles', 'coste_por_persona',
            'partidos_clasicos', 'mini_partidos',
        ]
