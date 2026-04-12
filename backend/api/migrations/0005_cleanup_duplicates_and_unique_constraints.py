from django.db import migrations, models
from django.db.models import Count


def cleanup_duplicates(apps, schema_editor):
    MiembroGrupo = apps.get_model('api', 'MiembroGrupo')
    AsistenteSesion = apps.get_model('api', 'AsistenteSesion')
    Pago = apps.get_model('api', 'Pago')

    duplicados_miembros = (
        MiembroGrupo.objects
        .values('grupo_id', 'usuario_id')
        .annotate(total=Count('id'))
        .filter(total__gt=1)
    )
    for dup in duplicados_miembros:
        filas = MiembroGrupo.objects.filter(
            grupo_id=dup['grupo_id'],
            usuario_id=dup['usuario_id'],
        ).order_by('id')
        keep = filas.first()
        if filas.filter(es_admin=True).exists() and not keep.es_admin:
            keep.es_admin = True
            keep.save(update_fields=['es_admin'])
        filas.exclude(id=keep.id).delete()

    duplicados_asistencia = (
        AsistenteSesion.objects
        .values('sesion_id', 'usuario_id')
        .annotate(total=Count('id'))
        .filter(total__gt=1)
    )
    for dup in duplicados_asistencia:
        filas = AsistenteSesion.objects.filter(
            sesion_id=dup['sesion_id'],
            usuario_id=dup['usuario_id'],
        ).order_by('id')
        keep = filas.first()
        filas.exclude(id=keep.id).delete()

    duplicados_pago = (
        Pago.objects
        .values('sesion_id')
        .annotate(total=Count('id'))
        .filter(total__gt=1)
    )
    for dup in duplicados_pago:
        filas = Pago.objects.filter(sesion_id=dup['sesion_id']).order_by('-id')
        keep = filas.first()
        filas.exclude(id=keep.id).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_liquidacion'),
    ]

    operations = [
        migrations.RunPython(cleanup_duplicates, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='miembrogrupo',
            constraint=models.UniqueConstraint(fields=('grupo', 'usuario'), name='unique_miembro_grupo_usuario'),
        ),
        migrations.AddConstraint(
            model_name='asistentesesion',
            constraint=models.UniqueConstraint(fields=('sesion', 'usuario'), name='unique_asistencia_sesion_usuario'),
        ),
        migrations.AddConstraint(
            model_name='pago',
            constraint=models.UniqueConstraint(fields=('sesion',), name='unique_pago_por_sesion'),
        ),
    ]
