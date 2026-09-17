from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from core.models import (
    SiteSetting, Usuario, Tablero, TableroUsuario, Ticket,
    Comentario, Notificacion, WallpaperGroup, Wallpaper
)
from core.permissions import get_permisos_usuario, check_permiso
from .serializers import (
    UsuarioSerializer, TableroSerializer, TableroUsuarioSerializer,
    TicketSerializer, ComentarioSerializer, NotificacionSerializer,
    SiteSettingSerializer, WallpaperGroupSerializer, WallpaperSerializer,
    WallpaperThumbSerializer
)
import os
from django.conf import settings


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['email', 'username']
    ordering_fields = ['nombre', 'email', 'id']


class TableroViewSet(viewsets.ModelViewSet):
    queryset = Tablero.objects.all()
    serializer_class = TableroSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['creador', 'tipo']
    ordering_fields = ['created_at', 'nombre']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Tablero.objects.none()

        from django.db.models import Q
        tablero_ids = TableroUsuario.objects.filter(usuario=user).values_list('tablero_id', flat=True)
        return Tablero.objects.filter(Q(creador=user) | Q(id__in=tablero_ids)).distinct()

    def perform_create(self, serializer):
        tablero = serializer.save(creador=self.request.user)
        TableroUsuario.objects.get_or_create(
            tablero=tablero,
            usuario=self.request.user,
            defaults={'rol_en_tablero': 'Administrador'}
        )
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            instance.delete()
            return Response(
                {"detail": "Tablero eliminado correctamente."},
                status=status.HTTP_200_OK  # Devuelve 200 OK con JSON
            )
        except Tablero.DoesNotExist:
            return Response(
                {"detail": "No Tablero matches the given query."},
                status=status.HTTP_404_NOT_FOUND
            )

class TableroUsuarioViewSet(viewsets.ModelViewSet):
    queryset = TableroUsuario.objects.all()
    serializer_class = TableroUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['tablero', 'usuario', 'tablero_id', 'usuario_id']
    ordering_fields = ['id']

    def _check_gestionar_usuarios(self, request):
        tablero_id = request.data.get('tablero_id') or request.query_params.get('tablero_id')
        if tablero_id and not check_permiso(request.user, int(tablero_id), 'gestionar_usuarios'):
            return Response({'error': 'No tienes permiso para gestionar usuarios'}, status=403)
        return None

    def create(self, request, *args, **kwargs):
        denied = self._check_gestionar_usuarios(request)
        if denied:
            return denied
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._check_gestionar_usuarios(request)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['tablero', 'tablero_id', 'estado', 'prioridad']
    ordering_fields = ['posicion', 'fecha_creacion', 'id', 'prioridad']

    def get_queryset(self):
        qs = super().get_queryset()
        tablero_id = self.request.query_params.get('tablero_id')
        if tablero_id:
            qs = qs.filter(tablero_id=tablero_id)
        return qs

    def _check_tablero_permiso(self, request, permiso):
        tablero_id = request.data.get('tablero_id') or request.query_params.get('tablero_id')
        if not tablero_id:
            ticket_id = request.data.get('ticket_id') or request.query_params.get('ticket_id')
            if ticket_id:
                try:
                    ticket = Ticket.objects.get(pk=ticket_id)
                    tablero_id = ticket.tablero_id
                except Ticket.DoesNotExist:
                    pass
        if tablero_id and not check_permiso(request.user, int(tablero_id), permiso):
            return Response({'error': f'No tienes permiso de {permiso}'}, status=403)
        return None

    def create(self, request, *args, **kwargs):
        denied = self._check_tablero_permiso(request, 'crear_tickets')
        if denied:
            return denied
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        denied = self._check_tablero_permiso(request, 'editar_tickets')
        if denied:
            return denied
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        denied = self._check_tablero_permiso(request, 'editar_tickets')
        if denied:
            return denied
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._check_tablero_permiso(request, 'eliminar_tickets')
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """
        Recibe: { "columnas": { "NombreColumna": [id1, id2, id3], ... } }
        Actualiza estado y posicion de cada ticket de forma atomica.
        """
        from django.db import transaction
        columnas = request.data.get('columnas', {})
        if not columnas or not isinstance(columnas, dict):
            return Response({'error': 'Payload invalido'}, status=400)

        updates = []
        for estado, ticket_ids in columnas.items():
            for idx, ticket_id in enumerate(ticket_ids):
                updates.append((ticket_id, estado, idx))

        if not updates:
            return Response({'status': 'no-op'})

        try:
            with transaction.atomic():
                for ticket_id, estado, posicion in updates:
                    Ticket.objects.filter(pk=ticket_id).update(estado=estado, posicion=posicion)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        return Response({'status': 'ok', 'updated': len(updates)})

