from rest_framework import serializers
from core.models import (
    SiteSetting, Usuario, Tablero, TableroUsuario, Ticket,
    Comentario, Notificacion, WallpaperGroup, Wallpaper, Rol, Group
)


class SiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = '__all__'


class WallpaperGroupSerializer(serializers.ModelSerializer):
    wallpapers = serializers.SerializerMethodField()

    class Meta:
        model = WallpaperGroup
        fields = ['id', 'nombre', 'icono', 'orden', 'wallpapers']

    def get_wallpapers(self, obj):
        wallpapers = obj.wallpapers.filter(activo=True)
        return WallpaperThumbSerializer(wallpapers, many=True).data


class WallpaperThumbSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()
    thumb_url = serializers.SerializerMethodField()

    class Meta:
        model = Wallpaper
        fields = ['id', 'nombre', 'imagen_url', 'thumb_url']

    def get_imagen_url(self, obj):
        if obj.imagen:
            url = str(obj.imagen.name)
            return url if url.startswith(('http://', 'https://')) else f'/media/{url}'
        return ''

    def get_thumb_url(self, obj):
        if obj.thumb:
            url = str(obj.thumb.name)
            return url if url.startswith(('http://', 'https://')) else f'/media/{url}'
        if obj.imagen:
            url = str(obj.imagen.name)
            return url if url.startswith(('http://', 'https://')) else f'/media/{url}'
        return ''


class WallpaperSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()
    thumb_url = serializers.SerializerMethodField()
    group_nombre = serializers.CharField(source='group.nombre', read_only=True)

    class Meta:
        model = Wallpaper
        fields = ['id', 'nombre', 'group', 'group_nombre', 'imagen', 'imagen_url', 'thumb', 'thumb_url', 'activo', 'created_at']

    def get_imagen_url(self, obj):
        if obj.imagen:
            url = str(obj.imagen.name)
            return url if url.startswith(('http://', 'https://')) else f'/media/{url}'
        return ''

    def get_thumb_url(self, obj):
        if obj.thumb:
            url = str(obj.thumb.name)
            return url if url.startswith(('http://', 'https://')) else f'/media/{url}'
        if obj.imagen:
            url = str(obj.imagen.name)
            return url if url.startswith(('http://', 'https://')) else f'/media/{url}'
        return ''


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id', 'nombre', 'tableros']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['tableros'] = list(instance.tableros.values_list('id', flat=True))
        return data


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'nombre']


