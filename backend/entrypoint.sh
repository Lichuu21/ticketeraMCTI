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

# Seed default Wallpapers and WallpaperGroups if empty
python manage.py shell -c "
from core.models import WallpaperGroup, Wallpaper

if WallpaperGroup.objects.count() == 0:
    print('Seeding default wallpaper groups and wallpapers...')
    g_gen = WallpaperGroup.objects.create(nombre='Fondos Generales', icono='fas fa-image', orden=1)
    g_pba = WallpaperGroup.objects.create(nombre='Provincia de Buenos Aires', icono='fas fa-landmark', orden=2)
    g_abs = WallpaperGroup.objects.create(nombre='Fondos Abstractos', icono='fas fa-paint-brush', orden=3)

    initial_wallpapers = [
        # General
        (g_gen, 'Montañas', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Aurora Boreal', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Bosque', 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Desierto', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Galaxia', 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Cascada', 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Playa', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'New York', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Tokyo', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Paris', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Bariloche', 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=400&q=80'),
        (g_gen, 'Cataratas del Iguazú', 'https://images.unsplash.com/photo-1583354731017-7e9b88e14620?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1583354731017-7e9b88e14620?auto=format&fit=crop&w=400&q=80'),
        # PBA
        (g_pba, 'Buenos Aires', 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?auto=format&fit=crop&w=400&q=80'),
        (g_pba, 'Mar del Plata', 'https://images.unsplash.com/photo-1589561084283-930aa7b1ce50?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1589561084283-930aa7b1ce50?auto=format&fit=crop&w=400&q=80'),
        # Abstractos
        (g_abs, 'Esfera Violeta', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80'),
        (g_abs, 'Burbujas Pastel', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80'),
        (g_abs, 'Gradiente Neón', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80'),
        (g_abs, 'Océano Digital', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'),
    ]

    for grp, nombre, img_url, th_url in initial_wallpapers:
        Wallpaper.objects.create(
            group=grp,
            nombre=nombre,
            imagen=img_url,
            thumb=th_url,
            activo=True
        )
    print('Wallpapers seeded successfully.')
else:
    print('WallpaperGroups already seeded.')
" || true

echo "Starting server..."
if [ "$DJANGO_DEBUG" = "True" ]; then
    exec python manage.py runserver 0.0.0.0:8000
else
    exec gunicorn ticketera.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi
