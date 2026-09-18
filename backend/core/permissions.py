"""
====================================================================
DOCUMENTACIÓN COMPLETA DE PERMISOS (BACKEND Y FRONTEND)
====================================================================

PERMISOS DEL SERVIDOR (BACKEND):
--------------------------------
1. 'crear_tickets':
   - Backend: Valida si el usuario puede crear tickets vía POST /api/tickets/.
   - Frontend: Muestra u oculta los botones "Nuevo Ticket" y el formulario de creación.

2. 'editar_tickets':
   - Backend: Valida si el usuario puede editar la información de un ticket vía PUT/PATCH /api/tickets/{id}/
     o reordenar la posición/estado de tickets vía POST /api/tickets/reorder/.
   - Frontend: Habilita la edición de campos en el modal de detalle del ticket.

3. 'eliminar_tickets':
   - Backend: Valida si el usuario puede borrar un ticket vía DELETE /api/tickets/{id}/.
   - Frontend: Muestra u oculta el botón "Eliminar Ticket" en el modal de detalle.

4. 'gestionar_comentarios':
   - Backend: Valida si el usuario puede añadir o eliminar comentarios vía POST/DELETE /api/comentarios/.
   - Frontend: Habilita el input y botón para comentar en un ticket.

5. 'gestionar_usuarios':
   - Backend: Valida si el usuario puede añadir/remover miembros o modificar sus roles/permisos
     en los endpoints:
     - POST /api/tableros/remove_member/
     - POST /api/tableros/update_member_role/
     - POST /api/tableros/update_member_permisos/
   - Frontend: Muestra el panel "Añadir Miembro" y las acciones de rol/permisos/eliminación en el modal.

PERMISOS DE LA INTERFAZ DE USUARIO (FRONTEND):
----------------------------------------------
6. 'ver_estadisticas':
   - Frontend: Habilita el acceso y despliegue del panel visual de Estadísticas e indicadores Kanban.

7. 'mover_tarjetas':
   - Frontend: Habilita el arrastre de tarjetas entre columnas (Drag & Drop) en el tablero Kanban.
"""

from .models import TableroUsuario, Usuario, Tablero


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


def is_global_admin(user):
    """
    Retorna True si el usuario es Administrador global del sistema (is_superuser o rol global Administrador).
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return user.roles.filter(nombre__iexact='Administrador').exists()


def get_permisos_usuario(user, tablero_id):
    """
    Calcula los permisos efectivos de un usuario para un tablero específico.
    Jerarquía:
    1. Administrador Global del Sistema -> Todos los permisos (PERMISOS_ADMIN)
    2. Creador del Tablero -> Todos los permisos (PERMISOS_ADMIN)
    3. Administrador del Tablero -> Todos los permisos (PERMISOS_ADMIN)
    4. Miembro con permisos explícitos en TableroUsuario -> Permisos guardados en JSON
    5. Permisos heredados del Rol del Usuario en DB (si los tiene definidos)
    6. Permisos por defecto de Miembro (PERMISOS_MIEMBRO_DEFAULT)
    """
    if not user or not user.is_authenticated:
        return PERMISOS_MIEMBRO_DEFAULT

    if is_global_admin(user):
        return PERMISOS_ADMIN

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

    # Permisos específicos del usuario en este tablero
    if membership.permisos and isinstance(membership.permisos, dict):
        return {**PERMISOS_MIEMBRO_DEFAULT, **membership.permisos}

    # Permisos heredados de los roles asignados al usuario en la base de datos
    role_perms = {}
    for rol in user.roles.all():
        if isinstance(rol.permisos, dict) and rol.permisos:
            role_perms.update(rol.permisos)

    if role_perms:
        return {**PERMISOS_MIEMBRO_DEFAULT, **role_perms}

    return PERMISOS_MIEMBRO_DEFAULT


def check_permiso(user, tablero_id, permiso):
    """
    Verifica si un usuario posee un permiso específico en un tablero.
    """
    permisos = get_permisos_usuario(user, tablero_id)
    return permisos.get(permiso, False)


def is_tablero_admin(user, tablero_id):
    """
    Retorna True si el usuario es Administrador del tablero (creador del tablero,
    miembro con rol 'Administrador' en TableroUsuario, o Administrador global del sistema).
    """
    if not user or not user.is_authenticated:
        return False
    if is_global_admin(user):
        return True
    try:
        tablero = Tablero.objects.get(pk=tablero_id)
    except Tablero.DoesNotExist:
        return False

    if tablero.creador_id == user.id:
        return True

    try:
        membership = TableroUsuario.objects.get(tablero_id=tablero_id, usuario=user)
        return membership.rol_en_tablero == 'Administrador'
    except TableroUsuario.DoesNotExist:
        return False

