from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_alter_ticket_fecha_creacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='posicion',
            field=models.IntegerField(default=0),
        ),
    ]
