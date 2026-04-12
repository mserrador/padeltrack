from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from .models import Usuario, Grupo, Sesion, AsistenteSesion, Pago, PartidoClasico, MiniPartido, MiembroGrupo, Liquidacion
from .serializers import UsuarioSerializer, GrupoSerializer, SesionSerializer, AsistenteSesionSerializer, PagoSerializer, PartidoClasicoSerializer, MiniPartidoSerializer, LiquidacionSerializer

# Vista para Usuarios
class UsuarioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

# Vista para Grupos
class GrupoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Grupo.objects.all()
    serializer_class = GrupoSerializer

    def get_queryset(self):
        usuario = self.request.user
        return Grupo.objects.filter(miembrogrupo__usuario=usuario).distinct()

    
    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        grupo = self.get_object()
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

            # 1. Pagos adelantados (A FAVOR)
            pagos = Pago.objects.filter(sesion__grupo=grupo, usuario_pagador=usuario).aggregate(total=Sum('cantidad'))['total'] or 0.0
            total_balance += float(pagos)

            # 2. Coste de pistas jugadas (EN CONTRA)
            sesiones_finalizadas = Sesion.objects.filter(grupo=grupo, estado='FINALIZADA')
            for sesion in sesiones_finalizadas:
                confirmados = AsistenteSesion.objects.filter(sesion=sesion, estado_asistencia='CONFIRMADO')
                if confirmados.filter(usuario=usuario).exists():
                    num_jugadores = confirmados.count()
                    if num_jugadores > 0:
                        coste_por_persona = float(sesion.coste_total) / num_jugadores
                        total_balance -= coste_por_persona

            # 3. Bizums ENVIADOS (+) y RECIBIDOS (-)
            liq_enviadas = Liquidacion.objects.filter(grupo=grupo, pagador=usuario).aggregate(total=Sum('cantidad'))['total'] or 0.0
            liq_recibidas = Liquidacion.objects.filter(grupo=grupo, receptor=usuario).aggregate(total=Sum('cantidad'))['total'] or 0.0
            
            total_balance += float(liq_enviadas)
            total_balance -= float(liq_recibidas)

            balances.append({
                'usuario_id': usuario.id,
                'username': usuario.username, # <--- IMPORTANTE: usamos 'username'
                'balance': round(total_balance, 2)
            })

        balances.sort(key=lambda x: x['balance'], reverse=True)
        return Response(balances)
    
    @action(detail=True, methods=['get'])
    def historial_liquidaciones(self, request, pk=None):
        grupo = self.get_object()
        # Filtramos por grupo y ordenamos por fecha descendente (la más reciente primero)
        liquidaciones = Liquidacion.objects.filter(grupo=grupo).order_by('-fecha')
        serializer = LiquidacionSerializer(liquidaciones, many=True)
        return Response(serializer.data)

# Vista para Sesiones (Aquí es donde se planifican los partidos)
class SesionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SesionSerializer

    def get_queryset(self):
        queryset = Sesion.objects.all()
        grupo_id = self.request.query_params.get('grupo')
        if grupo_id:
            queryset = queryset.filter(grupo_id=grupo_id)
        return queryset
    
    def perform_create(self, serializer):
        sesion = serializer.save()

        AsistenteSesion.objects.create(
            sesion=sesion,
            usuario=self.request.user,
            estado_asistencia='CONFIRMADO'
        )



# Vista para Asistencia (El "Voy/No voy")
class AsistenteSesionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = AsistenteSesion.objects.all()
    serializer_class = AsistenteSesionSerializer

# Vista para Pagos (El "Tricount")
class PagoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer

class PartidoClasicoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = PartidoClasico.objects.all()
    serializer_class = PartidoClasicoSerializer

class MiniPartidoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = MiniPartido.objects.all()
    serializer_class = MiniPartidoSerializer

class LiquidacionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Liquidacion.objects.all()
    serializer_class = LiquidacionSerializer
