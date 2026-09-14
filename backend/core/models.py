from django.contrib.auth.models import AbstractUser
from django.db import models


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
