import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
// Importamos las herramientas de arrastrar y soltar
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// 1. Header
const Header = () => (
  <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">T</div>
      <h1 className="text-xl font-bold text-gray-800 tracking-tight">Ticketera</h1>
    </div>
  </header>
);

// 2. Botón de añadir
const BotonAñadirTicket = ({ alAbrirFormulario }) => (
  <button onClick={alAbrirFormulario} className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-medium cursor-pointer">
    <span className="text-lg">+</span> Añadir nuevo ticket
  </button>
);

// 3. Formulario para crear un ticket
const ModalNuevoTicket = ({ alCerrar, alGuardar }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [area, setArea] = useState('Sistemas');
  const [prioridad, setPrioridad] = useState('Media');
  const [cargando, setCargando] = useState(false);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setCargando(true);
    const nuevoTicketDatos = { titulo, descripcion, area, prioridad, estado: 'Pendiente', responsable: 'Sin asignar' };
    await alGuardar(nuevoTicketDatos);
    setCargando(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Crear nuevo ticket</h2>
          <button onClick={alCerrar} className="text-gray-400 hover:text-gray-700 text-2xl font-bold cursor-pointer">&times;</button>
        </div>
        <form onSubmit={manejarEnvio} className="p-6 flex flex-col gap-4">
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label><input required type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label><textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Área</label><select value={area} onChange={(e) => setArea(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"><option value="Sistemas">Sistemas</option><option value="Soporte">Soporte</option><option value="Ventas">Ventas</option><option value="Diseño">Diseño</option></select></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Prioridad</label><select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"><option value="Alta">Alta (Rojo)</option><option value="Media">Media (Amarillo)</option><option value="Baja">Baja (Verde)</option></select></div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={alCerrar} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={cargando} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">{cargando ? 'Guardando...' : 'Crear Ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. Modal de Detalle
const ModalTicket = ({ ticket, alCerrar }) => {
  if (!ticket) return null;
  const colorPrioridad = { Alta: 'bg-red-500', Media: 'bg-amber-400', Baja: 'bg-emerald-500' }[ticket.prioridad];
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex justify-between items-start">
          <div>
            <div className="flex gap-3 mb-2"><span className={`${colorPrioridad} text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full`}>Prioridad {ticket.prioridad}</span><span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">{ticket.area}</span></div>
            <h2 className="text-2xl font-bold text-gray-800">{ticket.titulo}</h2>
          </div>
          <button onClick={alCerrar} className="text-gray-400 hover:text-gray-700 text-2xl font-bold cursor-pointer">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="mb-6"><h3 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h3><div className="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm whitespace-pre-wrap">{ticket.descripcion}</div></div>
          <div className="grid grid-cols-2 gap-4 border-t pt-6">
            <div><h3 className="text-sm font-semibold text-gray-700 mb-1">Estado</h3><span className="text-sm bg-gray-100 px-3 py-1.5 rounded-md inline-block">{ticket.estado}</span></div>
            <div><h3 className="text-sm font-semibold text-gray-700 mb-1">Responsable</h3><span className="text-sm flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{ticket.responsable.charAt(0)}</div>{ticket.responsable}</span></div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end"><button onClick={alCerrar} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Cerrar</button></div>
      </div>
    </div>
  );
};

// 5. Tarjeta Individual (Aislada del Draggable para mantenerlo limpio)
const TarjetaTicket = ({ ticket, alHacerClic }) => {
  const colorPrioridad = { Alta: 'bg-red-500 text-white', Media: 'bg-amber-400 text-amber-950', Baja: 'bg-emerald-500 text-white' }[ticket.prioridad];
  return (
    <div onClick={() => alHacerClic(ticket)} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all hover:border-indigo-200">
      <div className="flex justify-between items-center mb-3">
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${colorPrioridad}`}>{ticket.prioridad}</span>
        <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded">{ticket.area}</span>
      </div>
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{ticket.titulo}</h3>
      <div className="flex justify-end border-t border-gray-50 pt-3">
         <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium"><div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">{ticket.responsable.charAt(0)}</div>{ticket.responsable}</span>
      </div>
    </div>
  );
};

// 6. COMPONENTE PRINCIPAL
const TableroKanban = () => {
  const [tickets, setTickets] = useState([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null); 
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const columnas = ['Pendiente', 'En proceso', 'Resuelto', 'Bloqueado'];

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    const { data, error } = await supabase.from('tickets').select('*').order('id', { ascending: false });
    if (!error) setTickets(data);
  };

  const agregarTicket = async (nuevoTicketDatos) => {
    const { data, error } = await supabase.from('tickets').insert([nuevoTicketDatos]).select();
    if (!error) {
      setTickets([data[0], ...tickets]);
      setMostrandoFormulario(false);
    }
  };

  // NUEVA FUNCIÓN MAGICA: ¿Qué pasa cuando soltamos el ticket?
  const manejarDragEnd = async (resultado) => {
    const { destination, source, draggableId } = resultado;

    // 1. Si lo soltó fuera de las columnas, no hacemos nada
    if (!destination) return;

    // 2. Si lo soltó en la misma columna y en el mismo lugar, no hacemos nada
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const nuevoEstado = destination.droppableId; // Ej: "En proceso"
    const ticketId = parseInt(draggableId); // Convertimos el ID a número

    // 3. ACTUALIZACIÓN OPTIMISTA: Cambiamos la pantalla primero para que sea instantáneo
    const ticketsActualizados = tickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, estado: nuevoEstado };
      }
      return t;
    });
    setTickets(ticketsActualizados);

    // 4. Guardamos en la base de datos de fondo
    const { error } = await supabase
      .from('tickets')
      .update({ estado: nuevoEstado })
      .eq('id', ticketId);

    if (error) {
      console.error("Error al mover ticket:", error);
      alert("Hubo un error de conexión al guardar el movimiento.");
      // Si hay error, podríamos revertir la pantalla, pero lo mantenemos simple.
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      
      <div className="p-8">
        {/* Aquí envolvemos todo el tablero con el Contexto de Drag & Drop */}
        <DragDropContext onDragEnd={manejarDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-4">
            
            {columnas.map(columna => (
              <div key={columna} className="bg-gray-100/80 rounded-xl p-4 w-80 flex-shrink-0 flex flex-col gap-4 border border-gray-200 flex-grow">
                <h2 className="font-semibold text-gray-700">{columna}</h2>
                
                {/* Definimos las zonas donde se pueden soltar cosas */}
                <Droppable droppableId={columna}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className="flex flex-col gap-3 min-h-[100px]" // min-h importante para poder soltar en columnas vacías
                    >
                      {tickets
                        .filter(t => t.estado === columna)
                        .map((ticket, index) => (
                          // Cada ticket es un elemento arrastrable
                          <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TarjetaTicket ticket={ticket} alHacerClic={setTicketSeleccionado} />
                              </div>
                            )}
                          </Draggable>
                      ))}
                      {/* Placeholder necesario para que la librería calcule espacios */}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* El botón se queda fuera del Droppable para no arrastrarlo por error */}
                {columna === 'Pendiente' && <BotonAñadirTicket alAbrirFormulario={() => setMostrandoFormulario(true)} />}
              </div>
            ))}

          </div>
        </DragDropContext>
      </div>

      {ticketSeleccionado && <ModalTicket ticket={ticketSeleccionado} alCerrar={() => setTicketSeleccionado(null)} />}
      {mostrandoFormulario && <ModalNuevoTicket alCerrar={() => setMostrandoFormulario(false)} alGuardar={agregarTicket} />}
    </div>
  );
};

export default TableroKanban;