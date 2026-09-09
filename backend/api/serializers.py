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

    class Meta:
        model = Tablero
        fields = '__all__'


class TableroUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TableroUsuario
        fields = '__all__'


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = '__all__'


class ComentarioSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True, default='')

    class Meta:
        model = Comentario
        fields = '__all__'


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'
