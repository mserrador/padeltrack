from django.db import models
from django.contrib.auth.models import AbstractUser

# ==========================================
# 0. EL USUARIO 
# ==========================================
class Usuario(AbstractUser):
    pass

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
    fecha_hora = models.DateTimeField()
    lugar = models.CharField(max_length=200)
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
    # IMPORTANTE: Cambiado User por Usuario
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    estado_asistencia = models.CharField(max_length=20, choices=ESTADOS_ASISTENCIA, default='PENDIENTE')

class Pago(models.Model):
    sesion = models.ForeignKey(Sesion, on_delete=models.CASCADE)
    # IMPORTANTE: Cambiado User por Usuario
    usuario_pagador = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=6, decimal_places=2)

# ==========================================
# 3. MÓDULO DEPORTIVO
# ==========================================

class PartidoClasico(models.Model):
    sesion = models.ForeignKey(Sesion, on_delete=models.CASCADE)
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
    
    sesion = models.ForeignKey(Sesion, on_delete=models.CASCADE)
    orden = models.PositiveIntegerField()
    # IMPORTANTE: Todos cambiados a Usuario
    jugador1_A = models.ForeignKey(Usuario, related_name='mini_partidos_j1A', on_delete=models.CASCADE)
    jugador2_A = models.ForeignKey(Usuario, related_name='mini_partidos_j2A', on_delete=models.CASCADE)
    jugador1_B = models.ForeignKey(Usuario, related_name='mini_partidos_j1B', on_delete=models.CASCADE)
    jugador2_B = models.ForeignKey(Usuario, related_name='mini_partidos_j2B', on_delete=models.CASCADE)
    ganador = models.CharField(max_length=1, choices=GANADOR_CHOICES)