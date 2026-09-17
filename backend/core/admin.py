from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    SiteSetting, Usuario, Tablero, TableroUsuario, Ticket,
    Comentario, Notificacion, WallpaperGroup, Wallpaper, Rol, Group
)

@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not SiteSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        obj.pk = 1
        super().save_model(request, obj, form, change)

@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ['nombre']
    search_fields = ['nombre']

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ['nombre']
    search_fields = ['nombre']

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    list_display = ['email', 'nombre', 'apellido', 'is_active', 'is_superuser', 'date_joined']
    list_filter = ['is_active', 'is_superuser', 'roles', 'groups']
    search_fields = ['email', 'nombre', 'apellido', 'username']
    ordering = ['email']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Información Personal', {'fields': ('nombre', 'apellido', 'username', 'dependencia')}),
        ('Permisos', {'fields': ('is_active', 'is_superuser', 'roles', 'groups')}),
        ('Contraseña', {'fields': ('debe_cambiar_password',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nombre', 'apellido', 'password1', 'password2', 'is_active', 'is_superuser', 'roles', 'groups'),
        }),
    )

@admin.register(Tablero)
class TableroAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'creador', 'tipo', 'created_at']
    list_filter = ['tipo']
    search_fields = ['nombre']

@admin.register(TableroUsuario)
class TableroUsuarioAdmin(admin.ModelAdmin):
    list_display = ['tablero', 'usuario', 'rol_en_tablero']
    list_filter = ['rol_en_tablero']

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'tablero', 'estado', 'prioridad', 'fecha_creacion']
    list_filter = ['estado', 'prioridad', 'tablero']
    search_fields = ['titulo']

@admin.register(Comentario)
class ComentarioAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'usuario', 'created_at']
    list_filter = ['created_at']

@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'ticket', 'mensaje', 'leida', 'created_at']
    list_filter = ['leida']

@admin.register(WallpaperGroup)
class WallpaperGroupAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'icono', 'orden']
    ordering = ['orden', 'nombre']

@admin.register(Wallpaper)
class WallpaperAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'group', 'activo', 'created_at']
    list_filter = ['group', 'activo']
    search_fields = ['nombre']
