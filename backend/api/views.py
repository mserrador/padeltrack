import logging
import re

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.timezone import localtime
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario, Grupo, Sesion, AsistenteSesion, Pago, PartidoClasico, MiniPartido, MiembroGrupo, Liquidacion, SesionPublica, AsistenciaSesionPublica
from .serializers import UsuarioSerializer, GrupoSerializer, SesionSerializer, AsistenteSesionSerializer, PagoSerializer, PartidoClasicoSerializer, MiniPartidoSerializer, LiquidacionSerializer, RegistroUsuarioSerializer, MiembroGrupoSerializer, CambiarPasswordSerializer, SolicitarRestablecerPasswordSerializer, RestablecerPasswordSerializer, validar_password_en_espanol, ActualizarPerfilSerializer, SesionPublicaSerializer, AsistenciaSesionPublicaSerializer


registro_eventos = logging.getLogger(__name__)


def usuario_es_miembro_de_grupo(usuario, grupo):
    return MiembroGrupo.objects.filter(grupo=grupo, usuario=usuario).exists()


def usuario_es_admin_de_grupo(usuario, grupo):
    return MiembroGrupo.objects.filter(grupo=grupo, usuario=usuario, es_admin=True).exists()


def validar_membresia_en_grupo(usuario, grupo):
    if not usuario_es_miembro_de_grupo(usuario, grupo):
        raise PermissionDenied('No tienes permisos sobre este grupo.')


def validar_admin_en_grupo(usuario, grupo):
    if not usuario_es_admin_de_grupo(usuario, grupo):
        raise PermissionDenied('Solo un administrador del grupo puede realizar esta acción.')


def ids_miembros_grupo(grupo):
    return set(MiembroGrupo.objects.filter(grupo=grupo).values_list('usuario_id', flat=True))


def construir_enlace_frontend(ruta):
    url_base = settings.FRONTEND_URL.rstrip('/')
    return f'{url_base}{ruta}'


