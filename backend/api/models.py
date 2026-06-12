from django.db import models
from django.contrib.auth.models import AbstractUser


PROVINCIAS_ESPANA = [
    ('A Coruna', 'A Coruna'), ('Alava', 'Alava'), ('Albacete', 'Albacete'), ('Alicante', 'Alicante'),
    ('Almeria', 'Almeria'), ('Asturias', 'Asturias'), ('Avila', 'Avila'), ('Badajoz', 'Badajoz'),
    ('Barcelona', 'Barcelona'), ('Burgos', 'Burgos'), ('Caceres', 'Caceres'), ('Cadiz', 'Cadiz'),
    ('Cantabria', 'Cantabria'), ('Castellon', 'Castellon'), ('Ceuta', 'Ceuta'), ('Ciudad Real', 'Ciudad Real'),
    ('Cordoba', 'Cordoba'), ('Cuenca', 'Cuenca'), ('Girona', 'Girona'), ('Granada', 'Granada'),
    ('Guadalajara', 'Guadalajara'), ('Guipuzcoa', 'Guipuzcoa'), ('Huelva', 'Huelva'), ('Huesca', 'Huesca'),
    ('Illes Balears', 'Illes Balears'), ('Jaen', 'Jaen'), ('La Rioja', 'La Rioja'), ('Las Palmas', 'Las Palmas'),
    ('Leon', 'Leon'), ('Lleida', 'Lleida'), ('Lugo', 'Lugo'), ('Madrid', 'Madrid'), ('Malaga', 'Malaga'),
    ('Melilla', 'Melilla'), ('Murcia', 'Murcia'), ('Navarra', 'Navarra'), ('Ourense', 'Ourense'),
    ('Palencia', 'Palencia'), ('Pontevedra', 'Pontevedra'), ('Salamanca', 'Salamanca'), ('Santa Cruz de Tenerife', 'Santa Cruz de Tenerife'),
    ('Segovia', 'Segovia'), ('Sevilla', 'Sevilla'), ('Soria', 'Soria'), ('Tarragona', 'Tarragona'),
    ('Teruel', 'Teruel'), ('Toledo', 'Toledo'), ('Valencia', 'Valencia'), ('Valladolid', 'Valladolid'),
    ('Vizcaya', 'Vizcaya'), ('Zamora', 'Zamora'), ('Zaragoza', 'Zaragoza'),
]

# ==========================================
# 0. EL USUARIO 
# ==========================================
class Usuario(AbstractUser):
    email_verificado = models.BooleanField(default=False)
    provincia = models.CharField(max_length=60, choices=PROVINCIAS_ESPANA, blank=True, default='')

    def __str__(self):
        return self.username

# ==========================================
# 1. MÓDULO SOCIAL
# ==========================================

class Grupo(models.Model):
    nombre = models.CharField(max_length=100)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

class MiembroGrupo(models.Model):
    # IMPORTANTE: Cambiado User por Usuario
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    grupo = models.ForeignKey(Grupo, on_delete=models.CASCADE)
    es_admin = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['grupo', 'usuario'], name='unique_miembro_grupo_usuario'),
        ]

    def __str__(self):
        return f"{self.usuario.username} en {self.grupo.nombre}"
    
# ==========================================
# 2. MÓDULO DE EVENTOS Y DINERO
# ==========================================

class Sesion(models.Model):
    ESTADOS = [
        ('PLANIFICADA', 'Planificada'),
        ('EN_CURSO', 'En Curso'),
        ('FINALIZADA', 'Finalizada'),
    ]
    
    grupo = models.ForeignKey(Grupo, on_delete=models.CASCADE)
    creado_por = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.SET_NULL, related_name='sesiones_creadas')
    fecha_hora = models.DateTimeField(null=True, blank=True)
    lugar = models.CharField(max_length=200)
    google_maps_url = models.URLField(blank=True, default='')
    coste_total = models.DecimalField(max_digits=6, decimal_places=2)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PLANIFICADA')

    def __str__(self):
        return f"Sesión {self.lugar} - {self.fecha_hora.strftime('%d/%m/%Y')}"

class AsistenteSesion(models.Model):
    ESTADOS_ASISTENCIA = [
        ('PENDIENTE', 'Pendiente'),
        ('CONFIRMADO', 'Confirmado'),
        ('DECLINADO', 'Declinado'),
    ]
    
    sesion = models.ForeignKey(Sesion, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    estado_asistencia = models.CharField(max_length=20, choices=ESTADOS_ASISTENCIA, default='PENDIENTE')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['sesion', 'usuario'], name='unique_asistencia_sesion_usuario'),
        ]


