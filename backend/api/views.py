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
        return Grupo.objects.filter(miembrogrupo__usuario=usuario)

    
    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        grupo = self.get_object()
        miembros = MiembroGrupo.objects.filter(grupo=grupo)

        balances = []
        for miembro in miembros:
            usuario = miembro.usuario
            balance = 0.0

            # 1. Pagos adelantados en pistas de este grupo (A FAVOR)
            pagos = Pago.objects.filter(sesion__grupo=grupo, usuario_pagador=usuario).aggregate(total=Sum('cantidad'))['total'] or 0.0
            balance += float(pagos)

            # 2. Coste de las pistas que ha jugado (EN CONTRA)
            sesiones_finalizadas = Sesion.objects.filter(grupo=grupo, estado='FINALIZADA')
            for sesion in sesiones_finalizadas:
                confirmados = AsistenteSesion.objects.filter(sesion=sesion, estado_asistencia='CONFIRMADO')
                if confirmados.filter(usuario=usuario).exists():
                    num_jugadores = confirmados.count()
                    if num_jugadores > 0:
                        coste_por_persona = float(sesion.coste_total) / num_jugadores
                        balance -= coste_por_persona

            # 3. Bizums ENVIADOS a otros del grupo (A FAVOR, porque saldo mi deuda)
            liq_enviadas = Liquidacion.objects.filter(grupo=grupo, pagador=usuario).aggregate(total=Sum('cantidad'))['total'] or 0.0
            balance += float(liq_enviadas)

            # 4. Bizums RECIBIDOS de otros (EN CONTRA, porque me están devolviendo lo que me debían)
            liq_recibidas = Liquidacion.objects.filter(grupo=grupo, receptor=usuario).aggregate(total=Sum('cantidad'))['total'] or 0.0
            balance -= float(liq_recibidas)

            balances.append({
                'usuario_id': usuario.id,
                'usuario_nombre': usuario.username,
                'balance': round(balance, 2)
            })

        # Ordenamos la lista: los que están más en verde arriba, los morosos abajo
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
    queryset = Sesion.objects.all()
    serializer_class = SesionSerializer

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