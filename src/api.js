const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const BASE_URL = API_URL.replace('/api', '');

async function apiRequest(method, path, body = null) {
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.slice(4);
  }
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${cleanPath}`, opts);
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

class QueryBuilder {
  constructor(endpoint) {
    const clean = (endpoint || '').replace(/^\/+|\/+$/g, '');
    this._endpoint = clean ? `${clean}/` : '';
    this._filters = {};
    this._ordering = null;
    this._single = false;
    this._limit = null;
    this._isInsert = false;
    this._insertPayload = null;
  }

  eq(col, val) { this._filters[col] = val; return this; }
  neq(col, val) { this._filters[`${col}__ne`] = val; return this; }
  in(col, vals) { this._filters[col] = vals; return this; }
  gt(col, val) { this._filters[`${col}__gt`] = val; return this; }
  gte(col, val) { this._filters[`${col}__gte`] = val; return this; }
  lt(col, val) { this._filters[`${col}__lt`] = val; return this; }
  lte(col, val) { this._filters[`${col}__lte`] = val; return this; }
  like(col, val) { this._filters[`${col}__contains`] = val; return this; }
  single() { this._single = true; return this; }

  order(col, opts = {}) {
    const asc = opts.ascending !== false;
    this._ordering = asc ? col : `-${col}`;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  _createThenable() {
    const self = this;
    const thenable = {
      eq(col, val) { self.eq(col, val); return thenable; },
      neq(col, val) { self.neq(col, val); return thenable; },
      in(col, vals) { self.in(col, vals); return thenable; },
      gt(col, val) { self.gt(col, val); return thenable; },
      gte(col, val) { self.gte(col, val); return thenable; },
      lt(col, val) { self.lt(col, val); return thenable; },
      lte(col, val) { self.lte(col, val); return thenable; },
      like(col, val) { self.like(col, val); return thenable; },
      order(col, opts) { self.order(col, opts); return thenable; },
      limit(n) { self.limit(n); return thenable; },
      single() { self.single(); return thenable; },
      select(fields) { return thenable; },
      then(onFulfilled, onRejected) {
        const promise = self._isInsert ? self._executeInsert() : self._executeSelect();
        return promise.then(onFulfilled, onRejected);
      },
      catch(onRejected) {
        const promise = self._isInsert ? self._executeInsert() : self._executeSelect();
        return promise.catch(onRejected);
      },
      finally(onFinally) {
        const promise = self._isInsert ? self._executeInsert() : self._executeSelect();
        return promise.finally(onFinally);
      }
    };
    return thenable;
  }

  select(fields = '*') {
    return this._createThenable();
  }

  async _executeSelect() {
    const params = { ...this._filters };
    if (this._ordering) params.ordering = this._ordering;
    const query = buildQuery(params);
    try {
      let data = await apiRequest('GET', `/${this._endpoint}${query}`);
      if (Array.isArray(data) && this._limit) {
        data = data.slice(0, this._limit);
      }
      if (this._single) {
        const item = Array.isArray(data) ? (data[0] || null) : data;
        return { data: item, error: null };
      }
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  insert(rows) {
    this._isInsert = true;
    this._insertPayload = Array.isArray(rows) ? rows : [rows];
    return this._createThenable();
  }

  async _executeInsert() {
    try {
      const results = [];
      for (const row of this._insertPayload) {
        const d = await apiRequest('POST', `/${this._endpoint}`, row);
        results.push(d);
      }
      let resData = Array.isArray(this._insertPayload) ? results : results[0];
      if (this._single && Array.isArray(resData)) {
        resData = resData[0] || null;
      }
      return { data: resData, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  async update(updates) {
    try {
      const id = this._filters.id;
      if (!id) return { data: null, error: { message: 'Se requiere id para actualizar' } };
      const data = await apiRequest('PATCH', `/${this._endpoint}${id}/`, updates);
      return { data: [data], error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  async delete() {
    try {
      const id = this._filters.id;
      if (!id) return { data: null, error: { message: 'Se requiere id para eliminar' } };
      await apiRequest('DELETE', `/${this._endpoint}${id}/`);
      return { data: [{ id }], error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }
}

function queryFrom(endpoint) {
  return new QueryBuilder(endpoint);
}

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
      return { data: null, error: { message: e.message || 'Credenciales inválidas' } };
    }
  },

  async signUp({ email, password, data: userData }) {
    try {
      const data = await apiRequest('POST', '/auth/register/', {
        email,
        password,
        nombre: userData?.nombre_completo || '',
      });
      if (data.error) return { data: null, error: { message: data.error } };
      return { data: { user: data }, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  },

  async signOut() {
    try {
      await apiRequest('POST', '/auth/logout/');
      return { error: null };
    } catch (e) {
      return { error: { message: e.message } };
    }
  },

  async updateUser({ password }) {
    try {
      if (password) {
        await apiRequest('POST', '/auth/change-password/', { new_password: password });
      }
      return { error: null };
    } catch (e) {
      return { error: { message: e.message || 'Error al actualizar la contraseña' } };
    }
  },

  async resetPasswordForEmail(email) {
    try {
      await apiRequest('POST', '/auth/reset-password/', { email });
      return { error: null };
    } catch (e) {
      return { error: { message: e.message } };
    }
  },

  onAuthStateChange(callback) {
    return { data: { subscription: { unsubscribe: () => { } } } };
  },
};

export const admin = {
  path_base: '/admin/',
  async createUser(userData) {
    try {
      const data = await apiRequest('POST', `${this.path_base}create-user/`, userData);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  },
};

export const ticket = {
  path_base: '/ticket/',
  async getTicket(id) {
    try {
      const data = await apiRequest('GET', `${this.path_base}${id}/`);
      return { data: Array.isArray(data) ? data : (data ? [data] : []), error: null };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  },
  async getLastTicket() {
    try {
      const data = await apiRequest('GET', `${this.path_base}lastticket/`);
      return { data: Array.isArray(data) ? data : (data ? [data] : []), error: null };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  },
};

export const boards = {
  path_base: '/tablero-usuarios/',
  async getBoard(id) {
    try {
      const data = await apiRequest('GET', `${this.path_base}get-by-id/${id}/`);
      return { data: Array.isArray(data) ? data : (data ? [data] : []), error: null };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  },
  async createBoard(boardData) {
    try {
      const data = await apiRequest('POST', `${this.path_base}create-board/`, boardData);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  },
};

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

export const channel = () => ({
  on() { return this; },
  subscribe() { return this; },
});

export function removeChannel() { }

export default {
  from: queryFrom,
  auth,
  admin,
  ticket,
  boards,
  storage,
  channel,
  removeChannel,
};
