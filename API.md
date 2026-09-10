# API REST — Ticketera MCTI

> Base URL: `http://localhost:8070/api` (via Vite proxy → Django backend)

## Convención de Nombres de Campos

Los campos FK usan el sufijo `_id` tanto en请求 como en respuesta:
- `creador_id` → FK hacia `Usuario`
- `tablero_id` → FK hacia `Tablero`
- `ticket_id` → FK hacia `Ticket`
- `usuario_id` → FK hacia `Usuario`

Para campos FK, el backend acepta:
- **Escritura**: `creador_id: 1` (solo el ID)
- **Lectura**: `creador: 1` y `creador_id: 1` (ambos por compatibilidad)

Los campos con sufijo `_nombre` o `_email` son de solo lectura y se resuelven automáticamente.

---

## Autenticación

Todas las rutas requieren sesión autenticada excepto las marcadas con `(Público)`.  
La autenticación usa cookies de sesión (`credentials: 'include'`).

---

## Auth

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/auth/login/` | Iniciar sesión | Público |
| `POST` | `/auth/register/` | Registrar usuario | Público |
| `POST` | `/auth/logout/` | Cerrar sesión | Público |
| `GET` | `/auth/me/` | Obtener usuario actual | Público |
| `POST` | `/auth/change-password/` | Cambiar contraseña | Autenticado |
| `POST` | `/auth/reset-password/` | Resetear contraseña | Público |
| `POST` | `/auth/create-user/` | Crear usuario (admin) | Público |

### `POST /auth/login/`

```json
// Request
{ "email": "user@example.com", "password": "xxx" }

// Response 200
{ "id": 1, "username": "...", "email": "...", "nombre": "...", "rol": "...", "debe_cambiar_password": false }

// Response 400
{ "error": "Credenciales inválidas" }
```

### `POST /auth/change-password/`

```json
// Request
{ "new_password": "nueva123" }

// Response 200
{ "status": "ok" }
```

---

## Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/usuarios/` | Listar todos |
| `GET` | `/usuarios/{id}/` | Obtener por ID |
| `POST` | `/usuarios/` | Crear |
| `PATCH` | `/usuarios/{id}/` | Actualizar parcial |
| `DELETE` | `/usuarios/{id}/` | Eliminar |

### Filtros

| Parámetro | Tipo | Ejemplo |
|-----------|------|---------|
| `ordering` | string | `nombre`, `-email`, `id` |
| `email` | string | `user@example.com` |
| `username` | string | `admin` |

### Campos del modelo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | ID único |
| `username` | string | Usuario (igual al email) |
| `email` | string | Correo electrónico |
| `nombre` | string | Nombre completo |
| `dependencia` | string | Dependencia/área |
| `piso` | string | Ubicación |
| `rol` | string | Rol global (`Usuario`, `Admin`) |
| `debe_cambiar_password` | bool | Requiere cambio de contraseña |

---

## Tableros

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/tableros/` | Listar tableros del usuario |
| `GET` | `/tableros/{id}/` | Obtener por ID |
| `POST` | `/tableros/` | Crear tablero |
| `PATCH` | `/tableros/{id}/` | Actualizar parcial |
| `DELETE` | `/tableros/{id}/` | Eliminar |

### Filtros

| Parámetro | Tipo | Ejemplo |
|-----------|------|---------|
| `ordering` | string | `created_at`, `-created_at`, `nombre` |
| `creador` | int | ID del creador |
| `tipo` | string | `Trabajo`, `Personal` |

### Campos del modelo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | ID único |
| `nombre` | string | Nombre del tablero |
| `descripcion` | string | Descripción (JSON encoded) |
| `creador_id` | int | FK → Usuario (escritura) |
| `creador` | int | FK → Usuario (lectura, deprecated) |
| `creador_nombre` | string | Nombre del creador (read-only) |
| `tipo` | string | Tipo de tablero |
| `columnas` | array | Lista de nombres de columnas |
| `created_at` | datetime | Fecha de creación |

### Ejemplo POST

```json
{
  "nombre": "Tablero de Soporte",
  "descripcion": "Gestión de tickets",
  "creador_id": 1,
  "tipo": "Trabajo",
  "columnas": ["Solicitud", "En Progreso", "Resuelto"]
}
```

---

## Tablero Usuarios (Membresías)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/tablero-usuarios/` | Listar membresías |
| `GET` | `/tablero-usuarios/{id}/` | Obtener membresía |
| `POST` | `/tablero-usuarios/` | Agregar miembro |
| `PATCH` | `/tablero-usuarios/{id}/` | Actualizar membresía |
| `DELETE` | `/tablero-usuarios/{id}/` | Eliminar membresía |

### Endpoints custom

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/tablero-usuarios/remove-member/` | Eliminar miembro por tablero+usuario |
| `POST` | `/tablero-usuarios/update-role/` | Actualizar rol por tablero+usuario |
| `POST` | `/tablero-usuarios/update-permisos/` | Actualizar permisos por tablero+usuario |

### Campos del modelo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | ID único |
| `tablero_id` | int | FK → Tablero |
| `usuario_id` | int | FK → Usuario |
| `usuario_nombre` | string | Nombre del usuario (read-only) |
| `usuario_email` | string | Email del usuario (read-only) |
| `rol_en_tablero` | string | Rol en el tablero |
| `permisos` | object | Permisos personalizados |

### Filtros

| Parámetro | Tipo | Ejemplo |
|-----------|------|---------|
| `tablero_id` | int | ID del tablero |
| `usuario_id` | int | ID del usuario |

### Ejemplo POST

```json
{
  "tablero_id": 1,
  "usuario_id": 2,
  "rol_en_tablero": "Administrador",
  "permisos": { "puede_editar": true }
}
```

### `POST /tablero-usuarios/remove-member/`

```json
{ "tablero_id": 1, "usuario_id": 2 }
// Response 200: { "deleted": 1 }
```

### `POST /tablero-usuarios/update-role/`

```json
{ "tablero_id": 1, "usuario_id": 2, "rol": "Administrador" }
// Response 200: { "updated": 1 }
```

### `POST /tablero-usuarios/update-permisos/`

```json
{ "tablero_id": 1, "usuario_id": 2, "permisos": { "puede_editar": true } }
// Response 200: { "updated": 1 }
```

---

## Tickets

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/tickets/` | Listar tickets |
| `GET` | `/tickets/{id}/` | Obtener por ID |
| `POST` | `/tickets/` | Crear ticket |
| `PATCH` | `/tickets/{id}/` | Actualizar parcial |
| `DELETE` | `/tickets/{id}/` | Eliminar |

### Endpoints custom

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/tickets/rename-column/` | Renombrar columna en lote |
| `POST` | `/tickets/move-orphan/` | Mover tickets huérfanos |

### Filtros

| Parámetro | Tipo | Ejemplo |
|-----------|------|---------|
| `tablero_id` | int | ID del tablero |
| `estado` | string | Nombre de la columna |
| `prioridad` | string | `Alta`, `Media`, `Baja` |
| `ordering` | string | `-fecha_creacion`, `id`, `prioridad` |

### Campos del modelo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | ID único |
| `titulo` | string | Título del ticket |
| `descripcion` | string | Descripción detallada |
| `estado` | string | Columna actual |
| `prioridad` | string | Nivel de prioridad |
| `area` | string | Área responsable |
| `responsable` | string | Persona asignada |
| `solicitante` | string | Nombre del solicitante |
| `seccion_solicitante` | string | Sección del solicitante |
| `email_solicitante` | string | Email del solicitante |
| `tablero_id` | int | FK → Tablero (escritura) |
| `tablero` | int | FK → Tablero (lectura, deprecated) |
| `tablero_nombre` | string | Nombre del tablero (read-only) |
| `checklist` | array | Lista de tareas |
| `fecha_creacion` | datetime | Fecha de creación |

### Ejemplo POST

```json
{
  "titulo": "Problema con impresora",
  "descripcion": "No imprime en el piso 3",
  "tablero_id": 1,
  "estado": "Solicitud",
  "prioridad": "Alta",
  "area": "TIC",
  "responsable": "Juan Pérez",
  "solicitante": "María García",
  "seccion_solicitante": "Recursos Humanos",
  "email_solicitante": "maria@ejemplo.com"
}
```

### `POST /tickets/rename-column/`

```json
{ "tablero_id": 1, "old_name": "Solicitud", "new_name": "Pendiente" }
// Response 200: { "updated": 5 }
```

### `POST /tickets/move-orphan/`

```json
{ "tablero_id": 1, "ticket_ids": [10, 11, 12], "new_estado": "Solicitud" }
// Response 200: { "updated": 3 }
```

---

## Comentarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/comentarios/` | Listar comentarios |
| `GET` | `/comentarios/{id}/` | Obtener por ID |
| `POST` | `/comentarios/` | Crear comentario |
| `PATCH` | `/comentarios/{id}/` | Actualizar parcial |
| `DELETE` | `/comentarios/{id}/` | Eliminar |

### Filtros

| Parámetro | Tipo | Ejemplo |
|-----------|------|---------|
| `ticket_id` | int | ID del ticket |
| `ordering` | string | `created_at` |

### Campos del modelo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | ID único |
| `ticket_id` | int | FK → Ticket (escritura) |
| `ticket` | int | FK → Ticket (lectura, deprecated) |
| `usuario_id` | int | FK → Usuario (escritura) |
| `usuario` | int | FK → Usuario (lectura, deprecated) |
| `usuario_nombre` | string | Nombre del usuario (read-only) |
| `texto` | string | Contenido del comentario |
| `created_at` | datetime | Fecha de creación |

