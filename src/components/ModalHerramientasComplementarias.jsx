import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';

export default function ModalHerramientasComplementarias({ isOpen, onClose, tableros = [], onDataUpdated }) {
  const [activeTab, setActiveTab] = useState('excel'); // 'excel' | 'shortcuts'

  // Estados de Exportación
  const [exportTableroId, setExportTableroId] = useState('');
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  // Estados de Importación
  const [importTableroId, setImportTableroId] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [ticketsLeidos, setTicketsLeidos] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importando, setImportando] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Inicializar tableros seleccionados
  useEffect(() => {
    if (tableros.length > 0) {
      if (!exportTableroId || !tableros.some(t => String(t.id) === String(exportTableroId))) {
        setExportTableroId(String(tableros[0].id));
      }
      if (!importTableroId || !tableros.some(t => String(t.id) === String(importTableroId))) {
        setImportTableroId(String(tableros[0].id));
      }
    }
  }, [tableros]);

  // Limpiar mensajes y archivo al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setExportError('');
      setExportSuccess('');
      setImportSuccess('');
      setParseError('');
      setArchivoSeleccionado(null);
      setTicketsLeidos([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────
  // EXPORTACIÓN A EXCEL
  // ─────────────────────────────────────────────────────────
  const handleExportarExcel = async () => {
    if (!exportTableroId) {
      setExportError('Por favor selecciona un tablero.');
      return;
    }
    setExportError('');
    setExportSuccess('');
    setExportando(true);

    try {
      const tableroObj = tableros.find(t => String(t.id) === String(exportTableroId));
      const nombreTablero = tableroObj?.nombre || 'Tablero';

      const { data: tickets, error } = await api.tickets.getByTablero(exportTableroId);
      if (error) {
        throw new Error(error.message || 'Error al obtener tickets del tablero');
      }

      if (!tickets || tickets.length === 0) {
        setExportError('Este tablero no tiene tickets para exportar.');
        setExportando(false);
        return;
      }

      // Mapear datos a filas de Excel con nombres claros
      const filas = tickets.map((t, idx) => {
        let subtareasTexto = '';
        if (Array.isArray(t.checklist) && t.checklist.length > 0) {
          subtareasTexto = t.checklist
            .map(item => `[${item.completado ? 'X' : ' '}] ${item.texto}`)
            .join(' | ');
        }

        let fechaFormatted = '';
        if (t.fecha_creacion) {
          try {
            fechaFormatted = new Date(t.fecha_creacion).toLocaleString('es-AR');
          } catch {
            fechaFormatted = t.fecha_creacion;
          }
        }

        return {
          'N°': idx + 1,
          'ID Sistema': t.id,
          'Título': t.titulo || '',
          'Estado / Columna': t.estado || '',
          'Prioridad': t.prioridad || 'Media',
          'Área': t.area || '',
          'Responsable': t.responsable || '',
          'Solicitante': t.solicitante || '',
          'Sección Solicitante': t.seccion_solicitante || '',
          'Email Solicitante': t.email_solicitante || '',
          'Subtareas / Checklist': subtareasTexto,
          'Fecha Creación': fechaFormatted,
          'Descripción': t.descripcion || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(filas);

      // Configurar anchos de columnas recomendados
      worksheet['!cols'] = [
        { wch: 5 },  // N°
        { wch: 10 }, // ID Sistema
        { wch: 30 }, // Título
        { wch: 18 }, // Estado / Columna
        { wch: 12 }, // Prioridad
        { wch: 18 }, // Área
        { wch: 22 }, // Responsable
        { wch: 22 }, // Solicitante
        { wch: 22 }, // Sección Solicitante
        { wch: 25 }, // Email Solicitante
        { wch: 35 }, // Subtareas
        { wch: 20 }, // Fecha Creación
        { wch: 45 }, // Descripción
      ];

      const workbook = XLSX.utils.book_new();
      const sheetName = nombreTablero.replace(/[:\\\/?*\[\]]/g, '_').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const fechaHoy = new Date().toISOString().slice(0, 10);
      const cleanFileName = `Tickets_${nombreTablero.replace(/\s+/g, '_')}_${fechaHoy}.xlsx`;
      XLSX.writeFile(workbook, cleanFileName);

      setExportSuccess(`¡Exportación exitosa! Se descargó el archivo con ${tickets.length} tickets.`);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      setExportError(err.message || 'Ocurrió un error inesperado al exportar.');
    } finally {
      setExportando(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // DESCARGAR PLANTILLA EXCEL
  // ─────────────────────────────────────────────────────────
  const handleDescargarPlantilla = () => {
    const filasPlantilla = [
      {
        'Título': 'Mantenimiento de servidor principal',
        'Descripción': 'Revisión periódica y actualización de parches de seguridad.',
        'Estado': 'Solicitud',
        'Prioridad': 'Alta',
        'Área': 'Infraestructura',
        'Responsable': 'Juan Perez',
        'Solicitante': 'Maria Gomez',
        'Sección Solicitante': 'Despacho',
        'Email Solicitante': 'maria.gomez@ejemplo.gob.ar',
        'Subtareas': 'Crear backup | Instalar parches | Reiniciar servicios',
      },
      {
        'Título': 'Revisión de cableado de red oficina 3',
        'Descripción': 'Cables dañados en puesto de trabajo.',
        'Estado': 'En proceso',
        'Prioridad': 'Media',
        'Área': 'Redes',
        'Responsable': 'Carlos Diaz',
        'Solicitante': 'Esteban Lopez',
        'Sección Solicitante': 'Contabilidad',
        'Email Solicitante': 'esteban.lopez@ejemplo.gob.ar',
        'Subtareas': 'Probar continuidad | Reemplazar ficha RJ45',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(filasPlantilla);
    worksheet['!cols'] = [
      { wch: 35 }, // Título
      { wch: 45 }, // Descripción
      { wch: 18 }, // Estado
      { wch: 12 }, // Prioridad
      { wch: 18 }, // Área
      { wch: 22 }, // Responsable
      { wch: 22 }, // Solicitante
      { wch: 22 }, // Sección Solicitante
      { wch: 28 }, // Email Solicitante
      { wch: 45 }, // Subtareas
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Tickets');
    XLSX.writeFile(workbook, 'Plantilla_Importacion_Tickets.xlsx');
  };

  // ─────────────────────────────────────────────────────────
  // LECTURA / PARSEO DE ARCHIVO EXCEL
  // ─────────────────────────────────────────────────────────
  const handleArchivoSeleccionado = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError('');
    setImportSuccess('');
    setArchivoSeleccionado(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setParseError('El archivo seleccionado no contiene filas o está vacío.');
          setTicketsLeidos([]);
          return;
        }

        // Mapear encabezados tolerando mayúsculas, minúsculas y tildes
        const normalizarClave = (str) =>
          String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        const ticketsNormalizados = rawJson.map((row, idx) => {
          let titulo = '';
          let descripcion = '';
          let estado = '';
          let prioridad = 'Media';
          let area = '';
          let responsable = '';
          let solicitante = '';
          let seccion_solicitante = '';
          let email_solicitante = '';
          let checklist = [];

          for (const [clave, valor] of Object.entries(row)) {
            const k = normalizarClave(clave);
            const valStr = String(valor || '').trim();

            if (k === 'titulo' || k === 'title') {
              titulo = valStr;
            } else if (k === 'descripcion' || k === 'description' || k === 'detalle') {
              descripcion = valStr;
            } else if (k.includes('estado') || k.includes('columna') || k === 'status') {
              estado = valStr;
            } else if (k.includes('prioridad') || k === 'priority') {
              prioridad = valStr;
            } else if (k.includes('area') || k === 'departamento') {
              area = valStr;
            } else if (k.includes('responsable') || k.includes('asignado')) {
              responsable = valStr;
            } else if (k === 'solicitante' || k.includes('nombre solicitante')) {
              solicitante = valStr;
            } else if (k.includes('seccion') || k.includes('dependencia')) {
              seccion_solicitante = valStr;
            } else if (k.includes('email') || k.includes('correo')) {
              email_solicitante = valStr;
            } else if (k.includes('subtarea') || k.includes('checklist')) {
              if (valStr) {
                // Separar subtareas por | o saltos de línea
                checklist = valStr
                  .split(/[|\n]/)
                  .map(s => s.trim().replace(/^\[[ xX]\]\s*/, ''))
                  .filter(Boolean)
                  .map((tItem, i) => ({ id: i + 1, texto: tItem, completado: false }));
              }
            }
          }

          return {
            _index: idx + 1,
            titulo,
            descripcion,
            estado,
            prioridad,
            area,
            responsable,
            solicitante,
            seccion_solicitante,
            email_solicitante,
            checklist,
            valido: !!titulo,
          };
        });

        const validos = ticketsNormalizados.filter(t => t.valido);
        if (validos.length === 0) {
          setParseError('No se encontró ninguna columna "Título" válida con datos.');
          setTicketsLeidos([]);
        } else {
          setTicketsLeidos(ticketsNormalizados);
        }
      } catch (err) {
        console.error('Error leyendo Excel:', err);
        setParseError('No se pudo procesar el archivo. Asegúrate de que sea un archivo .xlsx, .xls o .csv válido.');
        setTicketsLeidos([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // ─────────────────────────────────────────────────────────
  // EJECUTAR IMPORTACIÓN AL TABLERO
  // ─────────────────────────────────────────────────────────
  const handleEjecutarImportacion = async () => {
    if (!importTableroId) {
      setParseError('Por favor selecciona un tablero de destino.');
      return;
    }

    const ticketsAImportar = ticketsLeidos.filter(t => t.valido);
    if (ticketsAImportar.length === 0) {
      setParseError('No hay tickets válidos para importar.');
      return;
    }

    setImportando(true);
    setParseError('');
    setImportSuccess('');

    try {
      const payload = ticketsAImportar.map(t => ({
        titulo: t.titulo,
        descripcion: t.descripcion,
        estado: t.estado,
        prioridad: t.prioridad,
        area: t.area,
        responsable: t.responsable,
        solicitante: t.solicitante,
        seccion_solicitante: t.seccion_solicitante,
        email_solicitante: t.email_solicitante,
        checklist: t.checklist,
      }));

      const { data, error } = await api.tickets.bulkImport(importTableroId, payload);
      if (error) {
        throw new Error(error.message || 'Error importando tickets');
      }

      setImportSuccess(`¡Éxito! Se importaron ${data?.imported || ticketsAImportar.length} tickets al tablero.`);
      setArchivoSeleccionado(null);
      setTicketsLeidos([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onDataUpdated) {
        onDataUpdated();
      }
    } catch (err) {
      console.error('Error en importación masiva:', err);
      setParseError(err.message || 'Ocurrió un error al importar los tickets.');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#0f172a] rounded-[28px] shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#065E94] to-[#043d63] text-white flex items-center justify-center shadow-md shadow-[#065E94]/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">
                Herramientas Complementarias
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Migración, importación/exportación de tickets en Excel y accesos rápidos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs de Navegación */}
        <div className="flex border-b border-slate-100 dark:border-white/10 px-6 bg-white dark:bg-[#0f172a]">
          <button
            onClick={() => setActiveTab('excel')}
            className={`py-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'excel'
              ? 'border-[#065E94] text-[#065E94] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel (Importar / Exportar)
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`py-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'shortcuts'
              ? 'border-[#065E94] text-[#065E94] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Accesos Directos y Utilidades
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
          {activeTab === 'excel' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ── SECCIÓN 1: EXPORTACIÓN ── */}
              <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/30">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                      Exportar Tickets a Excel
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                    Descarga una copia completa de todos los tickets del tablero en formato <strong>.xlsx</strong>. Incluye campos, responsables, estados y subtareas.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Seleccionar Tablero a Exportar
                      </label>
                      <select
                        value={exportTableroId}
                        onChange={(e) => setExportTableroId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#065E94]/40 cursor-pointer"
                      >
                        {tableros.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.nombre} ({t.tipo || 'Trabajo'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {exportSuccess && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{exportSuccess}</span>
                      </div>
                    )}

                    {exportError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{exportError}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10">
                  <button
                    onClick={handleExportarExcel}
                    disabled={exportando || !exportTableroId}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {exportando ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Generando Excel...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Descargar Excel (.xlsx)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ── SECCIÓN 2: IMPORTACIÓN ── */}
              <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#065E94] dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/30">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                        Importar Tickets desde Excel
                      </h3>
                    </div>
                    <button
                      onClick={handleDescargarPlantilla}
                      className="text-[11px] font-bold text-[#065E94] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Descargar archivo Excel con estructura de ejemplo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Descargar Plantilla
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                    Sube un archivo <strong>.xlsx</strong> para cargar tickets de manera masiva al tablero que elijas.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Tablero de Destino
                      </label>
                      <select
                        value={importTableroId}
                        onChange={(e) => setImportTableroId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#065E94]/40 cursor-pointer"
                      >
                        {tableros.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.nombre} ({t.tipo || 'Trabajo'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Selector de Archivo */}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleArchivoSeleccionado}
                        className="hidden"
                        id="archivo-excel-input"
                      />
                      <label
                        htmlFor="archivo-excel-input"
                        className="border-2 border-dashed border-slate-300 dark:border-white/15 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-[#065E94] dark:hover:border-blue-400 transition-colors cursor-pointer bg-white dark:bg-black/20"
                      >
                        <svg className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-xs">
                          {archivoSeleccionado ? archivoSeleccionado.name : 'Haz clic para seleccionar archivo Excel (.xlsx)'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          Compatible con archivos creados en Excel o Google Sheets
                        </span>
                      </label>
                    </div>

                    {/* Previsualización rápida */}
                    {ticketsLeidos.length > 0 && (
                      <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl">
                        <div className="flex justify-between items-center text-xs font-bold text-[#065E94] dark:text-blue-300">
                          <span>Tickets listos para importar:</span>
                          <span className="bg-[#065E94] text-white px-2 py-0.5 rounded-md text-[11px]">
                            {ticketsLeidos.filter(t => t.valido).length} válidos
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Ejemplo: "{ticketsLeidos[0]?.titulo}" ({ticketsLeidos[0]?.prioridad || 'Media'})
                        </p>
                      </div>
                    )}

                    {importSuccess && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{importSuccess}</span>
                      </div>
                    )}

                    {parseError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{parseError}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10">
                  <button
                    onClick={handleEjecutarImportacion}
                    disabled={importando || ticketsLeidos.filter(t => t.valido).length === 0}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#065E94] to-[#043d63] hover:from-[#0773b5] hover:to-[#065E94] shadow-md shadow-[#065E94]/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {importando ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Cargando tickets...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>Iniciar Importación a Tablero</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── SECCIÓN 3: ACCESOS DIRECTOS Y UTILIDADES ── */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/30">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      Versión Beta
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Esta versión está en fase activa previa a la próxima actualización del sistema. Te recomendamos exportar tus tableros periódicamente a Excel como copia de resguardo.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/30">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      Reasignación de Columnas
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Al importar tickets desde Excel, si una columna especificada en el archivo no existe en el tablero, el sistema asignará el ticket a la primera columna disponible para no perder información.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/50 dark:border-purple-800/30">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      Subtareas en Excel
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Puedes incluir subtareas en tu archivo Excel separando cada una con una barra vertical (ejemplo: <code>Tarea 1 | Tarea 2 | Tarea 3</code>). El sistema las convertirá automáticamente en ítems de checklist.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#065E94] dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/30">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      Próximas Integraciones
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    En este espacio se incorporarán accesos directos rápidos a reportes analíticos, conectores de correo electrónico y utilidades avanzadas de mesa de ayuda.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
