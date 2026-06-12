from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import UsuarioViewSet, GrupoViewSet, SesionViewSet, AsistenteSesionViewSet, PagoViewSet, PartidoClasicoViewSet, MiniPartidoViewSet, LiquidacionViewSet, RegistroUsuarioView, VerificarEmailView, ReenviarVerificacionView, SolicitarRestablecerPasswordView, RestablecerPasswordView, VistaTokenPadelTrack, SesionPublicaViewSet, AsistenciaSesionPublicaViewSet

 
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)
router.register(r'grupos', GrupoViewSet)
router.register(r'sesiones', SesionViewSet, basename='sesion')
router.register(r'sesiones-publicas', SesionPublicaViewSet, basename='sesion-publica')
router.register(r'asistencias', AsistenteSesionViewSet, basename='asistencia')
router.register(r'asistencias-sesiones-publicas', AsistenciaSesionPublicaViewSet, basename='asistencia-sesion-publica')
router.register(r'pagos', PagoViewSet, basename='pago')
router.register(r'partidos-clasicos', PartidoClasicoViewSet, basename='partido-clasico')
router.register(r'mini-partidos', MiniPartidoViewSet, basename='mini-partido')
router.register(r'liquidaciones', LiquidacionViewSet, basename='liquidacion')

urlpatterns = [
    path('registro/', RegistroUsuarioView.as_view(), name='registro_usuario'),
    path('verificar-email/', VerificarEmailView.as_view(), name='verificar_email'),
    path('reenviar-verificacion/', ReenviarVerificacionView.as_view(), name='reenviar_verificacion'),
    path('solicitar-restablecer-password/', SolicitarRestablecerPasswordView.as_view(), name='solicitar_restablecer_password'),
    path('restablecer-password/', RestablecerPasswordView.as_view(), name='restablecer_password'),
    path('', include(router.urls)),
    path('token/', VistaTokenPadelTrack.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
