import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GestionUsuariosGlobal from '../components/GestionUsuariosGlobal';
import { parseTableroConfig, buildTableroConfig } from '../utils/configTablero';

export default function Dashboard() {
  const [tableros, setTableros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tableroEditando, setTableroEditando] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('Trabajo');
  const [nuevoColumnas, setNuevoColumnas] = useState(['Solicitud', 'En proceso', 'En espera', 'Resuelto']);
  const [reqComentarios, setReqComentarios] = useState(['Resuelto']);
  const [colInicial, setColInicial] = useState('');
  const [colorTablero, setColorTablero] = useState('#065E94');
  const [draggedColIndex, setDraggedColIndex] = useState(null);
  const [columnaAEliminar, setColumnaAEliminar] = useState(null);
  const columnasEndRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [modalPerfilOpen, setModalPerfilOpen] = useState(false);
  const [modalMandatorioOpen, setModalMandatorioOpen] = useState(false);
  const [tienePasswordDefault, setTienePasswordDefault] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ nueva: '', confirmar: '' });
  const [cambiandoReq, setCambiandoReq] = useState(false);
  const [usuarioPerfil, setUsuarioPerfil] = useState(null);
  const [notificacionesPorTablero, setNotificacionesPorTablero] = useState({});
  const [modalUsuariosOpen, setModalUsuariosOpen] = useState(false);

  useEffect(() => {
    // Limpiar estilos globales de wallpaper o temas oscuros aplicados por el Kanban
    document.documentElement.classList.remove('dark', 'theme-blue', 'theme-dark', 'theme-wallpaper');
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';

    cargarTableros();
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      const cargarPerfil = async () => {
        const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
        if (data) setUsuarioPerfil(data);
      };
      cargarPerfil();
    }

    if (user?.email) {
      const status = sessionStorage.getItem('has_pwd_warning_' + user.id);

      if (status === '0') {
        setTienePasswordDefault(false);
      } else if (status === '1') {
        setTienePasswordDefault(true);
        setModalMandatorioOpen(true);
      } else {
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
            sessionStorage.setItem('has_pwd_warning_' + user.id, '0');
          }
        };

        const checked = sessionStorage.getItem('checked_pwd_' + user.id);
        if (!checked) {
          sessionStorage.setItem('checked_pwd_' + user.id, '1');
          verificarPassword();
        }
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const cargarNotificaciones = async () => {
      const { data: notifs } = await supabase
        .from('notificaciones')
        .select('ticket_id')
        .eq('usuario_id', user.id)
        .eq('leida', false);

      if (notifs && notifs.length > 0) {
        const ticketIds = notifs.map(n => n.ticket_id).filter(Boolean);
        if (ticketIds.length === 0) {
          setNotificacionesPorTablero({});
          return;
        }

        const { data: ticketsData } = await supabase
          .from('tickets')
          .select('id, tablero_id')
          .in('id', ticketIds);

        if (ticketsData) {
          const counts = {};
          notifs.forEach(notif => {
            const ticket = ticketsData.find(t => t.id === notif.ticket_id);
            if (ticket && ticket.tablero_id) {
              counts[ticket.tablero_id] = (counts[ticket.tablero_id] || 0) + 1;
            }
          });
          setNotificacionesPorTablero(counts);
        }
      } else {
        setNotificacionesPorTablero({});
      }
    };

    cargarNotificaciones();

    const sub = supabase.channel('notifs_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' }, payload => {
        cargarNotificaciones();
      })
      .subscribe();

    // Subscribe to ticket changes to update the "Activity" timestamp dynamically
    const subTickets = supabase.channel('dashboard_tickets_activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
        cargarTableros();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
      supabase.removeChannel(subTickets);
    };
  }, [user]);

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

  const getInicial = (nombre) => {
    if (!nombre) return '?';
    return nombre.charAt(0).toUpperCase();
  };

  const cargarTableros = async () => {
    if (!user) return;
    setLoading(true);

    // Obtenemos los IDs de los tableros a los que pertenece el usuario
    const { data: tableroUsuarios, error: errTU } = await supabase
      .from('tablero_usuarios')
      .select('tablero_id')
      .eq('usuario_id', user.id);

    if (errTU) {
      console.error('Error cargando membresías:', errTU);
      setLoading(false);
      return;
    }

    if (!tableroUsuarios || tableroUsuarios.length === 0) {
      setTableros([]);
      setLoading(false);
      return;
    }

    const tableroIds = tableroUsuarios.map(tu => tu.tablero_id);

    // Obtenemos la información de esos tableros
    const { data: tablerosData, error: errT } = await supabase
      .from('tableros')
      .select('*')
      .in('id', tableroIds)
      .order('created_at', { ascending: false });

    if (errT) {
      console.error('Error cargando tableros:', errT);
    } else {
      const savedOrder = JSON.parse(localStorage.getItem(`ordenTableros_${user.id}`) || '[]');
      let sortedTableros = [...(tablerosData || [])];

      if (savedOrder.length > 0) {
        sortedTableros.sort((a, b) => {
          const indexA = savedOrder.indexOf(a.id);
          const indexB = savedOrder.indexOf(b.id);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      }

      // Añadir la fecha de la última actividad a cada tablero
      for (const t of sortedTableros) {
        const { data: latestTicket } = await supabase
          .from('tickets')
          .select('fecha_creacion')
          .eq('tablero_id', t.id)
          .order('fecha_creacion', { ascending: false })
          .limit(1);

        if (latestTicket && latestTicket.length > 0) {
          const actTicket = new Date(latestTicket[0].fecha_creacion);
          const actTablero = new Date(t.created_at);
          t.last_activity = actTicket > actTablero ? latestTicket[0].fecha_creacion : t.created_at;
        } else {
          t.last_activity = t.created_at;
        }
      }

      setTableros(sortedTableros);
    }
    setLoading(false);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTableros((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(`ordenTableros_${user.id}`, JSON.stringify(newItems.map(t => t.id)));
        return newItems;
      });
    }
  };

  const abrirModalCreacion = () => {
    setTableroEditando(null);
    setNuevoNombre('');
    setNuevaDesc('');
    setNuevoTipo('Trabajo');
    setNuevoColumnas(['Solicitud', 'En proceso', 'En espera', 'Resuelto']);
    setReqComentarios([]);
    setColInicial('Solicitud');
    setColorTablero('#065E94');
    setColumnaAEliminar(null);
    setModalOpen(true);
  };

  const abrirModalEdicion = (tablero) => {
    const parsed = parseTableroConfig(tablero.descripcion);
    const cols = tablero.columnas && tablero.columnas.length > 0 ? [...tablero.columnas] : ['Solicitud', 'En proceso', 'En espera', 'Resuelto'];
    setTableroEditando(tablero);
    setNuevoNombre(tablero.nombre);
    setNuevaDesc(parsed.text);
    setNuevoTipo(tablero.tipo || 'Trabajo');
    setNuevoColumnas(cols);
    setReqComentarios(parsed.config?.req_com || []);
    setColInicial(parsed.config?.col_inicial || cols[0] || 'Solicitud');
    setColorTablero(parsed.config?.color || getRandomColor(tablero.nombre));
    setColumnaAEliminar(null);
    setModalOpen(true);
  };

  const handleGuardarTablero = async (e) => {
    e.preventDefault();

    const columnasFinales = nuevoColumnas.filter(c => c.trim() !== '');
    if (columnasFinales.length === 0) {
      alert("Debes definir al menos una columna.");
      return;
    }

    const validReqCom = reqComentarios.filter(rc => columnasFinales.includes(rc));
    const selectedColInicial = (colInicial && columnasFinales.includes(colInicial)) ? colInicial : columnasFinales[0];
    const descEncoded = buildTableroConfig(nuevaDesc.trim(), { req_com: validReqCom, col_inicial: selectedColInicial, color: colorTablero });

    if (tableroEditando) {
      const viejas = tableroEditando.columnas || ['Solicitud', 'En proceso', 'En espera', 'Resuelto'];

      const { error: errUpdate } = await supabase
        .from('tableros')
        .update({ nombre: nuevoNombre.trim(), descripcion: descEncoded, tipo: nuevoTipo, columnas: columnasFinales })
        .eq('id', tableroEditando.id);

      if (errUpdate) {
        alert("Error al actualizar tablero");
        return;
      }

      // 1. Si una columna fue renombrada explícitamente (misma cantidad de columnas y el nombre viejo ya no existe en el tablero)
      if (viejas.length === columnasFinales.length) {
        for (let i = 0; i < viejas.length; i++) {
          const oldName = viejas[i];
          const newName = columnasFinales[i];
          if (oldName !== newName && !columnasFinales.includes(oldName) && !viejas.includes(newName)) {
            await supabase
              .from('tickets')
              .update({ estado: newName })
              .eq('tablero_id', tableroEditando.id)
              .eq('estado', oldName);
          }
        }
      }

      // 2. Si se eliminó una columna, los tickets huérfanos se mueven únicamente a la primera columna
      const { data: lostTickets } = await supabase.from('tickets').select('id, estado').eq('tablero_id', tableroEditando.id);
      if (lostTickets) {
        const orphans = lostTickets.filter(t => !columnasFinales.includes(t.estado));
        if (orphans.length > 0) {
          await supabase
            .from('tickets')
            .update({ estado: columnasFinales[0] })
            .eq('tablero_id', tableroEditando.id)
            .in('id', orphans.map(t => t.id));
        }
      }

    } else {
      const { data: newBoard, error: errInsert } = await supabase
        .from('tableros')
        .insert([{
          nombre: nuevoNombre.trim(),
          descripcion: descEncoded,
          creador_id: user.id,
          tipo: nuevoTipo,
          columnas: columnasFinales
        }])
        .select()
        .single();

      if (errInsert) {
        alert("Error al crear tablero");
        return;
      }

      // Automatically add creator as Admin
      await supabase
        .from('tablero_usuarios')
        .insert([{
          tablero_id: newBoard.id,
          usuario_id: user.id,
          rol_en_tablero: 'Administrador'
        }]);
    }

    setModalOpen(false);
    setTableroEditando(null);
    setNuevoNombre('');
    setNuevaDesc('');
    setNuevoTipo('Trabajo');
    cargarTableros();
  };

  const handleEliminarTablero = async (tableroId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este tablero? Esta acción no se puede deshacer y se perderán todos los tickets y datos asociados.')) {
      const { error } = await supabase
        .from('tableros')
        .delete()
        .eq('id', tableroId);

      if (error) {
        alert("Error al eliminar el tablero: " + error.message);
      } else {
        setModalOpen(false);
        setTableroEditando(null);
        cargarTableros();
      }
    }
  };

  const getRandomColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 40%)`; // Colores elegantes
  };

  const tablerosTrabajo = tableros.filter(t => t.tipo !== 'Personal');
  const tablerosPersonales = tableros.filter(t => t.tipo === 'Personal');

  return (
    <div className="h-screen overflow-y-auto p-6 sm:p-12 bg-slate-50 dark:bg-black transition-colors duration-300 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div
              className="h-14 sm:h-18 w-11 sm:w-14 bg-[#065E94] dark:bg-white shrink-0 transition-colors duration-300"
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
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Tus Tableros</h1>
          </div>
          <div className="flex items-center gap-3">
            {(usuarioPerfil?.rol?.toLowerCase().includes('admin') || usuarioPerfil?.rol?.toLowerCase().includes('jefe') || usuarioPerfil?.permisos?.gestionar_usuarios) && (
              <button
                onClick={() => setModalUsuariosOpen(true)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-sm font-bold text-[#065E94] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-200 dark:border-blue-700/50 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                title="Gestión de Usuarios"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <span className="hidden md:inline">Gestión de Usuarios</span>
              </button>
            )}

            <button
              onClick={() => setModalPerfilOpen(true)}
              className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-gradient-to-br from-blue-100 to-white dark:from-white/10 dark:to-white/5 border border-blue-200 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative group overflow-hidden"
              title="Ver perfil y configuración"
            >
              <div className="text-[#065E94] dark:text-neutral-300 font-extrabold text-sm group-hover:scale-110 transition-transform">
                {getInicial(usuarioPerfil?.nombre || user?.email)}
              </div>
            </button>
          </div>
        </header>

        <div className="flex justify-start mb-8 gap-3">
          <button
            onClick={abrirModalCreacion}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#0773b5] hover:to-[#065E94] shadow-[0_6px_15px_-3px_rgba(6,94,148,0.4)] hover:shadow-[0_10px_20px_-3px_rgba(6,94,148,0.5)] hover:-translate-y-1 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo Tablero
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-[#065E94]/30 border-t-[#065E94] rounded-full animate-spin"></div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {tableros.length === 0 ? (
              <div className="bg-white dark:bg-[#112240] p-12 rounded-3xl border border-slate-200 dark:border-white/10 text-center shadow-sm">
                <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-black/30 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">No tienes tableros</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Aún no eres miembro de ningún tablero o no has creado ninguno.</p>
                <button onClick={abrirModalCreacion} className="text-[#065E94] dark:text-blue-400 font-bold hover:underline">Crear el primer tablero</button>
              </div>
            ) : (
              <div className="space-y-12">
                {tablerosTrabajo.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                      <svg className="w-6 h-6 text-[#065E94]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      Tableros de Trabajo
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      <SortableContext items={tablerosTrabajo.map(t => t.id)} strategy={rectSortingStrategy}>
                        {tablerosTrabajo.map(tablero => (
                          <SortableTablero
                            key={tablero.id}
                            tablero={tablero}
                            getRandomColor={getRandomColor}
                            navigate={navigate}
                            abrirModalEdicion={abrirModalEdicion}
                            notificacionesCount={notificacionesPorTablero[tablero.id] || 0}
                          />
                        ))}
                      </SortableContext>
                    </div>
                  </div>
                )}

                {tablerosPersonales.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                      <svg className="w-6 h-6 text-[#065E94]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Mis Notas Personales
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      <SortableContext items={tablerosPersonales.map(t => t.id)} strategy={rectSortingStrategy}>
                        {tablerosPersonales.map(tablero => (
                          <SortableTablero
                            key={tablero.id}
                            tablero={tablero}
                            getRandomColor={getRandomColor}
                            navigate={navigate}
                            abrirModalEdicion={abrirModalEdicion}
                            notificacionesCount={notificacionesPorTablero[tablero.id] || 0}
                          />
                        ))}
                      </SortableContext>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DndContext>
        )}
      </div>

      {/* Modal Crear Tablero */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 ${modalOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setModalOpen(false);
          }
        }}
      >
        <div className={`bg-white dark:bg-[var(--bg-secondary)] rounded-3xl shadow-2xl w-full max-w-4xl p-6 sm:p-8 border border-slate-100 dark:border-[var(--border-accent)] transform transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar ${modalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 dark:border-white/10">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">{tableroEditando ? 'Editar Tablero' : 'Nuevo Tablero'}</h2>
              <p className="text-xs text-slate-400 dark:text-neutral-400 font-medium mt-0.5">Configura las columnas y el comportamiento inicial de tu tablero</p>
            </div>
            <div className="flex gap-2">
              {tableroEditando && (
                <button type="button" onClick={() => handleEliminarTablero(tableroEditando.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar tablero">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleGuardarTablero} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* COLUMNA IZQUIERDA: Nombre, Tipo, Descripción y Lista de Columnas */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Nombre del Tablero</label>
                <input
                  required
                  type="text"
                  autoFocus
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 dark:text-white rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all"
                  placeholder="Ej. Soporte técnico"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Tipo de Tablero</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNuevoTipo('Trabajo')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all ${nuevoTipo === 'Trabajo' ? 'border-[#065E94] bg-blue-50 dark:bg-[#065E94]/20 text-[#065E94] dark:text-blue-400' : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'}`}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Trabajo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevoTipo('Personal')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all ${nuevoTipo === 'Personal' ? 'border-[#065E94] bg-blue-50 dark:bg-[#065E94]/20 text-[#065E94] dark:text-blue-400' : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'}`}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Personal
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Descripción (Opcional)</label>
                <textarea
                  value={nuevaDesc}
                  onChange={e => setNuevaDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 dark:text-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all resize-none h-20"
                  placeholder="¿De qué trata este tablero?"
                />
              </div>
              
              <div className="border-t border-slate-200 dark:border-white/10 pt-4 mt-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Columnas del Tablero</label>
                <div className="space-y-2 mb-3 max-h-52 overflow-y-auto px-1 custom-scrollbar">
                  {nuevoColumnas.map((col, idx) => (
                    <div
                      key={`${col}-${idx}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggedColIndex(idx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (draggedColIndex !== null && draggedColIndex !== idx) {
                          const updated = [...nuevoColumnas];
                          const [moved] = updated.splice(draggedColIndex, 1);
                          updated.splice(idx, 0, moved);
                          setNuevoColumnas(updated);
                          setDraggedColIndex(idx);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDragEnd={() => {
                        setDraggedColIndex(null);
                      }}
                      className={`flex flex-col gap-1.5 mb-2 border rounded-xl p-2.5 bg-white dark:bg-white/5 transition-all duration-200 ease-out ${
                        draggedColIndex === idx
                          ? 'scale-[1.02] border-[#065E94] dark:border-blue-400 bg-blue-50/80 dark:bg-blue-500/20 shadow-md ring-2 ring-[#065E94]/30'
                          : 'border-slate-200/80 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Ícono de Arrastre (6 Puntitos / Grip Handle) */}
                        <div
                          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-[#065E94] dark:hover:text-blue-400 rounded transition-colors shrink-0"
                          title="Arrastra para reordenar esta columna"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
                          </svg>
                        </div>

                        {/* Botones rápidos Arriba / Abajo */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              if (idx > 0) {
                                const updated = [...nuevoColumnas];
                                const [moved] = updated.splice(idx, 1);
                                updated.splice(idx - 1, 0, moved);
                                setNuevoColumnas(updated);
                              }
                            }}
                            className="p-0.5 text-slate-400 hover:text-[#065E94] dark:hover:text-blue-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            title="Subir columna"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button
                            type="button"
                            disabled={idx === nuevoColumnas.length - 1}
                            onClick={() => {
                              if (idx < nuevoColumnas.length - 1) {
                                const updated = [...nuevoColumnas];
                                const [moved] = updated.splice(idx, 1);
                                updated.splice(idx + 1, 0, moved);
                                setNuevoColumnas(updated);
                              }
                            }}
                            className="p-0.5 text-slate-400 hover:text-[#065E94] dark:hover:text-blue-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            title="Bajar columna"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                        </div>

                        {/* Input Nombre de Columna */}
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={col}
                            onChange={(e) => {
                              const newColName = e.target.value;
                              const cols = [...nuevoColumnas];
                              const oldColName = cols[idx];
                              cols[idx] = newColName;
                              setNuevoColumnas(cols);
                              if (reqComentarios.includes(oldColName)) {
                                setReqComentarios(reqComentarios.map(c => c === oldColName ? newColName : c));
                              }
                            }}
                            placeholder={`Columna ${idx + 1}`}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 dark:text-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all"
                            required
                          />
                        </div>

                        {/* Botón Eliminar */}
                        {nuevoColumnas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setColumnaAEliminar({ index: idx, nombre: col });
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar columna"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>

                      <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer pl-9">
                        <input
                          type="checkbox"
                          checked={reqComentarios.includes(col) && col.trim() !== ''}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReqComentarios([...reqComentarios, col]);
                            } else {
                              setReqComentarios(reqComentarios.filter(c => c !== col));
                            }
                          }}
                          disabled={col.trim() === ''}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-[#065E94] focus:ring-[#065E94] dark:bg-black/30 dark:border-white/10"
                        />
                        Exigir comentario al mover ticket aquí
                      </label>
                    </div>
                  ))}
                  <div ref={columnasEndRef} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNuevoColumnas([...nuevoColumnas, 'Nueva Columna']);
                    setTimeout(() => {
                      columnasEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 50);
                  }}
                  className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-white/20 text-slate-500 dark:text-slate-400 hover:border-[#065E94] hover:text-[#065E94] dark:hover:border-blue-400 dark:hover:text-blue-400 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Añadir Columna
                </button>
              </div>
            </div>

            {/* COLUMNA DERECHA: Cartel Informativo y Selector Desplegable de Columna Inicial */}
            <div className="md:col-span-5 bg-slate-50/80 dark:bg-black/30 p-5 md:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
                  <svg className="w-5 h-5 text-[#065E94] dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Configuración Destino de Tickets
                  </h3>
                </div>

                {/* Cartel Informativo */}
                <div className="p-4 rounded-2xl border border-blue-200/90 dark:border-blue-500/20 bg-white/90 dark:bg-blue-950/20 space-y-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#065E94] text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                        Los tickets nuevos irán automáticamente a la columna <span className="font-extrabold text-[#065E94] dark:text-blue-400 font-mono bg-blue-50 dark:bg-black/40 px-2 py-0.5 rounded-md border border-blue-200/80 dark:border-white/10 shadow-xs">"{colInicial || (nuevoColumnas[0] || 'Solicitud')}"</span>. Si deseas que vayan a otra de las columnas elígela debajo.
                      </p>
                    </div>
                  </div>

                  {/* Selector Desplegable Moderno */}
                  <div className="relative pt-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Seleccionar Columna Destino por Defecto
                    </label>
                    <div className="relative">
                      <select
                        value={colInicial || (nuevoColumnas[0] || '')}
                        onChange={(e) => setColInicial(e.target.value)}
                        className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-[#065E94] dark:hover:border-blue-400 text-slate-800 dark:text-white font-extrabold text-sm rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-[#065E94]/40 focus:border-[#065E94] outline-none transition-all shadow-sm cursor-pointer"
                      >
                        {nuevoColumnas.filter(c => c.trim() !== '').map((col, i) => (
                          <option key={i} value={col} className="font-bold py-2">
                            Columna {i + 1}: {col}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400 dark:text-neutral-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selector de Color de Portada del Tablero */}
                <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-black/20 space-y-2.5 shadow-sm">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Color de Portada del Tablero
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { name: 'Rojo (Primario)', value: '#dc2626' },
                      { name: 'Azul (Primario)', value: '#2563eb' },
                      { name: 'Amarillo (Primario)', value: '#eab308' },
                      { name: 'Verde', value: '#16a34a' },
                      { name: 'Naranja', value: '#ea580c' },
                      { name: 'Violeta', value: '#9333ea' },
                      { name: 'Azul PBA', value: '#065E94' },
                      { name: 'Gris Oscuro', value: '#334155' }
                    ].map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColorTablero(c.value)}
                        className={`w-7 h-7 rounded-full transition-all duration-200 transform cursor-pointer relative ${
                          colorTablero === c.value
                            ? 'scale-125 ring-2 ring-offset-2 ring-[#065E94] dark:ring-blue-400 dark:ring-offset-slate-900 shadow-md z-10'
                            : 'hover:scale-110 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                    {/* Selector Personalizado */}
                    <div className="relative flex items-center shrink-0 ml-1">
                      <input
                        type="color"
                        value={colorTablero || '#065E94'}
                        onChange={(e) => setColorTablero(e.target.value)}
                        className="w-7 h-7 rounded-full border-0 p-0 cursor-pointer opacity-0 absolute inset-0 z-10"
                        title="Elegir color personalizado"
                      />
                      <div
                        className="w-7 h-7 rounded-full border-2 border-dashed border-slate-400 dark:border-white/40 flex items-center justify-center transition-transform hover:scale-110 shadow-xs"
                        style={{ backgroundColor: colorTablero }}
                        title="Color personalizado"
                      >
                        <svg className="w-3.5 h-3.5 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {tableroEditando && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/30">
                    <strong className="text-amber-600 dark:text-amber-400">Nota de Seguridad:</strong> Si eliminas una columna que tiene tickets, estos pasarán automáticamente a la primera columna. Al cambiar el nombre de una columna, los tickets se conservan en su lugar.
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200/70 dark:border-white/10">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-extrabold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#0773b5] hover:to-[#065E94] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                >
                  {tableroEditando ? 'Guardar Cambios' : 'Crear Tablero'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Modal Confirmación de Eliminación de Columna */}
      {columnaAEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#112240] rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-slate-100 dark:border-white/10 shadow-2xl space-y-4 text-center transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-200 dark:border-red-900/50 shadow-xs">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">¿Eliminar columna?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed px-2">
                ¿Estás seguro de que deseas eliminar la columna <span className="font-extrabold text-slate-800 dark:text-white font-mono bg-slate-100 dark:bg-black/40 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">"{columnaAEliminar.nombre}"</span>?
              </p>
              {tableroEditando && (
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 pt-1 leading-snug">
                  Los tickets que contenga esta columna se moverán automáticamente a la primera columna al guardar los cambios.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setColumnaAEliminar(null)}
                className="py-3 rounded-xl font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-all text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = columnaAEliminar.index;
                  const col = columnaAEliminar.nombre;
                  const updatedCols = nuevoColumnas.filter((_, i) => i !== idx);
                  setNuevoColumnas(updatedCols);
                  setReqComentarios(reqComentarios.filter(c => c !== col));
                  if (colInicial === col) {
                    setColInicial(updatedCols[0] || 'Solicitud');
                  }
                  setColumnaAEliminar(null);
                }}
                className="py-3 rounded-xl font-extrabold text-white bg-red-600 hover:bg-red-700 transition-all shadow-md text-xs cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Perfil y Contraseña */}
      <div className={`fixed inset-0 bg-slate-900/20 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300 ${modalPerfilOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={(e) => { if (e.target === e.currentTarget) setModalPerfilOpen(false) }}>
        <div className={`bg-white/90 dark:bg-[#112240] backdrop-blur-2xl dark:backdrop-blur-none rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-none w-full max-w-md p-6 md:p-8 border border-white/60 dark:border-white/10 transform transition-all duration-300 ${modalPerfilOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-[#065E94] to-[#043d63] dark:from-[#2a83bd] dark:to-[#4ea8de]">
              Mi Perfil
            </h2>
            <button onClick={() => setModalPerfilOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-100 dark:bg-black/20 p-2 rounded-full">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-2xl border border-slate-100 dark:border-white/5 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-white/10 text-[#065E94] dark:text-white text-xl font-bold flex items-center justify-center shadow-inner shrink-0">
              {getInicial(usuarioPerfil?.nombre || user?.email)}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-lg font-bold text-slate-800 dark:text-white truncate" title={usuarioPerfil?.nombre || user?.email}>
                {usuarioPerfil?.nombre || user?.email}
              </span>
              <span className="text-sm text-slate-500 dark:text-neutral-400 truncate" title={user?.email}>{user?.email}</span>
              <span className="mt-1 inline-block text-[10px] uppercase font-bold text-[#065E94] dark:text-blue-400 tracking-wider bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md w-max border border-blue-100/50 dark:border-blue-800/50">
                {usuarioPerfil?.rol || 'Rol Desconocido'}
              </span>
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-white/10 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">Cambiar Contraseña</span>
          </h3>
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">Nueva Contraseña</label>
              <input required minLength={6} type="password" value={passwordForm.nueva} onChange={e => setPasswordForm({ ...passwordForm, nueva: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-white/10 dark:bg-black/20 dark:text-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">Confirmar Nueva Contraseña</label>
              <input required minLength={6} type="password" value={passwordForm.confirmar} onChange={e => setPasswordForm({ ...passwordForm, confirmar: e.target.value })} className="w-full bg-white border border-slate-200 dark:border-white/10 dark:bg-black/20 dark:text-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#065E94]/50 outline-none transition-all" placeholder="Repite la nueva contraseña" />
            </div>
            <button type="submit" disabled={cambiandoReq} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#054b77] hover:to-[#032e4b] shadow-[0_4px_15px_-3px_rgba(6,94,148,0.2)] dark:shadow-none transition-all hover:-translate-y-0.5 mt-2 disabled:opacity-50">
              {cambiandoReq ? 'Guardando...' : 'Actualizar Contraseña'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={logout}
              className="w-full py-3 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Modal - Cambio de Contraseña Obligatorio (Bloqueante) */}
      {modalMandatorioOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-xl flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-500">
          <div className="bg-white/95 dark:bg-[#112240] rounded-[32px] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-md p-10 border border-white dark:border-white/5 transform animate-in zoom-in-95 duration-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-200 dark:border-amber-500/30">
                <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-3 tracking-tight">Acceso Seguro Requerido</h2>
              <p className="text-slate-500 dark:text-neutral-400 leading-relaxed text-sm">
                Detectamos que aún usas la contraseña predeterminada. Por seguridad, <span className="font-bold text-slate-700 dark:text-slate-200">debes cambiarla ahora</span> para poder acceder a tus tableros.
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
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 dark:text-white rounded-2xl p-4 text-sm focus:ring-4 focus:ring-[#065E94]/20 outline-none transition-all shadow-sm"
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
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 dark:text-white rounded-2xl p-4 text-sm focus:ring-4 focus:ring-[#065E94]/20 outline-none transition-all shadow-sm"
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

      <GestionUsuariosGlobal
        isOpen={modalUsuariosOpen}
        onClose={() => setModalUsuariosOpen(false)}
      />
    </div>
  );
}

function TimeAgo({ date }) {
  const [str, setStr] = useState('');

  useEffect(() => {
    const update = () => {
      if (!date) return;
      const d = new Date(date);
      const now = new Date();
      const seconds = Math.floor((now - d) / 1000);
      if (seconds < 60) setStr('hace un momento');
      else if (seconds < 3600) setStr(`hace ${Math.floor(seconds / 60)} min`);
      else if (seconds < 86400) setStr(`hace ${Math.floor(seconds / 3600)} hr`);
      else setStr(`hace ${Math.floor(seconds / 86400)} días`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{str ? `Actividad: ${str}` : ''}</span>;
}

function SortableTablero({ tablero, getRandomColor, navigate, abrirModalEdicion, notificacionesCount = 0 }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tablero.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const parsedBoardConfig = parseTableroConfig(tablero.descripcion);
  const bannerColor = parsedBoardConfig.config?.color || getRandomColor(tablero.nombre);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white dark:bg-[#112240] rounded-[24px] overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-none transition-all duration-300 text-left flex flex-col h-32 relative block w-full select-none cursor-pointer touch-manipulation ${isDragging ? 'shadow-2xl scale-105 ring-2 ring-[#065E94] opacity-90' : 'hover:-translate-y-1'}`}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/tablero/${tablero.id}`)}
    >
      <button
        onPointerDown={(e) => { e.stopPropagation(); }}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); abrirModalEdicion(tablero); }}
        className="absolute top-2 right-2 z-20 p-1.5 text-white/90 md:text-white/70 hover:text-white bg-black/30 md:bg-black/20 hover:bg-black/40 rounded-full transition-colors backdrop-blur-sm opacity-100 md:opacity-0 group-hover:opacity-100"
        title="Editar tablero"
      >
        <svg className="hidden md:block w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        <svg className="block md:hidden w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
      </button>
      <div className="h-10 w-full shrink-0 relative transition-opacity group-hover:opacity-90" style={{ backgroundColor: bannerColor }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        {notificacionesCount > 0 && (
          <div className="absolute top-1.5 left-2 z-30 flex items-center gap-1.5 bg-rose-500 text-white pl-1.5 pr-2 py-1 rounded-full shadow-lg"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.4)' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="font-black text-xs leading-none">
              {notificacionesCount > 9 ? '9+' : notificacionesCount} nuevo{notificacionesCount > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 px-4 flex-1 flex flex-col justify-between z-10 bg-white dark:bg-[#112240]">
        <div>
          <h3 className="text-[16px] font-bold text-slate-800 dark:text-white leading-tight mb-0.5 truncate">{tablero.nombre}</h3>
          {parseTableroConfig(tablero.descripcion).text && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{parseTableroConfig(tablero.descripcion).text}</p>
          )}
        </div>
        <div className="mt-1">
          <TimeAgo date={tablero.last_activity} />
        </div>
      </div>
    </div>
  );
}

