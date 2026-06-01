from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, GrupoViewSet, SesionViewSet, AsistenteSesionViewSet, PagoViewSet, PartidoClasicoViewSet, MiniPartidoViewSet, LiquidacionViewSet, RegistroUsuarioView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

 
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)
router.register(r'grupos', GrupoViewSet)
router.register(r'sesiones', SesionViewSet, basename='sesion')
router.register(r'asistencias', AsistenteSesionViewSet, basename='asistencia')
router.register(r'pagos', PagoViewSet, basename='pago')
router.register(r'partidos-clasicos', PartidoClasicoViewSet, basename='partido-clasico')
router.register(r'mini-partidos', MiniPartidoViewSet, basename='mini-partido')
router.register(r'liquidaciones', LiquidacionViewSet, basename='liquidacion')

urlpatterns = [
    path('registro/', RegistroUsuarioView.as_view(), name='registro_usuario'),
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