class UsuarioSerializer(serializers.ModelSerializer):
    roles_detalle = RolSerializer(source='roles', many=True, read_only=True)
    groups_detalle = GroupSerializer(source='groups', many=True, read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nombre', 'apellido', 'dependencia',
            'debe_cambiar_password', 'is_active', 'is_superuser',
            'roles', 'roles_detalle', 'groups', 'groups_detalle',
            'last_login', 'date_joined',
        ]
        read_only_fields = ['last_login', 'date_joined']
        extra_kwargs = {
            'roles': {'required': False},
            'groups': {'required': False},
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['is_staff'] = True
        data['roles'] = list(instance.roles.values_list('id', flat=True))
        data['groups'] = list(instance.groups.values_list('id', flat=True))
        return data

    def create(self, validated_data):
        roles_data = validated_data.pop('roles', [])
        groups_data = validated_data.pop('groups', [])
        password = validated_data.pop('password', None)
        user = Usuario(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_password('Cti1234')
        user.save()
        user.roles.set(roles_data)
        user.groups.set(groups_data)
        return user


class TableroSerializer(serializers.ModelSerializer):
    creador_nombre = serializers.CharField(source='creador.nombre', read_only=True, default='')
    creador_id = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        source='creador',
        write_only=True,
        required=False
    )
    rol_en_tablero = serializers.SerializerMethodField()

    class Meta:
        model = Tablero
        fields = ['id', 'nombre', 'descripcion', 'creador', 'creador_id', 'creador_nombre', 'tipo', 'columnas', 'wallpaper_path', 'created_at', 'rol_en_tablero']
        read_only_fields = ['creador']

    def get_rol_en_tablero(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 'Miembro'
        from core.permissions import is_tablero_admin
        if is_tablero_admin(request.user, obj.id):
            return 'Administrador'
        return 'Miembro'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['creador_id'] = instance.creador_id
        return data

    def create(self, validated_data):
        if 'creador' not in validated_data and 'creador_id' in self.initial_data:
            try:
                usuario = Usuario.objects.get(pk=self.initial_data['creador_id'])
                validated_data['creador'] = usuario
            except Usuario.DoesNotExist:
                raise serializers.ValidationError({'creador_id': 'Usuario no encontrado'})
        return super().create(validated_data)



class TableroUsuarioSerializer(serializers.ModelSerializer):
    tablero_id = serializers.PrimaryKeyRelatedField(
        queryset=Tablero.objects.all(),
        source='tablero',
        write_only=True,
        required=False
    )
    usuario_id = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        source='usuario',
        write_only=True,
        required=False
    )
    usuario_nombre = serializers.SerializerMethodField()
    usuario_email = serializers.CharField(source='usuario.email', read_only=True, default='')

    class Meta:
        model = TableroUsuario
        fields = ['id', 'tablero', 'tablero_id', 'usuario', 'usuario_id', 'usuario_nombre', 'usuario_email', 'rol_en_tablero', 'permisos']
        read_only_fields = ['tablero', 'usuario']

    def get_usuario_nombre(self, obj):
        return f'{obj.usuario.nombre} {obj.usuario.apellido}'.strip()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['tablero_id'] = instance.tablero_id
        data['usuario_id'] = instance.usuario_id
        if 'permisos' in data:
            data['permisos_tablero'] = data.pop('permisos')
        return data


class TicketSerializer(serializers.ModelSerializer):
    tablero_id = serializers.PrimaryKeyRelatedField(
        queryset=Tablero.objects.all(),
        source='tablero',
        write_only=True,
        required=False
    )
    tablero_nombre = serializers.CharField(source='tablero.nombre', read_only=True, default='')

    class Meta:
        model = Ticket
        fields = ['id', 'titulo', 'descripcion', 'estado', 'prioridad', 'area', 'responsable',
                  'solicitante', 'seccion_solicitante', 'email_solicitante', 'tablero', 'tablero_id',
                  'tablero_nombre', 'checklist', 'fecha_creacion', 'posicion']
        read_only_fields = ['tablero']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['tablero_id'] = instance.tablero_id
        return data

    def create(self, validated_data):
        if 'tablero' not in validated_data and 'tablero_id' in self.initial_data:
            try:
                tablero = Tablero.objects.get(pk=self.initial_data['tablero_id'])
                validated_data['tablero'] = tablero
            except Tablero.DoesNotExist:
                raise serializers.ValidationError({'tablero_id': 'Tablero no encontrado'})
        return super().create(validated_data)


class ComentarioSerializer(serializers.ModelSerializer):
    ticket_id = serializers.PrimaryKeyRelatedField(
        queryset=Ticket.objects.all(),
        source='ticket',
        write_only=True,
        required=False
    )
    usuario_id = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        source='usuario',
        write_only=True,
        required=False,
        allow_null=True
    )
    usuario_nombre = serializers.SerializerMethodField()
    texto = serializers.CharField(required=False, allow_blank=True, default='')
    archivo_url = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    archivo_nombre = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    archivo_tipo = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')

    class Meta:
        model = Comentario
        fields = ['id', 'ticket', 'ticket_id', 'usuario', 'usuario_id', 'usuario_nombre', 'texto', 'archivo_url', 'archivo_nombre', 'archivo_tipo', 'created_at']
        read_only_fields = ['ticket', 'usuario']

    def validate(self, attrs):
        texto = attrs.get('texto', '')
        if isinstance(texto, str):
            texto = texto.strip()
        archivo_url = attrs.get('archivo_url', '')
        if isinstance(archivo_url, str):
            archivo_url = archivo_url.strip()
        elif archivo_url is None:
            attrs['archivo_url'] = ''
            archivo_url = ''

        if attrs.get('archivo_nombre') is None:
            attrs['archivo_nombre'] = ''
        if attrs.get('archivo_tipo') is None:
            attrs['archivo_tipo'] = ''

        if not texto and not archivo_url:
            raise serializers.ValidationError({'texto': 'Debe ingresar un comentario o adjuntar un archivo.'})
        return attrs

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return f'{obj.usuario.nombre} {obj.usuario.apellido}'.strip()
        return ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['ticket_id'] = instance.ticket_id
        data['usuario_id'] = instance.usuario_id
        return data

    def create(self, validated_data):
        if 'ticket' not in validated_data and 'ticket_id' in self.initial_data:
            try:
                ticket = Ticket.objects.get(pk=self.initial_data['ticket_id'])
                validated_data['ticket'] = ticket
            except Ticket.DoesNotExist:
                raise serializers.ValidationError({'ticket_id': 'Ticket no encontrado'})
        if 'usuario' not in validated_data and 'usuario_id' in self.initial_data:
            try:
                usuario = Usuario.objects.get(pk=self.initial_data['usuario_id'])
                validated_data['usuario'] = usuario
            except Usuario.DoesNotExist:
                raise serializers.ValidationError({'usuario_id': 'Usuario no encontrado'})
        return super().create(validated_data)


class NotificacionSerializer(serializers.ModelSerializer):
    ticket_id = serializers.PrimaryKeyRelatedField(
        queryset=Ticket.objects.all(),
        source='ticket',
        write_only=True,
        required=False
    )
    usuario_id = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        source='usuario',
        write_only=True,
        required=False
    )

    class Meta:
        model = Notificacion
        fields = ['id', 'usuario', 'usuario_id', 'ticket', 'ticket_id', 'mensaje', 'leida', 'created_at']
        read_only_fields = ['usuario', 'ticket']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['ticket_id'] = instance.ticket_id
        data['usuario_id'] = instance.usuario_id
        return data

    def create(self, validated_data):
        if 'ticket' not in validated_data and 'ticket_id' in self.initial_data:
            try:
                ticket = Ticket.objects.get(pk=self.initial_data['ticket_id'])
                validated_data['ticket'] = ticket
            except Ticket.DoesNotExist:
                raise serializers.ValidationError({'ticket_id': 'Ticket no encontrado'})
        if 'usuario' not in validated_data and 'usuario_id' in self.initial_data:
            try:
                usuario = Usuario.objects.get(pk=self.initial_data['usuario_id'])
                validated_data['usuario'] = usuario
            except Usuario.DoesNotExist:
                raise serializers.ValidationError({'usuario_id': 'Usuario no encontrado'})
        return super().create(validated_data)
