from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'usuarios', views.UsuarioViewSet)
router.register(r'tableros', views.TableroViewSet)
router.register(r'tablero-usuarios', views.TableroUsuarioViewSet)
router.register(r'tickets', views.TicketViewSet)
router.register(r'comentarios', views.ComentarioViewSet)
router.register(r'notificaciones', views.NotificacionViewSet)

urlpatterns = [
    path('', include(router.urls)),
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
]
