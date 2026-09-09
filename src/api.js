const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const BASE_URL = API_URL.replace('/api', '');

async function apiRequest(method, path, body = null) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
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
    const clean = endpoint.replace(/^\/+|\/+$/g, '');
    this._endpoint = clean ? `${clean}/` : '';
    this._filters = {};
    this._ordering = null;
    this._single = false;
    this._limit = null;
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

  select(fields = '*') {
    const runSelect = async () => {
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
    };

    const promise = runSelect();
    promise.single = async () => {
      this._single = true;
      return await runSelect();
    };
    return promise;
  }

  insert(rows) {
    const runInsert = async () => {
      const payload = Array.isArray(rows) ? rows : [rows];
      try {
        const results = [];
        for (const row of payload) {
          const d = await apiRequest('POST', `/${this._endpoint}`, row);
          results.push(d);
        }
        let resData = Array.isArray(rows) ? results : results[0];
        if (this._single && Array.isArray(resData)) {
          resData = resData[0] || null;
        }
        return { data: resData, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message } };
      }
    };

    const promise = runInsert();
    promise.select = () => {
      const p = runInsert();
      p.single = async () => {
        this._single = true;
        return await runInsert();
      };
      return p;
    };
    promise.single = async () => {
      this._single = true;
      return await runInsert();
    };
    return promise;
  }

  async update(updates) {
    try {
      if (Object.keys(this._filters).length > 0 && !this._filters.id) {
        const listRes = await this.select('*');
        if (listRes.error) return { data: null, error: listRes.error };
        const items = listRes.data || [];
        for (const item of items) {
          await apiRequest('PATCH', `/${this._endpoint}${item.id}/`, updates);
        }
        return { data: items.map(i => ({ ...i, ...updates })), error: null };
      }
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
      if (Object.keys(this._filters).length > 0 && !this._filters.id) {
        const listRes = await this.select('*');
        if (listRes.error) return { data: null, error: listRes.error };
        const items = listRes.data || [];
        for (const item of items) {
          await apiRequest('DELETE', `/${this._endpoint}${item.id}/`);
        }
        return { data: items, error: null };
      }
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
    const data = await apiRequest('POST', '/auth/login/', { email, password });
    if (data.error) return { data: null, error: { message: data.error } };
    return { data: { user: data }, error: null };
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
    await apiRequest('POST', '/auth/logout/');
    return { error: null };
  },

  async updateUser({ password }) {
    if (password) {
      await apiRequest('POST', '/auth/change-password/', { new_password: password });
    }
    return { error: null };
  },

  async resetPasswordForEmail(email) {
    await apiRequest('POST', '/auth/reset-password/', { email });
    return { error: null };
  },

  onAuthStateChange(callback) {
    return { data: { subscription: { unsubscribe: () => {} } } };
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

export function removeChannel() {}

export default {
  from: queryFrom,
  auth,
  storage,
  channel,
  removeChannel,
};
