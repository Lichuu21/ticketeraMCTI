import React, { useState, useEffect } from 'react';
import api from '../api';

export default function GestionUsuariosGlobal({ isOpen, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [formUsuario, setFormUsuario] = useState({
    nombre: '', apellido: '', email: '', dependencia: '', roles: []
  });
  const [editandoId, setEditandoId] = useState(null);
  const [formDataEdicion, setFormDataEdicion] = useState({});
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

  const fetchUsuarios = async () => {
    if (!isOpen) return;
    const { data, error } = await api.usuarios.getAll('nombre');
    if (!error && data) {
      setUsuarios(data);
    }
  };

  const fetchRoles = async () => {
    const { data, error } = await api.roles.getAll();
    if (!error && data) {
      setRoles(data);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
  }, [isOpen]);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (!formUsuario.nombre || !formUsuario.apellido || !formUsuario.email) {
      alert("Por favor completa nombre, apellido y email.");
      return;
    }

    try {
      const { data, error } = await api.usuarios.create({
        email: formUsuario.email,
        nombre: formUsuario.nombre,
        apellido: formUsuario.apellido,
        dependencia: formUsuario.dependencia,
        roles: formUsuario.roles,
      });

      if (error) {
        console.error('Error creating user:', error);
        alert(`Error al crear el usuario: ${error.message || 'Error desconocido'}`);
        return;
      }

      setFormUsuario({ nombre: '', apellido: '', email: '', dependencia: '', roles: [] });
      alert(`¡Usuario creado exitosamente!\n\nNombre: ${formUsuario.nombre} ${formUsuario.apellido}\nCorreo: ${formUsuario.email}\nContraseña inicial: Cti1234\n\nEl usuario debe cambiar su contraseña en el primer inicio de sesión.`);
      await fetchUsuarios();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(`Error inesperado al crear el usuario: ${error.message}`);
    }
  };

  const iniciarEdicion = (u) => {
    setEditandoId(u.id);
    setFormDataEdicion({
      nombre: u.nombre,
      apellido: u.apellido || '',
      dependencia: u.dependencia || '',
      roles: u.roles || [],
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setFormDataEdicion({});
  };

  const handleGuardarEdicion = async (userId) => {
    const cambios = formDataEdicion;
    if (!cambios.nombre) return;

    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, ...cambios } : u));
    setEditandoId(null);
    setFormDataEdicion({});

    const { error } = await api.usuarios.update(userId, cambios);

    if (error) {
      alert('Error al guardar los cambios en la base de datos.');
      fetchUsuarios();
    }
  };

  const handleEliminarUsuario = async () => {
    if (!usuarioAEliminar) return;
    const { error } = await api.usuarios.delete(usuarioAEliminar.id);
    if (error) {
      alert('Error al eliminar usuario de la base de datos. Puede que tenga tickets asignados.');
    } else {
      setUsuarios(prev => prev.filter(u => u.id !== usuarioAEliminar.id));
      setUsuarioAEliminar(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 transition-all duration-300 animate-in fade-in`} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`relative bg-white/90 dark:bg-[#112240] backdrop-blur-2xl dark:backdrop-blur-none rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-none w-full max-w-4xl p-6 md:p-10 max-h-[95vh] overflow-y-auto custom-scrollbar border border-white/60 dark:border-[var(--border-accent)] flex flex-col md:flex-row gap-8 md:gap-12 transform transition-all duration-300 animate-in zoom-in-95`}>
        <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 p-2 bg-slate-100/50 dark:bg-white/5 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors z-10" title="Cerrar">
          <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Formulario Izquierda */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] dark:from-[#2a83bd] dark:to-[#4ea8de]">Crear Nuevo Usuario</h2>
          <form onSubmit={handleCrearUsuario} className="space-y-5">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Nombre</label>
                <input required autoFocus type="text" value={formUsuario.nombre} onChange={e => setFormUsuario({ ...formUsuario, nombre: e.target.value })} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Nombre" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Apellido</label>
                <input required type="text" value={formUsuario.apellido} onChange={e => setFormUsuario({ ...formUsuario, apellido: e.target.value })} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Apellido" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
              <input required type="email" value={formUsuario.email} onChange={e => setFormUsuario({ ...formUsuario, email: e.target.value })} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="ejemplo@correo.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Dependencia</label>
              <input type="text" value={formUsuario.dependencia} onChange={e => setFormUsuario({ ...formUsuario, dependencia: e.target.value })} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Informática, Personal..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Roles</label>
              <div className="flex flex-wrap gap-2">
                {roles.map(rol => (
                  <label key={rol.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formUsuario.roles.includes(rol.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormUsuario({ ...formUsuario, roles: [...formUsuario.roles, rol.id] });
                        } else {
                          setFormUsuario({ ...formUsuario, roles: formUsuario.roles.filter(r => r !== rol.id) });
                        }
                      }}
                      className="rounded border-slate-300 text-[#065E94] focus:ring-[#065E94]"
                    />
                    <span className="text-sm text-slate-700 dark:text-neutral-300">{rol.nombre}</span>
                  </label>
                ))}
                {roles.length === 0 && <span className="text-xs text-slate-400">No hay roles creados</span>}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 flex items-start gap-3 mt-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Información</p>
                <p className="text-[11px] text-blue-600/90 dark:text-blue-200/80 leading-relaxed">
                  El usuario se creará con la contraseña temporal: <span className="font-mono font-bold bg-white dark:bg-black/30 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300">Cti1234</span><br />
                  Deberá cambiarla al iniciar sesión.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" className="w-full px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5">Crear Usuario</button>
            </div>
          </form>
        </div>

        {/* Lista Derecha */}
        <div className="flex flex-col h-[600px] flex-[1.2] border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-[var(--border-accent)] pt-6 md:pt-0 md:pl-8">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] dark:bg-none tracking-tight">Usuarios de la Plataforma</h2>
          <div className="flex-1 overflow-y-auto overscroll-contain pr-2 space-y-3 custom-scrollbar">
            {usuarios.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center mt-10">Cargando usuarios...</p>
            ) : (
              usuarios.map(u => (
                <div key={u.id} className="bg-slate-50/80 dark:bg-[var(--bg-secondary)] p-4 rounded-2xl border border-slate-100 dark:border-[var(--border-accent)] flex justify-between items-center transition-all hover:bg-white dark:hover:bg-white/[0.05] group">
                  <div className="flex flex-col gap-2 pr-4 flex-1">
                    {editandoId === u.id ? (
                      <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                        <div className="flex gap-2">
                          <div className="flex-1 flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre</label>
                            <input type="text" value={formDataEdicion.nombre} onChange={(e) => setFormDataEdicion({ ...formDataEdicion, nombre: e.target.value })} className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none w-full px-3 py-2 text-sm font-bold text-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-[#065E94]/50" />
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Apellido</label>
                            <input type="text" value={formDataEdicion.apellido} onChange={(e) => setFormDataEdicion({ ...formDataEdicion, apellido: e.target.value })} className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none w-full px-3 py-2 text-sm font-bold text-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-[#065E94]/50" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dependencia</label>
                          <input type="text" value={formDataEdicion.dependencia} onChange={(e) => setFormDataEdicion({ ...formDataEdicion, dependencia: e.target.value })} className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none w-full px-3 py-2 text-xs text-slate-600 dark:text-neutral-300 rounded-lg focus:ring-2 focus:ring-[#065E94]/50" />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Roles</label>
                          <div className="flex flex-wrap gap-2">
                            {roles.map(rol => (
                              <label key={rol.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(formDataEdicion.roles || []).includes(rol.id)}
                                  onChange={(e) => {
                                    const currentRoles = formDataEdicion.roles || [];
                                    if (e.target.checked) {
                                      setFormDataEdicion({ ...formDataEdicion, roles: [...currentRoles, rol.id] });
                                    } else {
                                      setFormDataEdicion({ ...formDataEdicion, roles: currentRoles.filter(r => r !== rol.id) });
                                    }
                                  }}
                                  className="rounded border-slate-300 text-[#065E94] focus:ring-[#065E94]"
                                />
                                <span className="text-xs text-slate-700 dark:text-neutral-300">{rol.nombre}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <button onClick={cancelarEdicion} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 transition-colors">Cancelar</button>
                          <button onClick={() => handleGuardarEdicion(u.id)} className="text-[10px] uppercase font-bold text-white tracking-wider bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg shadow-sm transition-all">Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                          {u.nombre} {u.apellido}
                          <button onClick={() => iniciarEdicion(u)} className="text-slate-400 hover:text-[#065E94] dark:hover:text-blue-400 p-1 rounded-md transition-colors" title="Editar usuario">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          {u.is_superuser && (
                            <span className="text-[9px] uppercase font-black text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Superadmin</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(u.roles_detalle || []).map(rol => (
                            <span key={rol.id} className="text-[10px] uppercase font-black text-[#065E94] dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{rol.nombre}</span>
                          ))}
                          {(!u.roles_detalle || u.roles_detalle.length === 0) && (
                            <span className="text-[10px] uppercase font-black text-slate-400">Sin roles</span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">{u.dependencia || 'Sin dependencia'}</span>
                        </div>
                        <div className="flex items-center mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">{u.email}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button onClick={() => setUsuarioAEliminar(u)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0" title="Eliminar Usuario">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {usuarioAEliminar && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-100 dark:border-[var(--border-accent)]">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">¿Eliminar del sistema?</h3>
              <p className="text-sm text-slate-600 dark:text-neutral-400 mb-6">
                Estás a punto de eliminar completamente a <span className="font-bold text-slate-700 dark:text-neutral-300">{usuarioAEliminar.nombre} {usuarioAEliminar.apellido}</span>.<br />
                Esto borrará su perfil y no podrá iniciar sesión.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setUsuarioAEliminar(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancelar</button>
                <button onClick={handleEliminarUsuario} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">Eliminar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
