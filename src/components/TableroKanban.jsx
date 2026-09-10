import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { parseTableroConfig } from '../utils/configTablero';
import EstadisticasPanel from './EstadisticasPanel';

const PERMISOS_DEFAULT = {
  Administrador: { ver_tablero: true, crear_tickets: true, editar_tickets: true, mover_tarjetas: true, eliminar_tickets: true, gestionar_comentarios: true, ver_estadisticas: true, gestionar_usuarios: true },
  'Jefe de Departamento': { ver_tablero: true, crear_tickets: true, editar_tickets: true, mover_tarjetas: true, eliminar_tickets: false, gestionar_comentarios: true, ver_estadisticas: true, gestionar_usuarios: true },
  'Mesa de ayuda': { ver_tablero: true, crear_tickets: true, editar_tickets: true, mover_tarjetas: true, eliminar_tickets: false, gestionar_comentarios: true, ver_estadisticas: false, gestionar_usuarios: false },
  Usuario: { ver_tablero: true, crear_tickets: true, editar_tickets: false, mover_tarjetas: false, eliminar_tickets: false, gestionar_comentarios: true, ver_estadisticas: false, gestionar_usuarios: false },
  Director: { ver_tablero: true, crear_tickets: false, editar_tickets: false, mover_tarjetas: false, eliminar_tickets: false, gestionar_comentarios: true, ver_estadisticas: true, gestionar_usuarios: false },
  Visualizador: { ver_tablero: true, crear_tickets: false, editar_tickets: false, mover_tarjetas: false, eliminar_tickets: false, gestionar_comentarios: false, ver_estadisticas: false, gestionar_usuarios: false },
  'Soporte Tecnico': { ver_tablero: true, crear_tickets: false, editar_tickets: true, mover_tarjetas: true, eliminar_tickets: false, gestionar_comentarios: true, ver_estadisticas: false, gestionar_usuarios: false }
};

const DEPARTAMENTOS = ['Soporte Técnico', 'Telefonía'];

const getPermisosUsuario = (u) => {
  const rolLower = (u?.rol || '').toLowerCase();
  const isBossOrAdmin = rolLower.includes('admin') || rolLower.includes('jefe');

  if (isBossOrAdmin) {
    return {
      ver_tablero: true,
      crear_tickets: true,
      editar_tickets: true,
      mover_tarjetas: true,
      eliminar_tickets: true,
      gestionar_comentarios: true,
      ver_estadisticas: true,
      gestionar_usuarios: true
    };
  }

  const customPerms = (u?.permisos && Object.keys(u.permisos).length > 0) ? u.permisos : u?.permisos_tablero;
  if (customPerms && Object.keys(customPerms).length > 0) {
    return {
      ver_tablero: true,
      crear_tickets: true,
      editar_tickets: true,
      mover_tarjetas: true,
      eliminar_tickets: false,
      gestionar_comentarios: true,
      ver_estadisticas: false,
      gestionar_usuarios: false,
      ...customPerms
    };
  }

  return PERMISOS_DEFAULT[u?.rol_en_tablero] || PERMISOS_DEFAULT['Usuario'];
};

const COLUMNAS_BASE = ['Solicitud', 'En proceso', 'En espera', 'Resuelto'];


const getNumeroTicket = (ticket, allTickets) => {
  if (!ticket || ticket.prioridad === 'Nota') return null;
  if (typeof ticket.id !== 'number') return ticket.id;

  const tableroId = ticket.tablero_id || 'default';
  const storageKey = `board_min_id_${tableroId}`;

  // Buscar el menor ID de los tickets (no notas) en este tablero
  let baseMin = ticket.id;
  if (Array.isArray(allTickets) && allTickets.length > 0) {
    const nonNotas = allTickets.filter(t => t.prioridad !== 'Nota' && typeof t.id === 'number');
    if (nonNotas.length > 0) {
      baseMin = Math.min(...nonNotas.map(t => t.id));
    }
  }

  // Si ya existía un ID mínimo registrado anteriormente para este tablero, no permitir que aumente al eliminar tickets
  const cachedMin = localStorage.getItem(storageKey);
  if (cachedMin && !isNaN(Number(cachedMin))) {
    baseMin = Math.min(Number(cachedMin), baseMin);
  }

  localStorage.setItem(storageKey, baseMin);

  const num = ticket.id - baseMin + 1;
  return num > 0 ? num : ticket.id;
};

const getPrioridadColor = (prioridad) => {
  switch (prioridad) {
    case 'Urgente': return 'badge-urgente';
    case 'Alta': return 'bg-transparent text-red-700 dark:text-red-500 border-red-600/60 dark:border-red-500/60 font-black';
    case 'Media': return 'bg-transparent text-emerald-700 dark:text-emerald-300 border-emerald-600/70 dark:border-emerald-400/70 font-bold';
    case 'Baja': return 'bg-transparent text-cyan-600 dark:text-cyan-400 border-cyan-500/70 dark:border-cyan-400/70 font-black';
    default: return 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-500/30 dark:border-gray-500/50';
  }
};


const getInicial = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 1].charAt(0) + parts[0].charAt(0)).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

const TicketCard = React.memo(({ ticket, index, onClick, isReadOnly, allTickets, totalCols }) => {
  const numeroTicket = getNumeroTicket(ticket, allTickets);
  const maxAvatars = (totalCols && totalCols > 4) ? 2 : 3;
  const respList = ticket.responsable ? ticket.responsable.split(',').map(r => r.trim()).filter(Boolean) : [];
  const displayedAvatars = respList.slice(0, maxAvatars);
  const extraCount = respList.length - maxAvatars;

  return (
    <Draggable draggableId={ticket.id.toString()} index={index} isDragDisabled={isReadOnly}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(ticket)}
          className={`${!snapshot.isDragging ? 'glass-card' : ''} bg-white/90 dark:bg-[var(--bg-card)] backdrop-blur-md dark:backdrop-blur-none p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-white dark:border-[var(--border-accent)] cursor-pointer group flex flex-col justify-between h-[215px] ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-[#065E94]/30 dark:ring-[var(--border-accent)] rotate-3 scale-[1.03] dark:bg-[var(--bg-hover)] opacity-100 z-[1000]' : 'shadow-sm dark:shadow-none transition-all duration-300 hover:shadow-[0_8px_25px_-5px_rgba(6,94,148,0.15)] hover:border-slate-200 dark:hover:border-[var(--border-accent)] dark:hover:bg-[var(--bg-hover)] hover:-translate-y-1'
            }`}
        >
          <div className="flex-1 flex flex-col justify-between min-h-0">
            {/* Header: Prioridad, #ID, Área */}
            <div>
              <div className="flex justify-between items-center mb-2 h-6">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-lg border ${getPrioridadColor(ticket.prioridad)}`}>
                    {ticket.prioridad}
                  </span>
                  {ticket.prioridad !== 'Nota' && numeroTicket && (
                    <span className="text-xs font-black text-slate-400 dark:text-neutral-500">#{numeroTicket}</span>
                  )}
                </div>
                {ticket.area && <span className="text-[11px] font-semibold text-slate-400 group-hover:text-[#065E94] transition-colors truncate max-w-[110px] text-right">{ticket.area}</span>}
              </div>

              {/* Título: Altura uniforme fija de 2 líneas max */}
              <div className="h-[2.5rem] flex items-center mb-2">
                <h3 className="text-xs md:text-sm font-semibold text-slate-800 dark:text-white leading-snug line-clamp-2" title={ticket.titulo}>
                  {ticket.titulo}
                </h3>
              </div>
            </div>

            {/* Solicitante / Descripción Nota */}
            {(ticket.solicitante || ticket.seccion_solicitante) ? (
              <div className="glass-solicitor flex items-center gap-2 mb-2 bg-slate-50/80 dark:bg-white/5 border border-slate-100 dark:border-[var(--border-accent)] py-1.5 px-2.5 rounded-lg h-[38px] shrink-0">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-white/10 shadow-sm shrink-0 border border-white/10 dark:border-white/5">
                  <svg className="w-3 h-3 text-indigo-500 dark:text-cyan-100 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
                </div>
                <div className="flex flex-col min-w-0 justify-center">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-white truncate leading-tight">
                    {ticket.solicitante || 'Desconocido'}
                  </span>
                  {ticket.seccion_solicitante && (
                    <span className="text-[9px] font-bold text-slate-400 dark:text-cyan-100/70 truncate leading-none uppercase tracking-wider mt-[1px]">
                      {ticket.seccion_solicitante}
                    </span>
                  )}
                </div>
              </div>
            ) : (ticket.prioridad === 'Nota' && ticket.descripcion) ? (
              <div className="glass-solicitor flex items-center gap-2 mb-2 bg-slate-50/80 dark:bg-white/5 border border-slate-100 dark:border-[var(--border-accent)] py-1.5 px-2.5 rounded-lg text-xs text-slate-600 dark:text-neutral-300 h-[38px] shrink-0 font-medium">
                <span className="truncate">{ticket.descripcion}</span>
              </div>
            ) : (
              <div className="h-[38px] mb-2 shrink-0" />
            )}
          </div>

          {/* Footer: Fecha, Subtareas y Asignados */}
          <div className="flex justify-between items-center pt-2.5 border-t border-slate-100/80 dark:border-white/5 h-[38px] shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-semibold tracking-wide">
                {new Date(ticket.fecha_creacion).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
              {Array.isArray(ticket.checklist) && ticket.checklist.length > 0 && (() => {
                const doneCount = ticket.checklist.filter(c => c.completado).length;
                const totalCount = ticket.checklist.length;
                const isAllDone = doneCount === totalCount;
                return (
                  <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 border ${isAllDone ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`} title={`${doneCount} de ${totalCount} subtareas completadas`}>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {doneCount}/{totalCount}
                  </span>
                );
              })()}
            </div>
            {ticket.responsable ? (
              <div className="flex -space-x-1.5 shrink-0">
                {displayedAvatars.map((r, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-[var(--bg-card)] bg-slate-100 dark:bg-white/90 text-[#065E94] dark:text-[#0f172a] font-extrabold flex items-center justify-center text-[10px] shadow-sm transform transition-transform hover:scale-110 hover:z-10"
                    title={r}
                  >
                    {getInicial(r)}
                  </div>
                ))}
                {extraCount > 0 && (
                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/90 text-slate-600 dark:text-[#0f172a] flex items-center justify-center text-[10px] font-extrabold border-2 border-white dark:border-[var(--bg-card)] shadow-sm z-0" title={respList.slice(maxAvatars).join(', ')}>
                    +{extraCount}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-7" />
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
    JSON.stringify(prevProps.ticket.checklist) === JSON.stringify(nextProps.ticket.checklist) &&
    prevProps.allTickets?.length === nextProps.allTickets?.length &&
    prevProps.index === nextProps.index &&
    prevProps.isReadOnly === nextProps.isReadOnly;
});

const TicketForm = ({ initialConfig, onSubmit, onCancel, user, usuarios, tipoTablero, setTicketAEliminar, setModalOpen }) => {
  const [localConfig, setLocalConfig] = React.useState(initialConfig);
  const [tipoElegido, setTipoElegido] = React.useState(
    initialConfig.id || tipoTablero === 'Personal' ? (initialConfig.prioridad === 'Nota' ? 'Nota' : 'Ticket') : null
  );

  const currentUserInBoard = React.useMemo(() => {
    return usuarios.find(u => u.id === user?.id) || user;
  }, [usuarios, user]);

  const misPermisos = React.useMemo(() => {
    return getPermisosUsuario(currentUserInBoard);
  }, [currentUserInBoard]);

  const responsablesSet = React.useMemo(() => {
    return new Set(localConfig.responsables || []);
  }, [localConfig.responsables]);

  React.useEffect(() => {
    setLocalConfig(initialConfig);
    setTipoElegido(
      initialConfig.id || tipoTablero === 'Personal' ? (initialConfig.prioridad === 'Nota' ? 'Nota' : 'Ticket') : null
    );
  }, [initialConfig, tipoTablero]);

  const toggleResponsable = React.useCallback((nombre) => {
    setLocalConfig(prev => {
      const current = prev.responsables || [];
      const hasUser = current.includes(nombre);
      return {
        ...prev,
        responsables: hasUser ? current.filter(r => r !== nombre) : [...current, nombre]
      };
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tipoTablero === 'Personal') {
      onSubmit({
        ...localConfig,
        solicitante: user?.nombre || 'Yo',
        seccion_solicitante: 'Personal',
        area: 'Personal',
        responsables: [user?.nombre]
      });
    } else {
      onSubmit(localConfig);
    }
  };

  const hasAssignees = tipoTablero !== 'Personal' && localConfig.prioridad !== 'Nota';

  // Paso 1: Selección previa de ¿Qué deseas crear? (Solo para nuevos elementos en tableros no personales)
  if (!tipoElegido && !localConfig.id && tipoTablero !== 'Personal') {
    return (
      <div className="p-6 md:p-8 flex flex-col justify-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start w-full">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] dark:from-[#2a83bd] dark:to-[#4ea8de]">
              ¿Qué deseas crear?
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-neutral-400 mt-1">
              Elige el tipo de registro para continuar
            </p>
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-100 dark:bg-[var(--bg-secondary)] p-2 rounded-full shadow-sm shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-1">
          {/* Opción Ticket */}
          <button
            type="button"
            onClick={() => {
              setLocalConfig(prev => ({ ...prev, prioridad: 'Media' }));
              setTipoElegido('Ticket');
            }}
            className="relative flex flex-col items-start p-6 rounded-3xl border-2 border-slate-200/80 dark:border-[var(--border-accent)] bg-white/70 dark:bg-[var(--bg-main)]/70 hover:border-[#065E94] dark:hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-500/15 transition-all duration-300 ease-out group cursor-pointer shadow-sm hover:shadow-[0_12px_30px_-5px_rgba(6,94,148,0.25)] dark:hover:shadow-[0_12px_30px_-5px_rgba(42,131,189,0.2)] hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] text-left overflow-hidden"
          >
            <div className="flex justify-between items-center w-full mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100/70 dark:bg-blue-500/20 text-[#065E94] dark:text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:bg-[#065E94] group-hover:text-white dark:group-hover:bg-blue-500 dark:group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-[#065E94]/30">
                <svg className="w-6 h-6 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 00-2 2H5a2 2 0 00-2-2V7a2 2 0 012-2zm0 8h14a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 012-2z" />
                </svg>
              </div>
              <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-xs font-extrabold text-[#065E94] dark:text-blue-400 flex items-center gap-1 transition-all duration-300">
                Seleccionar <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </span>
            </div>

            <span className="text-base font-extrabold text-slate-800 dark:text-white group-hover:text-[#065E94] dark:group-hover:text-blue-300 group-hover:translate-x-1 transition-all duration-300">
              Ticket de Solicitud
            </span>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2 leading-relaxed font-medium group-hover:text-slate-600 dark:group-hover:text-neutral-300 transition-colors">
              Solicitud formal para asignar a una dependencia, área o especialista con seguimiento.
            </p>
          </button>

          {/* Opción Nota */}
          <button
            type="button"
            onClick={() => {
              setLocalConfig(prev => ({ ...prev, prioridad: 'Nota', area: '', responsables: [] }));
              setTipoElegido('Nota');
            }}
            className="relative flex flex-col items-start p-6 rounded-3xl border-2 border-slate-200/80 dark:border-[var(--border-accent)] bg-white/70 dark:bg-[var(--bg-main)]/70 hover:border-amber-500 dark:hover:border-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-500/15 transition-all duration-300 ease-out group cursor-pointer shadow-sm hover:shadow-[0_12px_30px_-5px_rgba(217,119,6,0.25)] dark:hover:shadow-[0_12px_30px_-5px_rgba(245,158,11,0.2)] hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] text-left overflow-hidden"
          >
            <div className="flex justify-between items-center w-full mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100/70 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:bg-amber-500 group-hover:text-white dark:group-hover:bg-amber-400 dark:group-hover:text-slate-950 transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-amber-500/30">
                <svg className="w-6 h-6 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-xs font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1 transition-all duration-300">
                Seleccionar <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </span>
            </div>

            <span className="text-base font-extrabold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all duration-300">
              Nota o Recordatorio
            </span>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2 leading-relaxed font-medium group-hover:text-slate-600 dark:group-hover:text-neutral-300 transition-colors">
              Recordatorio rápido o aviso general para el tablero sin requerir asignación.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row w-full max-h-[90vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden">
      {/* ===== COLUMNA IZQUIERDA: Datos Principales ===== */}
      <div className="flex-1 p-6 md:p-8 flex flex-col min-w-0 md:overflow-y-auto custom-scrollbar space-y-4">
        {/* Header con Título y Botones de Acción de Cierre/Eliminación */}
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-3">
            {!localConfig.id && tipoTablero !== 'Personal' && (
              <button
                type="button"
                onClick={() => setTipoElegido(null)}
                className="p-2 text-slate-400 hover:text-[#065E94] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all duration-300 group cursor-pointer"
                title="Volver a elegir tipo (Ticket o Nota)"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] dark:from-[#2a83bd] dark:to-[#4ea8de]">
              {localConfig.id ? (user?.rol === 'Soporte Tecnico' ? 'Ver Ticket' : (tipoTablero === 'Personal' ? 'Editar Nota' : 'Editar Ticket')) : (localConfig.prioridad === 'Nota' || tipoTablero === 'Personal' ? 'Nueva Nota' : 'Nuevo Ticket')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {localConfig.id && (() => {
              return misPermisos.eliminar_tickets && (
                <button
                  type="button"
                  onClick={() => {
                    if (setTicketAEliminar && setModalOpen) {
                      setTicketAEliminar(localConfig);
                      setModalOpen(false);
                    }
                  }}
                  className="text-red-400 hover:text-white transition-colors bg-red-50 hover:bg-red-500 p-2 rounded-full shadow-sm"
                  title="Eliminar Ticket"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              );
            })()}
            <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-100 dark:bg-[var(--bg-secondary)] p-2 rounded-full shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 truncate">Título {localConfig.prioridad === 'Nota' ? 'de la Nota' : 'del Ticket'}</label>
            <input required autoFocus type="text" value={localConfig.titulo} onChange={e => setLocalConfig({ ...localConfig, titulo: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder={localConfig.prioridad === 'Nota' ? "Ej. Recordatorio..." : (tipoTablero === 'Personal' ? "Ej. Comprar café..." : "Ej. Computadora no enciende...")} disabled={user?.rol === 'Soporte Tecnico'} />
          </div>

          {tipoTablero !== 'Personal' && localConfig.prioridad !== 'Nota' && (
            <div className="space-y-3">
              {/* Row 1: Nombre / Solicitante & Dependencia / Sección (Datos del Usuario) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 truncate">Nombre / Solicitante</label>
                  <input type="text" value={localConfig.solicitante} onChange={e => setLocalConfig({ ...localConfig, solicitante: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Juan Pérez" disabled={user?.rol === 'Soporte Tecnico'} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 truncate" title="Sección / Dependencia">Dependencia / Sección</label>
                  <input type="text" value={localConfig.seccion_solicitante} onChange={e => setLocalConfig({ ...localConfig, seccion_solicitante: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="Ej. Compras, RRHH..." disabled={user?.rol === 'Soporte Tecnico'} />
                </div>
              </div>

              {/* Row 2: Email del Solicitante - Horizontal a todo el ancho */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 truncate">Email del Solicitante</label>
                <input type="email" value={localConfig.email_solicitante || ''} onChange={e => setLocalConfig({ ...localConfig, email_solicitante: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none" placeholder="ejemplo@correo.com" disabled={user?.rol === 'Soporte Tecnico'} />
              </div>

              {/* Row 3: Prioridad & Área (Clasificación del Ticket) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 truncate">Prioridad</label>
                  <select value={localConfig.prioridad} onChange={e => setLocalConfig({ ...localConfig, prioridad: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none shadow-sm dark:shadow-none cursor-pointer" disabled={user?.rol === 'Soporte Tecnico'}>
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 truncate">Área</label>
                  <select required={tipoTablero !== 'Personal' && localConfig.prioridad !== 'Nota'} value={localConfig.area} onChange={e => setLocalConfig({ ...localConfig, area: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none cursor-pointer" disabled={user?.rol === 'Soporte Tecnico'}>
                    <option value="" disabled>Seleccione un área...</option>
                    <option value="Soporte">Soporte</option>
                    <option value="Redes">Redes</option>
                    <option value="Desarrollo">Desarrollo</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tipoTablero === 'Personal' && localConfig.prioridad !== 'Nota' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 truncate">Prioridad</label>
              <select value={localConfig.prioridad} onChange={e => setLocalConfig({ ...localConfig, prioridad: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none shadow-sm dark:shadow-none cursor-pointer" disabled={user?.rol === 'Soporte Tecnico'}>
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 truncate">Descripción Detallada (Opcional)</label>
            <textarea value={localConfig.descripcion} onChange={e => setLocalConfig({ ...localConfig, descripcion: e.target.value })} rows={3} className="w-full bg-white border border-slate-200 dark:border-[var(--border-accent)] dark:bg-[var(--bg-main)] dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all shadow-sm dark:shadow-none resize-none" placeholder={localConfig.prioridad === 'Nota' ? "Escribe el detalle de tu nota..." : "Describe el problema con el mayor detalle posible..."} disabled={user?.rol === 'Soporte Tecnico'} />
          </div>
        </div>

        {/* Botones de acción si es columna única (Notas o Tablero Personal) */}
        {!hasAssignees && (
          <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100 dark:border-[var(--border-accent)]/40 mt-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-neutral-300 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 transition-colors">Cancelar</button>
            {(localConfig.id ? misPermisos.editar_tickets : misPermisos.crear_tickets) && (
              <button type="submit" className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-lg shadow-[#065E94]/30 transition-all hover:-translate-y-0.5">
                {localConfig.id ? "Guardar Cambios" : (localConfig.prioridad === 'Nota' || tipoTablero === 'Personal' ? "Crear Nota" : "Crear Ticket")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===== COLUMNA DERECHA: Asignación de Usuarios y Acciones ===== */}
      {hasAssignees && (
        <div className="w-full md:w-[390px] shrink-0 p-6 md:p-8 border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-[var(--border-accent)]/60 bg-slate-50/50 dark:bg-black/10 flex flex-col justify-between rounded-b-[32px] md:rounded-b-none md:rounded-r-[32px]">
          <div className="flex flex-col min-h-0 flex-1">
            <div className="mb-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-[#065E94] dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Asignado a (Usuarios)
              </h3>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">Puedes seleccionar múltiples personas asignadas.</p>
            </div>

            {/* Lista de usuarios con scroll ultra fluido */}
            <div className="flex-1 overflow-y-auto custom-scrollbar my-2 pr-1 space-y-1.5 max-h-[260px] md:max-h-[380px] bg-white dark:bg-[var(--bg-secondary)]/50 p-3 rounded-2xl border border-slate-200/70 dark:border-[var(--border-accent)]/50 shadow-inner">
              {usuarios.length === 0 ? (
                <p className="text-sm text-slate-400 p-2 italic text-center">No hay usuarios registrados</p>
              ) : (
                usuarios.map(u => {
                  const isChecked = responsablesSet.has(u.nombre);
                  return (
                    <label key={u.id} className={`flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors group border ${isChecked ? 'bg-blue-50/70 dark:bg-blue-900/25 border-blue-200/80 dark:border-blue-800/50' : 'border-transparent'}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleResponsable(u.nombre)}
                        className="w-4 h-4 text-[#065E94] rounded border-slate-300 focus:ring-[#065E94] cursor-pointer shrink-0"
                        disabled={!misPermisos.editar_tickets}
                      />
                      <div className="w-7 h-7 rounded-full bg-[#065E94]/10 dark:bg-blue-500/20 text-[#065E94] dark:text-blue-300 font-extrabold flex items-center justify-center text-[10px] shrink-0 border border-[#065E94]/20 dark:border-blue-500/30">
                        {getInicial(u.nombre)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs text-slate-700 dark:text-slate-200 font-bold group-hover:text-[#065E94] dark:group-hover:text-blue-400 transition-colors truncate">{u.nombre}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">{u.dependencia || 'Sin dep.'} (Piso {u.piso || '0'})</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Si la persona no está en la lista, regístrala primero en 'Gestión de Usuarios'.</p>
          </div>

          {/* Acciones de Footer */}
          <div className="pt-4 mt-2 border-t border-slate-200/60 dark:border-[var(--border-accent)]/50 flex justify-end items-center gap-2.5">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-neutral-300 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 transition-colors">Cancelar</button>
            {(localConfig.id ? misPermisos.editar_tickets : misPermisos.crear_tickets) && (
              <button type="submit" className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-lg shadow-[#065E94]/30 transition-all hover:-translate-y-0.5 cursor-pointer">
                {localConfig.id ? "Guardar Cambios" : "Crear Ticket"}
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
};

export default function TableroKanban() {
  const { user, logout } = useAuth();
  const { id: tableroId } = useParams();
  const navigate = useNavigate();

  const [departamentoActivo, setDepartamentoActivo] = useState(DEPARTAMENTOS[0]);

  const [tableroActual, setTableroActual] = useState(null);
  const [menuResponsiveAbierto, setMenuResponsiveAbierto] = useState(false);
  const [mostrarBuscadorMobile, setMostrarBuscadorMobile] = useState(false);
  const [mostrarNotificacionesDropdown, setMostrarNotificacionesDropdown] = useState(false);
  const kanbanContainerRef = useRef(null);
  const [tickets, setTickets] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalUsuariosOpen, setModalUsuariosOpen] = useState(false);
  const [modalPerfilOpen, setModalPerfilOpen] = useState(false);
  const [modalLogoutOpen, setModalLogoutOpen] = useState(false);
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [ticketActivo, setTicketActivo] = useState(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [usuarioAAñadir, setUsuarioAAñadir] = useState('');
  const [rolesEditados, setRolesEditados] = useState({});

  const currentUserInBoard = usuarios.find(u => u.id === user?.id) || user;
  const misPermisos = getPermisosUsuario(currentUserInBoard);
  const [ticketAEliminar, setTicketAEliminar] = useState(null);
  const [expandedUserPerms, setExpandedUserPerms] = useState(null);


  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [comentarioAEditar, setComentarioAEditar] = useState(null);
  const [comentarioAEliminar, setComentarioAEliminar] = useState(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const fileInputRef = useRef(null);
  const fileInputRefMobile = useRef(null);
  const mensajesEndRef = useRef(null);
  const [nuevoChecklist, setNuevoChecklist] = useState('');
  const [mostrarAgregarSubtarea, setMostrarAgregarSubtarea] = useState(false);

  const [notificaciones, setNotificaciones] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileNotifOpen, setIsMobileNotifOpen] = useState(false);

  // Optimizaciones de Render para TicketCard
  const actionsRef = useRef(null);
  useEffect(() => {
    actionsRef.current = { setTicketActivo, setDetalleOpen, user, setNotificaciones, notificaciones };
  });

  const fetchComentarios = async (ticketId) => {
    const { data, error } = await api.comentarios.getByTicket(ticketId);
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
        api.notificaciones.markTicketAsRead(ticket.id)
          .then(({ error }) => { if (error) console.error("Error marcando notificación leída:", error); });
      }
    }
  }, []);


  const modalScrollRef = useRef(null);

  // Auto-scroll al inicio del modal al abrir un ticket
  useEffect(() => {
    if (detalleOpen && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [detalleOpen, ticketActivo]);



  // Modal de Resolución
  const [modalResolucionOpen, setModalResolucionOpen] = useState(false);
  const [resolucionTexto, setResolucionTexto] = useState('');
  const [ticketAResolver, setTicketAResolver] = useState(null);


  const [formUsuario, setFormUsuario] = useState({
    nombre: '', dependencia: '', piso: '', rol: 'Soporte Tecnico'
  });


  // 🌙 Dark Mode State (4 modes: light, blue, dark, wallpaper)
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    if (saved) return saved; // 'light', 'blue', 'dark', or 'wallpaper'
    return 'light';
  });

  // 🖼️ Wallpaper state
  const [wallpaperModalOpen, setWallpaperModalOpen] = useState(false);
  const [categoriaFondo, setCategoriaFondo] = useState('general');
  const [activeWallpaper, setActiveWallpaper] = useState(() => {
    return localStorage.getItem('activeWallpaper') || 'montanas';
  });

  const WALLPAPERS = [
    // FONDOS GENERALES
    { id: 'none', categoria: 'general', label: 'Sin fondo', thumb: null, url: null },
    { id: 'montanas', categoria: 'general', label: 'Montañas', thumb: '/wallpapers/thumbs/montanas.jpg', url: '/wallpapers/montanas.jpg' },
    { id: 'aurora', categoria: 'general', label: 'Aurora Boreal', thumb: '/wallpapers/thumbs/aurora.jpg', url: '/wallpapers/aurora.jpg' },
    { id: 'bosque', categoria: 'general', label: 'Bosque', thumb: '/wallpapers/thumbs/bosque.jpg', url: '/wallpapers/bosque.jpg' },
    { id: 'desierto', categoria: 'general', label: 'Desierto', thumb: '/wallpapers/thumbs/desierto.jpg', url: '/wallpapers/desierto.jpg' },
    { id: 'galaxia', categoria: 'general', label: 'Galaxia', thumb: '/wallpapers/galaxia.jpg?v=3', url: '/wallpapers/galaxia.jpg?v=3' },
    { id: 'cascada', categoria: 'general', label: 'Cascada', thumb: '/wallpapers/thumbs/cascada.jpg', url: '/wallpapers/cascada.jpg' },
    { id: 'playa', categoria: 'general', label: 'Playa', thumb: '/wallpapers/thumbs/playa.jpg', url: '/wallpapers/playa.jpg' },
    { id: 'nyc', categoria: 'general', label: 'New York', thumb: '/wallpapers/thumbs/nyc.jpg', url: '/wallpapers/nyc.jpg' },
    { id: 'tokyo', categoria: 'general', label: 'Tokyo', thumb: '/wallpapers/thumbs/tokyo.jpg', url: '/wallpapers/tokyo.jpg' },
    { id: 'paris', categoria: 'general', label: 'Paris', thumb: '/wallpapers/paris.jpg?v=3', url: '/wallpapers/paris.jpg?v=3' },
    { id: 'dubai', categoria: 'general', label: 'Dubai', thumb: '/wallpapers/thumbs/dubai.jpg', url: '/wallpapers/dubai.jpg' },
    { id: 'noche', categoria: 'general', label: 'Noche', thumb: '/wallpapers/thumbs/noche.jpg', url: '/wallpapers/noche.jpg' },
    { id: 'bariloche', categoria: 'general', label: 'Bariloche', thumb: '/wallpapers/thumbs/bariloche.jpg', url: '/wallpapers/bariloche.jpg' },
    { id: 'iguazu', categoria: 'general', label: 'Cataratas del Iguazú', thumb: '/wallpapers/thumbs/iguazu.jpg', url: '/wallpapers/iguazu.jpg' },
    { id: 'patagonia', categoria: 'general', label: 'Patagonia', thumb: '/wallpapers/thumbs/patagonia.jpg', url: '/wallpapers/patagonia.jpg' },

    // FONDOS DE LA PROVINCIA DE BUENOS AIRES
    { id: 'buenosaires', categoria: 'pba', label: 'Buenos Aires', thumb: '/wallpapers/thumbs/buenosaires.jpg', url: '/wallpapers/buenosaires.jpg' },
    { id: 'mardelplata', categoria: 'pba', label: 'Mar del Plata', thumb: '/wallpapers/thumbs/mardelplata.jpg', url: '/wallpapers/mardelplata.jpg' },

    // FONDOS ABSTRACTOS
    { id: 'abstract_2', categoria: 'abstract', label: 'Esfera Violeta', thumb: '/wallpapers/thumbs/milad-fakurian-PjG_SXDkpwQ-unsplash.jpg', url: '/wallpapers/milad-fakurian-PjG_SXDkpwQ-unsplash.jpg' },
    { id: 'abstract_4', categoria: 'abstract', label: 'Burbujas Pastel', thumb: '/wallpapers/thumbs/pawel-czerwinski-ERcQ81KaX9g-unsplash.jpg', url: '/wallpapers/pawel-czerwinski-ERcQ81KaX9g-unsplash.jpg' },
    { id: 'abstract_5', categoria: 'abstract', label: 'Espiral de Color', thumb: '/wallpapers/thumbs/pawel-czerwinski-PvgqqicSLvA-unsplash.jpg', url: '/wallpapers/pawel-czerwinski-PvgqqicSLvA-unsplash.jpg' },
    { id: 'abstract_6', categoria: 'abstract', label: 'Líneas Abiertas', thumb: '/wallpapers/thumbs/pawel-czerwinski-YAtspJ-HV2E-unsplash.jpg', url: '/wallpapers/pawel-czerwinski-YAtspJ-HV2E-unsplash.jpg' },
    { id: 'abstract_7', categoria: 'abstract', label: 'Fuego Líquido', thumb: '/wallpapers/thumbs/rene-bohmer-YeUVDKZWSZ4-unsplash.jpg', url: '/wallpapers/rene-bohmer-YeUVDKZWSZ4-unsplash.jpg' },
    { id: 'abstract_8', categoria: 'abstract', label: 'Océano Digital', thumb: '/wallpapers/thumbs/richard-horvath-_nWaeTF6qo0-unsplash.jpg', url: '/wallpapers/richard-horvath-_nWaeTF6qo0-unsplash.jpg' },
    { id: 'abstract_9', categoria: 'abstract', label: 'Nebulosa Azul', thumb: '/wallpapers/thumbs/sean-sinclair-C_NJKfnTR5A-unsplash.jpg', url: '/wallpapers/sean-sinclair-C_NJKfnTR5A-unsplash.jpg' },
    { id: 'abstract_10', categoria: 'abstract', label: 'Dunas de Arena', thumb: '/wallpapers/thumbs/sebastian-svenson-LpbyDENbQQg-unsplash.jpg', url: '/wallpapers/sebastian-svenson-LpbyDENbQQg-unsplash.jpg' },
    { id: 'abstract_11', categoria: 'abstract', label: 'Apertura Neón', thumb: '/wallpapers/thumbs/aperture-vintage-NrAvSjyW3D4-unsplash.jpg', url: '/wallpapers/aperture-vintage-NrAvSjyW3D4-unsplash.jpg' },
    { id: 'abstract_12', categoria: 'abstract', label: 'Gradiente Suave', thumb: '/wallpapers/thumbs/gradient-wallpapers-PFKx7Srejek-unsplash.jpg', url: '/wallpapers/gradient-wallpapers-PFKx7Srejek-unsplash.jpg' }
  ];


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
    id: null, titulo: '', descripcion: '', area: '', prioridad: 'Media', responsables: [], solicitante: '', seccion_solicitante: '', email_solicitante: ''
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

    // Polling interval to simulate realtime updates
    const interval = setInterval(() => {
      fetchData();
      fetchNotificaciones();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []); // Dependencias vacías al usar ticketActivoRef



  const handleEliminarComentarioConfirmado = async (comentarioId) => {
    setComentarioAEliminar(null);
    // Optimistic delete
    const prevComentarios = [...comentarios];
    setComentarios(prev => prev.filter(c => c.id !== comentarioId));

    const { error } = await api.comentarios.delete(comentarioId);
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

    const { error } = await api.comentarios.update(comentarioId, { texto: textoEditado.trim() });
    if (error) {
      console.error("Error editando comentario", error);
      alert("No se pudo editar el comentario: " + error.message);
      setComentarios(prevComentarios);
    }
  };

  const fetchData = async () => {
    if (!tableroId || !user) return;
    setLoading(true);

    // 1. Cargar el tablero actual y validar acceso
    const { data: tablero, error: tableroErr } = await api.tableros.getById(tableroId);

    if (tableroErr || !tablero) {
      console.error("Tablero no encontrado", tableroErr);
      navigate('/');
      return;
    }

    const { data: perfilGlobal } = await api.usuarios.getById(user.id);

    const isGlobalAdmin = perfilGlobal?.rol === 'Administrador';

    const { data: membresiasData, error: memErr } = await api.tableroUsuarios.getByTablero(tableroId);
    const membresia = membresiasData?.find(m => m.usuario_id === user.id) || null;

    if ((memErr || !membresia) && !isGlobalAdmin) {
      console.error("No tienes acceso a este tablero");
      navigate('/');
      return;
    }

    setTableroActual({ ...tablero, mi_rol: membresia?.rol_en_tablero || 'Administrador Global' });

    // 2. Cargar tickets, usuarios y membresias del tablero
    const [ticketsRes, usuariosRes, membresiasRes] = await Promise.all([
      api.tickets.getByTablero(tableroId),
      api.usuarios.getAll('nombre'),
      api.tableroUsuarios.getByTablero(tableroId)
    ]);

    if (!ticketsRes.error && ticketsRes.data) {
      setTickets(ticketsRes.data);
    } else {
      console.error(ticketsRes.error);
    }

    if (!usuariosRes.error && usuariosRes.data && !membresiasRes.error && membresiasRes.data) {
      // Merge roles and permissions from tablero_usuarios into usuarios
      const membresiasMap = membresiasRes.data.reduce((acc, m) => {
        acc[m.usuario_id] = m;
        return acc;
      }, {});

      const usuariosConMembresia = usuariosRes.data.map(u => {
        const mem = membresiasMap[u.id];
        return {
          ...u,
          rol_en_tablero: mem ? mem.rol_en_tablero : null,
          permisos_tablero: mem && mem.permisos ? mem.permisos : null
        };
      });
      setUsuarios(usuariosConMembresia);
    } else {
      console.error(usuariosRes.error || membresiasRes.error);
    }

    if (user) {
      fetchNotificaciones();
    }

    setLoading(false);
  };

  const fetchNotificaciones = async () => {
    if (!user) return;
    const { data, error } = await api.notificaciones.getUnread();

    if (!error && data) {
      setNotificaciones(data);
    }
  };

  const columnasActivas = React.useMemo(() => {
    return tableroActual?.columnas && tableroActual.columnas.length > 0
      ? tableroActual.columnas
      : COLUMNAS_BASE;
  }, [tableroActual]);

  // Convertimos la lista de la BD al formato requerido por las columnas
  const columnasData = React.useMemo(() => {
    const data = columnasActivas.reduce((acc, colName) => {
      acc[colName] = tickets.filter(t => t.estado === colName);
      return acc;
    }, {});

    // Asignamos los tickets huérfanos a la primera columna para evitar que desaparezcan
    const ticketsHuerfanos = tickets.filter(t => !columnasActivas.includes(t.estado));
    if (ticketsHuerfanos.length > 0 && columnasActivas.length > 0) {
      data[columnasActivas[0]] = [...data[columnasActivas[0]], ...ticketsHuerfanos];
    }

    return data;
  }, [tickets, columnasActivas]);

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
    let destColumnTickets = localTickets.filter(t => t.estado === estadoNuevo);
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
    const reqComentarios = parseTableroConfig(tableroActual?.descripcion).config.req_com || [];
    if (reqComentarios.includes(estadoNuevo) && estadoPrevio !== estadoNuevo) {
      setTicketAResolver({ ...ticketToMove, previousState: estadoPrevio, targetState: estadoNuevo, prevDate: oldDate, nuevaFecha: isoNewDate });
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
      const { error } = await api.tickets.update(ticketToMove.id, {
          estado: estadoNuevo,
          fecha_creacion: isoNewDate
        });

      if (error) throw error;

      // Generar comentario de auditoría (Trazabilidad) si cambió de estado
        if (estadoNuevo !== estadoPrevio && user) {
        api.comentarios.create({
          ticket_id: ticketToMove.id,
          usuario_id: user.id,
          texto: `[AUDITORÍA]: Ticket movido de "${estadoPrevio}" a "${estadoNuevo}".`
        }).then(({ error: auditError }) => {
          if (auditError) console.error("Error al registrar auditoría:", auditError);
        });
      }
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
      const isResuelto = ticketAResolver.targetState === 'Resuelto';
      const prefix = isResuelto ? '[RESOLUCIÓN OFICIAL]' : '[AUDITORÍA]';
      const { error: errCom } = await api.comentarios.create({
        ticket_id: ticketAResolver.id,
        usuario_id: user.id,
        texto: `${prefix}: ${resolucionTexto.trim()}`
      });
      if (errCom) {
        console.error("Error guardando resolución en DB:", errCom);
      } else {
        fetchComentarios(ticketAResolver.id);
      }
    }

    if (ticketActivo && ticketActivo.id === ticketAResolver.id) {
      setTicketActivo(prev => ({ ...prev, estado: ticketAResolver.targetState || 'Resuelto' }));
    }

    const localTickets = [...tickets];
    const ticketIndex = localTickets.findIndex(t => t.id === ticketAResolver.id);
    if (ticketIndex !== -1) {
      localTickets[ticketIndex].estado = ticketAResolver.targetState || 'Resuelto';
      localTickets[ticketIndex].fecha_creacion = ticketAResolver.nuevaFecha;
      localTickets.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
      setTickets([...localTickets]);
    }

    try {
      const { error } = await api.tickets.update(ticketAResolver.id, {
          estado: ticketAResolver.targetState || 'Resuelto',
          fecha_creacion: ticketAResolver.nuevaFecha
        });

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
  const handleQuickResolve = async (ticketToResolve) => {
    const estadoNuevo = columnasActivas[columnasActivas.length - 1] || 'Resuelto';
    if (ticketToResolve.estado === estadoNuevo) return;
    const estadoPrevio = ticketToResolve.estado;
    const isoNewDate = new Date().toISOString();

    const localTickets = [...tickets];
    const ticketIdx = localTickets.findIndex(t => t.id === ticketToResolve.id);
    if (ticketIdx === -1) return;

    localTickets[ticketIdx] = { ...localTickets[ticketIdx], estado: estadoNuevo, fecha_creacion: isoNewDate };
    localTickets.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    setTickets(localTickets);

    try {
      const { error } = await api.tickets.update(ticketToResolve.id, { estado: estadoNuevo, fecha_creacion: isoNewDate });
      if (error) throw error;

      const { error: errCom } = await api.comentarios.create({
        ticket_id: ticketToResolve.id,
        usuario_id: user.id,
        texto: `RESOLUCIÓN OFICIAL: Resuelto`
      });
      if (errCom) console.error("Error guardando resolución rápida en DB:", errCom);

      const { error: auditError } = await api.comentarios.create({
        ticket_id: ticketToResolve.id,
        usuario_id: user.id,
        texto: `[AUDITORÍA]: El ticket fue movido de "${estadoPrevio}" a "${estadoNuevo}" `
      });
      if (auditError) console.error("Error al registrar auditoría:", auditError);
    } catch (error) {
      console.error('Error en resolución rápida, haciendo rollback:', error);
      const reverted = [...tickets];
      const revIdx = reverted.findIndex(t => t.id === ticketToResolve.id);
      reverted[revIdx] = { ...reverted[revIdx], estado: estadoPrevio };
      setTickets(reverted);
    }
  };

  const handleCrearTicket = async (eOrConfig) => {
    try {
      let configToUse = formConfig;
      if (eOrConfig && typeof eOrConfig.preventDefault === 'function') {
        eOrConfig.preventDefault();
      } else if (eOrConfig && typeof eOrConfig === 'object') {
        configToUse = eOrConfig;
      }

      const { id, titulo, descripcion, area, prioridad, responsables, solicitante, seccion_solicitante, email_solicitante } = configToUse || {};

      if (!titulo || !titulo.trim()) {
        alert("Por favor ingresa un título para el ticket.");
        return;
      }

      const respList = Array.isArray(responsables) ? responsables : [];
      const responsable = respList.length > 0 ? respList.join(', ') : '';
      let data = null;
      let error = null;

      if (id) {
        // Editar ticket existente
        const ticketViejo = tickets.find(t => t.id === id);
        const updatePayload = {
          titulo: titulo.trim(),
          descripcion: (descripcion || '').trim(),
          area: area || '',
          prioridad: prioridad || 'Media',
          responsable,
          solicitante: (solicitante || '').trim(),
          seccion_solicitante: (seccion_solicitante || '').trim()
        };
        if (email_solicitante && email_solicitante.trim()) {
          updatePayload.email_solicitante = email_solicitante.trim();
        }

        let res = await api.tickets.update(id, updatePayload);

        data = res.data;
        error = res.error;

        // Fallback si la columna 'email_solicitante' no existe en Supabase DB
        if (error && error.message?.includes('email_solicitante')) {
          delete updatePayload.email_solicitante;
          res = await api.tickets.update(id, updatePayload);
          data = res.data;
          error = res.error;
        }

        // Generar trazabilidad de edición
        if (!error && ticketViejo && user) {
          const cambios = [];
          if (ticketViejo.titulo !== titulo) cambios.push(`Título: ${ticketViejo.titulo} ➔ ${titulo}`);
          if (ticketViejo.descripcion !== descripcion) cambios.push(`Descripción modificada`);
          if (ticketViejo.prioridad !== prioridad) cambios.push(`Prioridad: ${ticketViejo.prioridad || 'Ninguna'} ➔ ${prioridad}`);
          if (ticketViejo.area !== area) cambios.push(`Área: ${ticketViejo.area || 'Ninguna'} ➔ ${area}`);
          if (ticketViejo.responsable !== responsable) cambios.push(`Responsable: ${ticketViejo.responsable || 'Sin asignar'} ➔ ${responsable || 'Sin asignar'}`);

          if (cambios.length > 0) {
            api.comentarios.create({
              ticket_id: id,
              usuario_id: user.id,
              texto: `[AUDITORÍA]: Se editó el ticket.\n- ${cambios.join('\n- ')}`
            }).then(({ error: auditError }) => {
              if (auditError) console.error("Error al registrar auditoría de edición:", auditError);
            });
          }
        }
      } else {
        // Crear nuevo ticket: respetar columna inicial configurada en el tablero si existe
        const parsedBoardConfig = parseTableroConfig(tableroActual?.descripcion);
        const colInicialConfigurada = parsedBoardConfig.config?.col_inicial;

        let estadoInicial;
        if (prioridad === 'Nota') {
          const colNota = (columnasActivas || []).find(c => c.toLowerCase().includes('informaci') || c.toLowerCase().includes('nota'));
          estadoInicial = colNota || ((columnasActivas && columnasActivas.length > 0) ? columnasActivas[0] : 'Información util');
        } else {
          if (colInicialConfigurada && (columnasActivas || []).includes(colInicialConfigurada)) {
            estadoInicial = colInicialConfigurada;
          } else {
            const colSolicitud = (columnasActivas || []).find(c => c.toLowerCase().includes('solicitud'));
            estadoInicial = colSolicitud || (columnasActivas && columnasActivas.includes('Solicitud') ? 'Solicitud' : ((columnasActivas && columnasActivas.length > 0) ? columnasActivas[0] : 'Solicitud'));
          }
        }

        const payload = {
          titulo: titulo.trim(),
          descripcion: (descripcion || '').trim(),
          area: area || '',
          prioridad: prioridad || 'Media',
          estado: estadoInicial,
          responsable,
          tablero_id: tableroId,
          solicitante: (solicitante || '').trim(),
          seccion_solicitante: (seccion_solicitante || '').trim()
        };
        if (email_solicitante && email_solicitante.trim()) {
          payload.email_solicitante = email_solicitante.trim();
        }

        let res = await api.tickets.create(payload);

        data = res.data;
        error = res.error;

        // Fallback 1: Si la columna 'email_solicitante' no existe en Supabase DB, reintentamos sin ese campo
        if (error && error.message?.includes('email_solicitante')) {
          console.warn("Reintentando creación sin la columna 'email_solicitante'...", error);
          const payloadSinEmail = { ...payload };
          delete payloadSinEmail.email_solicitante;
          res = await api.tickets.create(payloadSinEmail);
          data = res.data;
          error = res.error;
        }

        // Fallback 2: Si la base de datos rebotó por restricción ENUM en Postgres ('ticket_estado'), reintentamos con 'Pendiente'
        if (error && (error.code === '22P02' || error.message?.toLowerCase().includes('enum') || error.message?.includes('ticket_estado'))) {
          console.warn("Reintentando creación con estado 'Pendiente'...", error);
          const payloadSinEmail = { ...payload, estado: 'Pendiente' };
          delete payloadSinEmail.email_solicitante;
          res = await api.tickets.create(payloadSinEmail);
          data = res.data;
          error = res.error;
        }

        if (!error && data && data.length > 0 && user) {
          const nuevoTicketId = data[0].id;
          const creadorNombre = user.nombre || user.email || 'Usuario';
          const infoSolicitante = solicitante ? ` para ${solicitante}${seccion_solicitante ? ` (${seccion_solicitante})` : ''}` : '';
          const textoAuditoria = `[AUDITORÍA]: Ticket creado por ${creadorNombre}${infoSolicitante}.`;

          // Registrar trazabilidad de creación en la auditoría
          api.comentarios.create({
            ticket_id: nuevoTicketId,
            usuario_id: user.id,
            texto: textoAuditoria
          }).then(({ error: auditError }) => {
            if (auditError) console.error("Error al registrar auditoría de creación:", auditError);
          });

          // Notificar a n8n si hay correo de solicitante configurado
          if (email_solicitante && email_solicitante.trim()) {
            const numeroTicketCalculado = getNumeroTicket(data[0], [...tickets, data[0]]);
            const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.efectohost.com/webhook/crear-ticket';
            if (n8nWebhookUrl) {
              fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ticket_id: data[0].id,
                  numero_ticket: numeroTicketCalculado ? `#${numeroTicketCalculado}` : 'Nota',
                  titulo: data[0].titulo,
                  solicitante: data[0].solicitante || 'Solicitante',
                  email_solicitante: email_solicitante.trim(),
                  area: data[0].area || 'General',
                  prioridad: data[0].prioridad,
                  seccion_solicitante: data[0].seccion_solicitante || '',
                  fecha_creacion: new Date(data[0].fecha_creacion).toLocaleDateString('es-AR')
                })
              }).catch(err => console.error("Error al notificar a n8n:", err));
            }
          }

          // Crear las notificaciones SOLO para los miembros del tablero (excepto el creador) y SOLO si no es una Nota
          if (prioridad !== 'Nota') {
            const notificacionesPayload = usuarios
              .filter(u => u.id !== user.id && u.rol_en_tablero != null)
              .map(u => ({
                usuario_id: u.id,
                ticket_id: nuevoTicketId,
                mensaje: `Nuevo ticket: "${titulo}"`,
                leida: false
              }));

            if (notificacionesPayload.length > 0) {
              // Fire and forget, no bloqueamos la interfaz
              Promise.all(notificacionesPayload.map(item => api.notificaciones.create(item)))
                .then(results => {
                  const errors = results.filter(r => r.error);
                  if (errors.length > 0) console.error("Error al despachar notificaciones:", errors[0].error);
                });
            }
          }
        }
      }

      if (error) {
        console.error('Error al guardar el ticket en Supabase:', error);
        alert(`Error al guardar el ticket en Supabase:\n${error?.message || 'Revisa la conexión o permisos.'}`);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('Supabase no retornó la fila creada. Es posible que las políticas RLS estén bloqueando la inserción.');
        alert('⚠️ No se pudo guardar el ticket en Supabase.\n\nEs posible que las políticas de seguridad (RLS) en la tabla "tickets" estén bloqueando la inserción para tu usuario.');
        return;
      }

      // Éxito total
      setModalOpen(false);
      setFormConfig({ id: null, titulo: '', descripcion: '', area: '', prioridad: 'Media', responsables: [], solicitante: '', seccion_solicitante: '', email_solicitante: '' });
      if (id) {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, ...data[0] } : t));
        setDetalleOpen(false);
        setTicketActivo(null);
      } else {
        setTickets(prev => [data[0], ...prev]);
      }
    } catch (err) {
      console.error("Excepción inesperada en handleCrearTicket:", err);
      alert(`Ocurrió un error inesperado al procesar el ticket:\n${err?.message || err}`);
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
      // Crear usuario directamente en la tabla usuarios (el backend maneja auth)
      const { data, error } = await api.usuarios.create({
          nombre: formUsuario.nombre,
          email: formUsuario.email,
          dependencia: formUsuario.dependencia,
          piso: formUsuario.piso,
          rol: formUsuario.rol
        });

      if (error) {
        console.error("Error inserting user:", error);
        alert("Error al insertar usuario: " + error.message);
        return;
      }

      if (data && data.length > 0) {
        console.log("Usuario creado exitosamente!", data[0]);
        setFormUsuario({ nombre: '', email: '', dependencia: '', piso: '', rol: 'Soporte Tecnico' });
        setUsuarios(prev => {
          const nuevosUsuarios = [...prev, data[0]];
          return nuevosUsuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));
        });
        alert(`Usuario creado con éxito.\nContraseña temporal: Cti1234`);
      }
    } catch (e) {
      console.error("Error inesperado al crear el usuario:", e);
      alert("Ocurrió un error inesperado al crear el usuario.");
    }
  };
  // Aquí terminaba handleCrearUsuario

  // 5. Eliminar Usuario
  const handleEliminarUsuario = async () => {
    if (!usuarioAEliminar) return;

    // Usamos .select() para verificar si la base de datos realmente eliminó la fila
    const { data, error } = await api.usuarios.delete(usuarioAEliminar.id);

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

  // Añadir Miembro al Tablero
  const handleAnadirMiembro = async (e) => {
    e.preventDefault();
    if (!usuarioAAñadir) return;

    const uAA = usuarios.find(usr => usr.id === usuarioAAñadir);
    const defaultPerms = uAA?.rol === 'Soporte' ? PERMISOS_DEFAULT['Soporte Tecnico'] : PERMISOS_DEFAULT['Usuario'];

    const { error } = await api.tableroUsuarios.addMember({
          tablero_id: tableroId,
          usuario_id: usuarioAAñadir,
          rol_en_tablero: uAA?.rol || 'Usuario',
          permisos: defaultPerms
        });

    if (error) {
      console.error('Error al añadir miembro:', error);
      alert('No se pudo añadir al miembro: ' + error.message);
    } else {
      setUsuarioAAñadir('');
      fetchData();
    }
  };

  // Eliminar Miembro del Tablero
  const handleEliminarMiembro = async () => {
    if (!usuarioAEliminar) return;

    const { error } = await api.tableroUsuarios.removeMember(tableroId, usuarioAEliminar.id);

    if (error) {
      console.error('Error al eliminar miembro del tablero:', error);
      alert('Error al eliminar el miembro del tablero.');
    } else {
      setUsuarios(prev => prev.map(u => u.id === usuarioAEliminar.id ? { ...u, rol_en_tablero: null, permisos_tablero: null } : u));
      setUsuarioAEliminar(null);
    }
  };

  // 5b. Editar Rol de Usuario
  const handleEditarRolUsuario = async (userId, nuevoRol) => {
    // Optimistic UI Update para sentirlo instantáneo
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rol_en_tablero: nuevoRol } : u));
    setRolesEditados(prev => { const temp = { ...prev }; delete temp[userId]; return temp; });

    const { error } = await api.tableroUsuarios.updateRole(tableroId, userId, nuevoRol);

    if (error) {
      console.error('Error al actualizar el rol en tablero', error);
      alert('Error al guardar el nuevo rol en la base de datos.');
      fetchData();
    }
  };

  // Editar Permisos Granulares
  const handleGuardarPermisos = async (userId, nuevosPermisos) => {
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, permisos_tablero: nuevosPermisos } : u));
    const { error } = await api.tableroUsuarios.updatePermisos(tableroId, userId, nuevosPermisos);

    if (error) {
      console.error('Error al actualizar permisos', error);
      alert('Error al guardar los permisos en la base de datos.');
      fetchData();
    }
  };


  // 6. Eliminar Ticket
  const handleEliminarTicket = async () => {
    if (!ticketAEliminar) return;

    // Usamos .select() para verificar si la base de datos realmente eliminó la fila
    const { data, error } = await api.tickets.delete(ticketAEliminar.id);

    if (error) {
      console.error('Error al eliminar ticket', error);
      alert('Error al eliminar el ticket.');
    } else if (data && data.length === 0) {
      alert('⚠️ No se pudo eliminar el ticket de la base de datos porque las políticas de seguridad (RLS) de Supabase están bloqueando la acción.\n\nPor favor, revisa los permisos en la tabla "tickets" desde tu panel de Supabase.');
      setTicketAEliminar(null);
    } else {
      setTickets(prev => prev.filter(t => t.id !== ticketAEliminar.id)); // Instantáneo
      setTicketAEliminar(null);
      setTicketActivo(null);
      setDetalleOpen(false);
      setModalOpen(false);
    }
  };

  // 7. Sub-tareas (Checklist)
  const handleToggleChecklist = async (ticketId, index) => {
    const targetTicket = (ticketActivo && ticketActivo.id === ticketId)
      ? ticketActivo
      : tickets.find(t => t.id === ticketId);

    if (!targetTicket) return;

    const currentChecklist = Array.isArray(targetTicket.checklist) ? targetTicket.checklist : [];
    if (!currentChecklist[index]) return;

    const updatedChecklist = currentChecklist.map((item, idx) => {
      if (idx === index) {
        return { ...item, completado: !item.completado };
      }
      return item;
    });

    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, checklist: updatedChecklist } : t));
    if (ticketActivo && ticketActivo.id === ticketId) {
      setTicketActivo(prev => ({ ...prev, checklist: updatedChecklist }));
    }

    const { error } = await api.tickets.update(ticketId, { checklist: updatedChecklist });
    if (error) console.error("Error al actualizar checklist:", error);
  };

  const handleAgregarChecklist = async (e) => {
    e.preventDefault();
    if (!nuevoChecklist.trim() || !ticketActivo) return;

    const currentChecklist = Array.isArray(ticketActivo.checklist) ? ticketActivo.checklist : [];
    const updatedChecklist = [
      ...currentChecklist,
      { id: Date.now(), texto: nuevoChecklist.trim(), completado: false }
    ];

    setNuevoChecklist('');
    setTickets(prev => prev.map(t => t.id === ticketActivo.id ? { ...t, checklist: updatedChecklist } : t));
    setTicketActivo(prev => ({ ...prev, checklist: updatedChecklist }));

    const { error } = await api.tickets.update(ticketActivo.id, { checklist: updatedChecklist });
    if (error) console.error("Error al agregar al checklist:", error);
  };

  const handleEliminarChecklist = async (ticketId, index) => {
    const targetTicket = (ticketActivo && ticketActivo.id === ticketId)
      ? ticketActivo
      : tickets.find(t => t.id === ticketId);

    if (!targetTicket) return;

    const currentChecklist = Array.isArray(targetTicket.checklist) ? targetTicket.checklist : [];
    const updatedChecklist = currentChecklist.filter((_, idx) => idx !== index);

    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, checklist: updatedChecklist } : t));
    if (ticketActivo && ticketActivo.id === ticketId) {
      setTicketActivo(prev => ({ ...prev, checklist: updatedChecklist }));
    }

    const { error } = await api.tickets.update(ticketId, { checklist: updatedChecklist });
    if (error) console.error("Error al eliminar del checklist:", error);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-300 dark:bg-[var(--bg-main)] transition-colors duration-500 font-sans p-6">
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 max-w-sm">
          {/* Logo Provincia de Buenos Aires con Glow & Motion */}
          <div className="relative mb-6">
            <div className="absolute -inset-4 bg-[#065E94]/25 dark:bg-white/20 rounded-full blur-2xl animate-pulse" />
            <div
              className="relative h-24 sm:h-28 w-20 sm:w-24 bg-[#065E94] dark:bg-white shrink-0 transition-colors duration-300 drop-shadow-[0_12px_25px_rgba(6,94,148,0.35)] dark:drop-shadow-[0_12px_25px_rgba(255,255,255,0.3)] animate-bounce"
              style={{
                maskImage: 'url(/logo-pba.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskImage: 'url(/logo-pba.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
              }}
              title="Provincia de Buenos Aires"
            />
          </div>

          <h1 className="text-3xl font-extrabold text-[#065E94] dark:text-white tracking-tight mb-1">
            Ticketera
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400 mb-6">
            Gobierno de la Provincia de Buenos Aires
          </p>

          {/* Tarjeta de Carga Glassmorfica */}
          <div className="px-6 py-3.5 bg-white/70 dark:bg-white/10 backdrop-blur-xl rounded-2xl border border-white/80 dark:border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-[#065E94] dark:text-white font-extrabold text-sm tracking-wide flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#065E94] dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Cargando sistema...</span>
          </div>
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
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2.5">
              <div
                className="h-9 sm:h-11 w-7 sm:w-9 bg-[#065E94] dark:bg-white [html.theme-wallpaper_&]:bg-white shrink-0 transition-colors duration-300"
                style={{
                  maskImage: 'url(/logo-pba.png)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: 'url(/logo-pba.png)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                }}
                title="Provincia de Buenos Aires"
              />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#065E94] dark:text-white tracking-tight [html.theme-wallpaper_&]:text-white [html.theme-wallpaper_&]:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Ticketera
              </h1>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              {/* Notificaciones Mobile */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setMostrarNotificacionesDropdown(!mostrarNotificacionesDropdown)}
                    className="p-2 text-[#065E94] dark:text-neutral-300 bg-white/60 dark:bg-[var(--bg-secondary)] border border-slate-200/80 dark:border-[var(--border-accent)]/80 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-[var(--bg-hover)] transition-all cursor-pointer relative"
                    title="Notificaciones"
                  >
                    <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {notificaciones.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse-glow">
                        {notificaciones.length > 9 ? '9+' : notificaciones.length}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Notificaciones Mobile */}
                  {mostrarNotificacionesDropdown && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setMostrarNotificacionesDropdown(false)}></div>
                      <div className="fixed top-20 left-4 right-4 mx-auto max-w-[340px] w-auto bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-[var(--border-accent)] z-[70] p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border-accent)]/60 pb-3">
                          <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            Notificaciones
                          </p>
                          <span className="text-[10px] font-bold bg-[#065E94] text-white px-2 py-0.5 rounded-full shadow-sm">{notificaciones.length}</span>
                        </div>
                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                          {notificaciones.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">
                              No hay notificaciones
                            </div>
                          ) : (
                            notificaciones.slice(0, 5).map(n => (
                              <NotificationItem
                                key={n.id}
                                n={n}
                                tickets={tickets}
                                setTicketActivo={setTicketActivo}
                                setDetalleOpen={setDetalleOpen}
                                fetchComentarios={fetchComentarios}
                                setNotificaciones={setNotificaciones}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Botón Lupa Mobile */}
              <button
                onClick={() => setMostrarBuscadorMobile(!mostrarBuscadorMobile)}
                className={`p-2 border rounded-xl shadow-sm transition-all cursor-pointer ${mostrarBuscadorMobile
                  ? 'bg-[#065E94] text-white border-transparent'
                  : 'text-[#065E94] dark:text-neutral-300 bg-white/60 dark:bg-[var(--bg-secondary)] border-slate-200 dark:border-[var(--border-accent)] hover:bg-slate-50'
                  }`}
                title="Buscar"
              >
                <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Botón Hamburguesa */}
              <button
                onClick={() => setMenuResponsiveAbierto(true)}
                className="p-2 text-[#065E94] dark:text-white bg-white/60 dark:bg-[var(--bg-secondary)] border border-slate-200/80 dark:border-[var(--border-accent)]/80 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
                title="Menú"
              >
                <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className="hidden md:block flex-1 max-w-md mx-auto relative group">
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
                        const dateStr = t.fecha_creacion ? new Date(t.fecha_creacion).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                        const numTkt = getNumeroTicket(t, tickets);
                        return t.titulo?.toLowerCase().includes(term) ||
                          t.solicitante?.toLowerCase().includes(term) ||
                          t.responsable?.toLowerCase().includes(term) ||
                          t.id?.toString().includes(term) ||
                          (numTkt && numTkt.toString().includes(term)) ||
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
                              Fecha: {new Date(t.fecha_creacion).toLocaleDateString()} | {t.prioridad !== 'Nota' ? `Ticket #${getNumeroTicket(t, tickets)}` : 'Nota'} | Asignado a: {t.responsable || 'Sin asignar'} | Solicitante: {t.solicitante || 'Desconocido'}
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

          <div className="hidden md:flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-4">
                {/* Campanita de Notificaciones */}
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 dark:bg-[var(--bg-secondary)] border border-white/80 dark:border-[var(--border-accent)] shadow-[0_4px_20px_-4px_rgba(6,94,148,0.2)] dark:shadow-none backdrop-blur-md dark:backdrop-blur-none cursor-pointer transition-all duration-300 hover:bg-white/90 dark:hover:bg-[var(--bg-hover)] hover:-translate-y-1 group ">
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
                        notificaciones.slice(0, 5).map(n => (
                          <NotificationItem
                            key={n.id}
                            n={n}
                            tickets={tickets}
                            setTicketActivo={setTicketActivo}
                            setDetalleOpen={setDetalleOpen}
                            fetchComentarios={fetchComentarios}
                            setNotificaciones={setNotificaciones}
                          />
                        ))
                      )}
                    </div>
                    {notificaciones.length > 5 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-[var(--border-accent)]/50 text-center">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">+{notificaciones.length - 5} notificaciones adicionales</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {misPermisos.crear_tickets && (
              <button
                onClick={() => {
                  setFormConfig({ id: null, titulo: '', descripcion: '', area: '', prioridad: 'Media', responsables: [], solicitante: '', seccion_solicitante: '' });
                  setModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#065E94] dark:text-white bg-white/80 dark:bg-[var(--bg-secondary)] hover:bg-blue-50 dark:hover:bg-[var(--bg-hover)] shadow-[0_4px_15px_-3px_rgba(6,94,148,0.15)] dark:shadow-none hover:-translate-y-1 dark:hover:-translate-y-0 transition-all duration-300 border border-blue-100 dark:border-[var(--border-accent)] backdrop-blur-md dark:backdrop-blur-none flex items-center gap-2"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuevo Ticket
              </button>
            )}

            {misPermisos.ver_estadisticas && (
              <button
                onClick={() => setMostrarEstadisticas(!mostrarEstadisticas)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border backdrop-blur-md dark:backdrop-blur-none flex items-center gap-2 ${mostrarEstadisticas
                  ? 'text-white bg-gradient-to-r from-[#065E94] to-[#043d63] border-transparent shadow-[0_4px_15px_-3px_rgba(6,94,148,0.4)]'
                  : 'text-[#065E94] dark:text-white bg-white/80 dark:bg-[var(--bg-secondary)] hover:bg-blue-50 dark:hover:bg-[var(--bg-hover)] border-blue-100 dark:border-[var(--border-accent)] shadow-[0_4px_15px_-3px_rgba(6,94,148,0.15)] dark:shadow-none hover:-translate-y-1 dark:hover:-translate-y-0'
                  }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mostrarEstadisticas ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  )}
                </svg>
                {mostrarEstadisticas ? 'Volver' : 'Estadísticas'}
              </button>
            )}

            <button
              onClick={() => setModalUsuariosOpen(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#065E94] dark:text-white bg-white/80 dark:bg-[var(--bg-secondary)] hover:bg-blue-50 dark:hover:bg-[var(--bg-hover)] shadow-[0_4px_15px_-3px_rgba(6,94,148,0.15)] dark:shadow-none hover:-translate-y-1 dark:hover:-translate-y-0 transition-all duration-300 border border-blue-100 dark:border-[var(--border-accent)] backdrop-blur-md dark:backdrop-blur-none flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Miembros del Tablero
            </button>

            {/* Botón Volver a los Tableros */}
            <button
              onClick={() => navigate('/')}
              className="px-4.5 py-2.5 rounded-xl text-sm font-bold text-[#065E94] dark:text-white bg-white/80 dark:bg-[var(--bg-secondary)] hover:bg-blue-50 dark:hover:bg-[var(--bg-hover)] shadow-[0_4px_15px_-3px_rgba(6,94,148,0.15)] dark:shadow-none hover:-translate-y-1 dark:hover:-translate-y-0 transition-all duration-300 border border-blue-100 dark:border-[var(--border-accent)] backdrop-blur-md dark:backdrop-blur-none flex items-center gap-2"
              title="Volver a la lista de tableros"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver a los tableros</span>
            </button>

            {/* Botón Cerrar Sesión (Solo Ícono) */}
            <button
              onClick={() => setModalLogoutOpen(true)}
              className="p-2.5 rounded-xl text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 shadow-sm dark:shadow-none hover:-translate-y-0.5 transition-all duration-300 border border-red-200/80 dark:border-red-900/50 backdrop-blur-md flex items-center justify-center shrink-0"
              title="Cerrar Sesión"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Mobile Search Bar */}
        {mostrarBuscadorMobile && (
          <div className="md:hidden mb-6 relative z-40 animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <svg className="w-4 h-4 text-slate-600 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="w-full bg-white/90 dark:bg-[var(--bg-secondary)]/90 border border-slate-200 dark:border-[var(--border-accent)] backdrop-blur-md rounded-2xl py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#065E94]/30 transition-all placeholder:text-slate-500 dark:placeholder:text-neutral-300 shadow-sm"
              />

              {showSearchDropdown && busqueda.trim() !== '' && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowSearchDropdown(false)}></div>
                  <div className="absolute top-12 left-0 w-full bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-[var(--border-accent)] z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-slate-100 dark:border-[var(--border-accent)]/60 bg-slate-50/50 dark:bg-white/5">
                      <p className="text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-[0.2em]">Tarjetas</p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {(() => {
                        const term = busqueda.toLowerCase().trim();
                        const filtered = tickets.filter(t => {
                          const dateStr = t.fecha_creacion ? new Date(t.fecha_creacion).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                          const numTkt = getNumeroTicket(t, tickets);
                          return t.titulo?.toLowerCase().includes(term) ||
                            t.solicitante?.toLowerCase().includes(term) ||
                            t.responsable?.toLowerCase().includes(term) ||
                            t.id?.toString().includes(term) ||
                            (numTkt && numTkt.toString().includes(term)) ||
                            dateStr.includes(term);
                        }).slice(0, 8);

                        if (filtered.length === 0) {
                          return (
                            <div className="p-6 text-center">
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
                              setMostrarBuscadorMobile(false);
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
                                {t.prioridad !== 'Nota' ? `Ticket #${getNumeroTicket(t, tickets)}` : 'Nota'} | Asignado: {t.responsable || 'Sin asignar'}
                              </p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {mostrarEstadisticas ? (
          <div className="flex-1 overflow-hidden">
            <EstadisticasPanel tickets={tickets} usuarios={usuarios} themeMode={themeMode} user={user} />
          </div>
        ) : (
          <>
            {/* Nombre del Tablero y Botón Volver */}
            <div className="hidden md:flex mb-8 border-b-2 border-slate-200/60 dark:border-[var(--border-accent)] gap-6 overflow-x-auto justify-between items-center pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 text-slate-400 hover:text-[#065E94] dark:text-neutral-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors [html.theme-wallpaper_&]:text-white/90 [html.theme-wallpaper_&]:hover:text-white [html.theme-wallpaper_&]:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] [html.theme-wallpaper_&]:hover:bg-white/10"
                  title="Volver a mis tableros"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-2xl font-extrabold text-[#065E94] dark:text-white drop-shadow-sm [html.theme-wallpaper_&]:text-white [html.theme-wallpaper_&]:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {tableroActual ? tableroActual.nombre : 'Cargando tablero...'}
                </h2>
              </div>

              {columnasActivas.length > 5 && (
                <div className="flex items-center gap-2 bg-white/70 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200/70 dark:border-[var(--border-accent)] shadow-sm">
                  <button
                    onClick={() => kanbanContainerRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                    className="p-1.5 text-slate-500 hover:text-[#065E94] dark:text-neutral-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Desplazar columnas a la izquierda"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-xs font-bold text-slate-600 dark:text-neutral-300 px-1">
                    {columnasActivas.length} columnas
                  </span>
                  <button
                    onClick={() => kanbanContainerRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                    className="p-1.5 text-slate-500 hover:text-[#065E94] dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Desplazar columnas a la derecha"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Tablero Kanban */}
            <DragDropContext onDragEnd={onDragEnd} onDragStart={(start) => setDraggingSourceId(start.source.droppableId)}>
              <div ref={kanbanContainerRef} className={`flex ${columnasActivas.length > 4 ? 'gap-3.5' : 'gap-4 sm:gap-6'} pb-6 items-start flex-1 min-h-0 overflow-x-auto overflow-y-hidden w-full px-2 pr-12 snap-x snap-mandatory scroll-smooth custom-scrollbar`}>
                {columnasActivas.map(columnId => (
                  <div
                    key={columnId}
                    className={`glass-column flex-shrink-0 ${columnasActivas.length <= 4
                        ? 'w-[85vw] sm:w-[340px]'
                        : columnasActivas.length === 5
                          ? 'w-[80vw] sm:w-[285px]'
                          : 'w-[75vw] sm:w-[250px] min-w-[250px]'
                      } flex flex-col rounded-2xl p-2 bg-slate-200/60 dark:bg-[var(--bg-column)] border border-slate-300/50 dark:border-[var(--border-accent)]/30 max-h-[calc(100vh-140px)] sm:max-h-[680px] min-h-[250px] shadow-sm relative transition-all duration-200 snap-center sm:snap-none ${draggingSourceId === columnId ? 'z-[1000]' : 'z-0'}`}
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
                          className={`flex-1 overflow-y-auto min-h-[150px] space-y-3.5 px-2 pb-32 sm:pb-6 pt-1 transition-colors duration-300 ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-[var(--bg-secondary)]/50 rounded-2xl ring-2 ring-[#065E94]/30 dark:ring-[var(--border-accent)] shadow-inner dark:shadow-none' : ''
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
                                isReadOnly={!getPermisosUsuario(user).mover_tarjetas}
                                allTickets={tickets}
                                totalCols={columnasActivas.length}
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
          </>
        )}
      </div>
      {/* ===== TEMA TOGGLE (FLOTANTE - 4 ESTADOS) ===== */}
      <div className="hidden md:flex fixed bottom-8 right-8 bg-white/80 dark:bg-[var(--bg-secondary)]/80 backdrop-blur-xl border border-slate-200/80 dark:border-[var(--border-accent)] p-1.5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] items-center gap-1 z-50 group hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:hover:shadow-[0_8px_30px_rgba(29,78,216,0.3)] transition-shadow duration-300">

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
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 transition-all duration-300 ${wallpaperModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        onClick={(e) => { if (e.target === e.currentTarget) setWallpaperModalOpen(false); }}
      >
        <div className={`bg-slate-900/95 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.5)] w-full max-w-4xl p-6 sm:p-8 max-h-[85vh] flex flex-col transform transition-all duration-300 ${wallpaperModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          {/* Header */}
          <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🖼️</span> Fondo de pantalla
              </h2>
              <p className="text-xs sm:text-sm text-white/50 mt-1 uppercase tracking-widest">Elegí un fondo para tu tablero</p>
            </div>
            <button
              onClick={() => setWallpaperModalOpen(false)}
              className="text-white/40 hover:text-white/80 transition-colors bg-white/10 hover:bg-white/20 p-2.5 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Categorías / Carpetas de Fondos */}
          <div className="flex items-center gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl mb-5 overflow-x-auto custom-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setCategoriaFondo('general')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 whitespace-nowrap cursor-pointer ${categoriaFondo === 'general'
                  ? 'bg-gradient-to-r from-[#065E94] to-[#043d63] text-white shadow-lg shadow-[#065E94]/40 scale-[1.02]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
            >
              <span className="text-base sm:text-lg">🏞️</span> Fondos
            </button>

            <button
              type="button"
              onClick={() => setCategoriaFondo('pba')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 whitespace-nowrap cursor-pointer ${categoriaFondo === 'pba'
                  ? 'bg-gradient-to-r from-[#065E94] to-[#043d63] text-white shadow-lg shadow-[#065E94]/40 scale-[1.02]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
            >
              <img src="/logo-pba-blanco.png" alt="PBA" className="w-5 h-5 object-contain" /> Prov. de Buenos Aires
            </button>

            <button
              type="button"
              onClick={() => setCategoriaFondo('abstract')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 whitespace-nowrap cursor-pointer ${categoriaFondo === 'abstract'
                  ? 'bg-gradient-to-r from-[#065E94] to-[#043d63] text-white shadow-lg shadow-[#065E94]/40 scale-[1.02]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
            >
              <span className="text-base sm:text-lg">🎨</span> Fondos Abstractos
            </button>
          </div>

          {/* Grid ampliado y espacioso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 custom-scrollbar">
            {WALLPAPERS.filter(wp => wp.categoria === categoriaFondo || (categoriaFondo !== 'general' && wp.id === 'none')).map(wp => (
              <button
                key={wp.id}
                onClick={() => { setActiveWallpaper(wp.id); }}
                className={`relative rounded-2xl overflow-hidden h-44 sm:h-40 w-full shrink-0 block group transition-all duration-300 ${activeWallpaper === wp.id
                  ? 'ring-4 ring-[#065E94] ring-offset-4 ring-offset-[#0a1628] scale-[1.02]'
                  : 'hover:scale-[1.03] hover:ring-2 hover:ring-[#065E94]/40'
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
                  <span className="text-sm font-bold text-white block truncate">{wp.label}</span>
                </div>
                {/* Selected check */}
                {activeWallpaper === wp.id && (
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gradient-to-br from-[#065E94] to-[#043d63] flex items-center justify-center shadow-lg shadow-[#065E94]/40">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => setWallpaperModalOpen(false)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#0773b5] hover:to-[#065E94] text-white font-bold text-sm transition-all shadow-lg shadow-[#065E94]/40 hover:-translate-y-0.5"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

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
          <div className={`bg-white/95 dark:bg-[var(--bg-secondary)] backdrop-blur-md rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-none w-full border border-white/60 dark:border-[var(--border-accent)] transform-gpu transition-all animate-in zoom-in-95 duration-200 overflow-hidden ${tableroActual?.tipo !== 'Personal' && formConfig.prioridad !== 'Nota' ? 'max-w-[960px]' : 'max-w-lg'}`}>
            <TicketForm
              initialConfig={formConfig}
              onSubmit={handleCrearTicket}
              onCancel={() => setModalOpen(false)}
              user={user}
              usuarios={usuarios}
              tipoTablero={tableroActual?.tipo}
              setTicketAEliminar={setTicketAEliminar}
              setModalOpen={setModalOpen}
            />
          </div>
        </div>
      )}

      {/* Modal - Gestión de Usuarios (Glassmorphism) */}
      {modalUsuariosOpen && (
        <div className="fixed inset-0 bg-slate-900/30 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 opacity-100 transition-opacity animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) setModalUsuariosOpen(false) }}>
          <div className="relative bg-white/95 dark:bg-[var(--bg-secondary)] backdrop-blur-3xl dark:backdrop-blur-none rounded-[32px] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] dark:shadow-none w-full max-w-4xl border border-white/80 dark:border-[var(--border-accent)] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300 max-h-[85vh]">

            {/* Botón X Absoluto en la esquina superior derecha */}
            <button
              onClick={() => setModalUsuariosOpen(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100/90 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-black/60 p-2 sm:p-2.5 rounded-full transition-all shrink-0 cursor-pointer backdrop-blur-md shadow-sm border border-slate-200/50 dark:border-white/10"
              title="Cerrar ventana"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Formulario Izquierda (Añadir Miembro) */}
            {getPermisosUsuario(user).gestionar_usuarios && (
              <div className="flex-[0.8] p-4 sm:p-6 md:p-9 flex flex-col bg-slate-50/50 dark:bg-black/10 border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-[var(--border-accent)]/50 pr-12 md:pr-6">
                <div className="max-w-xs mx-auto w-full">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-1 sm:mb-2 tracking-tight">Añadir Miembro</h2>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-neutral-400 mb-3 sm:mb-6 leading-normal">Agregá nuevos usuarios para que puedan ver, comentar o editar tareas en este tablero.</p>

                  <form onSubmit={handleAnadirMiembro} className="space-y-3 sm:space-y-6">
                    <div className="bg-white dark:bg-[var(--bg-secondary)]/50 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/50 dark:border-[var(--border-accent)]/50 shadow-sm">
                      <label className="block text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5 sm:mb-3">Seleccionar Usuario</label>
                      <select
                        value={usuarioAAñadir}
                        onChange={e => setUsuarioAAñadir(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[var(--bg-main)] border border-slate-200/60 dark:border-[var(--border-accent)] dark:text-white rounded-xl p-2.5 sm:p-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner cursor-pointer"
                        required
                      >
                        <option value="">Selecciona un usuario...</option>
                        {usuarios.filter(u => u.rol_en_tablero === null).map(u => (
                          <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!usuarioAAñadir}
                      className="w-full py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-600/30 dark:shadow-emerald-900/40 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                      Añadir al Tablero
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Lista Derecha (Miembros del Tablero) */}
            <div className={`flex flex-col flex-[1.2] p-4 sm:p-6 md:p-9 overflow-hidden`}>
              <div className="flex items-center justify-between mb-3 sm:mb-6 gap-2 pr-8 md:pr-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight truncate">Miembros del Tablero</h2>
                    <span className="text-[10px] sm:text-[11px] font-extrabold bg-[#065E94]/10 dark:bg-blue-500/10 text-[#065E94] dark:text-blue-400 px-2.5 py-1 rounded-full border border-[#065E94]/20 dark:border-blue-500/20 shadow-sm shrink-0">
                      {usuarios.filter(u => u.rol_en_tablero !== null).length}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-neutral-500 mt-0.5 line-clamp-1">Usuarios con acceso y sus roles correspondientes.</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 sm:space-y-4 custom-scrollbar">
                {usuarios.filter(u => u.rol_en_tablero !== null).length === 0 ? (
                  <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center opacity-70">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 mb-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <p className="text-sm font-bold text-slate-500">Sin miembros</p>
                  </div>
                ) : (
                  usuarios.filter(u => u.rol_en_tablero !== null).map(u => (
                    <div key={u.id} className="group bg-slate-50/50 dark:bg-[var(--bg-secondary)] border border-slate-200/50 dark:border-[var(--border-accent)]/40 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col hover:bg-white dark:hover:bg-white/[0.02] hover:shadow-md dark:hover:shadow-none hover:border-slate-300/60 dark:hover:border-[var(--border-accent)] transition-all duration-300">

                      {/* Fila principal */}
                      <div className="flex items-center gap-2.5 sm:gap-4 w-full">
                        {/* Avatar Inicial */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#065E94] to-blue-500 text-white font-extrabold flex items-center justify-center text-[11px] sm:text-xs shadow-md border border-white/20 shrink-0">
                          {getInicial(u.nombre)}
                        </div>

                        {/* Info de Usuario */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                            <h4 className="font-bold text-slate-800 dark:text-white text-[13px] sm:text-[14px] truncate" title={u.nombre}>{u.nombre}</h4>
                          </div>

                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400 font-medium truncate mt-0.2">{u.email}</p>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.2 truncate">
                            {u.dependencia || 'Sin dep'} • Piso {u.piso || '0'}
                            {u.rol && ` • ${u.rol}`}
                          </p>
                        </div>

                        {/* Controles del Miembro */}
                        <div className="flex items-center gap-1 shrink-0">
                          {getPermisosUsuario(user).gestionar_usuarios && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedUserPerms(expandedUserPerms === u.id ? null : u.id); }}
                                className={`text-[9px] sm:text-[10px] uppercase font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full transition-all border shadow-sm ${expandedUserPerms === u.id
                                  ? 'bg-indigo-500 hover:bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/10'
                                  : 'bg-white dark:bg-[var(--bg-main)]/60 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                                  }`}
                              >
                                {expandedUserPerms === u.id ? 'Ocultar' : 'Permisos'}
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setUsuarioAEliminar(u); }}
                                className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 sm:p-2 bg-transparent hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Eliminar del Tablero"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Permisos Personalizados (Acordeón) */}
                      {getPermisosUsuario(user).gestionar_usuarios && expandedUserPerms === u.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-[var(--border-accent)]/30 w-full animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Permisos del Miembro</p>
                          </div>
                          <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 bg-white/50 dark:bg-black/10 p-4 rounded-xl border border-slate-200/40 dark:border-[var(--border-accent)]/20">
                            {[
                              { key: 'ver_tablero', label: 'Ver Tablero' },
                              { key: 'crear_tickets', label: 'Crear Tickets' },
                              { key: 'editar_tickets', label: 'Editar Tickets' },
                              { key: 'mover_tarjetas', label: 'Mover Tarjetas' },
                              { key: 'eliminar_tickets', label: 'Eliminar Tickets' },
                              { key: 'gestionar_comentarios', label: 'Comentar' },
                              { key: 'ver_estadisticas', label: 'Estadísticas' },
                              { key: 'gestionar_usuarios', label: 'Gestión Usuarios' }
                            ].map(perm => {
                              const uPerms = getPermisosUsuario(u);
                              const hasPerm = !!uPerms[perm.key];
                              return (
                                <label key={perm.key} className="flex items-center gap-3 cursor-pointer select-none group/sw py-1 px-1.5 rounded-lg hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={hasPerm}
                                    onClick={() => handleGuardarPermisos(u.id, { ...uPerms, [perm.key]: !hasPerm })}
                                    className={`${hasPerm ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                                      } relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner`}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className={`${hasPerm ? 'translate-x-4' : 'translate-x-0'}
                                        pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out`}
                                    />
                                  </button>
                                  <span className="text-xs font-bold text-slate-600 dark:text-neutral-300 group-hover/sw:text-indigo-600 dark:group-hover/sw:text-indigo-400 transition-colors leading-tight">{perm.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sub-Modal Confirmación Eliminar Usuario */}
          {usuarioAEliminar && (
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm rounded-[28px] flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-sm p-6 text-center transform transition-all animate-in zoom-in-95 duration-200 border border-transparent dark:border-[var(--border-accent)]">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 object-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Eliminar Miembro</h3>
                <p className="text-sm text-slate-500 dark:text-neutral-400 mb-6">¿Estás seguro que deseas eliminar a <b>{usuarioAEliminar.nombre}</b> de este tablero? El usuario conservará su cuenta global en el sistema.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setUsuarioAEliminar(null)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-neutral-300 bg-slate-100 dark:bg-[var(--bg-secondary)] hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
                  <button onClick={handleEliminarMiembro} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 dark:shadow-none transition-all hover:-translate-y-0.5 dark:hover:-translate-y-0">Sí, eliminar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal - Vista de Detalle (Glassmorphism) */}
      <div className={`fixed inset-0 bg-slate-900/20 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300 ${detalleOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={(e) => { if (e.target === e.currentTarget) setDetalleOpen(false) }}>
        {ticketActivo && (
          <>
            <div className={`bg-white/90 dark:bg-[var(--bg-secondary)] backdrop-blur-2xl dark:backdrop-blur-none rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-none w-full max-w-[1100px] border border-white/60 dark:border-[var(--border-accent)] transform transition-all duration-300 h-[90vh] max-h-[90vh] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden ${detalleOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
              {/* ===== COLUMNA IZQUIERDA: Info del ticket ===== */}
              <div className="flex-1 min-w-0 p-5 md:p-8 md:overflow-y-auto custom-scrollbar flex flex-col">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <span className={`text-[10px] md:text-[11px] uppercase tracking-widest font-bold px-2.5 py-1.5 md:px-3 rounded-xl border ${getPrioridadColor(ticketActivo.prioridad)}`}>
                    Prioridad {ticketActivo.prioridad}
                  </span>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    {ticketActivo.prioridad !== 'Nota' && (
                      <span className="text-[10px] md:text-[11px] font-extrabold px-2 py-1.5 md:px-2.5 rounded-xl border border-slate-200 dark:border-[var(--border-accent)] bg-slate-100/80 dark:bg-[var(--bg-secondary)] text-slate-500 dark:text-slate-400 tracking-widest">
                        #{getNumeroTicket(ticketActivo, tickets)}
                      </span>
                    )}
                    {/* Editar y Eliminar */}

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
                          email_solicitante: ticketActivo.email_solicitante || '',
                          responsables: ticketActivo.responsable ? ticketActivo.responsable.split(',').map(r => r.trim()).filter(Boolean) : []
                        });
                        setDetalleOpen(false); // Cierra la pestaña de detalles
                        setTimeout(() => setModalOpen(true), 50); // Abre la de edición con un ligero retraso para suavizar la animación
                      }}
                      className="text-slate-400 hover:text-[#065E94] dark:hover:text-blue-400 p-1.5 md:p-2 bg-slate-100/50 dark:bg-[var(--bg-secondary)] rounded-full hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border border-transparent"
                      title="Editar ticket"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setTicketAEliminar(ticketActivo); }}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 md:p-2 bg-slate-100/50 dark:bg-[var(--bg-secondary)] rounded-full hover:bg-red-50 dark:hover:bg-slate-700 transition-colors border border-transparent"
                      title="Eliminar ticket"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <button onClick={() => setDetalleOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 md:p-2 bg-slate-100/50 dark:bg-[var(--bg-secondary)] rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors border border-transparent" title="Cerrar">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                <h2 className="text-xl md:text-3xl font-extrabold text-slate-800 dark:text-white leading-tight mb-3 md:mb-4 tracking-tight break-words">{ticketActivo.titulo}</h2>

                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-neutral-400 mb-6 font-medium">
                  {ticketActivo.prioridad !== 'Nota' && ticketActivo.area && (
                    <>
                      <span className="bg-slate-100/80 dark:bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg text-slate-700 dark:text-neutral-300">{ticketActivo.area}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                    </>
                  )}
                  <span>{new Date(ticketActivo.fecha_creacion).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-[#065E94] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg font-bold border border-blue-100/50 dark:border-blue-800/50 whitespace-nowrap">{ticketActivo.estado}</span>
                </div>

                {ticketActivo.prioridad !== 'Nota' && (ticketActivo.solicitante || ticketActivo.seccion_solicitante) && (
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

                <div className="bg-slate-50/50 dark:bg-[var(--bg-secondary)] backdrop-blur-sm p-6 rounded-2xl border border-slate-200/50 dark:border-[var(--border-accent)]/50 mb-8 min-h-[140px] shadow-sm flex flex-col">
                  <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 shrink-0">Descripción</h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[220px] pr-2">
                    <p className="text-slate-700 dark:text-neutral-300 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{ticketActivo.descripcion}</p>
                  </div>
                </div>

                {/* Módulo de Subtareas / Checklist */}
                {ticketActivo.prioridad !== 'Nota' && (() => {
                  const checklist = Array.isArray(ticketActivo.checklist) ? ticketActivo.checklist : [];
                  const hasChecklist = checklist.length > 0;
                  const doneCount = checklist.filter(c => c.completado).length;
                  const totalCount = checklist.length;
                  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                  if (!hasChecklist && !mostrarAgregarSubtarea) {
                    return (
                      <div className="-mt-4 mb-6">
                        <button
                          type="button"
                          onClick={() => setMostrarAgregarSubtarea(true)}
                          className="text-[11.5px] font-semibold text-slate-500 hover:text-[#065E94] dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          + Añadir Subtarea
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-50/50 dark:bg-[var(--bg-secondary)] backdrop-blur-sm p-4 md:p-5 rounded-2xl border border-slate-200/50 dark:border-[var(--border-accent)]/50 mb-8 shadow-sm transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            Subtareas {hasChecklist && `(${doneCount}/${totalCount})`}
                          </h3>
                        </div>

                        {hasChecklist && (
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${progressPercent === 100 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300' : 'bg-blue-50 dark:bg-blue-900/30 text-[#065E94] dark:text-blue-300'}`}>
                            {progressPercent}%
                          </span>
                        )}
                      </div>

                      {/* Barra de progreso si hay subtareas */}
                      {hasChecklist && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 mb-3.5 overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${progressPercent === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-[#065E94] to-blue-500'}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      )}

                      {/* Lista de Subtareas */}
                      {hasChecklist && (
                        <div className="space-y-1.5 mb-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                          {checklist.map((item, idx) => (
                            <div key={item.id || idx} className="group flex items-center justify-between p-2 bg-white dark:bg-[var(--bg-main)]/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-[var(--border-accent)]/40 transition-colors">
                              <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 pr-2">
                                <input
                                  type="checkbox"
                                  checked={!!item.completado}
                                  onChange={() => handleToggleChecklist(ticketActivo.id, idx)}
                                  className="w-3.5 h-3.5 rounded text-[#065E94] border-slate-300 focus:ring-[#065E94] cursor-pointer shrink-0"
                                />
                                <span className={`text-xs font-medium transition-all break-words ${item.completado ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-neutral-200'}`}>
                                  {item.texto}
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleEliminarChecklist(ticketActivo.id, idx)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded-lg transition-all cursor-pointer"
                                title="Eliminar subtarea"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formulario de adición de nueva subtarea */}
                      <form onSubmit={handleAgregarChecklist} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={nuevoChecklist}
                          onChange={(e) => setNuevoChecklist(e.target.value)}
                          placeholder="+ Añadir una subtarea..."
                          className="flex-1 bg-white dark:bg-[var(--bg-main)] border border-slate-200/80 dark:border-[var(--border-accent)] rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#065E94]/40 shadow-2xs"
                        />
                        <button
                          type="submit"
                          disabled={!nuevoChecklist.trim()}
                          className="px-3 py-1.5 bg-[#065E94] hover:bg-[#043d63] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                        >
                          Agregar
                        </button>
                        {!hasChecklist && (
                          <button
                            type="button"
                            onClick={() => setMostrarAgregarSubtarea(false)}
                            className="px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </form>
                    </div>
                  );
                })()}

                {ticketActivo.prioridad !== 'Nota' && ticketActivo.estado !== 'Resuelto' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setTicketAResolver({
                        id: ticketActivo.id,
                        titulo: ticketActivo.titulo,
                        targetState: 'Resuelto',
                        previousState: ticketActivo.estado,
                        prevDate: ticketActivo.fecha_creacion,
                        nuevaFecha: new Date().toISOString()
                      });
                      setModalResolucionOpen(true);
                    }}
                    className="group relative overflow-hidden w-full my-4 mb-8 py-4 px-7 rounded-2xl text-sm md:text-[15px] font-extrabold tracking-wide text-white bg-gradient-to-r from-emerald-600 via-emerald-600 to-green-600 hover:from-emerald-700 hover:via-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-600/30 dark:shadow-emerald-900/40 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 after:absolute after:inset-0 after:translate-x-[-100%] hover:after:translate-x-[100%] after:transition-transform after:duration-1000 after:ease-out after:bg-gradient-to-r after:from-transparent after:via-white/15 after:to-transparent"
                  >
                    <svg className="w-5 h-5 group-hover:scale-125 group-hover:rotate-6 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Marcar como Resuelto
                  </button>
                )}

                {ticketActivo.prioridad !== 'Nota' && ticketActivo.estado === 'Resuelto' && (
                  <div className="w-full my-4 mb-8 py-4 px-7 rounded-2xl text-sm md:text-[15px] font-extrabold tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 flex items-center justify-center gap-3 select-none animate-in zoom-in-95 duration-300">
                    <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Ticket Resuelto
                  </div>
                )}




                {ticketActivo.prioridad !== 'Nota' && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Asignado a</h3>
                    {!ticketActivo.responsable ? (
                      <p className="text-sm font-bold text-slate-500 dark:text-neutral-400 bg-white/60 dark:bg-[var(--bg-secondary)] border border-slate-100 dark:border-[var(--border-accent)] p-3 rounded-xl shadow-sm inline-block w-fit">Sin asignar</p>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {ticketActivo.responsable.split(',').map(r => r.trim()).filter(Boolean).map((nombreResp, idx) => {
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
                )}

              </div>{/* Fin columna izquierda */}

              {/* ===== COLUMNA DERECHA: Comentarios / Auditoría ===== */}
              <div className="w-full md:w-[560px] shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-slate-200/50 dark:border-[var(--border-accent)]/50 bg-slate-50/60 dark:bg-black/20 rounded-b-[32px] md:rounded-b-none md:rounded-r-[32px]">
                <div className="p-5 md:p-8 pb-0 flex items-center">
                  <h3 className="text-[12px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2 h-9">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Historial / Comentarios
                  </h3>
                </div>

                <div className="flex-1 flex flex-col md:overflow-hidden p-4 md:p-6">
                  {/* Lista de Comentarios */}
                  <div className="flex-1 md:overflow-y-auto custom-scrollbar pr-1 space-y-3 mb-3">
                    {comentarios.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 italic">
                        No hay comentarios en este ticket aún.
                      </div>
                    ) : (
                      [...comentarios].reverse().map(c => {
                        const isSystemLog = c.texto && (c.texto.startsWith('[AUDITORÍA]:') || c.texto.startsWith('RESOLUCIÓN OFICIAL:') || c.texto.startsWith('[RESOLUCIÓN OFICIAL]:'));
                        const isResolution = c.texto && (c.texto.startsWith('RESOLUCIÓN OFICIAL:') || c.texto.startsWith('[RESOLUCIÓN OFICIAL]:'));
                        const esMio = user && c.usuario_id === user.id && !isSystemLog;
                        const userObj = usuarios.find(u => u.id === c.usuario_id);
                        const isEditing = comentarioAEditar === c.id;
                        const hasImage = c.archivo_url && c.archivo_tipo?.startsWith('image/');

                        if (isSystemLog) {
                          const cleanTexto = c.texto
                            .replace('[AUDITORÍA]:', '')
                            .replace('RESOLUCIÓN OFICIAL:', '')
                            .replace('[RESOLUCIÓN OFICIAL]:', '')
                            .trim();

                          if (isResolution) {
                            return (
                              <div key={c.id} className="w-full flex justify-center my-3 select-none">
                                <div className="flex items-center gap-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/30 px-4 py-2.5 rounded-[1.25rem] max-w-[90%] shadow-[0_4px_15px_-3px_rgba(16,185,129,0.1)] dark:shadow-none backdrop-blur-md">
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <p className="text-xs font-extrabold text-slate-800 dark:text-emerald-300 leading-tight">
                                      RESOLUCIÓN OFICIAL
                                    </p>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-neutral-300 leading-normal mt-0.5 whitespace-pre-wrap">
                                      {cleanTexto}
                                    </p>
                                    <span className="text-[9.5px] text-slate-400 dark:text-neutral-500 font-bold mt-1 uppercase tracking-wider">
                                      {userObj?.nombre || 'Sistema'} • {new Date(c.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={c.id} className="w-full flex justify-center my-2.5 select-none">
                              <div className="flex items-center gap-3 bg-slate-100/80 dark:bg-neutral-800/30 border border-slate-200/50 dark:border-white/5 px-4 py-2 rounded-2xl max-w-[90%] shadow-sm backdrop-blur-sm">
                                <div className="w-7 h-7 rounded-full bg-slate-200/60 dark:bg-neutral-700/40 text-slate-500 dark:text-neutral-400 flex items-center justify-center shrink-0">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <p className="text-xs font-semibold text-slate-600 dark:text-neutral-300 leading-tight">
                                    {cleanTexto}
                                  </p>
                                  <span className="text-[9.5px] text-slate-400 dark:text-neutral-500 font-bold mt-0.5">
                                    {userObj?.nombre || 'Sistema'} • {new Date(c.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={c.id} className={`flex flex-col max-w-[85%] min-w-0 ${esMio ? 'ml-auto items-end' : 'mr-auto items-start'} group`}>
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <span className="text-[10px] text-slate-400 font-bold">
                                {userObj?.nombre || 'Usuario Desconocido'} • {new Date(c.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                              <div className={`p-3 rounded-2xl text-sm shadow-sm flex flex-col gap-2 max-w-full min-w-0 ${esMio
                                ? (hasImage
                                  ? 'bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 rounded-br-sm'
                                  : 'bg-[#065E94] dark:bg-blue-600/30 text-white rounded-br-sm')
                                : 'bg-white dark:bg-[var(--bg-secondary)] border border-slate-100 dark:border-transparent text-slate-700 dark:text-neutral-200 rounded-bl-sm'
                                }`}>
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
                  {/* Caja de nuevo comentario (Desktop) */}
                  <div className="hidden md:block pt-3 border-t border-slate-200/40 dark:border-[var(--border-accent)]/30 mt-3">
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

                          const { data: uploadData, error: uploadError } = await api.storage
                            .from('ticket-adjuntos')
                            .upload(fileName, archivoSeleccionado);

                          if (uploadError) {
                            console.error('Error uploading file:', uploadError);
                            alert('Error al subir el archivo.');
                            setSubiendoArchivo(false);
                            return;
                          }

                          const { data: { publicUrl } } = api.storage
                            .from('ticket-adjuntos')
                            .getPublicUrl(fileName);

                          archivoUrl = publicUrl;
                          archivoNombre = archivoSeleccionado.name;
                          archivoTipo = archivoSeleccionado.type;
                        }

                        setNuevoComentario('');
                        setArchivoSeleccionado(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        if (fileInputRefMobile.current) fileInputRefMobile.current.value = '';

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
                        setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

                        // Guardamos en DB
                        const { error } = await api.comentarios.create({
                          ticket_id: ticketActivo.id,
                          usuario_id: user.id,
                          texto: textoInsert,
                          archivo_url: archivoUrl,
                          archivo_nombre: archivoNombre,
                          archivo_tipo: archivoTipo
                        });

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
                          className="p-3 bg-slate-100 dark:bg-[var(--bg-main)] border border-slate-200/50 dark:border-[var(--border-accent)]/50 text-slate-500 dark:text-neutral-400 hover:text-[#065E94] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1c1c1c] rounded-xl transition-colors cursor-pointer"
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

              {/* Caja de nuevo comentario (Mobile Sticky) */}
              <div className="md:hidden sticky bottom-0 z-45 bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[var(--border-accent)] p-4 w-full shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-none">
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

                      const { data: uploadData, error: uploadError } = await api.storage
                        .from('ticket-adjuntos')
                        .upload(fileName, archivoSeleccionado);

                      if (uploadError) {
                        console.error('Error uploading file:', uploadError);
                        alert('Error al subir el archivo.');
                        setSubiendoArchivo(false);
                        return;
                      }

                      const { data: { publicUrl } } = api.storage
                        .from('ticket-adjuntos')
                        .getPublicUrl(fileName);

                      archivoUrl = publicUrl;
                      archivoNombre = archivoSeleccionado.name;
                      archivoTipo = archivoSeleccionado.type;
                    }

                    setNuevoComentario('');
                    setArchivoSeleccionado(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    if (fileInputRefMobile.current) fileInputRefMobile.current.value = '';

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
                    setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

                    // Guardamos en DB
                    const { error } = await api.comentarios.create({
                      ticket_id: ticketActivo.id,
                      usuario_id: user.id,
                      texto: textoInsert,
                      archivo_url: archivoUrl,
                      archivo_nombre: archivoNombre,
                      archivo_tipo: archivoTipo
                    });

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
                      <button type="button" onClick={() => { setArchivoSeleccionado(null); if (fileInputRefMobile.current) fileInputRefMobile.current.value = ''; }} className="ml-auto text-slate-400 hover:text-red-500">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRefMobile}
                      className="hidden"
                      onChange={e => setArchivoSeleccionado(e.target.files[0])}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefMobile.current?.click()}
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
          </>
        )}
      </div>

      {/* Modal Confirmación Eliminar Ticket */}
      {ticketAEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
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

      {/* MODAL DE RESOLUCIÓN (Reemplaza a window.prompt para no romper el drag and drop) */}
      {modalResolucionOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={cancelarResolucion}></div>
          <div className="bg-white/95 dark:bg-[var(--bg-secondary)] backdrop-blur-md w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative border border-white/40 dark:border-[var(--border-accent)]/80">
            <div className="p-8 pb-6 bg-gradient-to-br from-blue-50/50 to-white dark:from-[var(--bg-secondary)] dark:to-[var(--bg-main)] relative">
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">
                {ticketAResolver?.targetState === 'Resuelto' ? 'Resolución del Ticket' : `Comentario Obligatorio`}
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-neutral-400 mt-2">
                {ticketAResolver?.targetState === 'Resuelto' ? 'Por favor, detalla la solución final antes de dar este ticket por cerrado.' : `Detalla el motivo para mover este ticket a "${ticketAResolver?.targetState}".`}
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
                    placeholder={ticketAResolver?.targetState === 'Resuelto' ? "Ej: Se reemplazó el tóner defectuoso y se calibraron los colores..." : "Escribe tu comentario aquí..."}
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


      {/* ===== MENÚ LATERAL RESPONSIVE (MÓVIL) ===== */}
      {menuResponsiveAbierto && (
        <>
          {/* Fondo oscuro overlay */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden" onClick={() => setMenuResponsiveAbierto(false)}></div>

          {/* Panel Lateral */}
          <div className="fixed top-0 right-0 h-full w-[280px] bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-l border-slate-200 dark:border-[var(--border-accent)] z-[110] p-6 shadow-2xl flex flex-col md:hidden animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-extrabold text-[#065E94] dark:text-blue-300">Menú</h2>
              <button onClick={() => setMenuResponsiveAbierto(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2 mb-8">
                <button
                  onClick={() => { navigate('/'); setMenuResponsiveAbierto(false); }}
                  className="text-left px-4 py-3 rounded-xl font-bold bg-[#065E94]/10 dark:bg-blue-500/20 text-[#065E94] dark:text-blue-300 border border-[#065E94]/20 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Volver a mis tableros
                </button>
              </div>

              <h3 className="text-xs font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-4">Acciones</h3>
              <div className="flex flex-col gap-2 mb-8">
                {misPermisos.crear_tickets && (
                  <button onClick={() => { setFormConfig({ id: null, titulo: '', descripcion: '', area: '', prioridad: 'Media', responsables: [], solicitante: '', seccion_solicitante: '' }); setModalOpen(true); setMenuResponsiveAbierto(false); }} className="text-left px-4 py-3 rounded-xl font-bold bg-[#065E94] text-white flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nuevo Ticket
                  </button>
                )}
                {misPermisos.ver_estadisticas && (
                  <button onClick={() => { setMostrarEstadisticas(!mostrarEstadisticas); setMenuResponsiveAbierto(false); }} className="text-left px-4 py-3 rounded-xl font-bold bg-slate-50 dark:bg-black/20 text-[#065E94] dark:text-blue-300 border border-blue-100 dark:border-white/10 flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {mostrarEstadisticas ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      )}
                    </svg>
                    {mostrarEstadisticas ? 'Volver al Tablero' : 'Estadísticas'}
                  </button>
                )}
                <button onClick={() => { setModalUsuariosOpen(true); setMenuResponsiveAbierto(false); }} className="text-left px-4 py-3 rounded-xl font-bold bg-slate-50 dark:bg-black/20 text-[#065E94] dark:text-blue-300 border border-blue-100 dark:border-white/10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Miembros del Tablero
                </button>
                <button onClick={() => { setModalLogoutOpen(true); setMenuResponsiveAbierto(false); }} className="text-left px-4 py-3 rounded-xl font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Cerrar Sesión
                </button>
              </div>

              <h3 className="text-xs font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-4">Apariencia</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setThemeMode('light'); setMenuResponsiveAbierto(false); }} className={`p-3 rounded-xl flex flex-col items-center gap-2 border ${themeMode === 'light' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500'}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  <span className="text-[10px] font-bold">Claro</span>
                </button>
                <button onClick={() => { setThemeMode('dark'); setMenuResponsiveAbierto(false); }} className={`p-3 rounded-xl flex flex-col items-center gap-2 border ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500'}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  <span className="text-[10px] font-bold">Oscuro</span>
                </button>
                <button onClick={() => { setThemeMode('blue'); setMenuResponsiveAbierto(false); }} className={`p-3 rounded-xl flex flex-col items-center gap-2 border ${themeMode === 'blue' ? 'bg-blue-900 border-blue-700 text-blue-300' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500'}`}>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" /><path strokeWidth="3.5" strokeLinecap="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707" /></svg>
                  <span className="text-[10px] font-bold">Azul</span>
                </button>
                <button onClick={() => { setThemeMode('wallpaper'); setWallpaperModalOpen(true); setMenuResponsiveAbierto(false); }} className={`p-3 rounded-xl flex flex-col items-center gap-2 border ${themeMode === 'wallpaper' ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500'}`}>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-[10px] font-bold">Fondos</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== FLECHAS DE NAVEGACIÓN DE COLUMNAS (MÓVIL) ===== */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-[45] bg-white/90 dark:bg-[var(--bg-secondary)]/90 backdrop-blur-xl px-5 py-2.5 rounded-[2rem] border border-slate-200/80 dark:border-[var(--border-accent)] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)]">
        <button onClick={() => kanbanContainerRef.current?.scrollBy({ left: -340, behavior: 'smooth' })} className="p-2 text-slate-600 dark:text-neutral-300 hover:text-[#065E94] dark:hover:text-blue-400 active:scale-90 transition-transform">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="w-[1px] h-6 bg-slate-200 dark:bg-[var(--border-accent)]"></div>
        <button onClick={() => kanbanContainerRef.current?.scrollBy({ left: 340, behavior: 'smooth' })} className="p-2 text-slate-600 dark:text-neutral-300 hover:text-[#065E94] dark:hover:text-blue-400 active:scale-90 transition-transform">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Modal Confirmación Cerrar Sesión (Intuitivo) */}
      {modalLogoutOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.3)] w-full max-w-md p-6 text-center transform transition-all animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-[var(--border-accent)]">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200/50 dark:border-red-800/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">
              ¿Cerrar Sesión?
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-neutral-400 mb-6 leading-relaxed">
              Saldrás de tu cuenta de usuario. Para ingresar nuevamente tendrás que escribir tu correo y contraseña.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setModalLogoutOpen(false)}
                className="flex-1 px-5 py-3 rounded-xl font-bold text-slate-700 dark:text-neutral-200 bg-slate-100 dark:bg-[var(--bg-main)] hover:bg-slate-200 dark:hover:bg-[var(--bg-hover)] transition-colors border border-slate-200 dark:border-[var(--border-accent)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setModalLogoutOpen(false);
                  logout();
                }}
                className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 dark:shadow-none transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                Sí, Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function NotificationItem({ n, tickets, setTicketActivo, setDetalleOpen, fetchComentarios, setNotificaciones }) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const startX = useRef(null);
  const tkt = tickets.find(t => t.id === n.ticket_id);

  const handleDismiss = (e) => {
    if (e) e.stopPropagation();
    setNotificaciones(prev => prev.filter(x => x.id !== n.id));
    api.notificaciones.markAsRead(n.id).then(({ error }) => { if (error) console.error(error); });
  };

  const handleClick = () => {
    if (tkt) {
      setTicketActivo(tkt);
      setDetalleOpen(true);
      fetchComentarios(n.ticket_id);
    } else {
      alert("El ticket de la notificación ya no existe. La notificación ha sido descartada.");
    }
    handleDismiss();
  };

  return (
    <div className="relative mb-2">
      {/* Card */}
      <div
        className="relative bg-slate-50 dark:bg-[var(--bg-main)] p-3 cursor-pointer hover:bg-blue-50/80 dark:hover:bg-[var(--bg-hover)] border border-slate-100 dark:border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 rounded-xl group/notif flex items-start gap-3 shadow-sm dark:shadow-none"
        onClick={handleClick}
      >
        <div className="absolute top-1 right-1 md:opacity-0 md:group-hover/notif:opacity-100 transition-opacity">
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
            title="Descartar notificación"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="mt-1 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800/60 shadow-inner">
          <svg className="w-4 h-4 text-[#065E94] dark:text-blue-400 group-hover/notif:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <div className="flex flex-col min-w-0 flex-1 pr-4 text-left">
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
          <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 block uppercase tracking-wider">{new Date(n.created_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
