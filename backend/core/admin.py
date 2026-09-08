from django.contrib import admin
from .models import (
    Usuario, Tablero, TableroUsuario, Ticket, Comentario, Notificacion
)

admin.site.register(Usuario)
admin.site.register(Tablero)
admin.site.register(TableroUsuario)
admin.site.register(Ticket)
admin.site.register(Comentario)
admin.site.register(Notificacion)
