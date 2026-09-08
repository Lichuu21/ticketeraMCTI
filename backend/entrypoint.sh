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

# Create admin user if it doesn't exist
python manage.py shell -c "
from core.models import Usuario
if not Usuario.objects.filter(email='admin@ticket.com.ar').exists():
    Usuario.objects.create_superuser(
        username='admin@ticket.com.ar',
        email='admin@ticket.com.ar',
        password='EstoNoEsPass',
        nombre='Administrador'
    )
    print('Admin user created: admin@ticket.com.ar / EstoNoEsPass')
else:
    print('Admin user already exists.')
" || true

echo "Starting server..."
if [ "$DJANGO_DEBUG" = "True" ]; then
    exec python manage.py runserver 0.0.0.0:8000
else
    exec gunicorn ticketera.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi
