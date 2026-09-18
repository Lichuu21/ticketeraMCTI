from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_rol_permisos'),
    ]

    operations = [
        migrations.AlterField(
            model_name='wallpapergroup',
            name='icono',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
    ]
