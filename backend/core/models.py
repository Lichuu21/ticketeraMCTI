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
        if not extra_fields.get('username'):
            extra_fields['username'] = email
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class Rol(models.Model):
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Rol")
    tableros = models.ManyToManyField('Tablero', blank=True, related_name='roles', verbose_name="Tableros Asociados")
    permisos = models.JSONField(default=dict, blank=True, verbose_name="Permisos por Defecto", help_text="Permisos por defecto asignados a usuarios con este rol (JSON)")

    class Meta:
        db_table = 'roles'
        ordering = ['nombre']
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.nombre


class Group(models.Model):
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Grupo")

    class Meta:
        db_table = 'grupos'
        ordering = ['nombre']
        verbose_name = 'Grupo'
        verbose_name_plural = 'Grupos'

    def __str__(self):
        return self.nombre


class Usuario(AbstractBaseUser, PermissionsMixin):
    nombre = models.CharField(max_length=200, verbose_name="Nombre")
    apellido = models.CharField(max_length=200, verbose_name="Apellido")
    username = models.CharField(max_length=150, unique=True, blank=True, default='',verbose_name="Nombre de Usuario")
    email = models.EmailField(unique=True, verbose_name="Correo Electrónico")
    dependencia = models.CharField(max_length=200, blank=True, default='', verbose_name="Dependencia")
    debe_cambiar_password = models.BooleanField(default=True, verbose_name="Debe Cambiar Contraseña")
    is_active = models.BooleanField(default=True, verbose_name="Esta Activo")
    is_superuser = models.BooleanField(default=False, verbose_name="Es Supervisor")
    roles = models.ManyToManyField(Rol, blank=True, related_name='usuarios', verbose_name="Roles")
    groups = models.ManyToManyField(Group, blank=True, related_name='usuarios', verbose_name="Grupos")
    date_joined = models.DateTimeField(default=timezone.now, verbose_name="Fecha de Creacion")

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre', 'apellido']

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

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
    nombre_sistema = models.CharField(max_length=200, default='Ticketera MCTI', verbose_name="Nombre del Sistema")
    nombre_corto = models.CharField(max_length=50, default='Ticketera', verbose_name="Nombre Corto")
    logo_pequeño = models.FileField(upload_to='config/', blank=True, default='', verbose_name="Logo Pequeño")
    logo_grande = models.FileField(upload_to='config/', blank=True, default='', verbose_name="Logo Grande")
    color_logo = models.CharField(max_length=7, default='#065E94', verbose_name="Color del Logo")
    color_fondo_logo = models.CharField(max_length=7, default='#FFFFFF', verbose_name="Color de Fondo del Logo")
    color_sitio = models.CharField(max_length=7, default='#065E94', verbose_name="Color del Sitio")
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
    nombre = models.CharField(max_length=200, verbose_name="Nombre del Tablero")
    descripcion = models.TextField(blank=True, default='', verbose_name="Descripción")
    creador = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='tableros_creados', verbose_name="Creador")
    tipo = models.CharField(max_length=50, default='Trabajo', verbose_name="Tipo de Tablero")
    columnas = models.JSONField(default=list, verbose_name="Columnas")
    wallpaper_path = models.CharField(max_length=500, blank=True, default='', verbose_name="Ruta del Fondo de Pantalla")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        db_table = 'tableros'
        ordering = ['-created_at']
        verbose_name = 'Tablero'
        verbose_name_plural = 'Tableros'

    def __str__(self):
        return self.nombre


class TableroUsuario(models.Model):
    ROL_CHOICES = [
        ('Administrador', 'Administrador'),
        ('Miembro', 'Miembro'),
    ]

    tablero = models.ForeignKey(Tablero, on_delete=models.CASCADE, verbose_name="Tablero")
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, verbose_name="Usuario")
    rol_en_tablero = models.CharField(max_length=20, choices=ROL_CHOICES, default='Miembro', verbose_name="Rol en el Tablero")
    permisos = models.JSONField(null=True, blank=True, verbose_name="Permisos")

    class Meta:
        db_table = 'tablero_usuarios'
        unique_together = ('tablero', 'usuario')
        verbose_name = 'Usuario de Tablero'
        verbose_name_plural = 'Usuarios de Tableros'

    def __str__(self):
        return f"{self.usuario} - {self.tablero} ({self.rol_en_tablero})"



class Ticket(models.Model):
    titulo = models.CharField(max_length=300, verbose_name="Título")
    descripcion = models.TextField(blank=True, default='', verbose_name="Descripción")
    estado = models.CharField(max_length=100, default='Solicitud', verbose_name="Estado")
    prioridad = models.CharField(max_length=50, default='Media', verbose_name="Prioridad")
    area = models.CharField(max_length=100, blank=True, default='', verbose_name="Área")
    responsable = models.CharField(max_length=500, blank=True, default='', verbose_name="Responsable")
    solicitante = models.CharField(max_length=200, blank=True, default='', verbose_name="Solicitante")
    seccion_solicitante = models.CharField(max_length=200, blank=True, default='', verbose_name="Sección del Solicitante")
    email_solicitante = models.CharField(max_length=200, blank=True, default='', verbose_name="Correo del Solicitante")
    tablero = models.ForeignKey(Tablero, on_delete=models.CASCADE, related_name='tickets', verbose_name="Tablero")
    checklist = models.JSONField(default=list, verbose_name="Lista de Tareas (Checklist)")
    fecha_creacion = models.DateTimeField(default=timezone.now, verbose_name="Fecha de Creación")
    posicion = models.IntegerField(default=0, verbose_name="Posición")

    class Meta:
        db_table = 'tickets'
        ordering = ['posicion', '-fecha_creacion']
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'

    def __str__(self):
        return self.titulo



class Comentario(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comentarios', verbose_name="Ticket")
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, verbose_name="Usuario")
    texto = models.TextField(verbose_name="Comentario")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comentarios'
        ordering = ['created_at']
        verbose_name = 'Comentario'
        verbose_name_plural = 'Comentarios'

    def __str__(self):
        return f"Comentario de {self.usuario} en {self.ticket}"


class Notificacion(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, verbose_name="Usuario")
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, verbose_name="Ticket")
    mensaje = models.CharField(max_length=500, verbose_name="Mensaje")
    leida = models.BooleanField(default=False, verbose_name="Leída")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        db_table = 'notificaciones'
        ordering = ['-created_at']
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'

    def __str__(self):
        return self.mensaje


class WallpaperGroup(models.Model):
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Grupo")
    icono = models.CharField(max_length=50, blank=True, default='', verbose_name="Ícono")
    orden = models.IntegerField(default=0, verbose_name="Orden")

    class Meta:
        db_table = 'wallpaper_groups'
        ordering = ['orden', 'nombre']
        verbose_name = 'Grupo de Wallpapers'
        verbose_name_plural = 'Grupos de Wallpapers'

    def __str__(self):
        return self.nombre


class Wallpaper(models.Model):
    nombre = models.CharField(max_length=150, unique=True, verbose_name="Nombre del Wallpaper")
    group = models.ForeignKey(WallpaperGroup, on_delete=models.CASCADE, related_name='wallpapers', verbose_name='Grupo')
    imagen = models.FileField(upload_to='wallpapers/', verbose_name="Imagen")
    thumb = models.FileField(upload_to='wallpapers/thumbs/', blank=True, default='', verbose_name="Miniatura (Thumb)")
    activo = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        db_table = 'wallpapers'
        ordering = ['group__orden', 'nombre']
        verbose_name = 'Wallpaper'
        verbose_name_plural = 'Wallpapers'

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
