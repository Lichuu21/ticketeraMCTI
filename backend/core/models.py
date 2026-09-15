from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
import os


class SiteSetting(models.Model):
    nombre_sistema = models.CharField(max_length=200, default='Ticketera MCTI')
    nombre_corto = models.CharField(max_length=50, default='Ticketera')
    logo_pequeño = models.FileField(upload_to='config/', blank=True, default='')
    logo_grande = models.FileField(upload_to='config/', blank=True, default='')
    color_logo = models.CharField(max_length=7, default='#065E94')
    color_fondo_logo = models.CharField(max_length=7, default='#FFFFFF')
    color_sitio = models.CharField(max_length=7, default='#065E94')
    max_file_size_mb = models.IntegerField(default=10, verbose_name='Tamaño máximo de archivo (MB)')
    allowed_file_types = models.JSONField(default=list, verbose_name='Tipos de archivo permitidos')

    class Meta:
        db_table = 'site_settings'
        verbose_name = 'Configuración del Sitio'
        verbose_name_plural = 'Configuración del Sitio'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.nombre_sistema


class Usuario(AbstractUser):
    nombre = models.CharField(max_length=200, blank=True, default='')
    dependencia = models.CharField(max_length=200, blank=True, default='')
    piso = models.CharField(max_length=50, blank=True, default='')
    rol = models.CharField(max_length=100, blank=True, default='Usuario')
    debe_cambiar_password = models.BooleanField(default=True)

    class Meta:
        db_table = 'usuarios'

    def save(self, *args, **kwargs):
        if not self.username and self.email:
            self.username = self.email.strip()
        if not self.nombre or not self.nombre.strip():
            if self.first_name and self.last_name:
                self.nombre = f"{self.first_name} {self.last_name}".strip()
            elif self.first_name:
                self.nombre = self.first_name.strip()
            elif self.email:
                local_part = self.email.split('@')[0]
                self.nombre = local_part.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()
            elif self.username:
                self.nombre = self.username.split('@')[0].replace('.', ' ').title()
            else:
                self.nombre = 'Usuario'

        if not self.first_name or not self.first_name.strip():
            self.first_name = self.nombre

        if not self.dependencia or not self.dependencia.strip():
            self.dependencia = 'Sin Especificar'

        if not self.piso or not self.piso.strip():
            self.piso = '-'

        if not self.rol or not self.rol.strip():
            self.rol = 'Administrador' if (self.is_staff or self.is_superuser) else 'Usuario'

        if str(self.rol).strip().lower() in ['administrador', 'admin', 'jefe']:
            self.is_staff = True
            self.is_superuser = True

        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre or self.email



class CambioPassword(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='cambio_password_status')
    debe_cambiar = models.BooleanField(default=True)

    class Meta:
        db_table = 'cambio_passwords'

    def __str__(self):
        return f"{self.usuario.username} - debe_cambiar: {self.debe_cambiar}"


class Tablero(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    creador = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='tableros_creados')
    tipo = models.CharField(max_length=50, default='Trabajo')
    columnas = models.JSONField(default=list)
    wallpaper_path = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tableros'
        ordering = ['-created_at']

    def __str__(self):
        return self.nombre


class TableroUsuario(models.Model):
    tablero = models.ForeignKey(Tablero, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    rol_en_tablero = models.CharField(max_length=100, default='Usuario')
    permisos = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'tablero_usuarios'
        unique_together = ('tablero', 'usuario')


class Ticket(models.Model):
    titulo = models.CharField(max_length=300)
    descripcion = models.TextField(blank=True, default='')
    estado = models.CharField(max_length=100, default='Solicitud')
    prioridad = models.CharField(max_length=50, default='Media')
    area = models.CharField(max_length=100, blank=True, default='')
    responsable = models.CharField(max_length=500, blank=True, default='')
    solicitante = models.CharField(max_length=200, blank=True, default='')
    seccion_solicitante = models.CharField(max_length=200, blank=True, default='')
    email_solicitante = models.CharField(max_length=200, blank=True, default='')
    tablero = models.ForeignKey(Tablero, on_delete=models.CASCADE, related_name='tickets')
    checklist = models.JSONField(default=list)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tickets'
        ordering = ['-fecha_creacion']


class Comentario(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comentarios')
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True)
    texto = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comentarios'
        ordering = ['created_at']


class Notificacion(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE)
    mensaje = models.CharField(max_length=500)
    leida = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificaciones'
        ordering = ['-created_at']

class WallpaperGroup(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    icono = models.CharField(max_length=10, blank=True, default='')
    orden = models.IntegerField(default=0)

    class Meta:
        db_table = 'wallpaper_groups'
        ordering = ['orden', 'nombre']
        verbose_name = 'Grupo de Wallpapers'
        verbose_name_plural = 'Grupos de Wallpapers'

    def __str__(self):
        return self.nombre

class Wallpaper(models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    group = models.ForeignKey(WallpaperGroup, on_delete=models.CASCADE, related_name='wallpapers', verbose_name='Grupo')
    imagen = models.FileField(upload_to='wallpapers/')
    thumb = models.FileField(upload_to='wallpapers/thumbs/', blank=True, default='')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wallpapers'
        ordering = ['group__orden', 'nombre']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.imagen and not self.thumb:
            self._generate_thumb()

    def _generate_thumb(self):
        try:
            from PIL import Image
        except ImportError:
            return

        img_path = self.imagen.path
        thumb_dir = os.path.join(settings.MEDIA_ROOT, 'wallpapers', 'thumbs')
        os.makedirs(thumb_dir, exist_ok=True)

        thumb_filename = f"thumb_{os.path.basename(img_path)}"
        thumb_path = os.path.join(thumb_dir, thumb_filename)

        with Image.open(img_path) as img:
            img.thumbnail((200, 200))
            img.save(thumb_path, quality=85)

        self.thumb = f'wallpapers/thumbs/{thumb_filename}'
        super().save(update_fields=['thumb'])

    def __str__(self):
        return self.nombre