def enviar_correo_verificacion(usuario):
    uid = urlsafe_base64_encode(force_bytes(usuario.pk))
    token = default_token_generator.make_token(usuario)
    enlace = construir_enlace_frontend(f'/verificar-email?uid={uid}&token={token}')

    send_mail(
        subject='Verifica tu correo en PadelTrack',
        message=(
            f'Hola {usuario.username},\n\n'
            'Gracias por registrarte en PadelTrack.\n'
            'Antes de iniciar sesión, verifica tu correo desde este enlace:\n\n'
            f'{enlace}\n\n'
            'Si no has creado esta cuenta, puedes ignorar este mensaje.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[usuario.email],
        fail_silently=False,
    )


def enviar_correo_restablecer_password(usuario):
    uid = urlsafe_base64_encode(force_bytes(usuario.pk))
    token = default_token_generator.make_token(usuario)
    enlace = construir_enlace_frontend(f'/restablecer-password?uid={uid}&token={token}')

    send_mail(
        subject='Restablece tu contraseña en PadelTrack',
        message=(
            f'Hola {usuario.username},\n\n'
            'Has solicitado cambiar tu contraseña en PadelTrack.\n'
            'Puedes crear una nueva desde este enlace:\n\n'
            f'{enlace}\n\n'
            'Si no has solicitado este cambio, puedes ignorar este mensaje.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[usuario.email],
        fail_silently=False,
    )


def enviar_correo_nueva_sesion(sesion):
    miembros = Usuario.objects.filter(
        miembrogrupo__grupo=sesion.grupo,
        email_verificado=True,
    ).exclude(id=sesion.creado_por_id).exclude(email='').distinct()

    destinatarios = [usuario.email for usuario in miembros if usuario.email]
    if not destinatarios:
        return

    fecha = localtime(sesion.fecha_hora).strftime('%d/%m/%Y %H:%M') if sesion.fecha_hora else 'Por definir'
    enlace = construir_enlace_frontend(f'/sesiones/{sesion.id}')

    send_mail(
        subject=f'Nueva sesión en {sesion.grupo.nombre}',
        message=(
            f'Se ha creado una nueva sesión en el grupo {sesion.grupo.nombre}.\n\n'
            f'Lugar: {sesion.lugar}\n'
            f'Fecha y hora: {fecha}\n'
            f'Coste total: {sesion.coste_total}€\n\n'
            f'Puedes verla aquí:\n{enlace}'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=destinatarios,
        fail_silently=False,
    )


def calcular_balances_grupo(grupo):
    miembros = MiembroGrupo.objects.filter(grupo=grupo).select_related('usuario')

    usuarios_unicos = []
    vistos = set()
    for miembro in miembros:
        if miembro.usuario_id in vistos:
            continue
        vistos.add(miembro.usuario_id)
        usuarios_unicos.append(miembro.usuario)

    balances = []
    for usuario in usuarios_unicos:
        total_balance = 0.0

        pagos = Pago.objects.filter(sesion__grupo=grupo, usuario_pagador=usuario).aggregate(total=Sum('cantidad'))['total'] or 0.0
        total_balance += float(pagos)

        sesiones_finalizadas = Sesion.objects.filter(grupo=grupo, estado='FINALIZADA')
        for sesion in sesiones_finalizadas:
            confirmados = AsistenteSesion.objects.filter(sesion=sesion, estado_asistencia='CONFIRMADO')
            if confirmados.filter(usuario=usuario).exists():
                num_jugadores = confirmados.count()
                if num_jugadores > 0:
                    coste_por_persona = float(sesion.coste_total) / num_jugadores
                    total_balance -= coste_por_persona

        liq_enviadas = Liquidacion.objects.filter(grupo=grupo, pagador=usuario).aggregate(total=Sum('cantidad'))['total'] or 0.0
        liq_recibidas = Liquidacion.objects.filter(grupo=grupo, receptor=usuario).aggregate(total=Sum('cantidad'))['total'] or 0.0

        total_balance += float(liq_enviadas)
        total_balance -= float(liq_recibidas)

        balances.append({
            'usuario_id': usuario.id,
            'username': usuario.username,
            'balance': round(total_balance, 2),
        })

    balances.sort(key=lambda x: x['balance'], reverse=True)
    return balances


def calcular_liquidaciones_sugeridas(grupo):
    balances = calcular_balances_grupo(grupo)
    deudores = sorted(
        [
            {'usuario_id': b['usuario_id'], 'username': b['username'], 'balance': abs(b['balance'])}
            for b in balances if b['balance'] < 0
        ],
        key=lambda x: x['balance'],
        reverse=True,
    )
    acreedores = sorted(
        [
            {'usuario_id': b['usuario_id'], 'username': b['username'], 'balance': b['balance']}
            for b in balances if b['balance'] > 0
        ],
        key=lambda x: x['balance'],
        reverse=True,
    )

    transacciones = []
    i = 0
    j = 0
    while i < len(deudores) and j < len(acreedores):
        monto = min(deudores[i]['balance'], acreedores[j]['balance'])

        if monto > 0.01:
            transacciones.append({
                'pagador_id': deudores[i]['usuario_id'],
                'receptor_id': acreedores[j]['usuario_id'],
                'cantidad': round(monto, 2),
            })

        deudores[i]['balance'] -= monto
        acreedores[j]['balance'] -= monto

        if deudores[i]['balance'] <= 0:
            i += 1
        if acreedores[j]['balance'] <= 0:
            j += 1

    return transacciones


def usuario_puede_editar_sesion(usuario, sesion):
    return usuario_es_admin_de_grupo(usuario, sesion.grupo) or sesion.creado_por_id == usuario.id


def usuario_puede_gestionar_asistencia(usuario, sesion):
    return usuario_es_admin_de_grupo(usuario, sesion.grupo) or sesion.creado_por_id == usuario.id


def usuario_es_confirmado_en_sesion(usuario, sesion):
    return AsistenteSesion.objects.filter(
        sesion=sesion,
        usuario=usuario,
        estado_asistencia='CONFIRMADO',
    ).exists()


def validar_marcador_en_sesion(usuario, sesion):
    validar_membresia_en_grupo(usuario, sesion.grupo)

    if sesion.estado != 'EN_CURSO':
        raise PermissionDenied('Solo se pueden registrar resultados cuando la sesión está en curso.')

    if not usuario_es_confirmado_en_sesion(usuario, sesion):
        raise PermissionDenied('Solo los jugadores confirmados de esta sesión pueden registrar resultados.')


def usuario_es_confirmado_en_sesion_publica(usuario, sesion_publica):
    return AsistenciaSesionPublica.objects.filter(
        sesion_publica=sesion_publica,
        usuario=usuario,
        estado_asistencia='CONFIRMADO',
    ).exists()


def validar_marcador_en_sesion_publica(usuario, sesion_publica):
    if usuario.provincia != sesion_publica.provincia and sesion_publica.creado_por_id != usuario.id:
        raise PermissionDenied('No tienes permisos sobre esta sesión pública.')

    if sesion_publica.estado != 'EN_CURSO':
        raise PermissionDenied('Solo se pueden registrar resultados cuando la sesión pública está en curso.')

    if not usuario_es_confirmado_en_sesion_publica(usuario, sesion_publica):
        raise PermissionDenied('Solo los jugadores confirmados de esta sesión pública pueden registrar resultados.')


def usuario_puede_editar_sesion_publica(usuario, sesion_publica):
    return sesion_publica.creado_por_id == usuario.id


class SerializadorTokenPadelTrack(TokenObtainPairSerializer):
    default_error_messages = {
        'no_active_account': 'Usuario o contraseña incorrectos.',
    }

    def validate(self, attrs):
        data = super().validate(attrs)

        if not self.user.email_verificado:
            raise ValidationError({'detail': 'Debes verificar tu correo antes de iniciar sesión.'})

        return data


class VistaTokenPadelTrack(TokenObtainPairView):
    serializer_class = SerializadorTokenPadelTrack


class RegistroUsuarioView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroUsuarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                usuario = serializer.save()
                enviar_correo_verificacion(usuario)
        except Exception:
            registro_eventos.exception('No se pudo enviar el correo de verificación para el usuario %s', request.data.get('username'))
            raise ValidationError({'detail': 'No se pudo enviar el correo de verificación. Inténtalo de nuevo más tarde.'})

        return Response(
            {
                'id': usuario.id,
                'username': usuario.username,
                'email': usuario.email,
                'mensaje': 'Usuario creado correctamente. Revisa tu correo para verificar la cuenta antes de iniciar sesión.',
            },
            status=status.HTTP_201_CREATED,
        )


class VerificarEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')

        if not uid or not token:
            raise ValidationError({'detail': 'El enlace de verificación no es válido.'})

        try:
            usuario_id = force_str(urlsafe_base64_decode(uid))
            usuario = Usuario.objects.get(pk=usuario_id)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            raise ValidationError({'detail': 'El enlace de verificación no es válido o ha caducado.'})

        if usuario.email_verificado:
            return Response({'detail': 'Tu correo ya estaba verificado.'}, status=status.HTTP_200_OK)

        if not default_token_generator.check_token(usuario, token):
            raise ValidationError({'detail': 'El enlace de verificación no es válido o ha caducado.'})

        usuario.email_verificado = True
        usuario.save(update_fields=['email_verificado'])
        return Response({'detail': 'Correo verificado correctamente.'}, status=status.HTTP_200_OK)


class ReenviarVerificacionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            raise ValidationError({'email': ['Debes indicar un correo válido.']})

        usuario = Usuario.objects.filter(email__iexact=email).first()
        if not usuario:
            raise ValidationError({'email': ['No existe ninguna cuenta registrada con ese correo.']})

        if usuario.email_verificado:
            return Response({'detail': 'Esta cuenta ya tiene el correo verificado.'}, status=status.HTTP_200_OK)

        try:
            enviar_correo_verificacion(usuario)
        except Exception:
            registro_eventos.exception('No se pudo reenviar el correo de verificación para %s', email)
            raise ValidationError({'detail': 'No se pudo reenviar el correo de verificación. Inténtalo de nuevo más tarde.'})

        return Response({'detail': 'Te hemos reenviado el correo de verificación.'}, status=status.HTTP_200_OK)


class SolicitarRestablecerPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SolicitarRestablecerPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        usuario = Usuario.objects.filter(email__iexact=email, email_verificado=True).first()

        if usuario:
            try:
                enviar_correo_restablecer_password(usuario)
            except Exception:
                registro_eventos.exception('No se pudo enviar el correo de restablecimiento para %s', email)
                raise ValidationError({'detail': 'No se pudo enviar el correo de restablecimiento. Inténtalo de nuevo más tarde.'})

        return Response(
            {'detail': 'Si existe una cuenta verificada con ese correo, te hemos enviado un enlace para restablecer la contraseña.'},
            status=status.HTTP_200_OK,
        )


class RestablecerPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RestablecerPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']

        try:
            usuario_id = force_str(urlsafe_base64_decode(uid))
            usuario = Usuario.objects.get(pk=usuario_id, email_verificado=True)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            raise ValidationError({'detail': 'El enlace para restablecer la contraseña no es válido o ha caducado.'})

        if not default_token_generator.check_token(usuario, token):
            raise ValidationError({'detail': 'El enlace para restablecer la contraseña no es válido o ha caducado.'})

        validar_password_en_espanol(serializer.validated_data['nueva_password'], usuario)
        usuario.set_password(serializer.validated_data['nueva_password'])
        usuario.save(update_fields=['password'])
        return Response({'detail': 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'}, status=status.HTTP_200_OK)

# Vista para Usuarios
class UsuarioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request):
        termino = (request.query_params.get('q') or '').strip()
        if len(termino) < 2:
            return Response([])

        usuarios = Usuario.objects.filter(username__icontains=termino).order_by('username')[:10]
        serializer = UsuarioSerializer(usuarios, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)

    @me.mapping.patch
    def actualizar_me(self, request):
        serializer = ActualizarPerfilSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UsuarioSerializer(request.user).data)

    @action(detail=False, methods=['post'], url_path='cambiar-password')
    def cambiar_password(self, request):
        serializer = CambiarPasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['nueva_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Contraseña actualizada correctamente.'}, status=status.HTTP_200_OK)

# Vista para Grupos
class GrupoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Grupo.objects.all()
    serializer_class = GrupoSerializer

    def get_queryset(self):
        usuario = self.request.user
        return Grupo.objects.filter(miembrogrupo__usuario=usuario).distinct()

    def perform_create(self, serializer):
        with transaction.atomic():
            grupo = serializer.save()
            MiembroGrupo.objects.create(
                grupo=grupo,
                usuario=self.request.user,
                es_admin=True,
            )

    def perform_destroy(self, instance):
        validar_admin_en_grupo(self.request.user, instance)
        instance.delete()

    @action(detail=True, methods=['get'])
    def miembros(self, request, pk=None):
        grupo = self.get_object()
        miembros = MiembroGrupo.objects.filter(grupo=grupo).select_related('usuario').order_by('-es_admin', 'usuario__username')
        serializer = MiembroGrupoSerializer(miembros, many=True)
        return Response(serializer.data)

    @miembros.mapping.post
    def agregar_miembro(self, request, pk=None):
        grupo = self.get_object()
        validar_admin_en_grupo(request.user, grupo)

        username = (request.data.get('username') or '').strip()
        if len(username) < 3:
            return Response({'username': ['Debes indicar un username válido.']}, status=status.HTTP_400_BAD_REQUEST)

        usuario_objetivo = Usuario.objects.filter(username__iexact=username).first()
        if not usuario_objetivo:
            return Response({'username': ['No existe un usuario con ese username.']}, status=status.HTTP_404_NOT_FOUND)

        if MiembroGrupo.objects.filter(grupo=grupo, usuario=usuario_objetivo).exists():
            return Response({'username': ['Ese usuario ya pertenece al grupo.']}, status=status.HTTP_400_BAD_REQUEST)

        miembro = MiembroGrupo.objects.create(grupo=grupo, usuario=usuario_objetivo, es_admin=False)
        serializer = MiembroGrupoSerializer(miembro)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'miembros/(?P<miembro_id>[^/.]+)')
    def eliminar_miembro(self, request, pk=None, miembro_id=None):
        grupo = self.get_object()
        validar_admin_en_grupo(request.user, grupo)

        miembro = get_object_or_404(MiembroGrupo, id=miembro_id, grupo=grupo)

        if miembro.usuario_id == request.user.id and miembro.es_admin:
            total_admins = MiembroGrupo.objects.filter(grupo=grupo, es_admin=True).count()
            if total_admins <= 1:
                return Response({'detail': 'No puedes salir del grupo siendo el ultimo administrador.'}, status=status.HTTP_400_BAD_REQUEST)

        miembro.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def salir(self, request, pk=None):
        grupo = self.get_object()
        miembro = MiembroGrupo.objects.filter(grupo=grupo, usuario=request.user).first()

        if not miembro:
            return Response({'detail': 'No perteneces a este grupo.'}, status=status.HTTP_400_BAD_REQUEST)

        if not miembro.es_admin:
            miembro.delete()
            return Response({'detail': 'Has salido del grupo correctamente.'}, status=status.HTTP_200_OK)

        total_admins = MiembroGrupo.objects.filter(grupo=grupo, es_admin=True).count()
        if total_admins > 1:
            miembro.delete()
            return Response({'detail': 'Has salido del grupo correctamente.'}, status=status.HTTP_200_OK)

        accion = request.data.get('accion')

        if accion == 'borrar_grupo':
            grupo.delete()
            return Response({'detail': 'Grupo eliminado y salida completada.'}, status=status.HTTP_200_OK)

        if accion == 'transferir_admin':
            nuevo_admin_id = request.data.get('nuevo_admin_id')
            if not nuevo_admin_id:
                return Response({'detail': 'Debes indicar el nuevo administrador.'}, status=status.HTTP_400_BAD_REQUEST)

            nuevo_admin = MiembroGrupo.objects.filter(grupo=grupo, usuario_id=nuevo_admin_id).first()
            if not nuevo_admin:
                return Response({'detail': 'El nuevo administrador debe pertenecer al grupo.'}, status=status.HTTP_400_BAD_REQUEST)

            if nuevo_admin.usuario_id == request.user.id:
                return Response({'detail': 'Debes transferir la administración a otra persona.'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                nuevo_admin.es_admin = True
                nuevo_admin.save(update_fields=['es_admin'])
                miembro.delete()

            return Response({'detail': 'Administración transferida y salida completada.'}, status=status.HTTP_200_OK)

        return Response(
            {
                'detail': 'Eres el último administrador. Elige borrar el grupo o transferir la administración antes de salir.',
                'requiere_accion': True,
                'opciones': ['borrar_grupo', 'transferir_admin'],
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    
    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        grupo = self.get_object()
        return Response(calcular_balances_grupo(grupo))
    
    @action(detail=True, methods=['get'])
    def historial_liquidaciones(self, request, pk=None):
        grupo = self.get_object()
        # Filtramos por grupo y ordenamos por fecha descendente (la más reciente primero)
        liquidaciones = Liquidacion.objects.filter(grupo=grupo).order_by('-fecha')
        serializer = LiquidacionSerializer(liquidaciones, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        grupo = self.get_object()
        sesiones_finalizadas = Sesion.objects.filter(grupo=grupo, estado='FINALIZADA')

        tabla = {}

        def asegurar_usuario(usuario_id):
            if usuario_id in tabla:
                return tabla[usuario_id]

            usuario = Usuario.objects.filter(id=usuario_id).first()
            tabla[usuario_id] = {
                'usuario_id': usuario_id,
                'username': usuario.username if usuario else f'Jugador {usuario_id}',
                'ganados': 0,
                'derrotas': 0,
                'jugados': 0,
                'ratio': 0.0,
            }
            return tabla[usuario_id]

        def procesar_resultado(equipo_ganador, equipo_perdedor):
            for usuario_id in equipo_ganador:
                fila = asegurar_usuario(usuario_id)
                fila['ganados'] += 1
                fila['jugados'] += 1

            for usuario_id in equipo_perdedor:
                fila = asegurar_usuario(usuario_id)
                fila['derrotas'] += 1
                fila['jugados'] += 1

        partidos_contabilizados = 0
        for sesion in sesiones_finalizadas:
            for partido in PartidoClasico.objects.filter(sesion=sesion):
                match = str(partido.resultado or '').strip()
                m = re.match(r'^(\d+)\s*[-:]\s*(\d+)$', match)
                if not m:
                    continue

                puntos_a = int(m.group(1))
                puntos_b = int(m.group(2))
                if puntos_a == puntos_b:
                    continue

                equipo_a = [partido.jugador1_A_id, partido.jugador2_A_id]
                equipo_b = [partido.jugador1_B_id, partido.jugador2_B_id]
                if puntos_a > puntos_b:
                    procesar_resultado(equipo_a, equipo_b)
                else:
                    procesar_resultado(equipo_b, equipo_a)
                partidos_contabilizados += 1

            for mini in MiniPartido.objects.filter(sesion=sesion):
                equipo_a = [mini.jugador1_A_id, mini.jugador2_A_id]
                equipo_b = [mini.jugador1_B_id, mini.jugador2_B_id]
                if mini.ganador == 'A':
                    procesar_resultado(equipo_a, equipo_b)
                    partidos_contabilizados += 1
                elif mini.ganador == 'B':
                    procesar_resultado(equipo_b, equipo_a)
                    partidos_contabilizados += 1

        ranking = list(tabla.values())
        for fila in ranking:
            fila['ratio'] = round((fila['ganados'] / fila['jugados']) * 100, 2) if fila['jugados'] > 0 else 0.0

        ranking.sort(key=lambda x: (-x['ganados'], x['derrotas'], x['username']))

        max_ganados = max((f['ganados'] for f in ranking), default=0)
        max_derrotas = max((f['derrotas'] for f in ranking), default=0)
        mas_ganados = [f for f in ranking if max_ganados > 0 and f['ganados'] == max_ganados]
        mas_derrotas = [f for f in ranking if max_derrotas > 0 and f['derrotas'] == max_derrotas]

        return Response({
            'resumen': {
                'sesiones_finalizadas': sesiones_finalizadas.count(),
                'partidos_contabilizados': partidos_contabilizados,
            },
            'kpis': {
                'mas_ganados': {
                    'valor': max_ganados,
                    'jugadores': [{'usuario_id': j['usuario_id'], 'username': j['username']} for j in mas_ganados],
                },
                'mas_derrotas': {
                    'valor': max_derrotas,
                    'jugadores': [{'usuario_id': j['usuario_id'], 'username': j['username']} for j in mas_derrotas],
                },
            },
            'ranking': ranking,
        })


class SesionPublicaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SesionPublicaSerializer

    def get_queryset(self):
        usuario = self.request.user
        filtros = Q(creado_por=usuario) | Q(asistenciasesionpublica__usuario=usuario)
        if usuario.provincia:
            filtros |= Q(provincia=usuario.provincia, estado='PLANIFICADA')

        queryset = SesionPublica.objects.filter(filtros).distinct().order_by('fecha_hora', 'id')
        if self.action == 'list':
            queryset = queryset.exclude(estado='FINALIZADA')
        return queryset

    def perform_create(self, serializer):
        if not self.request.user.provincia:
            raise ValidationError({'detail': 'Debes indicar tu provincia en el perfil antes de crear una sesión pública.'})

        with transaction.atomic():
            sesion_publica = serializer.save(creado_por=self.request.user, provincia=self.request.user.provincia)
            AsistenciaSesionPublica.objects.create(
                sesion_publica=sesion_publica,
                usuario=self.request.user,
                estado_asistencia='CONFIRMADO',
            )

    def perform_update(self, serializer):
        sesion_publica = self.get_object()
        if not usuario_puede_editar_sesion_publica(self.request.user, sesion_publica):
            raise PermissionDenied('Solo el creador puede editar esta sesión pública.')

        nuevo_estado = serializer.validated_data.get('estado', sesion_publica.estado)
        pagador = serializer.validated_data.get('pagador', sesion_publica.pagador)

        if nuevo_estado == 'EN_CURSO':
            confirmados = sesion_publica.asistenciasesionpublica_set.filter(estado_asistencia='CONFIRMADO').count()
            if confirmados < 4:
                raise ValidationError({'estado': ['Se necesitan al menos 4 jugadores confirmados para iniciar la sesión pública.']})

        if nuevo_estado != 'FINALIZADA' and 'pagador' in serializer.validated_data:
            raise ValidationError({'pagador': ['El pagador solo se puede fijar cuando la sesión pública está finalizada.']})

        if pagador and not AsistenciaSesionPublica.objects.filter(
            sesion_publica=sesion_publica,
            usuario=pagador,
            estado_asistencia='CONFIRMADO',
        ).exists():
            raise ValidationError({'pagador': ['El pagador debe estar confirmado en la sesión pública.']})

        serializer.save(provincia=sesion_publica.provincia)

    def perform_destroy(self, instance):
        if not usuario_puede_editar_sesion_publica(self.request.user, instance):
            raise PermissionDenied('Solo el creador puede eliminar esta sesión pública.')
        instance.delete()


class AsistenciaSesionPublicaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AsistenciaSesionPublicaSerializer

    def get_queryset(self):
        return AsistenciaSesionPublica.objects.filter(usuario=self.request.user).distinct()

    def create(self, request, *args, **kwargs):
        datos = request.data.copy()
        if not datos.get('usuario'):
            datos['usuario'] = request.user.id

        serializer = self.get_serializer(data=datos)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def _validar_confirmacion(self, sesion_publica, usuario, estado, instancia=None):
        if sesion_publica.estado != 'PLANIFICADA':
            raise ValidationError({'detail': 'Solo se puede cambiar la asistencia mientras la sesión pública está planificada.'})

        if not instancia and sesion_publica.asistenciasesionpublica_set.filter(usuario=usuario).exists():
            raise ValidationError({'detail': 'Ya tienes una asistencia registrada en esta sesión pública.'})

        if not instancia:
            confirmados_actuales = AsistenciaSesionPublica.objects.filter(
                sesion_publica=sesion_publica,
                estado_asistencia='CONFIRMADO',
            ).count()
            if confirmados_actuales >= sesion_publica.plazas_maximas:
                raise ValidationError({'detail': 'La sesión pública ya está completa y no admite nuevas asistencias.'})

        if estado != 'CONFIRMADO':
            return

        confirmados = AsistenciaSesionPublica.objects.filter(
            sesion_publica=sesion_publica,
            estado_asistencia='CONFIRMADO',
        )
        if instancia:
            confirmados = confirmados.exclude(id=instancia.id)

        plazas_ocupadas = confirmados.count()
        ya_confirmado = instancia and instancia.usuario_id == usuario.id and instancia.estado_asistencia == 'CONFIRMADO'
        if ya_confirmado:
            return

        if plazas_ocupadas >= sesion_publica.plazas_maximas:
            raise ValidationError({'estado_asistencia': ['No quedan plazas disponibles en esta sesión pública.']})

    def perform_create(self, serializer):
        sesion_publica = serializer.validated_data['sesion_publica']
        usuario = self.request.user

        if sesion_publica.creado_por_id != usuario.id and usuario.provincia != sesion_publica.provincia:
            raise PermissionDenied('Solo puedes apuntarte a sesiones públicas de tu provincia.')

        self._validar_confirmacion(sesion_publica, usuario, serializer.validated_data['estado_asistencia'])
        serializer.save(usuario=usuario)

    def perform_update(self, serializer):
        asistencia = self.get_object()
        if asistencia.usuario_id != self.request.user.id:
            raise PermissionDenied('Solo puedes modificar tu propia asistencia.')

        estado = serializer.validated_data.get('estado_asistencia', asistencia.estado_asistencia)
        self._validar_confirmacion(asistencia.sesion_publica, self.request.user, estado, instancia=asistencia)
        serializer.save()

# Vista para Sesiones (Aquí es donde se planifican los partidos)
class SesionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SesionSerializer

    def get_queryset(self):
        queryset = Sesion.objects.filter(grupo__miembrogrupo__usuario=self.request.user).distinct()
        grupo_id = self.request.query_params.get('grupo')
        if grupo_id:
            queryset = queryset.filter(grupo_id=grupo_id)
        return queryset

    def perform_create(self, serializer):
        grupo = serializer.validated_data['grupo']
        validar_membresia_en_grupo(self.request.user, grupo)

        sesion = serializer.save(creado_por=self.request.user)

        AsistenteSesion.objects.create(
            sesion=sesion,
            usuario=self.request.user,
            estado_asistencia='CONFIRMADO'
        )

        try:
            enviar_correo_nueva_sesion(sesion)
        except Exception:
            registro_eventos.exception('No se pudieron enviar los correos de nueva sesión para la sesión %s', sesion.id)

    def perform_update(self, serializer):
        sesion = self.get_object()
        if not usuario_puede_editar_sesion(self.request.user, sesion):
            raise PermissionDenied('Solo el creador de la sesión o un administrador puede editarla.')
        serializer.save()

    def perform_destroy(self, instance):
        if not usuario_puede_editar_sesion(self.request.user, instance):
            raise PermissionDenied('Solo el creador de la sesión o un administrador puede eliminarla.')
        instance.delete()



# Vista para Asistencia (El "Voy/No voy")
class AsistenteSesionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AsistenteSesionSerializer

    def get_queryset(self):
        return AsistenteSesion.objects.filter(sesion__grupo__miembrogrupo__usuario=self.request.user).distinct()

    def create(self, request, *args, **kwargs):
        datos = request.data.copy()
        if not datos.get('usuario'):
            datos['usuario'] = request.user.id

        serializer = self.get_serializer(data=datos)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        sesion = serializer.validated_data['sesion']
        validar_membresia_en_grupo(self.request.user, sesion.grupo)

        usuario_objetivo = serializer.validated_data.get('usuario')
        if usuario_objetivo is None:
            usuario_objetivo = self.request.user

        if usuario_objetivo != self.request.user:
            if not usuario_puede_gestionar_asistencia(self.request.user, sesion):
                raise PermissionDenied('Solo el admin del grupo o el creador de la sesión puede gestionar asistencia de otros.')
        else:
            usuario_objetivo = self.request.user

        if usuario_objetivo.id not in ids_miembros_grupo(sesion.grupo):
            raise ValidationError({'usuario': ['El usuario no pertenece al grupo de la sesión.']})

        serializer.save(usuario=usuario_objetivo)

    def perform_update(self, serializer):
        asistencia = self.get_object()
        validar_membresia_en_grupo(self.request.user, asistencia.sesion.grupo)

        if asistencia.usuario_id != self.request.user.id:
            if not usuario_puede_gestionar_asistencia(self.request.user, asistencia.sesion):
                raise PermissionDenied('Solo el admin del grupo o el creador de la sesión puede editar asistencia de otros.')

        serializer.save()

    def perform_destroy(self, instance):
        validar_admin_en_grupo(self.request.user, instance.sesion.grupo)
        instance.delete()

# Vista para Pagos (El "Tricount")
class PagoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PagoSerializer

    def get_queryset(self):
        return Pago.objects.filter(sesion__grupo__miembrogrupo__usuario=self.request.user).distinct()

    def perform_create(self, serializer):
        sesion = serializer.validated_data['sesion']
        pagador = serializer.validated_data['usuario_pagador']
        if not usuario_puede_editar_sesion(self.request.user, sesion):
            raise PermissionDenied('Solo el creador de la sesión o un administrador puede guardar el pagador.')

        if pagador.id not in ids_miembros_grupo(sesion.grupo):
            raise ValidationError({'usuario_pagador': ['El pagador debe pertenecer al grupo.']})

        serializer.save()

    def perform_update(self, serializer):
        pago = self.get_object()
        if not usuario_puede_editar_sesion(self.request.user, pago.sesion):
            raise PermissionDenied('Solo el creador de la sesión o un administrador puede editar el pagador.')

        pagador = serializer.validated_data.get('usuario_pagador', pago.usuario_pagador)
        if pagador.id not in ids_miembros_grupo(pago.sesion.grupo):
            raise ValidationError({'usuario_pagador': ['El pagador debe pertenecer al grupo.']})

        serializer.save()

    def perform_destroy(self, instance):
        validar_admin_en_grupo(self.request.user, instance.sesion.grupo)
        instance.delete()

class PartidoClasicoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PartidoClasicoSerializer

    def get_queryset(self):
        return PartidoClasico.objects.filter(
            Q(sesion__grupo__miembrogrupo__usuario=self.request.user) |
            Q(sesion_publica__provincia=self.request.user.provincia) |
            Q(sesion_publica__creado_por=self.request.user)
        ).distinct()

    def _validar_jugadores_en_grupo(self, sesion, jugadores_ids):
        miembros = ids_miembros_grupo(sesion.grupo)
        if not set(jugadores_ids).issubset(miembros):
            raise ValidationError('Todos los jugadores del partido deben pertenecer al grupo.')

    def _validar_jugadores_en_sesion_publica(self, sesion_publica, jugadores_ids):
        confirmados = set(
            AsistenciaSesionPublica.objects.filter(
                sesion_publica=sesion_publica,
                estado_asistencia='CONFIRMADO',
            ).values_list('usuario_id', flat=True)
        )
        if not set(jugadores_ids).issubset(confirmados):
            raise ValidationError('Todos los jugadores del partido deben estar confirmados en la sesión pública.')

    def perform_create(self, serializer):
        sesion = serializer.validated_data.get('sesion')
        sesion_publica = serializer.validated_data.get('sesion_publica')

        if sesion_publica:
            validar_marcador_en_sesion_publica(self.request.user, sesion_publica)
        else:
            validar_marcador_en_sesion(self.request.user, sesion)

        jugadores_ids = [
            serializer.validated_data['jugador1_A'].id,
            serializer.validated_data['jugador2_A'].id,
            serializer.validated_data['jugador1_B'].id,
            serializer.validated_data['jugador2_B'].id,
        ]
        if sesion_publica:
            self._validar_jugadores_en_sesion_publica(sesion_publica, jugadores_ids)
        else:
            self._validar_jugadores_en_grupo(sesion, jugadores_ids)
        serializer.save()

    def perform_update(self, serializer):
        partido = self.get_object()
        if partido.sesion_publica_id:
            validar_marcador_en_sesion_publica(self.request.user, partido.sesion_publica)
        else:
            validar_marcador_en_sesion(self.request.user, partido.sesion)

        jugadores_ids = [
            serializer.validated_data.get('jugador1_A', partido.jugador1_A).id,
            serializer.validated_data.get('jugador2_A', partido.jugador2_A).id,
            serializer.validated_data.get('jugador1_B', partido.jugador1_B).id,
            serializer.validated_data.get('jugador2_B', partido.jugador2_B).id,
        ]
        if partido.sesion_publica_id:
            self._validar_jugadores_en_sesion_publica(partido.sesion_publica, jugadores_ids)
        else:
            self._validar_jugadores_en_grupo(partido.sesion, jugadores_ids)
        serializer.save()

    def perform_destroy(self, instance):
        if instance.sesion_publica_id:
            if not usuario_puede_editar_sesion_publica(self.request.user, instance.sesion_publica):
                raise PermissionDenied('Solo el creador puede eliminar resultados de esta sesión pública.')
        else:
            validar_admin_en_grupo(self.request.user, instance.sesion.grupo)
        instance.delete()

class MiniPartidoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MiniPartidoSerializer

    def get_queryset(self):
        return MiniPartido.objects.filter(
            Q(sesion__grupo__miembrogrupo__usuario=self.request.user) |
            Q(sesion_publica__provincia=self.request.user.provincia) |
            Q(sesion_publica__creado_por=self.request.user)
        ).distinct()

    def _validar_jugadores_en_grupo(self, sesion, jugadores_ids):
        miembros = ids_miembros_grupo(sesion.grupo)
        if not set(jugadores_ids).issubset(miembros):
            raise ValidationError('Todos los jugadores del mini partido deben pertenecer al grupo.')

    def _validar_jugadores_en_sesion_publica(self, sesion_publica, jugadores_ids):
        confirmados = set(
            AsistenciaSesionPublica.objects.filter(
                sesion_publica=sesion_publica,
                estado_asistencia='CONFIRMADO',
            ).values_list('usuario_id', flat=True)
        )
        if not set(jugadores_ids).issubset(confirmados):
            raise ValidationError('Todos los jugadores del mini partido deben estar confirmados en la sesión pública.')

    def perform_create(self, serializer):
        sesion = serializer.validated_data.get('sesion')
        sesion_publica = serializer.validated_data.get('sesion_publica')
        if sesion_publica:
            validar_marcador_en_sesion_publica(self.request.user, sesion_publica)
        else:
            validar_marcador_en_sesion(self.request.user, sesion)

        jugadores_ids = [
            serializer.validated_data['jugador1_A'].id,
            serializer.validated_data['jugador2_A'].id,
            serializer.validated_data['jugador1_B'].id,
            serializer.validated_data['jugador2_B'].id,
        ]
        if sesion_publica:
            self._validar_jugadores_en_sesion_publica(sesion_publica, jugadores_ids)
        else:
            self._validar_jugadores_en_grupo(sesion, jugadores_ids)
        serializer.save()

    def perform_update(self, serializer):
        partido = self.get_object()
        if partido.sesion_publica_id:
            validar_marcador_en_sesion_publica(self.request.user, partido.sesion_publica)
        else:
            validar_marcador_en_sesion(self.request.user, partido.sesion)

        jugadores_ids = [
            serializer.validated_data.get('jugador1_A', partido.jugador1_A).id,
            serializer.validated_data.get('jugador2_A', partido.jugador2_A).id,
            serializer.validated_data.get('jugador1_B', partido.jugador1_B).id,
            serializer.validated_data.get('jugador2_B', partido.jugador2_B).id,
        ]
        if partido.sesion_publica_id:
            self._validar_jugadores_en_sesion_publica(partido.sesion_publica, jugadores_ids)
        else:
            self._validar_jugadores_en_grupo(partido.sesion, jugadores_ids)
        serializer.save()

    def perform_destroy(self, instance):
        if instance.sesion_publica_id:
            if not usuario_puede_editar_sesion_publica(self.request.user, instance.sesion_publica):
                raise PermissionDenied('Solo el creador puede eliminar resultados de esta sesión pública.')
        else:
            validar_admin_en_grupo(self.request.user, instance.sesion.grupo)
        instance.delete()

class LiquidacionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LiquidacionSerializer

    def get_queryset(self):
        return Liquidacion.objects.filter(grupo__miembrogrupo__usuario=self.request.user).distinct()

    def _validar_pagadores_en_grupo(self, grupo, pagador, receptor):
        miembros = ids_miembros_grupo(grupo)
        if pagador.id not in miembros or receptor.id not in miembros:
            raise ValidationError('Pagador y receptor deben pertenecer al grupo.')

    def perform_create(self, serializer):
        grupo = serializer.validated_data['grupo']
        pagador = serializer.validated_data['pagador']
        receptor = serializer.validated_data['receptor']
        self._validar_pagadores_en_grupo(grupo, pagador, receptor)

        if not usuario_es_admin_de_grupo(self.request.user, grupo):
            validar_membresia_en_grupo(self.request.user, grupo)

            if pagador != self.request.user:
                raise PermissionDenied('Solo puedes registrar pagos en los que tú seas el pagador.')

            cantidad = round(float(serializer.validated_data['cantidad']), 2)
            liquidaciones_sugeridas = calcular_liquidaciones_sugeridas(grupo)
            coincide = any(
                item['pagador_id'] == pagador.id and
                item['receptor_id'] == receptor.id and
                abs(item['cantidad'] - cantidad) < 0.01
                for item in liquidaciones_sugeridas
            )

            if not coincide:
                raise PermissionDenied('Solo puedes registrar uno de los pagos sugeridos pendientes a tu nombre.')

        serializer.save()

    def perform_update(self, serializer):
        liquidacion = self.get_object()
        validar_admin_en_grupo(self.request.user, liquidacion.grupo)

        pagador = serializer.validated_data.get('pagador', liquidacion.pagador)
        receptor = serializer.validated_data.get('receptor', liquidacion.receptor)
        self._validar_pagadores_en_grupo(liquidacion.grupo, pagador, receptor)
        serializer.save()

    def perform_destroy(self, instance):
        validar_admin_en_grupo(self.request.user, instance.grupo)
        instance.delete()
