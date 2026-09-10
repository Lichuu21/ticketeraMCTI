from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from django.contrib import admin
from . import views

router = DefaultRouter()
router.register(r'usuarios', views.UsuarioViewSet)
router.register(r'tableros', views.TableroViewSet)
router.register(r'tablero-usuarios', views.TableroUsuarioViewSet)
router.register(r'tickets', views.TicketViewSet)
router.register(r'comentarios', views.ComentarioViewSet)
router.register(r'notificaciones', views.NotificacionViewSet)

# === RUTAS PURAS DE LA API (/api/) ===
api_user_patterns = [
    path('health/', views.health_check, name='health'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/register/', views.register_view, name='register'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/me/', views.me_view, name='me'),
    path('auth/change-password/', views.change_password_view, name='change-password'),
    path('auth/reset-password/', views.reset_password_view, name='reset-password'),
    path('auth/create-user/', views.create_user_admin_view, name='create-user-admin'),
    path('media/upload/<str:bucket>/<path:path>', views.upload_file, name='upload-file'),
    path('media/<str:bucket>/<path:path>', views.serve_media, name='serve-media'),
    path('ticket/lastticket', views.lastticket_view, name='lastTicket'),
    path('ticket/lastticket/', views.lastticket_view, name='lastTicket_slash'),
    path('ticket/<int:id>', views.ticket_view, name='ticket'),
    path('ticket/<int:id>/', views.ticket_view, name='ticket_slash'),
    path('tablero-usuarios/get-by-id/<int:id>', views.tablero_usuarios_get_by_id_view, name='tablero_usuarios_get_by_id'),
    path('tablero-usuarios/get-by-id/<int:id>/', views.tablero_usuarios_get_by_id_view, name='tablero_usuarios_get_by_id_slash'),
    path('tablero-usuarios/create-board', views.create_board_view, name='create-board'),
    
]

# === RUTAS ADMINISTRATIVAS (/api/admin/) ===
api_admin_patterns = [
    re_path(r'admin/', admin.site.urls ),
]

urlpatterns = [
    path('', include(router.urls)),
    *api_user_patterns,
    *api_admin_patterns,
]
    