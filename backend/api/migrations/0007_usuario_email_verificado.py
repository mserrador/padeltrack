from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_sesion_creado_por'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='email_verificado',
            field=models.BooleanField(default=False),
        ),
    ]
