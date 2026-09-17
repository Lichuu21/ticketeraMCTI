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
    email='admin@ticket.com.ar',
    defaults={
        'nombre': 'Administrador',
        'apellido': 'Sistema',
        'is_superuser': True,
        'is_active': True,
        'debe_cambiar_password': False,
    }
)
if created:
    u.set_password('EstoNoEsPass')
    u.save()
    print('Admin user created: admin@ticket.com.ar / EstoNoEsPass')
else:
    u.is_superuser = True
    u.is_active = True
    u.save()
    print('Admin user updated')
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
