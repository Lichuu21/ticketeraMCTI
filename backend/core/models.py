from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.conf import settings
from django.utils import timezone
import os


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es requerido')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class Rol(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    tableros = models.ManyToManyField('Tablero', blank=True, related_name='roles')

    class Meta:
        db_table = 'roles'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Group(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'grupos'
        ordering = ['nombre']
        verbose_name = 'Grupo'
        verbose_name_plural = 'Grupos'

    def __str__(self):
        return self.nombre


class Usuario(AbstractBaseUser, PermissionsMixin):
    nombre = models.CharField(max_length=200)
    apellido = models.CharField(max_length=200)
    username = models.CharField(max_length=150, unique=True, blank=True, default='')
    email = models.EmailField(unique=True)
    dependencia = models.CharField(max_length=200, blank=True, default='')
    debe_cambiar_password = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    roles = models.ManyToManyField(Rol, blank=True, related_name='usuarios')
    groups = models.ManyToManyField(Group, blank=True, related_name='usuarios')
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre', 'apellido']

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f'{self.nombre} {self.apellido}'.strip() or self.email

    @property
    def is_staff(self):
        return True

    def has_perm(self, perm, obj=None):
        if self.is_superuser:
            return True
        return super().has_perm(perm, obj)

    def has_module_perms(self, app_label):
        if self.is_superuser:
            return True
        return super().has_module_perms(app_label)


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
    ROL_CHOICES = [
        ('Administrador', 'Administrador'),
        ('Miembro', 'Miembro'),
    ]

    tablero = models.ForeignKey(Tablero, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    rol_en_tablero = models.CharField(max_length=20, choices=ROL_CHOICES, default='Miembro')
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
    fecha_creacion = models.DateTimeField(default=timezone.now)
    posicion = models.IntegerField(default=0)

    class Meta:
        db_table = 'tickets'
        ordering = ['posicion', '-fecha_creacion']


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