class SesionPublica(models.Model):
    ESTADOS = [
        ('PLANIFICADA', 'Planificada'),
        ('EN_CURSO', 'En Curso'),
        ('FINALIZADA', 'Finalizada'),
    ]

    creado_por = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='sesiones_publicas_creadas')
    provincia = models.CharField(max_length=60, choices=PROVINCIAS_ESPANA)
    fecha_hora = models.DateTimeField()
    lugar = models.CharField(max_length=200)
    google_maps_url = models.URLField(blank=True, default='')
    descripcion = models.TextField(blank=True, default='')
    coste_total = models.DecimalField(max_digits=6, decimal_places=2)
    plazas_maximas = models.PositiveIntegerField(default=4)
    pagador = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.SET_NULL, related_name='sesiones_publicas_pagadas')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PLANIFICADA')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Sesion publica {self.lugar} - {self.provincia}'


class AsistenciaSesionPublica(models.Model):
    ESTADOS_ASISTENCIA = [
        ('PENDIENTE', 'Pendiente'),
        ('CONFIRMADO', 'Confirmado'),
        ('DECLINADO', 'Declinado'),
    ]

    sesion_publica = models.ForeignKey(SesionPublica, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    estado_asistencia = models.CharField(max_length=20, choices=ESTADOS_ASISTENCIA, default='PENDIENTE')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['sesion_publica', 'usuario'], name='unique_asistencia_sesion_publica_usuario'),
        ]

class Pago(models.Model):
    sesion = models.ForeignKey(Sesion, on_delete=models.CASCADE)
    usuario_pagador = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=6, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['sesion'], name='unique_pago_por_sesion'),
        ]

class Liquidacion(models.Model):
    grupo = models.ForeignKey(Grupo, on_delete=models.CASCADE)
    pagador = models.ForeignKey(Usuario, related_name='liquidaciones_enviadas', on_delete=models.CASCADE)
    receptor = models.ForeignKey(Usuario, related_name='liquidaciones_recibidas', on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=6, decimal_places=2)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.pagador.username} pagó {self.cantidad}€ a {self.receptor.username}"

# ==========================================
# 3. MÓDULO DEPORTIVO
# ==========================================

class PartidoClasico(models.Model):
    sesion = models.ForeignKey(Sesion, null=True, blank=True, on_delete=models.CASCADE)
    sesion_publica = models.ForeignKey(SesionPublica, null=True, blank=True, on_delete=models.CASCADE)
    # IMPORTANTE: Todos cambiados a Usuario
    jugador1_A = models.ForeignKey(Usuario, related_name='partidos_clasicos_j1A', on_delete=models.CASCADE)
    jugador2_A = models.ForeignKey(Usuario, related_name='partidos_clasicos_j2A', on_delete=models.CASCADE)
    jugador1_B = models.ForeignKey(Usuario, related_name='partidos_clasicos_j1B', on_delete=models.CASCADE)
    jugador2_B = models.ForeignKey(Usuario, related_name='partidos_clasicos_j2B', on_delete=models.CASCADE)
    resultado = models.CharField(max_length=50)

class MiniPartido(models.Model):
    GANADOR_CHOICES = [
        ('A', 'Equipo A'),
        ('B', 'Equipo B'),
    ]
    
    sesion = models.ForeignKey(Sesion, null=True, blank=True, on_delete=models.CASCADE)
    sesion_publica = models.ForeignKey(SesionPublica, null=True, blank=True, on_delete=models.CASCADE)
    orden = models.PositiveIntegerField()
    # IMPORTANTE: Todos cambiados a Usuario
    jugador1_A = models.ForeignKey(Usuario, related_name='mini_partidos_j1A', on_delete=models.CASCADE)
    jugador2_A = models.ForeignKey(Usuario, related_name='mini_partidos_j2A', on_delete=models.CASCADE)
    jugador1_B = models.ForeignKey(Usuario, related_name='mini_partidos_j1B', on_delete=models.CASCADE)
    jugador2_B = models.ForeignKey(Usuario, related_name='mini_partidos_j2B', on_delete=models.CASCADE)
    ganador = models.CharField(max_length=1, choices=GANADOR_CHOICES)

    puntos_A = models.CharField(max_length=5, default='0')
    puntos_B = models.CharField(max_length=5, default='0')
    corona_rey = models.BooleanField(default=False)
