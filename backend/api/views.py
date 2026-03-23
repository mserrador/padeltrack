from rest_framework import viewsets
from .models import Usuario, Grupo, Sesion, AsistenteSesion, Pago
from .serializers import UsuarioSerializer, GrupoSerializer, SesionSerializer, AsistenteSesionSerializer, PagoSerializer

# Vista para Usuarios
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

# Vista para Grupos
class GrupoViewSet(viewsets.ModelViewSet):
    queryset = Grupo.objects.all()
    serializer_class = GrupoSerializer

# Vista para Sesiones (Aquí es donde se planifican los partidos)
class SesionViewSet(viewsets.ModelViewSet):
    queryset = Sesion.objects.all()
    serializer_class = SesionSerializer

# Vista para Asistencia (El "Voy/No voy")
class AsistenteSesionViewSet(viewsets.ModelViewSet):
    queryset = AsistenteSesion.objects.all()
    serializer_class = AsistenteSesionSerializer

# Vista para Pagos (El "Tricount")
class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer