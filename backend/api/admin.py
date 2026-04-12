from django.contrib import admin
from .models import Usuario, Grupo, MiembroGrupo, Sesion, AsistenteSesion, Pago, PartidoClasico, MiniPartido, Liquidacion

admin.site.register(Usuario)
admin.site.register(Grupo)
admin.site.register(MiembroGrupo)
admin.site.register(Sesion)
admin.site.register(AsistenteSesion)
admin.site.register(Pago)
admin.site.register(PartidoClasico)
admin.site.register(MiniPartido)
admin.site.register(Liquidacion)
 