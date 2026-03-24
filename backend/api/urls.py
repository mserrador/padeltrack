from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, GrupoViewSet, SesionViewSet, AsistenteSesionViewSet, PagoViewSet, PartidoClasicoViewSet, MiniPartidoViewSet, LiquidacionViewSet

# El Router crea las URLs automáticamente 
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)
router.register(r'grupos', GrupoViewSet)
router.register(r'sesiones', SesionViewSet)
router.register(r'asistencias', AsistenteSesionViewSet)
router.register(r'pagos', PagoViewSet)
router.register(r'partidos-clasicos', PartidoClasicoViewSet)
router.register(r'mini-partidos', MiniPartidoViewSet)
router.register(r'liquidaciones', LiquidacionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]