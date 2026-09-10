const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const BASE_URL = API_URL.replace('/api', '');

async function apiRequest(method, path, body = null) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, opts);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || data.detail || 'Error en la petición');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function buildQuery(params) {
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      val.forEach(v => q.append(key, v));
    } else {
      q.set(key, val);
    }
  }
  const str = q.toString();
  return str ? `?${str}` : '';
}

function formatError(err) {
  return { data: null, error: { message: err.message } };
}

// ─── AUTH ────────────────────────────────────────────────
export const auth = {
  async getSession() {
    try {
      const data = await apiRequest('GET', '/auth/me/');
      if (!data || data.authenticated === false || !data.id) {
        return { data: { session: null }, error: null };
      }
      return { data: { session: { user: data } }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  },

  async signInWithPassword({ email, password }) {
    try {
      const data = await apiRequest('POST', '/auth/login/', { email, password });
      if (data.error) return { data: null, error: { message: data.error } };
      return { data: { user: data }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async signUp({ email, password, data: userData }) {
    try {
      const data = await apiRequest('POST', '/auth/register/', {
        email, password, nombre: userData?.nombre_completo || '',
      });
      if (data.error) return { data: null, error: { message: data.error } };
      return { data: { user: data }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async signOut() {
    try {
      await apiRequest('POST', '/auth/logout/');
      return { error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async updateUser({ password }) {
    try {
      if (password) {
        await apiRequest('POST', '/auth/change-password/', { new_password: password });
      }
      return { error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async resetPasswordForEmail(email) {
    try {
      await apiRequest('POST', '/auth/reset-password/', { email });
      return { error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  onAuthStateChange(callback) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
};

// ─── USUARIOS ────────────────────────────────────────────
export const usuarios = {
  async getAll(ordering = 'nombre') {
    try {
      const data = await apiRequest('GET', `/usuarios/?ordering=${ordering}`);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async getById(id) {
    try {
      const data = await apiRequest('GET', `/usuarios/${id}/`);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async create(userData) {
    try {
      const data = await apiRequest('POST', '/usuarios/', userData);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async update(id, updates) {
    try {
      const data = await apiRequest('PATCH', `/usuarios/${id}/`, updates);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async delete(id) {
    try {
      await apiRequest('DELETE', `/usuarios/${id}/`);
      return { data: { id }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },
};

// ─── TABLEROS ────────────────────────────────────────────
export const tableros = {
  async getByUsuario() {
    try {
      const data = await apiRequest('GET', '/tableros/?ordering=-created_at');
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async getById(id) {
    try {
      const data = await apiRequest('GET', `/tableros/${id}/`);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async create(tableroData) {
    try {
      const data = await apiRequest('POST', '/tableros/', tableroData);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async update(id, updates) {
    try {
      const data = await apiRequest('PATCH', `/tableros/${id}/`, updates);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async delete(id) {
    try {
      await apiRequest('DELETE', `/tableros/${id}/`);
      return { data: { id }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },
};

// ─── TABLERO USUARIOS ────────────────────────────────────
export const tableroUsuarios = {
  async getByTablero(tableroId) {
    try {
      const data = await apiRequest('GET', `/tablero-usuarios/?tablero_id=${tableroId}`);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async getByUsuario(usuarioId) {
    try {
      const data = await apiRequest('GET', `/tablero-usuarios/?usuario_id=${usuarioId}`);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async addMember(memberData) {
    try {
      const data = await apiRequest('POST', '/tablero-usuarios/', memberData);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async removeMember(tableroId, usuarioId) {
    try {
      await apiRequest('POST', '/tablero-usuarios/remove-member/', { tablero_id: tableroId, usuario_id: usuarioId });
      return { data: { tablero_id: tableroId, usuario_id: usuarioId }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async updateRole(tableroId, usuarioId, rol) {
    try {
      await apiRequest('POST', '/tablero-usuarios/update-role/', { tablero_id: tableroId, usuario_id: usuarioId, rol });
      return { data: { tablero_id: tableroId, usuario_id: usuarioId, rol }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async updatePermisos(tableroId, usuarioId, permisos) {
    try {
      await apiRequest('POST', '/tablero-usuarios/update-permisos/', { tablero_id: tableroId, usuario_id: usuarioId, permisos });
      return { data: { tablero_id: tableroId, usuario_id: usuarioId, permisos }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },
};

// ─── TICKETS ─────────────────────────────────────────────
export const tickets = {
  async getByTablero(tableroId, ordering = '-fecha_creacion') {
    try {
      const data = await apiRequest('GET', `/tickets/?tablero_id=${tableroId}&ordering=${ordering}`);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async getById(id) {
    try {
      const data = await apiRequest('GET', `/tickets/${id}/`);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async create(ticketData) {
    try {
      const data = await apiRequest('POST', '/tickets/', ticketData);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async update(id, updates) {
    try {
      const data = await apiRequest('PATCH', `/tickets/${id}/`, updates);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async delete(id) {
    try {
      await apiRequest('DELETE', `/tickets/${id}/`);
      return { data: { id }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async renameColumn(tableroId, oldName, newName) {
    try {
      const data = await apiRequest('POST', '/tickets/rename-column/', {
        tablero_id: tableroId, old_name: oldName, new_name: newName,
      });
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async moveOrphanTickets(tableroId, ticketIds, newEstado) {
    try {
      const data = await apiRequest('POST', '/tickets/move-orphan/', {
        tablero_id: tableroId, ticket_ids: ticketIds, new_estado: newEstado,
      });
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },
};

// ─── COMENTARIOS ─────────────────────────────────────────
export const comentarios = {
  async getByTicket(ticketId) {
    try {
      const data = await apiRequest('GET', `/comentarios/?ticket_id=${ticketId}&ordering=created_at`);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async create(comentarioData) {
    try {
      const data = await apiRequest('POST', '/comentarios/', comentarioData);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async update(id, updates) {
    try {
      const data = await apiRequest('PATCH', `/comentarios/${id}/`, updates);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async delete(id) {
    try {
      await apiRequest('DELETE', `/comentarios/${id}/`);
      return { data: { id }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },
};

// ─── NOTIFICACIONES ──────────────────────────────────────
export const notificaciones = {
  async getUnread() {
    try {
      const data = await apiRequest('GET', '/notificaciones/?ordering=-created_at');
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async create(notificacionData) {
    try {
      const data = await apiRequest('POST', '/notificaciones/', notificacionData);
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async markAsRead(id) {
    try {
      const data = await apiRequest('PATCH', `/notificaciones/${id}/`, { leida: true });
      return { data, error: null };
    } catch (e) {
      return formatError(e);
    }
  },

  async markTicketAsRead(ticketId) {
    try {
      await apiRequest('POST', '/notificaciones/mark-ticket-read/', { ticket_id: ticketId });
      return { data: { ticket_id: ticketId }, error: null };
    } catch (e) {
      return formatError(e);
    }
  },
};

// ─── STORAGE ─────────────────────────────────────────────
export const storage = {
  from(bucket) {
    return {
      async upload(path, file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${BASE_URL}/api/media/upload/${bucket}/${path}`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: { message: data.error } };
        return { data: { path: data.path }, error: null };
      },
      getPublicUrl(path) {
        return { data: { publicUrl: `${BASE_URL}/media/${bucket}/${path}` } };
      },
    };
  },
};

// ─── DEFAULT EXPORT ──────────────────────────────────────
export default {
  auth,
  usuarios,
  tableros,
  tableroUsuarios,
  tickets,
  comentarios,
  notificaciones,
  storage,
};
