from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='rol',
            name='permisos',
            field=models.JSONField(blank=True, default=dict, help_text='Permisos por defecto asignados a usuarios con este rol (JSON)'),
        ),
    ]
