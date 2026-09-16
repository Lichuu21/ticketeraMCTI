#!/bin/bash
set -e

echo "Making migrations..."
python manage.py makemigrations --noinput 2>/dev/null || true

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

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

# Create default SiteSetting if it doesn't exist
python manage.py shell -c "
from core.models import SiteSetting
config = SiteSetting.load()
if not config.allowed_file_types:
    config.allowed_file_types = [
        'pdf', 'jpeg', 'jpg', 'png', 'webp', 'txt', 'md',
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
    ]
    config.save()
    print('SiteSetting default file types configured.')
else:
    print('SiteSetting already configured.')
" || true

echo "Starting server..."
if [ "$DJANGO_DEBUG" = "True" ]; then
    exec python manage.py runserver 0.0.0.0:8000
else
    exec gunicorn ticketera.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi
