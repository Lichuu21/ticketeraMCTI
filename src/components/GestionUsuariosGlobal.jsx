import React, { useState, useEffect } from 'react';
import api from '../api';

export default function GestionUsuariosGlobal({ isOpen, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [formUsuario, setFormUsuario] = useState({
    nombre: '', email: '', dependencia: '', piso: '', rol: ''
  });
  const [editandoId, setEditandoId] = useState(null);
  const [formDataEdicion, setFormDataEdicion] = useState({});
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

  const fetchUsuarios = async () => {
    if (!isOpen) return;
    const { data, error } = await api.from('usuarios').select('*').order('nombre');
    if (!error && data) {
      setUsuarios(data);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [isOpen]);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (!formUsuario.nombre || !formUsuario.email || !formUsuario.dependencia || !formUsuario.piso || !formUsuario.rol) {
      alert("Por favor completa todos los campos.");
      return;
    }

    try {
      const { data, error } = await api.from('usuarios').insert([{
        email: formUsuario.email,
        nombre: formUsuario.nombre,
        dependencia: formUsuario.dependencia,
        piso: formUsuario.piso,
        rol: formUsuario.rol,
        activo: true
      }]);

      if (error) {
        console.error('Error creating user:', error);
        alert(`Error al crear el usuario: ${error.message || 'Error desconocido'}`);
        return;
      }

      setShowForm(false);
      setFormUsuario({ nombre: '', email: '', dependencia: '', piso: '', rol: 'Usuario' });
      alert(`¡Usuario creado exitosamente!\n\nNombre: ${formUsuario.nombre}\nCorreo: ${formUsuario.email}\nContraseña inicial: Cti1234\nRol asignado: ${formUsuario.rol}\n\nEl usuario debe cambiar su contraseña en el primer inicio de sesión.`);
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
      rol: u.rol || '',
      dependencia: u.dependencia || '',
      piso: u.piso || ''
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

    const { error } = await api.from('usuarios').update(cambios).eq('id', userId);

    if (error) {
      alert('Error al guardar los cambios en la base de datos.');
      fetchUsuarios();
    }
  };

  const handleEliminarUsuario = async () => {
    if (!usuarioAEliminar) return;
    const { error } = await api.from('usuarios').delete().eq('id', usuarioAEliminar.id);
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
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Nombre Completo</label>
              <input required autoFocus type="text" value={formUsuario.nombre} onChange={e => setFormUsuario({ ...formUsuario, nombre: e.target.value })} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Nombre y Apellido" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
              <input required type="email" value={formUsuario.email} onChange={e => setFormUsuario({ ...formUsuario, email: e.target.value })} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="ejemplo@correo.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Dependencia</label>
              <input required type="text" value={formUsuario.dependencia} onChange={e => setFormUsuario({ ...formUsuario, dependencia: e.target.value })} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Informática, Personal..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Piso</label>
              <input required type="text" value={formUsuario.piso} onChange={e => setFormUsuario({ ...formUsuario, piso: e.target.value })} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. 1, 2, PB..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Rol</label>
              <input required type="text" value={formUsuario.rol} onChange={e => setFormUsuario({ ...formUsuario, rol: e.target.value })} className="w-full bg-white/50 dark:bg-[#1a2f55] border border-slate-200/60 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Soporte, Mesa de ayuda..." />
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-start gap-3 mt-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-1">Información Importante</p>
                <p className="text-[11px] text-red-600/90 dark:text-red-200/80 leading-relaxed">
                  El usuario se creará con la contraseña temporal: <span className="font-mono font-bold bg-white dark:bg-black/30 px-1.5 py-0.5 rounded text-red-700 dark:text-red-300">Cti1234</span><br />
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
                      // Modo Edición
                      <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre Completo</label>
                          <input
                            type="text"
                            value={formDataEdicion.nombre}
                            onChange={(e) => setFormDataEdicion({ ...formDataEdicion, nombre: e.target.value })}
                            className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none w-full px-3 py-2 text-sm font-bold text-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-[#065E94]/50"
                            placeholder="Nombre del usuario"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rol</label>
                          <input
                            type="text"
                            value={formDataEdicion.rol}
                            onChange={(e) => setFormDataEdicion({ ...formDataEdicion, rol: e.target.value })}
                            className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none w-full px-3 py-2 text-sm font-semibold text-[#065E94] dark:text-blue-300 uppercase tracking-widest rounded-lg focus:ring-2 focus:ring-[#065E94]/50"
                            placeholder="Ej. Administrador, Jefe de Area..."
                          />
                        </div>

                        <div className="flex gap-3">
                          <div className="flex flex-col gap-1 flex-[2]">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dependencia</label>
                            <input
                              type="text"
                              value={formDataEdicion.dependencia}
                              onChange={(e) => setFormDataEdicion({ ...formDataEdicion, dependencia: e.target.value })}
                              className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none w-full px-3 py-2 text-xs text-slate-600 dark:text-neutral-300 rounded-lg focus:ring-2 focus:ring-[#065E94]/50"
                              placeholder="Dependencia"
                            />
                          </div>
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Piso</label>
                            <input
                              type="text"
                              value={formDataEdicion.piso}
                              onChange={(e) => setFormDataEdicion({ ...formDataEdicion, piso: e.target.value })}
                              className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none w-full px-3 py-2 text-xs text-slate-600 dark:text-neutral-300 rounded-lg focus:ring-2 focus:ring-[#065E94]/50"
                              placeholder="Piso"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <button
                            onClick={cancelarEdicion}
                            className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleGuardarEdicion(u.id)}
                            className="text-[10px] uppercase font-bold text-white tracking-wider bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg shadow-sm transition-all"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo Lectura
                      <div className="flex flex-col gap-2">
                        {/* Fila del Nombre y Lapiz */}
                        <div className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                          {u.nombre}
                          <button
                            onClick={() => iniciarEdicion(u)}
                            className="text-slate-400 hover:text-[#065E94] dark:hover:text-blue-400 p-1 rounded-md transition-colors"
                            title="Editar usuario"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>

                        {/* Fila del Rol */}
                        <div className="flex items-center">
                          <span className="text-[10px] uppercase font-black text-[#065E94] dark:text-blue-300 tracking-widest">
                            {u.rol || 'SIN ROL'}
                          </span>
                        </div>

                        {/* Fila de Dependencia y Piso */}
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">{u.dependencia || 'Sin dependencia'}</span>
                          <span className="text-[11px] text-slate-400">• Piso {u.piso || '-'}</span>
                        </div>

                        {/* Fila del Email */}
                        <div className="flex items-center mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate" title="El email no puede ser modificado por seguridad">{u.email}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setUsuarioAEliminar(u)}
                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                    title="Eliminar Usuario"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Eliminar */}
        {usuarioAEliminar && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-100 dark:border-[var(--border-accent)]">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">¿Eliminar del sistema?</h3>
              <p className="text-sm text-slate-600 dark:text-neutral-400 mb-6">
                Estás a punto de eliminar completamente a <span className="font-bold text-slate-700 dark:text-neutral-300">{usuarioAEliminar.nombre}</span>.<br />
                Esto borrará su perfil y no podrá iniciar sesión. Los tickets que haya creado podrían quedar sin autor asignado.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setUsuarioAEliminar(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancelar</button>
                <button onClick={handleEliminarUsuario} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">Sí, eliminar permanentemente</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
