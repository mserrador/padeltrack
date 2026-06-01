from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_cleanup_duplicates_and_unique_constraints'),
    ]

    operations = [
        migrations.AddField(
            model_name='sesion',
            name='creado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sesiones_creadas', to='api.usuario'),
        ),
    ]
