from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from core.models import Usuario, Tablero, TableroUsuario, Ticket, Comentario, Notificacion
from .serializers import (
    UsuarioSerializer, TableroSerializer, TableroUsuarioSerializer,
    TicketSerializer, ComentarioSerializer, NotificacionSerializer
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
        if user.is_staff:
            return Tablero.objects.all()
        tablero_ids = TableroUsuario.objects.filter(usuario=user).values_list('tablero_id', flat=True)
        return Tablero.objects.filter(id__in=tablero_ids)

    def perform_create(self, serializer):
        serializer.save(creador=self.request.user)


class TableroUsuarioViewSet(viewsets.ModelViewSet):
    queryset = TableroUsuario.objects.all()
    serializer_class = TableroUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['tablero', 'usuario', 'tablero_id', 'usuario_id']
    ordering_fields = ['id']


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['tablero', 'tablero_id', 'estado', 'prioridad']
    ordering_fields = ['fecha_creacion', 'id', 'prioridad']

    def get_queryset(self):
        qs = super().get_queryset()
        tablero_id = self.request.query_params.get('tablero_id')
        if tablero_id:
            qs = qs.filter(tablero_id=tablero_id)
        return qs


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

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['usuario', 'usuario_id', 'leida', 'ticket', 'ticket_id']
    ordering_fields = ['created_at']

    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user, leida=False)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    from django.contrib.auth import authenticate, login
    email = request.data.get('email', '')
    password = request.data.get('password', '')
    user = authenticate(request, username=email, password=password)
    if user is not None:
        print("User authenticated:", user)
        login(request, user)
        return Response(UsuarioSerializer(user).data)
    print("User authentication failed for email:", email, "password:", password)
    return Response({'error': 'Credenciales inválidas'}, status=400)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    from django.contrib.auth.hashers import make_password
    data = request.data
    try:
        user = Usuario.objects.create(
            username=data.get('email', ''),
            email=data.get('email', ''),
            password=make_password(data.get('password', '')),
            nombre=data.get('nombre', ''),
            dependencia=data.get('dependencia', ''),
            piso=data.get('piso', ''),
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
    return Response({'status': 'ok'})



@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reset_password_view(request):
    email = request.data.get('email', '')
    new_password = request.data.get('new_password', '')
    if not email:
        return Response({'error': 'Se requiere un correo electrónico'}, status=400)
    try:
        user = Usuario.objects.get(email=email)
        if not new_password:
            new_password = 'Temp1234!'
        user.set_password(new_password)
        user.save()
        return Response({'status': 'ok', 'message': f'Contraseña restablecida para {email}'})
    except Usuario.DoesNotExist:
        return Response({'status': 'ok', 'message': 'Si el correo existe, se procesó la solicitud'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def create_user_admin_view(request):
    from django.contrib.auth.hashers import make_password
    data = request.data
    try:
        user = Usuario.objects.create(
            username=data.get('email', ''),
            email=data.get('email', ''),
            password=make_password(data.get('password', 'Cti1234')),
            nombre=data.get('nombre', ''),
            dependencia=data.get('dependencia', ''),
            piso=data.get('piso', ''),
            rol=data.get('rol', 'Usuario'),
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
