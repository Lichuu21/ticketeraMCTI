from rest_framework import serializers
from core.models import Usuario, Tablero, TableroUsuario, Ticket, Comentario, Notificacion, CambioPassword


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'nombre', 'dependencia', 'piso', 'rol', 'debe_cambiar_password']


class CambioPasswordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CambioPassword
        fields = '__all__'


class TableroSerializer(serializers.ModelSerializer):
    creador_nombre = serializers.CharField(source='creador.nombre', read_only=True, default='')
    creador_id = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        source='creador',
        write_only=True,
        required=False
    )

    class Meta:
        model = Tablero
        fields = ['id', 'nombre', 'descripcion', 'creador', 'creador_id', 'creador_nombre', 'tipo', 'columnas', 'created_at']
        read_only_fields = ['creador']

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
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True, default='')
    usuario_email = serializers.CharField(source='usuario.email', read_only=True, default='')

    class Meta:
        model = TableroUsuario
        fields = ['id', 'tablero', 'tablero_id', 'usuario', 'usuario_id', 'usuario_nombre', 'usuario_email', 'rol_en_tablero', 'permisos']
        read_only_fields = ['tablero', 'usuario']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['tablero_id'] = instance.tablero_id
        data['usuario_id'] = instance.usuario_id
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
                  'tablero_nombre', 'checklist', 'fecha_creacion']
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
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True, default='')

    class Meta:
        model = Comentario
        fields = ['id', 'ticket', 'ticket_id', 'usuario', 'usuario_id', 'usuario_nombre', 'texto', 'created_at']
        read_only_fields = ['ticket', 'usuario']

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