class ComentarioViewSet(viewsets.ModelViewSet):
    queryset = Comentario.objects.all()
    serializer_class = ComentarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['ticket', 'ticket_id', 'usuario']
    ordering_fields = ['created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        ticket_id = self.request.query_params.get('ticket_id')
        if ticket_id:
            qs = qs.filter(ticket_id=ticket_id)
        return qs

    def _check_comentario_permiso(self, request):
        ticket_id = request.data.get('ticket_id') or request.query_params.get('ticket_id')
        if not ticket_id:
            comentario_id = request.data.get('comentario_id') or request.query_params.get('comentario_id')
            if comentario_id:
                try:
                    c = Comentario.objects.get(pk=comentario_id)
                    ticket_id = c.ticket_id
                except Comentario.DoesNotExist:
                    pass
        if ticket_id:
            try:
                ticket = Ticket.objects.get(pk=ticket_id)
                if not check_permiso(request.user, ticket.tablero_id, 'gestionar_comentarios'):
                    return Response({'error': 'No tienes permiso para gestionar comentarios'}, status=403)
            except Ticket.DoesNotExist:
                pass
        return None

    def create(self, request, *args, **kwargs):
        denied = self._check_comentario_permiso(request)
        if denied:
            return denied
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    def destroy(self, request, *args, **kwargs):
        denied = self._check_comentario_permiso(request)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)


class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['usuario', 'usuario_id', 'leida', 'ticket', 'ticket_id']
    ordering_fields = ['created_at']

    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user, leida=False)


class WallpaperGroupViewSet(viewsets.ModelViewSet):
    queryset = WallpaperGroup.objects.all()
    serializer_class = WallpaperGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering_fields = ['orden', 'nombre']


class WallpaperViewSet(viewsets.ModelViewSet):
    queryset = Wallpaper.objects.all()
    serializer_class = WallpaperSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['group', 'activo']
    ordering_fields = ['nombre', 'created_at']


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    from django.contrib.auth import authenticate, login
    from django.db import models
    email_or_username = request.data.get('email', '').strip()
    password = request.data.get('password', '')

    user = authenticate(request, username=email_or_username, password=password)

    if user is None and email_or_username:
        # Search by email or username case-insensitively
        user_obj = Usuario.objects.filter(
            models.Q(email__iexact=email_or_username) | models.Q(username__iexact=email_or_username)
        ).first()

        if user_obj:
            user = authenticate(request, username=user_obj.username, password=password)

            # Legacy plain-text password fallback if check_password fails
            if user is None and user_obj.password == password:
                user_obj.set_password(password)
                user_obj.save()
                user = authenticate(request, username=user_obj.username, password=password)

    if user is not None:
        login(request, user)
        return Response(UsuarioSerializer(user).data)

    return Response({'error': 'Credenciales inválidas'}, status=400)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    data = request.data
    email = data.get('email', '').strip()
    password = data.get('password', '')
    nombre = data.get('nombre', '')
    dependencia = data.get('dependencia', '')
    piso = data.get('piso', '')

    if not email or not password:
        return Response({'error': 'El correo y la contraseña son requeridos'}, status=400)

    try:
        user = Usuario.objects.create_user(
            username=email,
            email=email,
            password=password,
            nombre=nombre,
            dependencia=dependencia,
            piso=piso,
            rol='Usuario',
            debe_cambiar_password=True,
        )
        return Response(UsuarioSerializer(user).data, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def logout_view(request):
    from django.contrib.auth import logout
    logout(request)
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def me_view(request):
    if request.user and request.user.is_authenticated:
        return Response(UsuarioSerializer(request.user).data)
    return Response({'authenticated': False}, status=200)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password_view(request):
    from django.contrib.auth import update_session_auth_hash
    user = request.user
    new_password = request.data.get('new_password', '')
    if not new_password or len(new_password) < 6:
        return Response({'error': 'La contraseña debe tener al menos 6 caracteres'}, status=400)
    user.set_password(new_password)
    user.debe_cambiar_password = False
    user.save()
    if hasattr(user, 'cambio_password_status'):
        user.cambio_password_status.debe_cambiar = False
        user.cambio_password_status.save()
    update_session_auth_hash(request, user)
    return Response({'status': 'ok'})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reset_password_view(request):
    email = request.data.get('email', '').strip()
    new_password = request.data.get('new_password', '')
    if not email:
        return Response({'error': 'Se requiere un correo electrónico'}, status=400)
    try:
        user = Usuario.objects.get(email__iexact=email)
        if not new_password:
            new_password = 'Temp1234!'
        user.set_password(new_password)
        user.debe_cambiar_password = True
        user.save()
        return Response({'status': 'ok', 'message': f'Contraseña restablecida para {email}'})
    except Usuario.DoesNotExist:
        return Response({'status': 'ok', 'message': 'Si el correo existe, se procesó la solicitud'})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def create_user_admin_view(request):
    data = request.data
    email = data.get('email', '').strip()
    password = data.get('password', 'Cti1234')
    nombre = data.get('nombre', '')
    dependencia = data.get('dependencia', '')
    piso = data.get('piso', '')
    rol = data.get('rol', 'Usuario')

    if not email:
        return Response({'error': 'El correo electrónico es requerido'}, status=400)

    is_admin = rol.lower() in ['administrador', 'admin', 'jefe']

    try:
        user = Usuario.objects.create_user(
            username=email,
            email=email,
            password=password,
            nombre=nombre,
            dependencia=dependencia,
            piso=piso,
            rol=rol,
            is_staff=is_admin,
            is_superuser=is_admin,
            debe_cambiar_password=True,
        )
        return Response(UsuarioSerializer(user).data, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_file(request, bucket, path):
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file provided'}, status=400)

    config = SiteSetting.load()

    ext = os.path.splitext(file.name)[1].lower().lstrip('.')
    if ext not in config.allowed_file_types:
        return Response({
            'error': f'Tipo de archivo no permitido: .{ext}',
            'allowed': config.allowed_file_types
        }, status=400)

    max_bytes = config.max_file_size_mb * 1024 * 1024
    if file.size > max_bytes:
        return Response({
            'error': f'El archivo excede el límite de {config.max_file_size_mb}MB'
        }, status=400)

    upload_dir = os.path.join(settings.MEDIA_ROOT, bucket)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, path)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, 'wb+') as dest:
        for chunk in file.chunks():
            dest.write(chunk)

    return Response({'path': f'{bucket}/{path}', 'url': f'/media/{bucket}/{path}'})

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def serve_media(request, bucket, path):
    import mimetypes
    from django.http import FileResponse
    file_path = os.path.join(settings.MEDIA_ROOT, bucket, path)
    if not os.path.exists(file_path):
        return Response({'error': 'File not found'}, status=404)
    content_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
    return FileResponse(open(file_path, 'rb'), content_type=content_type)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def ticket_view(request, id):
    try:
        ticket = Ticket.objects.get(id=id)
        return Response(TicketSerializer(ticket).data)
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=404)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def lastticket_view(request):
    ticket = Ticket.objects.all().order_by('-fecha_creacion').first()
    if not ticket:
        return Response([])
    return Response([TicketSerializer(ticket).data])

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def tablero_usuarios_get_by_id_view(request, id):
    from django.db.models import Q
    tablero_usuarios = TableroUsuario.objects.filter(Q(usuario_id=id) | Q(tablero_id=id))
    return Response(TableroUsuarioSerializer(tablero_usuarios, many=True).data)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def create_board_view(request):
    creador = request.user if (request.user and request.user.is_authenticated) else Usuario.objects.get(id=request.data.get('creador_id', ''))
    tablero = Tablero.objects.create(
        nombre=request.data.get('nombre', ''),
        creador=creador,
        tipo=request.data.get('tipo', 'Trabajo'),
        columnas=request.data.get('columnas', []),
    )
    if creador:
        TableroUsuario.objects.get_or_create(
            tablero=tablero,
            usuario=creador,
            defaults={'rol_en_tablero': 'Administrador'}
        )
    return Response(TableroSerializer(tablero).data, status=201)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def rename_column_view(request):
    tablero_id = request.data.get('tablero_id')
    old_name = request.data.get('old_name')
    new_name = request.data.get('new_name')
    if not all([tablero_id, old_name, new_name]):
        return Response({'error': 'tablero_id, old_name y new_name son requeridos'}, status=400)
    updated = Ticket.objects.filter(tablero_id=tablero_id, estado=old_name).update(estado=new_name)
    return Response({'updated': updated})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def move_orphan_tickets_view(request):
    tablero_id = request.data.get('tablero_id')
    ticket_ids = request.data.get('ticket_ids', [])
    new_estado = request.data.get('new_estado')
    if not all([tablero_id, new_estado]):
        return Response({'error': 'tablero_id y new_estado son requeridos'}, status=400)
    updated = Ticket.objects.filter(tablero_id=tablero_id, id__in=ticket_ids).update(estado=new_estado)
    return Response({'updated': updated})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def remove_member_view(request):
    tablero_id = request.data.get('tablero_id')
    usuario_id = request.data.get('usuario_id')
    if not all([tablero_id, usuario_id]):
        return Response({'error': 'tablero_id y usuario_id son requeridos'}, status=400)
    deleted, _ = TableroUsuario.objects.filter(tablero_id=tablero_id, usuario_id=usuario_id).delete()
    return Response({'deleted': deleted})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_member_role_view(request):
    tablero_id = request.data.get('tablero_id')
    usuario_id = request.data.get('usuario_id')
    rol = request.data.get('rol')
    if not all([tablero_id, usuario_id, rol]):
        return Response({'error': 'tablero_id, usuario_id y rol son requeridos'}, status=400)
    obj, _ = TableroUsuario.objects.update_or_create(
        tablero_id=tablero_id, usuario_id=usuario_id,
        defaults={'rol_en_tablero': rol}
    )
    return Response({'updated': 1})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_member_permisos_view(request):
    tablero_id = request.data.get('tablero_id')
    usuario_id = request.data.get('usuario_id')
    permisos = request.data.get('permisos')
    if not all([tablero_id, usuario_id]):
        return Response({'error': 'tablero_id y usuario_id son requeridos'}, status=400)
    obj, _ = TableroUsuario.objects.update_or_create(
        tablero_id=tablero_id, usuario_id=usuario_id,
        defaults={'permisos': permisos}
    )
    return Response({'updated': 1})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_ticket_notifications_read_view(request):
    ticket_id = request.data.get('ticket_id')
    if not ticket_id:
        return Response({'error': 'ticket_id es requerido'}, status=400)
    updated = Notificacion.objects.filter(
        usuario=request.user, ticket_id=ticket_id, leida=False
    ).update(leida=True)
    return Response({'updated': updated})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def site_setting_view(request):
    config = SiteSetting.load()
    return Response(SiteSettingSerializer(config).data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def wallpapers_grouped_view(request):
    groups = WallpaperGroup.objects.prefetch_related('wallpapers').all()
    result = []
    for group in groups:
        wallpapers = group.wallpapers.filter(activo=True)
        if wallpapers.exists():
            result.append({
                'id': group.id,
                'nombre': group.nombre,
                'icono': group.icono,
                'wallpapers': WallpaperThumbSerializer(wallpapers, many=True).data
            })
    return Response(result)
