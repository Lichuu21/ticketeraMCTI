#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --noinput

if [ "$DJANGO_DEBUG" = "True" ]; then
    echo "DEBUG mode: skipping collectstatic"
else
    echo "Production mode: collecting static files"
    python manage.py collectstatic --noinput
fi

# Create or update admin user
python manage.py shell -c "
from core.models import Usuario
u, created = Usuario.objects.get_or_create(
    username='admin@ticket.com.ar',
    defaults={
        'email': 'admin@ticket.com.ar',
        'nombre': 'Administrador',
        'rol': 'Administrador',
        'is_staff': True,
        'is_superuser': True,
        'debe_cambiar_password': True,
    }
)
if created:
    u.set_password('EstoNoEsPass')
    u.save()
    print('Admin user created: admin@ticket.com.ar / EstoNoEsPass')
else:
    u.rol = 'Administrador'
    u.is_staff = True
    u.is_superuser = True
    u.save()
    print('Admin user updated: rol Administrador')
" || true

echo "Starting server..."
if [ "$DJANGO_DEBUG" = "True" ]; then
    exec python manage.py runserver 0.0.0.0:8000
else
    exec gunicorn ticketera.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi
