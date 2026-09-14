from django.contrib import admin
from .models import (
    SiteSetting, Usuario, Tablero, TableroUsuario, Ticket,
    Comentario, Notificacion, WallpaperGroup, Wallpaper
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


@admin.register(WallpaperGroup)
class WallpaperGroupAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'icono', 'orden']
    ordering = ['orden', 'nombre']


@admin.register(Wallpaper)
class WallpaperAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'group', 'activo', 'created_at']
    list_filter = ['group', 'activo']
    search_fields = ['nombre']


admin.site.register(Usuario)
admin.site.register(Tablero)
admin.site.register(TableroUsuario)
admin.site.register(Ticket)
admin.site.register(Comentario)
admin.site.register(Notificacion)
