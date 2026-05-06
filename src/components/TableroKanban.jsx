import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const COLUMNAS_BASE = ['Solicitud', 'En proceso', 'En espera', 'Resuelto'];
const DEPARTAMENTOS = ['Soporte Técnico', 'Telefonía'];

// Configuración de Webhook para N8N
const WEBHOOK_N8N_URL = 'http://localhost:5678/webhook-test/3406573f-0d56-4029-b042-fa5a9b74cc3d'; // URL oficial de n8n proporcionada por el usuario

// Utilidad para notificar a N8N
const notificarN8n = async (evento, ticket) => {
  if (!WEBHOOK_N8N_URL || WEBHOOK_N8N_URL.includes('tu-servidor.com')) return;

  try {
    fetch(WEBHOOK_N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento,
        fecha: new Date().toISOString(),
        ticket
      })
    });
  } catch (err) {
    console.error("Error enviando webhook a n8n:", err);
  }
};

// Utilidad para colores de prioridad
const getPrioridadColor = (prioridad) => {
  switch (prioridad) {
    case 'Urgente': return 'badge-urgente';
    case 'Alta': return 'bg-transparent text-red-600 dark:text-[#ff8a65] border-red-500/30 dark:border-[#ff8a65]/50';
    case 'Media': return 'bg-transparent text-yellow-600 dark:text-[#ffd54f] border-yellow-500/30 dark:border-[#ffd54f]/50';
    case 'Baja': return 'bg-transparent text-emerald-600 dark:text-[#4db6ac] border-emerald-500/30 dark:border-[#4db6ac]/50';
    default: return 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-500/30 dark:border-gray-500/50';
  }
};

// Utilidad para extraer las iniciales (Apellido + Nombre)
const getInicial = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 1].charAt(0) + parts[0].charAt(0)).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

const TicketCard = React.memo(({ ticket, index, onClick, isReadOnly }) => {
  return (
    <Draggable draggableId={ticket.id.toString()} index={index} isDragDisabled={isReadOnly}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(ticket)}
          className={`${!snapshot.isDragging ? 'glass-card' : ''} bg-white/90 dark:bg-[var(--bg-card)] backdrop-blur-md dark:backdrop-blur-none p-5 rounded-2xl border border-white dark:border-[var(--border-accent)] cursor-pointer group ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-[#065E94]/30 dark:ring-[var(--border-accent)] rotate-3 scale-[1.03] dark:bg-[var(--bg-hover)] opacity-100 z-[1000]' : 'shadow-sm dark:shadow-none transition-all duration-300 hover:shadow-[0_8px_25px_-5px_rgba(6,94,148,0.15)] hover:border-slate-200 dark:hover:border-[var(--border-accent)] dark:hover:bg-[var(--bg-hover)] hover:-translate-y-1'
            }`}
        >
          <div className="flex justify-between items-start mb-3">
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg border ${getPrioridadColor(ticket.prioridad)}`}>
              {ticket.prioridad}
            </span>
            {ticket.area && <span className="text-[11px] font-semibold text-slate-400 group-hover:text-[#065E94] transition-colors">{ticket.area}</span>}
          </div>

          <h3 className={`text-sm font-semibold text-slate-800 dark:text-white leading-snug ${(ticket.solicitante || ticket.seccion_solicitante) ? 'mb-2' : 'mb-4'}`}>{ticket.titulo}</h3>

          {(ticket.solicitante || ticket.seccion_solicitante) && (
            <div className="glass-solicitor flex items-center gap-2.5 mb-2 bg-slate-50/80 dark:bg-white/5 border border-slate-100 dark:border-[var(--border-accent)] py-2 px-2.5 rounded-lg">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-white/10 shadow-sm shrink-0 border border-white/10 dark:border-white/5">
                <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-100 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
              </div>
              <div className="flex flex-col min-w-0 justify-center">
                <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-white truncate leading-tight">
                  {ticket.solicitante || 'Desconocido'}
                </span>
                {ticket.seccion_solicitante && (
                  <span className="text-[9.5px] font-bold text-slate-400 dark:text-cyan-100/70 truncate leading-none uppercase tracking-wider mt-[2px]">
                    {ticket.seccion_solicitante}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100/80 dark:border-white/5">
            <span className="text-xs text-slate-400 dark:text-slate-400 font-semibold tracking-wide">
              {new Date(ticket.fecha_creacion).toLocaleDateString()}
            </span>
            {ticket.responsable && (
              <div className="flex -space-x-2">
                {ticket.responsable.split(',').map(r => r.trim()).filter(Boolean).slice(0, 3).map((r, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-[var(--bg-card)] bg-slate-100 dark:bg-white/90 text-[#065E94] dark:text-[#0f172a] font-extrabold flex items-center justify-center text-[11px] shadow-sm transform transition-transform hover:scale-110 hover:z-10"
                    title={r}
                  >
                    {getInicial(r)}
                  </div>
                ))}
                {ticket.responsable.split(',').filter(Boolean).length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/90 text-slate-600 dark:text-[#0f172a] flex items-center justify-center text-[11px] font-extrabold border-2 border-white dark:border-[var(--bg-card)] shadow-sm z-0" title={ticket.responsable}>
                    +{ticket.responsable.split(',').filter(Boolean).length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}, (prevProps, nextProps) => {
  return prevProps.ticket.id === nextProps.ticket.id &&
    prevProps.ticket.titulo === nextProps.ticket.titulo &&
    prevProps.ticket.estado === nextProps.ticket.estado &&
    prevProps.ticket.prioridad === nextProps.ticket.prioridad &&
    prevProps.ticket.area === nextProps.ticket.area &&
    prevProps.ticket.responsable === nextProps.ticket.responsable &&
    prevProps.ticket.solicitante === nextProps.ticket.solicitante &&
    prevProps.ticket.seccion_solicitante === nextProps.ticket.seccion_solicitante &&
    prevProps.ticket.fecha_creacion === nextProps.ticket.fecha_creacion &&
    prevProps.index === nextProps.index &&
    prevProps.isReadOnly === nextProps.isReadOnly;
});

const TicketForm = ({ initialConfig, onSubmit, onCancel, user, usuarios }) => {
  const [localConfig, setLocalConfig] = React.useState(initialConfig);

  React.useEffect(() => {
    setLocalConfig(initialConfig);
  }, [initialConfig]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(localConfig);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Título</label>
        <input required autoFocus type="text" value={localConfig.titulo} onChange={e => setLocalConfig({ ...localConfig, titulo: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Computadora no enciende..." disabled={user?.rol === 'Soporte Tecnico'} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Solicitante</label>
          <input type="text" value={localConfig.solicitante} onChange={e => setLocalConfig({ ...localConfig, solicitante: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Juan Pérez" disabled={user?.rol === 'Soporte Tecnico'} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Sección / Dependencia</label>
          <input type="text" value={localConfig.seccion_solicitante} onChange={e => setLocalConfig({ ...localConfig, seccion_solicitante: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Compras, RRHH..." disabled={user?.rol === 'Soporte Tecnico'} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Área</label>
          <select required value={localConfig.area} onChange={e => setLocalConfig({ ...localConfig, area: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none cursor-pointer" disabled={user?.rol === 'Soporte Tecnico'}>
            <option value="" disabled>Seleccione un área...</option>
            <option value="Soporte">Soporte</option>
            <option value="Redes">Redes</option>
            <option value="Desarrollo">Desarrollo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Prioridad</label>
          <select value={localConfig.prioridad} onChange={e => setLocalConfig({ ...localConfig, prioridad: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none shadow-sm dark:shadow-none cursor-pointer" disabled={user?.rol === 'Soporte Tecnico'}>
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
            <option value="Urgente">Urgente 🚨</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Descripción Detallada (Opcional)</label>
        <textarea value={localConfig.descripcion} onChange={e => setLocalConfig({ ...localConfig, descripcion: e.target.value })} rows={4} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none resize-none" placeholder="Describe el problema con el mayor detalle posible..." disabled={user?.rol === 'Soporte Tecnico'} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Asignado a (Usuarios)</label>
        <div className="w-full bg-white border border-slate-200 dark:bg-[var(--bg-secondary)]/50 dark:border-[var(--border-accent)]/60 rounded-xl p-3 max-h-40 overflow-y-auto overscroll-contain custom-scrollbar shadow-sm space-y-1">
          {usuarios.length === 0 ? (
            <p className="text-sm text-slate-400 p-1">No hay usuarios registrados</p>
          ) : (
            usuarios.map(u => (
              <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer transition-colors group">
                <input
                  type="checkbox"
                  checked={localConfig.responsables.includes(u.nombre)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setLocalConfig({ ...localConfig, responsables: [...localConfig.responsables, u.nombre] });
                    } else {
                      setLocalConfig({ ...localConfig, responsables: localConfig.responsables.filter(r => r !== u.nombre) });
                    }
                  }}
                  className="w-4 h-4 text-[#065E94] rounded border-slate-300 focus:ring-[#065E94] cursor-pointer"
                  disabled={user?.rol === 'Soporte Tecnico'}
                />
                <div className="flex flex-col">
                  <span className="text-sm text-slate-700 dark:text-slate-200 font-bold group-hover:text-[#065E94] dark:group-hover:text-blue-400 transition-colors">{u.nombre}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{u.dependencia} (Piso {u.piso})</span>
                </div>
              </label>
            ))
          )}
        </div>
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">Puedes seleccionar múltiples personas asignadas. Si la persona no está en la lista, regístrala primero en 'Gestión de Usuarios'.</p>
      </div>
      <div className="pt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-neutral-300 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 transition-colors">Cancelar</button>
        {user?.rol !== 'Soporte Tecnico' && (
          <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-lg shadow-[#065E94]/30 transition-all hover:-translate-y-0.5">
            {localConfig.id ? "Guardar Cambios" : "Crear Ticket"}
          </button>
        )}
      </div>
    </form>
  );
};

export default function TableroKanban() {
  const { user, logout } = useAuth();

  const [departamentoActivo, setDepartamentoActivo] = useState(DEPARTAMENTOS[0]);
  const [tickets, setTickets] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalUsuariosOpen, setModalUsuariosOpen] = useState(false);
  const [modalPerfilOpen, setModalPerfilOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [ticketActivo, setTicketActivo] = useState(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [ticketAEliminar, setTicketAEliminar] = useState(null);

  // Comentarios
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [comentarioAEditar, setComentarioAEditar] = useState(null);
  const [comentarioAEliminar, setComentarioAEliminar] = useState(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const fileInputRef = useRef(null);
  const mensajesEndRef = useRef(null);
  const [modalMandatorioOpen, setModalMandatorioOpen] = useState(false);

  // Notificaciones
  const [notificaciones, setNotificaciones] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Optimizaciones de Render para TicketCard
  const actionsRef = useRef(null);
  useEffect(() => {
    actionsRef.current = { setTicketActivo, setDetalleOpen, user, setNotificaciones, notificaciones };
  });

  const fetchComentarios = async (ticketId) => {
    const { data, error } = await supabase
      .from('comentarios')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) console.error("Error al buscar comentarios:", error);
    else setComentarios(data);
  };

  const handleTicketClick = React.useCallback((ticket) => {
    if (!actionsRef.current) return;
    const { setTicketActivo, setDetalleOpen, user, setNotificaciones, notificaciones } = actionsRef.current;

    setTicketActivo(ticket);
    setDetalleOpen(true);
    fetchComentarios(ticket.id);

    if (user) {
      const notifPendientes = notificaciones.filter(n => n.ticket_id === ticket.id);
      if (notifPendientes.length > 0) {
        setNotificaciones(prev => prev.filter(n => n.ticket_id !== ticket.id));
        supabase.from('notificaciones')
          .update({ leida: true })
          .eq('usuario_id', user.id)
          .eq('ticket_id', ticket.id)
          .then(({ error }) => { if (error) console.error("Error marcando notificación leída:", error); });
      }
    }
  }, []);

  // Auto-scroll al final del chat cuando hay nuevos comentarios
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comentarios, detalleOpen]);

  // Perfil Usuario (Contraseña)
  const [passwordForm, setPasswordForm] = useState({ nueva: '', confirmar: '' });
  const [cambiandoReq, setCambiandoReq] = useState(false);

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (passwordForm.nueva !== passwordForm.confirmar) {
      alert("Las contraseñas nuevas no coinciden.");
      return;
    }
    setCambiandoReq(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.nueva
    });
    setCambiandoReq(false);
    if (error) {
      alert(`Error al cambiar contraseña: ${error.message}`);
    } else {
      setTienePasswordDefault(false);
      sessionStorage.setItem('has_pwd_warning_' + user?.id, '0');
      alert("Contraseña cambiada exitosamente.");
      setPasswordForm({ nueva: '', confirmar: '' });
      setModalPerfilOpen(false);
      setModalMandatorioOpen(false);
    }
  };

  // Modal de Resolución
  const [modalResolucionOpen, setModalResolucionOpen] = useState(false);
  const [resolucionTexto, setResolucionTexto] = useState('');
  const [ticketAResolver, setTicketAResolver] = useState(null);

  // Formulario Usuarios
  const [formUsuario, setFormUsuario] = useState({
    nombre: '', dependencia: '', piso: '', rol: 'Soporte Tecnico'
  });
  const [rolesEditados, setRolesEditados] = useState({});
  const [nombresEditados, setNombresEditados] = useState({});

  // 🌙 Dark Mode State (4 modes: light, blue, dark, wallpaper)
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    if (saved) return saved; // 'light', 'blue', 'dark', or 'wallpaper'
    return 'light';
  });

  // 🖼️ Wallpaper state
  const [wallpaperModalOpen, setWallpaperModalOpen] = useState(false);
  const [activeWallpaper, setActiveWallpaper] = useState(() => {
    return localStorage.getItem('activeWallpaper') || 'montanas';
  });

  const WALLPAPERS = [
    { id: 'none', label: 'Sin fondo', thumb: null, url: null },
    { id: 'buenosaires', label: 'Buenos Aires', thumb: '/wallpapers/thumbs/buenosaires.jpg', url: '/wallpapers/buenosaires.jpg' },
    { id: 'patagonia', label: 'Patagonia', thumb: '/wallpapers/thumbs/patagonia.jpg', url: '/wallpapers/patagonia.jpg' },
    { id: 'iguazu', label: 'Cataratas del Iguazú', thumb: '/wallpapers/thumbs/iguazu.jpg', url: '/wallpapers/iguazu.jpg' },
    { id: 'bariloche', label: 'Bariloche', thumb: '/wallpapers/thumbs/bariloche.jpg', url: '/wallpapers/bariloche.jpg' },
    { id: 'montanas', label: 'Montañas', thumb: '/wallpapers/thumbs/montanas.jpg', url: '/wallpapers/montanas.jpg' },
    { id: 'aurora', label: 'Aurora Boreal', thumb: '/wallpapers/thumbs/aurora.jpg', url: '/wallpapers/aurora.jpg' },
    { id: 'bosque', label: 'Bosque', thumb: '/wallpapers/thumbs/bosque.jpg', url: '/wallpapers/bosque.jpg' },
    { id: 'desierto', label: 'Desierto', thumb: '/wallpapers/thumbs/desierto.jpg', url: '/wallpapers/desierto.jpg' },
    { id: 'galaxia', label: 'Galaxia', thumb: '/wallpapers/galaxia.jpg?v=3', url: '/wallpapers/galaxia.jpg?v=3' },
    { id: 'cascada', label: 'Cascada', thumb: '/wallpapers/thumbs/cascada.jpg', url: '/wallpapers/cascada.jpg' },
    { id: 'playa', label: 'Playa', thumb: '/wallpapers/thumbs/playa.jpg', url: '/wallpapers/playa.jpg' },
    { id: 'nyc', label: 'New York', thumb: '/wallpapers/thumbs/nyc.jpg', url: '/wallpapers/nyc.jpg' },
    { id: 'tokyo', label: 'Tokyo', thumb: '/wallpapers/thumbs/tokyo.jpg', url: '/wallpapers/tokyo.jpg' },
    { id: 'paris', label: 'Paris', thumb: '/wallpapers/paris.jpg?v=3', url: '/wallpapers/paris.jpg?v=3' },
    { id: 'dubai', label: 'Dubai', thumb: '/wallpapers/thumbs/dubai.jpg', url: '/wallpapers/dubai.jpg' },
    { id: 'noche', label: 'Noche', thumb: '/wallpapers/thumbs/noche.jpg', url: '/wallpapers/noche.jpg' },
    { id: 'mardelplata', label: 'Mar del Plata', thumb: '/wallpapers/thumbs/mardelplata.jpg', url: '/wallpapers/mardelplata.jpg' },
  ];

  const [tienePasswordDefault, setTienePasswordDefault] = useState(false);

  useEffect(() => {
    if (user?.email) {
      const status = sessionStorage.getItem('has_pwd_warning_' + user.id);

      if (status === '0') {
        setTienePasswordDefault(false);
        return;
      } else if (status === '1') {
        setTienePasswordDefault(true);
        return;
      }

      const verificarPassword = async () => {
        try {
          const res = await fetch('https://deftutfyjpdlneiyzejm.supabase.co/auth/v1/token?grant_type=password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZnR1dGZ5anBkbG5laXl6ZWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTU1MzEsImV4cCI6MjA4NzY5MTUzMX0.LHP2e4eZ-CIwHvKMCQhKXK-TOH6XJBvK7si9E_DBGSA'
            },
            body: JSON.stringify({
              email: user.email,
              password: 'Cti1234'
            })
          });
          const data = await res.json();
          if (data.access_token) {
            setTienePasswordDefault(true);
            setModalMandatorioOpen(true);
            sessionStorage.setItem('has_pwd_warning_' + user.id, '1');
          } else {
            setTienePasswordDefault(false);
            sessionStorage.setItem('has_pwd_warning_' + user.id, '0');
          }
        } catch (e) {
          // Si falla, asumir falso por default
          sessionStorage.setItem('has_pwd_warning_' + user.id, '0');
        }
      };

      const checked = sessionStorage.getItem('checked_pwd_' + user.id);
      if (!checked) {
        sessionStorage.setItem('checked_pwd_' + user.id, '1');
        verificarPassword();
      }
    }
  }, [user]);


  // Apply Theme Mode Class to HTML tag
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'theme-blue', 'theme-dark', 'theme-wallpaper');

    if (themeMode === 'blue') {
      document.documentElement.classList.add('dark', 'theme-blue');
    } else if (themeMode === 'dark') {
      document.documentElement.classList.add('dark', 'theme-dark');
    } else if (themeMode === 'wallpaper') {
      document.documentElement.classList.add('dark', 'theme-wallpaper');
    }

    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  // Apply wallpaper background to body
  useEffect(() => {
    const wp = WALLPAPERS.find(w => w.id === activeWallpaper);
    if (themeMode === 'wallpaper' && wp?.url) {
      document.body.style.backgroundImage = `url('${wp.url}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundAttachment = '';
    }
    localStorage.setItem('activeWallpaper', activeWallpaper);
  }, [themeMode, activeWallpaper]);

  // Remove dynamic background injection, rely entirely on Tailwind classes on root wrappers
  useEffect(() => {
    if (themeMode === 'light') {
      document.body.style.backgroundColor = ''; // Reverts to tailwind class bg-slate-50
    }
  }, [themeMode]);

  // El scroll de la página siempre está bloqueado (diseño estilo Trello)
  // Solo se mantiene este efecto para compatibilidad con scroll-on-modal si se necesita en el futuro

  // Formulario de creación/edición
  const [formConfig, setFormConfig] = useState({
    id: null, titulo: '', descripcion: '', area: '', prioridad: 'Media', responsables: [], departamento: DEPARTAMENTOS[0], solicitante: '', seccion_solicitante: ''
  });

  const [draggingSourceId, setDraggingSourceId] = useState(null);

  // 1. Carga inicial de datos y WebSockets (Realtime)
  const ticketActivoRef = useRef(null);
  useEffect(() => {
    ticketActivoRef.current = ticketActivo;
  }, [ticketActivo]);

  // 1. Carga inicial de datos y WebSockets (Realtime)
  useEffect(() => {
    fetchData();

    // Suscribirse a inserciones automáticas de tickets, usuarios y comentarios
    const subscription = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comentarios' }, (payload) => {
        // Solo agregar el comentario si pertenece al ticket que tenemos abierto
        if (ticketActivoRef.current && payload.new.ticket_id === ticketActivoRef.current.id) {
          // Refetch de los comentarios para traer el perfil del usuario (JOIN)
          fetchComentarios(ticketActivoRef.current.id);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
        if (user && payload.new.usuario_id === user.id && !payload.new.leida) {
          setNotificaciones(prev => [payload.new, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificaciones' }, (payload) => {
        if (user && payload.new.usuario_id === user.id) {
          if (payload.new.leida) {
            setNotificaciones(prev => prev.filter(n => n.id !== payload.new.id));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []); // Dependencias vacías al usar ticketActivoRef



  const handleEliminarComentarioConfirmado = async (comentarioId) => {
    setComentarioAEliminar(null);
    // Optimistic delete
    const prevComentarios = [...comentarios];
    setComentarios(prev => prev.filter(c => c.id !== comentarioId));

    const { error } = await supabase.from('comentarios').delete().eq('id', comentarioId);
    if (error) {
      console.error("Error eliminando comentario", error);
      alert("No se pudo eliminar el comentario: " + error.message);
      setComentarios(prevComentarios);
    }
  };

  const handleGuardarEdicionComentario = async (comentarioId) => {
    if (!textoEditado.trim()) return;

    // Optimistic update
    const prevComentarios = [...comentarios];
    setComentarios(prev => prev.map(c => c.id === comentarioId ? { ...c, texto: textoEditado.trim() } : c));
    setComentarioAEditar(null);

    const { error } = await supabase.from('comentarios').update({ texto: textoEditado.trim() }).eq('id', comentarioId);
    if (error) {
      console.error("Error editando comentario", error);
      alert("No se pudo editar el comentario: " + error.message);
      setComentarios(prevComentarios);
    }
  };

  const fetchData = async () => {
    const [ticketsRes, usuariosRes] = await Promise.all([
      supabase.from('tickets').select('*').order('fecha_creacion', { ascending: false }),
      supabase.from('usuarios').select('*').order('nombre', { ascending: true })
    ]);

    if (!ticketsRes.error && ticketsRes.data) {
      // Por compatibilidad con tickets viejos sin departamento, les asignamos Soporte Técnico por defecto al leerlos en memoria
      const ticketsMapeados = ticketsRes.data.map(t => ({
        ...t,
        departamento: t.departamento || 'Soporte Técnico'
      }));
      setTickets(ticketsMapeados);
    } else {
      console.error(ticketsRes.error);
    }

    if (!usuariosRes.error && usuariosRes.data) {
      setUsuarios(usuariosRes.data);
    } else {
      console.error(usuariosRes.error);
    }

    if (user) {
      fetchNotificaciones();
    }

    setLoading(false);
  };

  const fetchNotificaciones = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('leida', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotificaciones(data);
    }
  };

  // Convertimos la lista de la BD al formato requerido por las columnas Y filtramos por DEPARTAMENTO ACTIVO
  const columnasData = React.useMemo(() => {
    return COLUMNAS_BASE.reduce((acc, colName) => {
      acc[colName] = tickets.filter(t => {
        const matchesEstado = t.estado === colName;
        const matchesDepto = t.departamento === departamentoActivo;

        return matchesEstado && matchesDepto;
      });
      return acc;
    }, {});
  }, [tickets, departamentoActivo]);

  // 2. Drag & Drop - Actualización optimista con reordenamiento
  const onDragEnd = async (result) => {
    setDraggingSourceId(null);
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // Si no cambió ni su columna ni posición, salimos.
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const localTickets = [...tickets];
    const ticketIndex = localTickets.findIndex(t => t.id.toString() === draggableId.toString());

    if (ticketIndex === -1) return;

    const ticketToMove = localTickets[ticketIndex];
    const estadoPrevio = ticketToMove.estado;
    const estadoNuevo = destination.droppableId;
    const oldDate = ticketToMove.fecha_creacion;

    // --- LÓGICA DE REORDENAMIENTO VIA FECHA ---
    // Calculamos una fecha nueva para insertarlo en la posición visual seleccionada
    let destColumnTickets = localTickets.filter(t => t.estado === estadoNuevo && t.departamento === departamentoActivo);
    destColumnTickets = destColumnTickets.filter(t => t.id.toString() !== draggableId.toString());

    let newDate = new Date();
    if (destColumnTickets.length === 0) {
      newDate = new Date(ticketToMove.fecha_creacion);
    } else if (destination.index === 0) {
      // Si va primero, le damos 1 segundo más que el que ahora está primero
      newDate = new Date(new Date(destColumnTickets[0].fecha_creacion).getTime() + 1000);
    } else if (destination.index >= destColumnTickets.length) {
      // Si va al final, 1 segundo menos que el que ahora está al final
      newDate = new Date(new Date(destColumnTickets[destColumnTickets.length - 1].fecha_creacion).getTime() - 1000);
    } else {
      // A la mitad
      const prevDate = new Date(destColumnTickets[destination.index - 1].fecha_creacion).getTime();
      const nextDate = new Date(destColumnTickets[destination.index].fecha_creacion).getTime();
      newDate = new Date((prevDate + nextDate) / 2);
    }
    const isoNewDate = newDate.toISOString();

    // ----- FASE 3: Lógica de Resolución Formal -----
    if (estadoNuevo === 'Resuelto' && estadoPrevio !== 'Resuelto') {
      setTicketAResolver({ ...ticketToMove, previousState: estadoPrevio, prevDate: oldDate, nuevaFecha: isoNewDate });
      setResolucionTexto('');
      setModalResolucionOpen(true);
      return;
    }
    // -----------------------------------------------

    // Update state locally
    ticketToMove.estado = estadoNuevo;
    ticketToMove.fecha_creacion = isoNewDate;
    localTickets.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    setTickets([...localTickets]);

    // Actualizamos asíncronamente en Supabase
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          estado: estadoNuevo,
          fecha_creacion: isoNewDate
        })
        .eq('id', ticketToMove.id);

      if (error) throw error;

      // Notificar a N8N del movimiento
      notificarN8n('ticket_movido', { ...ticketToMove, estado_nuevo: estadoNuevo });
    } catch (error) {
      console.error('Error moviendo ticket, haciendo rollback:', error);
      ticketToMove.estado = estadoPrevio;
      ticketToMove.fecha_creacion = oldDate;
      localTickets.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
      setTickets([...localTickets]);
    }
  };

  const confirmarResolucion = async () => {
    if (!resolucionTexto.trim() || !ticketAResolver) return;

    if (user) {
      const { error: errCom } = await supabase.from('comentarios').insert([{
        ticket_id: ticketAResolver.id,
        usuario_id: user.id,
        texto: `[RESOLUCIÓN OFICIAL]: ${resolucionTexto.trim()}`
      }]);
      if (errCom) console.error("Error guardando resolución en DB:", errCom);
    }

    const localTickets = [...tickets];
    const ticketIndex = localTickets.findIndex(t => t.id === ticketAResolver.id);
    if (ticketIndex !== -1) {
      localTickets[ticketIndex].estado = 'Resuelto';
      localTickets[ticketIndex].fecha_creacion = ticketAResolver.nuevaFecha;
      localTickets.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
      setTickets([...localTickets]);
    }

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          estado: 'Resuelto',
          fecha_creacion: ticketAResolver.nuevaFecha
        })
        .eq('id', ticketAResolver.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error confirmando resolución, rollback:', error);
      if (ticketIndex !== -1) {
        localTickets[ticketIndex].estado = ticketAResolver.previousState;
        localTickets[ticketIndex].fecha_creacion = ticketAResolver.prevDate;
        localTickets.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
        setTickets([...localTickets]);
      }
    }

    setModalResolucionOpen(false);
    setTicketAResolver(null);
    setResolucionTexto('');
  };

  const cancelarResolucion = () => {
    // Si cancela, no hacemos nada, porque el ticket nunca se movió (detuvimos onDragEnd)
    setModalResolucionOpen(false);
    setTicketAResolver(null);
    setResolucionTexto('');
  };

  // 3. Crear o Editar Ticket Manualmente
  const handleCrearTicket = async (eOrConfig) => {
    let configToUse = formConfig;
    if (eOrConfig && typeof eOrConfig.preventDefault === 'function') {
      eOrConfig.preventDefault();
    } else if (eOrConfig && typeof eOrConfig === 'object') {
      configToUse = eOrConfig;
    }

    const { id, titulo, descripcion, area, prioridad, responsables, departamento, solicitante, seccion_solicitante } = configToUse;
    const responsable = responsables.length > 0 ? responsables.join(', ') : '';

    let data, error;

    if (id) {
      // Editar ticket existente
      const res = await supabase
        .from('tickets')
        .update({ titulo, descripcion, area, prioridad, responsable, departamento, solicitante, seccion_solicitante })
        .eq('id', id)
        .select();
      data = res.data;
      error = res.error;
    } else {
      // Crear nuevo ticket
      const res = await supabase
        .from('tickets')
        .insert([{ titulo, descripcion, area, prioridad, estado: 'Solicitud', responsable, departamento, solicitante, seccion_solicitante }])
        .select();
      data = res.data;
      error = res.error;

      // Fase 4: Enviar notificaciones a todos los usuarios registrados
      if (!error && data && data.length > 0 && user) {
        const nuevoTicketId = data[0].id;

        // Crear las notificaciones para todos EXCEPTO para el que acaba de crearlo
        const notificacionesPayload = usuarios
          .filter(u => u.id !== user.id)
          .map(u => ({
            usuario_id: u.id,
            ticket_id: nuevoTicketId,
            mensaje: `"${titulo}" en ${departamento}`,
            leida: false
          }));

        if (notificacionesPayload.length > 0) {
          // Fire and forget, no bloqueamos la interfaz
          supabase.from('notificaciones').insert(notificacionesPayload).then(({ error: notifError }) => {
            if (notifError) console.error("Error al despachar notificaciones:", notifError);
          });
        }
      }
    }

    if (!error) {
      setModalOpen(false);
      setFormConfig({ id: null, titulo: '', descripcion: '', area: '', prioridad: 'Media', responsables: [], departamento: departamentoActivo });
      if (data && data.length > 0) {
        if (id) {
          // Si se estaba editando, se actualizan los datos en el estado local actual
          setTickets(prev => prev.map(t => t.id === id ? { ...t, ...data[0] } : t));
          // Y si el detalle está abierto, lo cerramos para evitar desincronizaciones visuales
          setDetalleOpen(false);
          setTicketActivo(null);
        } else {
          setTickets(prev => [data[0], ...prev]);
        }

        // Notificar a N8N (Creación o Edición)
        notificarN8n(id ? 'ticket_editado' : 'ticket_creado', data[0]);
      }
    } else {
      console.error('Error al crear ticket', error);
      alert('Error en Supabase: Asegúrate de haber actualizado el tipo ENUM "ticket_estado" para incluir "Solicitud" y "En espera"');
    }
  };

  // 4. Crear Usuario
  const handleCrearUsuario = async (e) => {
    console.log("▶ Iniciando handleCrearUsuario...");
    e.preventDefault();
    console.log("Valores formUsuario:", formUsuario);
    if (!formUsuario.nombre || !formUsuario.email || !formUsuario.dependencia || !formUsuario.piso || !formUsuario.rol) {
      console.warn("Faltan campos obligatorios");
      alert("Por favor completa todos los campos.");
      return;
    }

    try {
      console.log("Creando cliente aislado de supabase...");
      // Usamos una instancia aislada para no interferir con la sesión actual del Administrador
      const { createClient } = await import('@supabase/supabase-js');
      const authSupabase = createClient(
        'https://deftutfyjpdlneiyzejm.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZnR1dGZ5anBkbG5laXl6ZWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTU1MzEsImV4cCI6MjA4NzY5MTUzMX0.LHP2e4eZ-CIwHvKMCQhKXK-TOH6XJBvK7si9E_DBGSA',
        { auth: { persistSession: false, storageKey: 'dummy-admin-key' } }
      );

      console.log("Paso 1: Llamando auth.signUp...");
      // 1. Crear usuario en Auth con constraseña temporal
      const { data: authData, error: authError } = await authSupabase.auth.signUp({
        email: formUsuario.email,
        password: 'Cti1234',
      });

      if (authError) {
        if (authError.message.includes('registered')) {
          alert(`⚠️ EL CORREO YA ESTÁ EN USO (Usuario Oculto)\n\nEl correo "${formUsuario.email}" pertenece a un usuario que eliminaste de esta lista, pero Supabase NO lo elimina automáticamente de su registro de Autenticación por medidas de seguridad.\n\nCÓMO ARREGLARLO:\n1. Entra a tu panel de Supabase en tu navegador.\n2. Ve al menú "Authentication" -> sección "Users".\n3. Busca el correo "${formUsuario.email}".\n4. Presiona los 3 puntitos y elige "Delete user".\n\nUna vez eliminado de allí, podrás volver a crearlo aquí sin problema.`);
          return;
        }
        console.error("❌ Error creating auth user:", authError);
        alert(`Error al crear la cuenta: ${authError.message}`);
        return;
      }

      console.log("✅ Usuario auth creado:", authData.user.id);
      console.log("Paso 2: Insertando en tabla pública...");

      // 2. Insertar en la tabla pública de usuarios (el trigger del backend también podría hacerlo, pero lo hacemos manual por los campos extra)
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{
          id: authData.user.id,
          nombre: formUsuario.nombre,
          email: formUsuario.email,
          dependencia: formUsuario.dependencia,
          piso: formUsuario.piso,
          rol: formUsuario.rol
        }])
        .select();

      if (error) {
        console.error("❌ Error inserting public profile:", error);
        // Podríamos intentar borrar el auth user aquí para compensar, pero dejémoslo simple
        alert("Error al insertar perfil en BD");
      }

      if (!error && data && data.length > 0) {
        console.log("✅ Perfil insertado exitosamente!", data[0]);
        setFormUsuario({ nombre: '', email: '', dependencia: '', piso: '', rol: 'Soporte Tecnico' });
        // Actualizamos el estado local inmediatamente
        setUsuarios(prev => {
          const nuevosUsuarios = [...prev, data[0]];
          return nuevosUsuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));
        });
        alert(`Usuario creado con éxito.\nContraseña temporal secreta: Cti1234`);
      }
    } catch (e) {
      console.error("❌ Catch error:", e);
      alert("Ocurrió un error inesperado al crear el usuario.");
    }
  };
  // Aquí terminaba handleCrearUsuario

  // 5. Eliminar Usuario
  const handleEliminarUsuario = async () => {
    if (!usuarioAEliminar) return;

    // Usamos .select() para verificar si la base de datos realmente eliminó la fila
    const { data, error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', usuarioAEliminar.id)
      .select();

    if (error) {
      console.error('Error al eliminar usuario', error);
      alert('Error al eliminar el usuario.');
    } else if (data && data.length === 0) {
      alert('⚠️ No se pudo eliminar el usuario de la base de datos porque las políticas de seguridad (RLS) de Supabase están bloqueando la acción o el usuario está en uso.\n\nPor favor, habilita la política "Enable delete for all users" en la tabla "usuarios" desde el panel de Supabase.');
      setUsuarioAEliminar(null);
    } else {
      setUsuarios(prev => prev.filter(u => u.id !== usuarioAEliminar.id)); // Instantáneo
      setUsuarioAEliminar(null);
    }
  };

  // 5b. Editar Rol de Usuario
  const handleEditarRolUsuario = async (userId, nuevoRol) => {
    // Optimistic UI Update para sentirlo instantáneo
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rol: nuevoRol } : u));
    setRolesEditados(prev => { const temp = { ...prev }; delete temp[userId]; return temp; });

    const { error } = await supabase
      .from('usuarios')
      .update({ rol: nuevoRol })
      .eq('id', userId);

    if (error) {
      console.error('Error al actualizar el rol', error);
      alert('Error al guardar el nuevo rol en la base de datos. Verifica tus permisos RLS.');
      // Revertir (idealmente se debe re-fechetear)
      fetchData();
    }
  };

  // 5c. Editar Nombre de Usuario
  const handleEditarNombreUsuario = async (userId, nuevoNombre) => {
    if (!nuevoNombre || !nuevoNombre.trim()) return;
    const nombreLimpio = nuevoNombre.trim();
    // Optimistic UI Update
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, nombre: nombreLimpio } : u));
    setNombresEditados(prev => { const temp = { ...prev }; delete temp[userId]; return temp; });

    const { error } = await supabase
      .from('usuarios')
      .update({ nombre: nombreLimpio })
      .eq('id', userId);

    if (error) {
      console.error('Error al actualizar el nombre', error);
      alert('Error al guardar el nuevo nombre en la base de datos.');
      fetchData();
    }
  };

  // 6. Eliminar Ticket
  const handleEliminarTicket = async () => {
    if (!ticketAEliminar) return;

    // Usamos .select() para verificar si la base de datos realmente eliminó la fila
    const { data, error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketAEliminar.id)
      .select();

    if (error) {
      console.error('Error al eliminar ticket', error);
      alert('Error al eliminar el ticket.');
    } else if (data && data.length === 0) {
      alert('⚠️ No se pudo eliminar el ticket de la base de datos porque las políticas de seguridad (RLS) de Supabase están bloqueando la acción.\n\nPor favor, revisa los permisos en la tabla "tickets" desde tu panel de Supabase.');
      setTicketAEliminar(null);
    } else {
      setTickets(prev => prev.filter(t => t.id !== ticketAEliminar.id)); // Instantáneo
      setTicketAEliminar(null);
      setDetalleOpen(false);
      setTicketActivo(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-300">
        <div className="px-8 py-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl text-[#065E94] font-semibold tracking-wide flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#065E94] border-t-transparent rounded-full animate-spin"></div>
          Cargando sistema...
        </div>
      </div>
    );
  }
  return (
    <div
      className={`glass-layout h-full flex flex-col p-8 font-sans transition-colors duration-500 bg-slate-300 dark:bg-[var(--bg-main)] dark:bg-none overflow-hidden`}
    >
      <div className="max-w-[1600px] w-full mx-auto flex flex-col flex-1 min-h-0">
        <header className="glass-header relative z-50 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#065E94] to-[#043d63] dark:bg-none dark:text-white tracking-tight">
              Ticketera CTI
            </h1>

          </div>

          <div className="flex-1 max-w-md mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <svg className="w-4 h-4 text-slate-600 dark:text-neutral-400 group-focus-within:text-[#065E94] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar tickets..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="w-full bg-white/60 dark:bg-[var(--bg-secondary)]/70 border border-white/80 dark:border-[var(--border-accent)] backdrop-blur-md rounded-2xl py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#065E94]/30 dark:focus:ring-blue-500/30 transition-all placeholder:text-slate-500 dark:placeholder:text-neutral-300 shadow-sm"
            />

            {/* Menú de Búsqueda Avanzada (Estilo Trello) */}
            {showSearchDropdown && busqueda.trim() !== '' && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowSearchDropdown(false)}></div>
                <div className="absolute top-12 left-0 w-full md:w-[500px] bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-white/60 dark:border-[var(--border-accent)] z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-[var(--border-accent)]/60 bg-slate-50/50 dark:bg-white/5">
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-[0.2em]">Tarjetas</p>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {(() => {
                      const term = busqueda.toLowerCase().trim();
                      const filtered = tickets.filter(t => {
                        const dateStr = t.fecha_creacion ? new Date(t.fecha_creacion).toLocaleDateString() : '';
                        return t.titulo?.toLowerCase().includes(term) ||
                          t.solicitante?.toLowerCase().includes(term) ||
                          t.responsable?.toLowerCase().includes(term) ||
                          t.id?.toString().includes(term) ||
                          dateStr.includes(term);
                      }).slice(0, 8);

                      if (filtered.length === 0) {
                        return (
                          <div className="p-8 text-center">
                            <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">No se encontraron resultados</p>
                          </div>
                        );
                      }

                      return filtered.map(t => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setTicketActivo(t);
                            setDetalleOpen(true);
                            fetchComentarios(t.id);
                            setShowSearchDropdown(false);
                            setBusqueda('');
                          }}
                          className="p-4 hover:bg-blue-50/80 dark:hover:bg-white/5 cursor-pointer transition-colors flex items-start gap-4 border-b border-slate-50 dark:border-white/5 last:border-0 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 group-hover:bg-white dark:group-hover:bg-white/20 transition-colors">
                            <svg className="w-5 h-5 text-slate-500 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <p className="text-[14px] font-extrabold text-slate-800 dark:text-white leading-tight mb-0.5 truncate group-hover:text-[#065E94] dark:group-hover:text-blue-400 transition-colors">
                              {t.titulo}
                            </p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 leading-tight mb-1.5 truncate">
                              Fecha: {new Date(t.fecha_creacion).toLocaleDateString()} | Asignado a: {t.responsable || 'Sin asignar'} | Solicitante: {t.solicitante || 'Desconocido'}
                            </p>
                            <p className="text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                              {t.departamento === 'Soporte Técnico' ? 'MESA DE AYUDA' : t.departamento}: {t.estado.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="p-3 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-[var(--border-accent)]/60 flex items-center gap-2 text-slate-500 dark:text-neutral-400 cursor-pointer hover:text-[#065E94] dark:hover:text-blue-400 transition-colors group">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">Búsqueda avanzada</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-4">
                {/* Campanita de Notificaciones */}
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 dark:bg-[var(--bg-secondary)] border border-white/80 dark:border-[var(--border-accent)] shadow-[0_4px_20px_-4px_rgba(6,94,148,0.2)] dark:shadow-none backdrop-blur-md dark:backdrop-blur-none cursor-help transition-all duration-300 hover:bg-white/90 dark:hover:bg-[var(--bg-hover)] hover:-translate-y-1 group ">
                  <svg className={`w-5 h-5 text-[#065E94] dark:text-neutral-300 transition-transform ${notificaciones.length > 0 ? 'group-hover:animate-swing' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificaciones.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] dark:shadow-none animate-pulse-glow ">
                      {notificaciones.length > 9 ? '9+' : notificaciones.length}
                    </span>
                  )}
                  {/* Tooltip */}
                  <div className="absolute top-14 right-0 w-[340px] bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-white/60 dark:border-[var(--border-accent)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border-accent)]/60 pb-3">
                      <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#065E94] dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        Notificaciones
                      </p>
                      <span className="text-[10px] font-bold bg-[#065E94] text-white px-2 py-0.5 rounded-full shadow-sm">{notificaciones.length}</span>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                      {notificaciones.length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center opacity-70">
                          <svg className="w-10 h-10 mb-2 text-[#065E94]/40 dark:text-blue-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                          <p className="text-sm font-bold text-slate-600 dark:text-neutral-300">Todo al día</p>
                          <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">No tienes notificaciones pendientes.</p>
                        </div>
                      ) : (
                        notificaciones.slice(0, 5).map(n => {
                          const tkt = tickets.find(t => t.id === n.ticket_id);
                          return (
                            <div
                              key={n.id}
                              className="relative bg-slate-50/80 dark:bg-[var(--bg-main)]/50 p-3 rounded-xl cursor-pointer hover:bg-blue-50/80 dark:hover:bg-[var(--bg-hover)] transition-all border border-slate-100 dark:border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 group/notif flex items-start gap-3 shadow-sm dark:shadow-none"
                              onClick={() => {
                                if (tkt) {
                                  setTicketActivo(tkt);
                                  setDetalleOpen(true);
                                  fetchComentarios(n.ticket_id);
                                  setNotificaciones(prev => prev.filter(x => x.id !== n.id));
                                  supabase.from('notificaciones').update({ leida: true }).eq('id', n.id).then(({ error }) => { if (error) console.error(error); });
                                } else {
                                  alert("El ticket de la notificación ya no existe o no se puede cargar.");
                                }
                              }}
                            >
                              <div className="absolute top-1 right-1 opacity-0 group-hover/notif:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNotificaciones(prev => prev.filter(x => x.id !== n.id));
                                    supabase.from('notificaciones').update({ leida: true }).eq('id', n.id).then(({ error }) => { if (error) console.error(error); });
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
                                  title="Descartar notificación"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                              <div className="mt-1 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800/60 shadow-inner">
                                <svg className="w-4 h-4 text-[#065E94] dark:text-blue-400 group-hover/notif:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </div>
                              <div className="flex flex-col min-w-0 flex-1 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-[#065E94] dark:text-blue-400 drop-shadow-sm">Nuevo ticket</span>
                                  {tkt && (
                                    <span className={`text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded-md border ${getPrioridadColor(tkt.prioridad)}`}>{tkt.prioridad}</span>
                                  )}
                                </div>
                                <p className="text-[11px] font-medium text-slate-600 dark:text-neutral-300 leading-tight mb-1" title={n.mensaje}>
                                  {n.mensaje}
                                </p>
                                {tkt && (tkt.solicitante || tkt.seccion_solicitante) && (
                                  <div className="flex items-center gap-1.5 mt-0.5 mb-1.5 text-[10px] font-bold text-slate-500 dark:text-neutral-400">
                                    <svg className="w-3.5 h-3.5 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
                                    <span className="truncate max-w-[170px]">{tkt.solicitante || tkt.seccion_solicitante}</span>
                                  </div>
                                )}
                                {tkt && (
                                  <div className="flex items-center justify-between mt-0.5 border-t border-slate-100 dark:border-white/5 pt-1.5">
                                    <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{tkt.area || 'Soporte'}</span>
                                    <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">{new Date(n.created_at || tkt.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {notificaciones.length > 5 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-[var(--border-accent)]/50 text-center">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">+{notificaciones.length - 5} notificaciones adicionales</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setModalPerfilOpen(true)}
                  className="hidden md:flex items-center gap-3 bg-white/80 dark:bg-[var(--bg-secondary)] px-4 py-2.5 rounded-xl border border-blue-100 dark:border-[var(--border-accent)] shadow-[0_4px_15px_-3px_rgba(6,94,148,0.15)] dark:shadow-none hover:-translate-y-1 transition-all duration-300 hover:bg-blue-50 dark:hover:bg-[var(--bg-hover)] mr-2 relative"
                  title="Ver perfil y contraseña"
                >

                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-[var(--bg-secondary)] text-[#065E94] dark:text-neutral-300 font-bold flex items-center justify-center text-[10px]">
                    {getInicial(usuarios.find(u => u.id === user.id)?.nombre || user?.email)}
                  </div>
                  <span className="text-sm font-semibold text-[#065E94] dark:text-white leading-none">
                    {(usuarios.find(u => u.id === user.id)?.nombre || user.email).split(' ')[0]}
                  </span>
                </button>
              </div>
            )}


            {user?.rol !== 'Director' && user?.rol !== 'Visualizador' && (
              <button
                onClick={() => {
                  setFormConfig({ id: null, titulo: '', descripcion: '', area: '', prioridad: 'Media', responsables: [], departamento: departamentoActivo, solicitante: '', seccion_solicitante: '' });
                  setModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#065E94] dark:text-white bg-white/80 dark:bg-[var(--bg-secondary)] hover:bg-blue-50 dark:hover:bg-[var(--bg-hover)] shadow-[0_4px_15px_-3px_rgba(6,94,148,0.15)] dark:shadow-none hover:-translate-y-1 dark:hover:-translate-y-0 transition-all duration-300 border border-blue-100 dark:border-[var(--border-accent)] backdrop-blur-md dark:backdrop-blur-none flex items-center gap-2"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuevo Ticket
              </button>
            )}

            <button
              onClick={() => {
                if (user?.rol === 'Administrador' || user?.rol === 'Jefe de Departamento') {
                  setFormConfig({ id: null, titulo: '', descripcion: '', area: '', prioridad: 'Media', responsables: [], departamento: departamentoActivo, solicitante: '', seccion_solicitante: '' });
                }
                setModalUsuariosOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#065E94] dark:text-white bg-white/80 dark:bg-[var(--bg-secondary)] hover:bg-blue-50 dark:hover:bg-[var(--bg-hover)] shadow-[0_4px_15px_-3px_rgba(6,94,148,0.15)] dark:shadow-none hover:-translate-y-1 dark:hover:-translate-y-0 transition-all duration-300 border border-blue-100 dark:border-[var(--border-accent)] backdrop-blur-md dark:backdrop-blur-none flex items-center gap-2"
            >
              {user?.rol === 'Administrador' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Gestión de Usuarios
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  Directorio
                </>
              )}
            </button>
            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-white/80 dark:bg-[var(--bg-secondary)] hover:bg-red-50 dark:hover:bg-[var(--bg-hover)] shadow-[0_4px_15px_-3px_rgba(239,68,68,0.1)] hover:shadow-[0_8px_25px_-5px_rgba(239,68,68,0.2)] dark:shadow-none hover:-translate-y-1 dark:hover:-translate-y-0 transition-all duration-300 border border-red-100 dark:border-[var(--border-accent)] backdrop-blur-md dark:backdrop-blur-none flex items-center gap-2"
              title="Cerrar Sesión"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* Pestañas de Navegación de Departamentos */}
        <div className="mb-8 border-b-2 border-slate-200/60 dark:border-[var(--border-accent)] flex gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {DEPARTAMENTOS.filter(dep => {
            if (user?.rol === 'Soporte Tecnico') {
              return dep === 'Soporte Técnico';
            }
            return true;
          }).map(dep => (
            <button
              key={dep}
              onClick={() => setDepartamentoActivo(dep)}
              className={`pb-4 px-2 text-lg font-bold transition-all relative whitespace-nowrap [html.theme-wallpaper_&]:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${departamentoActivo === dep
                ? 'text-[#065E94] dark:text-blue-300'
                : 'text-slate-400 dark:text-neutral-300 hover:text-[#043d63] dark:hover:text-white'
                }`}
            >
              <div className="flex items-center gap-2">
                {dep === 'Soporte Técnico' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                {dep === 'Telefonía' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                {dep}
              </div>

              {/* Indicador Activo Inferior */}
              {departamentoActivo === dep && (
                <div className="absolute -bottom-[2px] left-0 w-full h-[2px] bg-gradient-to-r from-[#065E94] to-[#043d63] dark:from-blue-400 dark:to-cyan-400"></div>
              )}
            </button>
          ))}
        </div>

        {/* Tablero Kanban */}
        <DragDropContext onDragEnd={onDragEnd} onDragStart={(start) => setDraggingSourceId(start.source.droppableId)}>
          <div className="flex gap-6 pb-4 items-start flex-1 min-h-0 overflow-x-auto overflow-y-hidden w-full px-2">
            {COLUMNAS_BASE.map(columnId => (
              <div
                key={columnId}
                className={`glass-column flex-shrink-0 w-[340px] flex flex-col rounded-2xl p-2 bg-slate-200/60 dark:bg-[var(--bg-column)] border border-slate-300/50 dark:border-[var(--border-accent)]/30 max-h-[680px] min-h-[250px] shadow-sm relative transition-all duration-200 ${draggingSourceId === columnId ? 'z-[1000]' : 'z-0'}`}
              >
                <div className="flex justify-between items-center mb-3 pt-2 px-3">
                  <h2 className="font-extrabold text-slate-700/80 dark:text-neutral-200 text-[15px] uppercase tracking-wide">{columnId}</h2>
                  <span className="text-xs bg-slate-300/50 dark:bg-[var(--bg-secondary)] text-slate-600 dark:text-neutral-300 px-2 py-1 rounded-md font-bold shadow-sm">
                    {columnasData[columnId].length}
                  </span>
                </div>

                <Droppable droppableId={columnId}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 overflow-y-auto min-h-[150px] space-y-3.5 px-2 pb-6 pt-1 transition-colors duration-300 ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-[var(--bg-secondary)]/50 rounded-2xl ring-2 ring-[#065E94]/30 dark:ring-[var(--border-accent)] shadow-inner dark:shadow-none' : ''
                        }`}
                    >
                      {columnasData[columnId].length === 0 && !snapshot.isDraggingOver ? (
                        <div className="h-[200px] flex flex-col items-center justify-center p-6 text-center rounded-xl border-2 border-dashed border-slate-300 dark:border-[var(--border-accent)]/40 bg-slate-100/50 dark:bg-black/20 m-2 transition-colors">
                          <svg className="w-10 h-10 mb-3 text-slate-400 dark:text-slate-500 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">Columna vacía</p>
                          <p className="text-xs font-medium text-slate-400 dark:text-neutral-500 mt-1">Arrastra tickets aquí</p>
                        </div>
                      ) : (
                        columnasData[columnId].map((ticket, index) => (
                          <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            index={index}
                            onClick={handleTicketClick}
                            isReadOnly={user?.rol === 'Director' || user?.rol === 'Visualizador'}
                          />
                        ))
                      )}
                      {provided.placeholder}
                      {/* Personalización visual del placeholder (el espacio vacío que deja el ticket al arrastrarse) */}
                      {snapshot.isDraggingOver && provided.placeholder && (
                        <div className="absolute opacity-0" />
                      )}
                    </div>
                  )}
                </Droppable>


              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
      {/* ===== TEMA TOGGLE (FLOTANTE - 4 ESTADOS) ===== */}
      <div className="fixed bottom-8 right-8 bg-white/80 dark:bg-[var(--bg-secondary)]/80 backdrop-blur-xl border border-slate-200/80 dark:border-[var(--border-accent)] p-1.5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-1 z-50 group hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:hover:shadow-[0_8px_30px_rgba(29,78,216,0.3)] transition-shadow duration-300">

        {/* Fondo del Slider Activo */}
        <div
          className="absolute h-10 w-10 rounded-full shadow-md transition-all duration-500 ease-out"
          style={{
            transform: `translateX(${themeMode === 'light' ? '0px' :
              themeMode === 'blue' ? '44px' :
                themeMode === 'dark' ? '88px' : '132px'
              })`,
            backgroundColor: themeMode === 'light' ? '#ffffff' : themeMode === 'blue' ? '#172554' : themeMode === 'dark' ? '#1c1c1c' : 'rgba(255,255,255,0.15)',
            border: `1px solid ${themeMode === 'light' ? '#e2e8f0' : themeMode === 'blue' ? '#1d4ed8' : themeMode === 'dark' ? '#3f3f3f' : 'rgba(255,255,255,0.4)'}`,
            backdropFilter: themeMode === 'wallpaper' ? 'blur(12px)' : 'none',
          }}
        />

        {/* Sol (Modo Claro) */}
        <button
          onClick={() => setThemeMode('light')}
          className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full group/btn transition-transform active:scale-95"
          title="Modo Claro"
        >
          <svg className={`w-5 h-5 transition-colors duration-300 ${themeMode === 'light' ? 'text-amber-500' : 'text-slate-400 group-hover/btn:text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={themeMode === 'light' ? 2.5 : 2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>

        {/* Mitad Sol / Mitad Luna (Azul Vibrante) */}
        <button
          onClick={() => setThemeMode('blue')}
          className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full group/btn transition-transform active:scale-95"
          title="Modo Azul Vibrante"
        >
          <svg className={`w-5 h-5 transition-colors duration-300 ${themeMode === 'blue' ? 'text-blue-400' : 'text-slate-400 group-hover/btn:text-blue-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="3" y1="21" x2="21" y2="3" strokeWidth="2.5" strokeLinecap="round" />
            <g transform="translate(1, 1) scale(0.45)">
              <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
              <path strokeWidth="3.5" strokeLinecap="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
            </g>
            <g transform="translate(12, 12) scale(0.45)">
              <path fill="currentColor" stroke="none" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </g>
          </svg>
        </button>

        {/* Luna (Oscuro) */}
        <button
          onClick={() => setThemeMode('dark')}
          className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full group/btn transition-transform active:scale-95"
          title="Modo Oscuro"
        >
          <svg className={`w-5 h-5 transition-colors duration-300 ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-400 group-hover/btn:text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={themeMode === 'dark' ? 2.5 : 2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>

        {/* Liquid Glass (Fondo de Pantalla) */}
        <button
          onClick={() => { setThemeMode('wallpaper'); setWallpaperModalOpen(true); }}
          className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full group/btn transition-transform active:scale-95"
          title="Liquid Glass — Fondo de Pantalla"
        >
          <svg className={`w-5 h-5 transition-colors duration-300 ${themeMode === 'wallpaper' ? 'text-cyan-300' : 'text-slate-400 group-hover/btn:text-cyan-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={themeMode === 'wallpaper' ? 2.5 : 2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* ===== WALLPAPER PICKER MODAL ===== */}
      {wallpaperModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setWallpaperModalOpen(false); }}
        >
          <div className="bg-[#1a1a2e]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] w-full max-w-4xl p-8 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🖼️</span> Fondo de pantalla
                </h2>
                <p className="text-sm text-white/50 mt-1 uppercase tracking-widest">Elegí un fondo</p>
              </div>
              <button
                onClick={() => setWallpaperModalOpen(false)}
                className="text-white/40 hover:text-white/80 transition-colors bg-white/10 hover:bg-white/20 p-2.5 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-6 max-h-[600px] overflow-y-auto p-5 custom-scrollbar">
              {WALLPAPERS.map(wp => (
                <button
                  key={wp.id}
                  onClick={() => { setActiveWallpaper(wp.id); }}
                  className={`relative rounded-2xl overflow-hidden aspect-video group transition-all duration-300 ${activeWallpaper === wp.id
                    ? 'ring-4 ring-cyan-400 ring-offset-4 ring-offset-[#1a1a2e] scale-[1.02]'
                    : 'hover:scale-[1.03] hover:ring-2 hover:ring-white/30'
                    }`}
                >
                  {wp.thumb ? (
                    <img
                      src={wp.thumb}
                      alt={wp.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-white/40">
                      <span className="text-3xl mb-2">🚫</span>
                      <span className="text-sm font-semibold">Sin Fondo</span>
                    </div>
                  )}
                  {/* Label overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-3">
                    <span className="text-sm font-bold text-white">{wp.label}</span>
                  </div>
                  {/* Selected check */}
                  {activeWallpaper === wp.id && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cyan-400 flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-[#1a1a2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setWallpaperModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#1a1a2e] font-bold text-sm transition-all shadow-lg shadow-cyan-500/30"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Perfil y Contraseña */}
      {modalPerfilOpen && (
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 opacity-100 transition-opacity animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) setModalPerfilOpen(false) }}>
          <div className="bg-white/90 dark:bg-[var(--bg-secondary)] backdrop-blur-2xl dark:backdrop-blur-none rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-none w-full max-w-md p-8 border border-white/60 dark:border-[var(--border-accent)] transform transition-all animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] dark:from-[#2a83bd] dark:to-[#4ea8de]">
                Mi Perfil
              </h2>
              <button onClick={() => setModalPerfilOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-100 dark:bg-[var(--bg-secondary)] p-2 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-[var(--bg-secondary)] p-5 rounded-2xl border border-slate-100 dark:border-[var(--border-accent)]/30 mb-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-[var(--bg-secondary)] text-[#065E94] dark:text-white text-xl font-bold flex items-center justify-center shadow-inner shrink-0">
                {getInicial(usuarios.find(u => u.id === user.id)?.nombre || user?.email)}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-lg font-bold text-slate-800 dark:text-white truncate" title={usuarios.find(u => u.id === user.id)?.nombre || user.email}>
                  {usuarios.find(u => u.id === user.id)?.nombre || user.email}
                </span>
                <span className="text-sm text-slate-500 dark:text-neutral-400 truncate" title={user.email}>{user.email}</span>
                <span className="mt-1 inline-block text-[10px] uppercase font-bold text-[#065E94] dark:text-blue-400 tracking-wider bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md w-max border border-blue-100/50 dark:border-blue-800/50">
                  {usuarios.find(u => u.id === user.id)?.rol || 'Rol Desconocido'}
                </span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-[var(--border-accent)] pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">Cambiar Contraseña</span>

            </h3>
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">Nueva Contraseña</label>
                <input required minLength={6} type="password" value={passwordForm.nueva} onChange={e => setPasswordForm({ ...passwordForm, nueva: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">Confirmar Nueva Contraseña</label>
                <input required minLength={6} type="password" value={passwordForm.confirmar} onChange={e => setPasswordForm({ ...passwordForm, confirmar: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all" placeholder="Repite la nueva contraseña" />
              </div>
              <button type="submit" disabled={cambiandoReq} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-[0_4px_15px_-3px_rgba(6,94,148,0.2)] dark:shadow-none transition-all hover:-translate-y-0.5 mt-2 disabled:opacity-50">
                {cambiandoReq ? 'Guardando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Creación/Edición (Glassmorphism) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 opacity-100 transition-opacity animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="bg-white/90 dark:bg-[var(--bg-secondary)] backdrop-blur-2xl dark:backdrop-blur-none rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-none w-full max-w-md p-8 border border-white/60 dark:border-[var(--border-accent)] transform transition-all animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] dark:from-[#2a83bd] dark:to-[#4ea8de]">
                {formConfig.id ? (user?.rol === 'Soporte Tecnico' ? 'Ver Ticket' : 'Editar Ticket') : 'Nuevo Ticket'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-100 dark:bg-[var(--bg-secondary)] p-2 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <TicketForm
              initialConfig={formConfig}
              onSubmit={handleCrearTicket}
              onCancel={() => setModalOpen(false)}
              user={user}
              usuarios={usuarios}
            />
          </div>
        </div>
      )}

      {/* Modal - Gestión de Usuarios (Glassmorphism) */}
      {modalUsuariosOpen && (
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 opacity-100 transition-opacity animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) setModalUsuariosOpen(false) }}>
          <div className="bg-white/90 dark:bg-[var(--bg-secondary)] backdrop-blur-2xl dark:backdrop-blur-none rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-none w-full max-w-4xl p-10 border border-white/60 dark:border-[var(--border-accent)] flex flex-col md:flex-row gap-12 animate-in zoom-in-95 duration-300">
            {/* Formulario Izquierda (Solo Admin) */}
            {(user?.rol === 'Administrador' || user?.rol === 'Jefe de Departamento') && (
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] dark:from-[#2a83bd] dark:to-[#4ea8de]">Gestión de Usuarios</h2>
                <form onSubmit={handleCrearUsuario} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                    <input required autoFocus type="text" value={formUsuario.nombre} onChange={e => setFormUsuario({ ...formUsuario, nombre: e.target.value })} className="w-full bg-white/50 dark:bg-[var(--bg-main)] border border-slate-200/60 dark:border-[var(--border-accent)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Juan Pérez" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                    <input required type="email" value={formUsuario.email} onChange={e => setFormUsuario({ ...formUsuario, email: e.target.value })} className="w-full bg-white/50 dark:bg-[var(--bg-main)] border border-slate-200/60 dark:border-[var(--border-accent)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="ejemplo@correo.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Dependencia</label>
                    <input required type="text" value={formUsuario.dependencia} onChange={e => setFormUsuario({ ...formUsuario, dependencia: e.target.value })} className="w-full bg-white/50 dark:bg-[var(--bg-main)] border border-slate-200/60 dark:border-[var(--border-accent)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. RRHH, Presidencia..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Piso</label>
                    <input required type="text" value={formUsuario.piso} onChange={e => setFormUsuario({ ...formUsuario, piso: e.target.value })} className="w-full bg-white/50 dark:bg-[var(--bg-main)] border border-slate-200/60 dark:border-[var(--border-accent)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. 1, 2, PB..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Rol del Sistema</label>
                    <select
                      value={formUsuario.rol}
                      onChange={e => setFormUsuario({ ...formUsuario, rol: e.target.value })}
                      className="w-full bg-white/50 dark:bg-[var(--bg-main)] border border-slate-200/60 dark:border-[var(--border-accent)] dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none cursor-pointer"
                    >
                      <option value="Administrador">Administrador (Acceso Total)</option>
                      <option value="Mesa de ayuda">Mesa de ayuda (Acceso a Ambos Tableros)</option>
                      <option value="Soporte Tecnico">Soporte Técnico (Solo Panel Soporte)</option>
                      <option value="Director">Director (Ver todo / No crear ni mover)</option>
                      <option value="Visualizador">Visualizador (Ver todo / No crear ni mover)</option>
                      <option value="Jefe de Departamento">Jefe de Departamento (Acceso Total)</option>
                    </select>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-start gap-3 mt-2">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>
                      <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-1">Información Importante</p>
                      <p className="text-[11px] text-red-600/90 dark:text-red-200/80 leading-relaxed">
                        El usuario se creará con la contraseña temporal: <span className="font-mono font-bold bg-white dark:bg-black/30 px-1.5 py-0.5 rounded text-red-700 dark:text-red-300">Cti1234</span><br />
                        Al iniciar sesión por primera vez, el sistema le pedirá al usuario que la cambie obligatoriamente por motivos de seguridad.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button type="submit" className="w-full px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5">Crear Usuario</button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista Derecha */}
            {/* Lista Derecha */}
            <div className={`flex flex-col h-[500px] ${(user?.rol === 'Administrador' || user?.rol === 'Jefe de Departamento') ? 'flex-[1.2] border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-[var(--border-accent)] pt-6 md:pt-0 md:pl-8' : 'w-full'}`}>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] dark:bg-none tracking-tight">Directorio</h2>
              <p className="text-sm text-slate-500 dark:text-neutral-400 mb-6">Lista de miembros</p>
              <div className="flex-1 overflow-y-auto overscroll-contain pr-2 space-y-3 custom-scrollbar">
                {usuarios.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center mt-10">No hay usuarios registrados</p>
                ) : (
                  usuarios.map(u => (
                    <div key={u.id} className="bg-slate-50/80 dark:bg-[var(--bg-secondary)] p-4 rounded-2xl border border-slate-100 dark:border-[var(--border-accent)] flex items-center justify-between gap-4 group transition-all hover:bg-white dark:hover:bg-white/[0.03]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-700 dark:text-white text-sm flex items-center gap-2">
                          {(user?.rol === 'Administrador' || user?.rol === 'Jefe de Departamento') ? (
                            <div className="flex items-center gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
                              <div className="relative flex items-center group/edit">
                                <input
                                  type="text"
                                  value={nombresEditados[u.id] !== undefined ? nombresEditados[u.id] : u.nombre}
                                  onChange={(e) => setNombresEditados({ ...nombresEditados, [u.id]: e.target.value })}
                                  className="bg-transparent outline-none max-w-[150px] px-2 py-1 text-sm font-bold truncate transition-all hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg pr-8"
                                  title="Editar nombre de usuario"
                                />
                                <svg className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none group-hover/edit:text-[#065E94] dark:group-hover/edit:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </div>
                              {nombresEditados[u.id] !== undefined && nombresEditados[u.id] !== u.nombre && nombresEditados[u.id].trim() !== '' && (
                                <button
                                  onClick={(e) => { e.preventDefault(); handleEditarNombreUsuario(u.id, nombresEditados[u.id]); }}
                                  className="text-[9px] uppercase font-bold text-white tracking-wider bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded shadow-sm transition-all"
                                >
                                  Guardar Nombre
                                </button>
                              )}
                            </div>
                          ) : (
                            u.nombre
                          )}

                          {/* Edición de Rol in-line para Admins */}
                          {(user?.rol === 'Administrador' || user?.rol === 'Jefe de Departamento') ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={rolesEditados[u.id] || u.rol || 'Soporte Tecnico'}
                                onChange={(e) => setRolesEditados({ ...rolesEditados, [u.id]: e.target.value })}
                                className="text-[10px] uppercase font-black text-[#065E94] dark:text-blue-200 tracking-widest bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-full cursor-pointer border border-blue-200/30 dark:border-blue-700/30 outline-none hover:bg-blue-100 dark:hover:bg-blue-800/60 transition-all shadow-sm"
                                title="Seleccionar nuevo rol"
                              >
                                <option value="Administrador">Admin</option>
                                <option value="Mesa de ayuda">Mesa</option>
                                <option value="Soporte Tecnico">Soporte</option>
                                <option value="Director">Director</option>
                                <option value="Visualizador">Visual</option>
                                <option value="Jefe de Departamento">Jefe Dep.</option>
                              </select>

                              {/* Mostrar botón Guardar solo si se hizo un cambio en el desplegable */}
                              {rolesEditados[u.id] && rolesEditados[u.id] !== u.rol && (
                                <button
                                  onClick={(e) => { e.preventDefault(); handleEditarRolUsuario(u.id, rolesEditados[u.id]); }}
                                  className="text-[9px] uppercase font-bold text-white tracking-wider bg-emerald-500 hover:bg-emerald-600 px-2 py-1 rounded shadow-sm transition-all"
                                >
                                  Guardar
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] uppercase font-black text-[#065E94] dark:text-blue-200 tracking-widest bg-blue-100/50 dark:bg-blue-900/30 px-3 py-1 rounded-full leading-none border border-blue-200/20 dark:border-blue-700/20 shadow-sm">{u.rol || 'Sin Rol'}</span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">{u.email || 'Sin correo registrado'}</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{u.dependencia} • Piso {u.piso}</span>
                      </div>

                      {/* Botón Borrar solo para Admin */}
                      {user?.rol === 'Administrador' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setUsuarioAEliminar(u); }}
                          className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Eliminar Usuario"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          {/* Botón Cerrar Flotante */}
          <button onClick={() => setModalUsuariosOpen(false)} className="absolute top-6 right-6 text-white/70 hover:text-white p-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* Sub-Modal Confirmación Eliminar Usuario */}
          {usuarioAEliminar && (
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm rounded-[28px] flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-sm p-6 text-center transform transition-all animate-in zoom-in-95 duration-200 border border-transparent dark:border-[var(--border-accent)]">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 object-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Eliminar Usuario</h3>
                <p className="text-sm text-slate-500 dark:text-neutral-400 mb-6">¿Estás seguro que deseas eliminar a <b>{usuarioAEliminar.nombre}</b>? Esta acción es irreversible.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setUsuarioAEliminar(null)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-neutral-300 bg-slate-100 dark:bg-[var(--bg-secondary)] hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                  <button onClick={handleEliminarUsuario} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 dark:shadow-none transition-all hover:-translate-y-0.5 dark:hover:-translate-y-0">Sí, eliminar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal - Vista de Detalle (Glassmorphism) */}
      {detalleOpen && ticketActivo && (
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) setDetalleOpen(false) }}>
          <div className="bg-white/90 dark:bg-[var(--bg-secondary)] backdrop-blur-2xl dark:backdrop-blur-none rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-none w-full max-w-xl p-9 border border-white/60 dark:border-[var(--border-accent)] transform transition-all animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <span className={`text-[11px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-xl border ${getPrioridadColor(ticketActivo.prioridad)}`}>
                Prioridad {ticketActivo.prioridad}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setFormConfig({
                      id: ticketActivo.id,
                      titulo: ticketActivo.titulo,
                      descripcion: ticketActivo.descripcion || '',
                      area: ticketActivo.area,
                      prioridad: ticketActivo.prioridad,
                      solicitante: ticketActivo.solicitante || '',
                      seccion_solicitante: ticketActivo.seccion_solicitante || '',
                      departamento: ticketActivo.departamento || departamentoActivo,
                      responsables: ticketActivo.responsable ? ticketActivo.responsable.split(',').map(r => r.trim()).filter(Boolean) : []
                    });
                    setDetalleOpen(false); // Cierra la pestaña de detalles
                    setTimeout(() => setModalOpen(true), 50); // Abre la de edición con un ligero retraso para suavizar la animación
                  }}
                  className="text-slate-400 hover:text-[#065E94] dark:hover:text-blue-400 p-2 bg-slate-100/50 dark:bg-[var(--bg-secondary)] rounded-full hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border border-transparent"
                  title="Editar ticket"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setTicketAEliminar(ticketActivo); }}
                  className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 bg-slate-100/50 dark:bg-[var(--bg-secondary)] rounded-full hover:bg-red-50 dark:hover:bg-slate-700 transition-colors border border-transparent"
                  title="Eliminar ticket"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <button onClick={() => setDetalleOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 bg-slate-100/50 dark:bg-[var(--bg-secondary)] rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors border border-transparent" title="Cerrar">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white leading-tight mb-4 tracking-tight break-words">{ticketActivo.titulo}</h2>

            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-neutral-400 mb-6 font-medium">
              <span className="bg-slate-100/80 dark:bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg text-slate-700 dark:text-neutral-300">{ticketActivo.area}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{new Date(ticketActivo.fecha_creacion).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-[#065E94] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg font-bold border border-blue-100/50 dark:border-blue-800/50">{ticketActivo.estado}</span>
            </div>

            {(ticketActivo.solicitante || ticketActivo.seccion_solicitante) && (
              <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/80 dark:border-amber-700/30">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-amber-600/70 dark:text-amber-500/70">Solicitado Por</p>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200 leading-tight mt-0.5 break-words">
                    {ticketActivo.solicitante || 'Desconocido'} {ticketActivo.seccion_solicitante && <span className="font-medium text-amber-700 dark:text-amber-400/80 break-words"> • {ticketActivo.seccion_solicitante}</span>}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-slate-50/50 dark:bg-[var(--bg-secondary)] backdrop-blur-sm p-6 rounded-2xl border border-slate-200/50 dark:border-[var(--border-accent)]/50 mb-8 min-h-[140px] shadow-sm">
              <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Descripción</h3>
              <p className="text-slate-700 dark:text-neutral-300 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{ticketActivo.descripcion}</p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Asignado a</h3>
              {!ticketActivo.responsable ? (
                <p className="text-sm font-bold text-slate-500 dark:text-neutral-400 bg-white/60 dark:bg-[var(--bg-secondary)] border border-slate-100 dark:border-[var(--border-accent)] p-3 rounded-xl shadow-sm inline-block w-fit">Sin asignar</p>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {ticketActivo.responsable.split(',').map(r => r.trim()).filter(Boolean).map((nombreResp, idx) => {
                    const usr = usuarios.find(u => u.nombre === nombreResp);
                    return (
                      <div key={idx} className="flex items-center gap-2 bg-white/70 dark:bg-[var(--bg-secondary)] border border-slate-200/80 dark:border-[var(--border-accent)]/80 pr-3.5 pl-1.5 py-1.5 rounded-full shadow-sm hover:shadow transition-shadow max-w-[200px]">
                        <div className="w-7 h-7 rounded-full bg-blue-100/90 dark:bg-[#043d63] text-[#065E94] dark:text-blue-100 flex items-center justify-center text-xs font-extrabold border border-white/60 dark:border-[var(--border-accent)] shadow-sm shrink-0">
                          {getInicial(nombreResp)}
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none truncate" title={nombreResp}>
                          {nombreResp}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECCIÓN DE COMENTARIOS / CHAT */}
            <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-[var(--border-accent)]/60">
              <h3 className="text-[12px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Historial / Comentarios
              </h3>

              <div className="bg-slate-50/80 dark:bg-[var(--bg-secondary)] backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-[var(--border-accent)]/60 p-4 h-64 flex flex-col shadow-inner">
                {/* Lista de Comentarios */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-4">
                  {comentarios.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 italic">
                      No hay comentarios en este ticket aún.
                    </div>
                  ) : (
                    comentarios.map(c => {
                      const esMio = user && c.usuario_id === user.id;
                      const userObj = usuarios.find(u => u.id === c.usuario_id);
                      const isEditing = comentarioAEditar === c.id;

                      return (
                        <div key={c.id} className={`flex flex-col max-w-[85%] min-w-0 ${esMio ? 'ml-auto items-end' : 'mr-auto items-start'} group`}>
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-[10px] text-slate-400 font-bold">
                              {userObj?.nombre || 'Usuario Desconocido'} • {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {esMio && !isEditing && comentarioAEliminar !== c.id && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => { setComentarioAEditar(c.id); setTextoEditado(c.texto); setComentarioAEliminar(null); }} className="text-slate-400 hover:text-[#065E94] transition-colors" title="Editar">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button type="button" onClick={() => { setComentarioAEliminar(c.id); setComentarioAEditar(null); }} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <div className={`p-3 rounded-2xl text-sm shadow-sm w-full min-w-[200px] ${esMio ? 'bg-blue-500/10 border border-blue-200 rounded-br-sm' : 'bg-white border border-slate-200'}`}>
                              <textarea
                                autoFocus
                                value={textoEditado}
                                onChange={(e) => setTextoEditado(e.target.value)}
                                className="w-full bg-white/50 border border-blue-200/60 rounded-xl px-3 py-2 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#065E94]/50 resize-none custom-scrollbar mb-2"
                                rows="2"
                              />
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setComentarioAEditar(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm transition-colors">Cancelar</button>
                                <button type="button" onClick={() => handleGuardarEdicionComentario(c.id)} disabled={!textoEditado.trim()} className="text-[10px] font-bold text-white hover:bg-[#043d63] bg-[#065E94] disabled:opacity-50 px-2 py-1 rounded-md shadow-sm transition-colors">Guardar</button>
                              </div>
                            </div>
                          ) : comentarioAEliminar === c.id ? (
                            <div className={`p-3 rounded-2xl text-sm shadow-sm w-full min-w-[200px] ${esMio ? 'bg-red-500/10 border border-red-200 rounded-br-sm' : 'bg-red-50 border border-red-200'}`}>
                              <p className="text-xs font-bold text-red-600 mb-2">¿Eliminar comentario?</p>
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setComentarioAEliminar(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm transition-colors">Cancelar</button>
                                <button type="button" onClick={() => handleEliminarComentarioConfirmado(c.id)} className="text-[10px] font-bold text-white hover:bg-red-600 bg-red-500 px-2 py-1 rounded-md shadow-sm transition-colors">Sí, eliminar</button>
                              </div>
                            </div>
                          ) : (
                            <div className={`p-3 rounded-2xl text-sm shadow-sm flex flex-col gap-2 max-w-full min-w-0 ${esMio ? 'bg-[#065E94] dark:bg-blue-600/30 text-white rounded-br-sm' : 'bg-white dark:bg-[var(--bg-secondary)] border border-slate-100 dark:border-transparent text-slate-700 dark:text-neutral-200 rounded-bl-sm'}`}>
                              {c.texto && <p className="whitespace-pre-wrap break-words min-w-0">{c.texto}</p>}

                              {c.archivo_url && c.archivo_tipo?.startsWith('image/') && (
                                <a href={c.archivo_url} target="_blank" rel="noopener noreferrer" className="block mt-1">
                                  <img src={c.archivo_url} alt={c.archivo_nombre} className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-white/20 hover:opacity-90 transition-opacity" />
                                </a>
                              )}

                              {c.archivo_url && !c.archivo_tipo?.startsWith('image/') && (
                                <a href={c.archivo_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-xl border mt-1 transition-colors ${esMio ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-slate-50 dark:bg-[var(--bg-main)] border-slate-200 dark:border-[var(--border-accent)] hover:bg-slate-100 dark:hover:bg-[#1c1c1c]'}`}>
                                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  <span className="text-xs font-medium truncate max-w-[150px]">{c.archivo_nombre}</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {/* Elemento invisible para el auto-scroll */}
                  <div ref={mensajesEndRef} />
                </div>

                {/* Caja de nuevo comentario */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if ((!nuevoComentario.trim() && !archivoSeleccionado) || !user) return;

                    const textoInsert = nuevoComentario;
                    let archivoUrl = null;
                    let archivoNombre = null;
                    let archivoTipo = null;

                    setSubiendoArchivo(true);

                    // Subir archivo si existe
                    if (archivoSeleccionado) {
                      const fileExt = archivoSeleccionado.name.split('.').pop();
                      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                      const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('ticket-adjuntos')
                        .upload(fileName, archivoSeleccionado);

                      if (uploadError) {
                        console.error('Error uploading file:', uploadError);
                        alert('Error al subir el archivo.');
                        setSubiendoArchivo(false);
                        return;
                      }

                      const { data: { publicUrl } } = supabase.storage
                        .from('ticket-adjuntos')
                        .getPublicUrl(fileName);

                      archivoUrl = publicUrl;
                      archivoNombre = archivoSeleccionado.name;
                      archivoTipo = archivoSeleccionado.type;
                    }

                    setNuevoComentario('');
                    setArchivoSeleccionado(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';

                    // Creamos un optimista para mostrarlo de inmediato en el chat local
                    const comentarioOptimista = {
                      id: Date.now(),
                      ticket_id: ticketActivo.id,
                      usuario_id: user.id,
                      texto: textoInsert,
                      archivo_url: archivoUrl,
                      archivo_nombre: archivoNombre,
                      archivo_tipo: archivoTipo,
                      created_at: new Date().toISOString()
                    };

                    setComentarios(prev => [...prev, comentarioOptimista]);
                    setSubiendoArchivo(false);

                    // Guardamos en DB
                    const { error } = await supabase.from('comentarios').insert([{
                      ticket_id: ticketActivo.id,
                      usuario_id: user.id,
                      texto: textoInsert,
                      archivo_url: archivoUrl,
                      archivo_nombre: archivoNombre,
                      archivo_tipo: archivoTipo
                    }]);

                    // Si da error, lo volvemos atras
                    if (error) {
                      console.error("Error al enviar comentario:", error);
                      alert(`Error al enviar el comentario: ${error.message}`);
                      setComentarios(prev => prev.filter(c => c.id !== comentarioOptimista.id));
                    }
                  }}
                  className="flex flex-col gap-2"
                >
                  {archivoSeleccionado && (
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-[#065E94] dark:text-blue-300 p-2 rounded-xl text-xs font-semibold border border-blue-100 dark:border-blue-800/50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      <span className="truncate max-w-[200px]">{archivoSeleccionado.name}</span>
                      <button type="button" onClick={() => { setArchivoSeleccionado(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-auto text-slate-400 hover:text-red-500">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={e => setArchivoSeleccionado(e.target.files[0])}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-slate-100 dark:bg-[var(--bg-main)] border border-slate-200 dark:border-[var(--border-accent)] text-slate-500 dark:text-neutral-400 hover:text-[#065E94] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1c1c1c] rounded-xl transition-colors cursor-pointer"
                      title="Adjuntar archivo"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <input
                      type="text"
                      value={nuevoComentario}
                      onChange={e => setNuevoComentario(e.target.value)}
                      placeholder="Escribe una resolución o comentario..."
                      className="flex-1 bg-white dark:bg-[var(--bg-main)] border border-slate-200 dark:border-[var(--border-accent)] rounded-xl px-4 py-2.5 text-sm dark:text-white focus:ring-2 focus:ring-[#065E94]/50 outline-none shadow-sm dark:shadow-none"
                    />
                    <button
                      type="submit"
                      disabled={(!nuevoComentario.trim() && !archivoSeleccionado) || subiendoArchivo}
                      className="bg-[#065E94] hover:bg-[#043d63] text-white px-4 py-2.5 rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[3rem]"
                    >
                      {subiendoArchivo ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </div>

          {/* Sub-Modal Confirmación Eliminar Ticket */}
          {ticketAEliminar && (
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm rounded-[32px] flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-sm p-6 text-center transform transition-all animate-in zoom-in-95 duration-200 border border-transparent dark:border-[var(--border-accent)]">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 object-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Eliminar Ticket</h3>
                <p className="text-sm text-slate-500 dark:text-neutral-400 mb-6">¿Estás seguro que deseas eliminar permanentemente el ticket <b>"{ticketAEliminar.titulo}"</b>?</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setTicketAEliminar(null)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-neutral-300 bg-slate-100 dark:bg-[var(--bg-secondary)] hover:bg-slate-200 dark:hover:bg-[var(--bg-hover)] transition-colors">Cancelar</button>
                  <button onClick={handleEliminarTicket} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 dark:shadow-none transition-all hover:-translate-y-0.5">Sí, eliminar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE RESOLUCIÓN (Reemplaza a window.prompt para no romper el drag and drop) */}
      {modalResolucionOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={cancelarResolucion}></div>
          <div className="bg-white/95 dark:bg-[var(--bg-secondary)] backdrop-blur-md w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative border border-white/40 dark:border-[var(--border-accent)]/80">
            <div className="p-8 pb-6 bg-gradient-to-br from-blue-50/50 to-white dark:from-[var(--bg-secondary)] dark:to-[var(--bg-main)] relative">
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">
                Resolución del Ticket
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-neutral-400 mt-2">
                Por favor, detalla la solución final antes de dar este ticket por cerrado.
              </p>
            </div>

            <div className="p-8 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Mensaje de Resolución</label>
                  <textarea
                    autoFocus
                    required
                    value={resolucionTexto}
                    onChange={(e) => setResolucionTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (resolucionTexto.trim()) {
                          confirmarResolucion();
                        }
                      }
                    }}
                    className="w-full bg-slate-50/50 dark:bg-[var(--bg-main)] border border-slate-200/60 dark:border-[var(--border-accent)] rounded-xl px-4 py-3 text-slate-700 dark:text-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#065E94]/50 focus:border-[#065E94] dark:focus:ring-blue-500/50 transition-all custom-scrollbar resize-none shadow-sm dark:shadow-none"
                    rows="4"
                    placeholder="Ej: Se reemplazó el tóner defectuoso y se calibraron los colores..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50/80 dark:bg-[var(--bg-main)]/50 border-t border-slate-100/80 dark:border-[var(--border-accent)] flex justify-end gap-3 z-10 relative">
              <button
                type="button"
                onClick={cancelarResolucion}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-neutral-300 bg-white dark:bg-[var(--bg-secondary)] border border-slate-200 dark:border-[var(--border-accent)] hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!resolucionTexto.trim()}
                onClick={confirmarResolucion}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-[#065E94] hover:bg-[#043d63] hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#065E94] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal - Cambio de Contraseña Obligatorio (Bloqueante) */}
      {modalMandatorioOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-xl flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-500">
          <div className="bg-white/95 dark:bg-[var(--bg-secondary)] rounded-[32px] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-md p-10 border border-white dark:border-[var(--border-accent)] transform animate-in zoom-in-95 duration-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-200 dark:border-amber-500/30">
                <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-3 tracking-tight">Acceso Seguro Requerido</h2>
              <p className="text-slate-500 dark:text-neutral-400 leading-relaxed text-sm">
                Detectamos que aún usas la contraseña predeterminada. Por seguridad, <span className="font-bold text-slate-700 dark:text-slate-200">debes cambiarla ahora</span> para poder acceder al tablero.
              </p>
            </div>

            <form onSubmit={handleCambiarPassword} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-[0.2em] mb-2 px-1">Nueva Contraseña</label>
                <input
                  required
                  minLength={6}
                  autoFocus
                  type="password"
                  value={passwordForm.nueva}
                  onChange={e => setPasswordForm({ ...passwordForm, nueva: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[var(--bg-main)] border border-slate-200 dark:border-[var(--border-accent)] dark:text-white rounded-2xl p-4 text-sm focus:ring-4 focus:ring-[#065E94]/20 outline-none transition-all shadow-sm"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-[0.2em] mb-2 px-1">Confirmar Contraseña</label>
                <input
                  required
                  minLength={6}
                  type="password"
                  value={passwordForm.confirmar}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmar: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[var(--bg-main)] border border-slate-200 dark:border-[var(--border-accent)] dark:text-white rounded-2xl p-4 text-sm focus:ring-4 focus:ring-[#065E94]/20 outline-none transition-all shadow-sm"
                  placeholder="Repite la contraseña"
                />
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={cambiandoReq}
                  className="w-full py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-xl shadow-[#065E94]/30 dark:shadow-none transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                  {cambiandoReq ? 'Guardando cambios...' : 'Actualizar y Entrar'}
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-3 text-sm font-bold text-slate-400 hover:text-red-500 transition-colors"
                >
                  Salir y cerrar sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