### Ejemplo POST

```json
{
  "ticket_id": 1,
  "usuario_id": 1,
  "texto": "Comentario de prueba"
}
```

---

## Notificaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/notificaciones/` | Listar no leídas (propio) |
| `GET` | `/notificaciones/{id}/` | Obtener por ID |
| `POST` | `/notificaciones/` | Crear notificación |
| `PATCH` | `/notificaciones/{id}/` | Actualizar (marcar leída) |
| `DELETE` | `/notificaciones/{id}/` | Eliminar |

### Endpoints custom

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/notificaciones/mark-ticket-read/` | Marcar notif. de un ticket como leídas |

### `POST /notificaciones/mark-ticket-read/`

```json
{ "ticket_id": 5 }
// Response 200: { "updated": 3 }
```

### Campos del modelo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | ID único |
| `usuario_id` | int | FK → Usuario (escritura) |
| `usuario` | int | FK → Usuario (lectura, deprecated) |
| `ticket_id` | int | FK → Ticket (escritura) |
| `ticket` | int | FK → Ticket (lectura, deprecated) |
| `mensaje` | string | Mensaje de la notificación |
| `leida` | bool | Estado de lectura |
| `created_at` | datetime | Fecha de creación |

### Ejemplo POST

```json
{
  "usuario_id": 1,
  "ticket_id": 5,
  "mensaje": "Nuevo comentario en tu ticket"
}
```

---

## Media (Archivos)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/media/upload/{bucket}/{path}` | Subir archivo | Autenticado |
| `GET` | `/media/{bucket}/{path}` | Servir archivo | Público |

---

## Health Check

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/health/` | Verificar estado del API | Público |

```json
// Response 200
{ "status": "ok" }
```

---

## Frontend → Backend (mapeo de funciones)

| Función frontend | Endpoint backend |
|------------------|------------------|
| `api.usuarios.getAll()` | `GET /usuarios/?ordering=nombre` |
| `api.usuarios.getById(id)` | `GET /usuarios/{id}/` |
| `api.usuarios.create(data)` | `POST /usuarios/` |
| `api.usuarios.update(id, data)` | `PATCH /usuarios/{id}/` |
| `api.usuarios.delete(id)` | `DELETE /usuarios/{id}/` |
| `api.tableros.getByUsuario()` | `GET /tableros/?ordering=-created_at` |
| `api.tableros.getById(id)` | `GET /tableros/{id}/` |
| `api.tableros.create(data)` | `POST /tableros/` |
| `api.tableros.update(id, data)` | `PATCH /tableros/{id}/` |
| `api.tableros.delete(id)` | `DELETE /tableros/{id}/` |
| `api.tableroUsuarios.getByTablero(id)` | `GET /tablero-usuarios/?tablero_id=X` |
| `api.tableroUsuarios.getByUsuario(id)` | `GET /tablero-usuarios/?usuario_id=X` |
| `api.tableroUsuarios.addMember(data)` | `POST /tablero-usuarios/` |
| `api.tableroUsuarios.removeMember(t,u)` | `POST /tablero-usuarios/remove-member/` |
| `api.tableroUsuarios.updateRole(t,u,r)` | `POST /tablero-usuarios/update-role/` |
| `api.tableroUsuarios.updatePermisos(t,u,p)` | `POST /tablero-usuarios/update-permisos/` |
| `api.tickets.getByTablero(id)` | `GET /tickets/?tablero_id=X` |
| `api.tickets.getById(id)` | `GET /tickets/{id}/` |
| `api.tickets.create(data)` | `POST /tickets/` |
| `api.tickets.update(id, data)` | `PATCH /tickets/{id}/` |
| `api.tickets.delete(id)` | `DELETE /tickets/{id}/` |
| `api.tickets.renameColumn(t,old,new)` | `POST /tickets/rename-column/` |
| `api.tickets.moveOrphanTickets(t,ids,e)` | `POST /tickets/move-orphan/` |
| `api.comentarios.getByTicket(id)` | `GET /comentarios/?ticket_id=X` |
| `api.comentarios.create(data)` | `POST /comentarios/` |
| `api.comentarios.update(id, data)` | `PATCH /comentarios/{id}/` |
| `api.comentarios.delete(id)` | `DELETE /comentarios/{id}/` |
| `api.notificaciones.getUnread()` | `GET /notificaciones/?ordering=-created_at` |
| `api.notificaciones.create(data)` | `POST /notificaciones/` |
| `api.notificaciones.markAsRead(id)` | `PATCH /notificaciones/{id}/` |
| `api.notificaciones.markTicketAsRead(id)` | `POST /notificaciones/mark-ticket-read/` |
