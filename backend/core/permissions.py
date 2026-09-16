from .models import TableroUsuario, Usuario


PERMISOS_KEYS = [
    'ver_tablero', 'crear_tickets', 'editar_tickets', 'mover_tarjetas',
    'eliminar_tickets', 'gestionar_comentarios', 'ver_estadisticas',
    'gestionar_usuarios'
]

PERMISOS_ADMIN = {k: True for k in PERMISOS_KEYS}

PERMISOS_MIEMBRO_DEFAULT = {
    'ver_tablero': True,
    'crear_tickets': True,
    'editar_tickets': True,
    'mover_tarjetas': True,
    'eliminar_tickets': False,
    'gestionar_comentarios': True,
    'ver_estadisticas': False,
    'gestionar_usuarios': False,
}


def get_permisos_usuario(user, tablero_id):
    if not user or not user.is_authenticated:
        return PERMISOS_MIEMBRO_DEFAULT

    if user.is_superuser or user.is_staff:
        return PERMISOS_ADMIN

    from .models import Tablero
    try:
        tablero = Tablero.objects.get(pk=tablero_id)
    except Tablero.DoesNotExist:
        return PERMISOS_MIEMBRO_DEFAULT

    if tablero.creador_id == user.id:
        return PERMISOS_ADMIN

    try:
        membership = TableroUsuario.objects.get(tablero_id=tablero_id, usuario=user)
    except TableroUsuario.DoesNotExist:
        return PERMISOS_MIEMBRO_DEFAULT

    if membership.rol_en_tablero == 'Administrador':
        return PERMISOS_ADMIN

    if membership.permisos and isinstance(membership.permisos, dict):
        return {**PERMISOS_MIEMBRO_DEFAULT, **membership.permisos}

    return PERMISOS_MIEMBRO_DEFAULT


def check_permiso(user, tablero_id, permiso):
    permisos = get_permisos_usuario(user, tablero_id)
    return permisos.get(permiso, False)
