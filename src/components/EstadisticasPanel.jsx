import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area, Cell
} from 'recharts';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Paleta de colores Premium y Coherente para Gráficos
const PALETA_LIGHT = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];
const PALETA_DARK = ['#6366f1', '#22d3ee', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#fb923c'];

// Obtener tema visual refinado según el themeMode de la aplicación
const getVisualTheme = (themeMode) => {
  const isLight = themeMode === 'light';
  const isBlue = themeMode === 'blue';
  const isWallpaper = themeMode === 'wallpaper';

  if (isLight) {
    return {
      isLight: true,
      cardBg: 'rgba(255, 255, 255, 0.75)',
      cardBorder: 'rgba(226, 232, 240, 0.8)',
      titleColor: '#0f172a',
      subColor: '#64748b',
      gridColor: 'rgba(226, 232, 240, 0.7)',
      axisColor: '#64748b',
      tooltipBg: '#ffffff',
      tooltipBorder: 'rgba(226, 232, 240, 0.9)',
      tooltipText: '#0f172a',
      palette: PALETA_LIGHT,
      accentNuevos: '#4f46e5',
      accentResueltos: '#10b981',
      accentEnProceso: '#0891b2',
      accentUrgentes: '#e11d48',
    };
  }

  if (isBlue) {
    return {
      isLight: false,
      cardBg: 'rgba(15, 23, 42, 0.45)',
      cardBorder: 'rgba(56, 189, 248, 0.15)',
      titleColor: '#e2e8f0',
      subColor: '#94a3b8',
      gridColor: 'rgba(30, 41, 59, 0.5)',
      axisColor: '#94a3b8',
      tooltipBg: 'rgba(15, 23, 42, 0.95)',
      tooltipBorder: 'rgba(56, 189, 248, 0.3)',
      tooltipText: '#ffffff',
      palette: PALETA_DARK,
      accentNuevos: '#6366f1',
      accentResueltos: '#34d399',
      accentEnProceso: '#38bdf8',
      accentUrgentes: '#f87171',
    };
  }

  if (isWallpaper) {
    return {
      isLight: false,
      cardBg: 'rgba(0, 0, 0, 0.45)',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      titleColor: 'rgba(255, 255, 255, 0.95)',
      subColor: 'rgba(255, 255, 255, 0.5)',
      gridColor: 'rgba(255, 255, 255, 0.05)',
      axisColor: 'rgba(255, 255, 255, 0.4)',
      tooltipBg: 'rgba(15, 15, 25, 0.95)',
      tooltipBorder: 'rgba(255, 255, 255, 0.15)',
      tooltipText: '#ffffff',
      palette: PALETA_DARK,
      accentNuevos: '#818cf8',
      accentResueltos: '#34d399',
      accentEnProceso: '#22d3ee',
      accentUrgentes: '#f87171',
    };
  }

  // Dark Mode por Defecto
  return {
    isLight: false,
    cardBg: 'rgba(30, 41, 59, 0.4)',
    cardBorder: 'rgba(255, 255, 255, 0.05)',
    titleColor: '#f1f5f9',
    subColor: '#94a3b8',
    gridColor: 'rgba(255, 255, 255, 0.05)',
    axisColor: '#94a3b8',
    tooltipBg: 'rgba(15, 23, 42, 0.95)',
    tooltipBorder: 'rgba(255, 255, 255, 0.1)',
    tooltipText: '#ffffff',
    palette: PALETA_DARK,
    accentNuevos: '#6366f1',
    accentResueltos: '#10b981',
    accentEnProceso: '#06b6d4',
    accentUrgentes: '#ef4444',
  };
};

const TooltipCustom = ({ active, payload, label, theme }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: theme.tooltipBg,
      border: `1px solid ${theme.tooltipBorder}`,
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      backdropFilter: 'blur(12px)',
      textShadow: 'none',
      padding: '10px 14px'
    }}>
      {label && <p style={{ color: theme.subColor, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 12, fontWeight: 700, color: p.color, margin: '2px 0' }}>
          {p.name}: <span style={{ color: theme.tooltipText }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ├ìcono SVG Minimalista
const Icon = ({ d, size = 18, stroke = 'currentColor', fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const KPI_ICONS = {
  tickets: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  urgent: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  process: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

const StatCard = ({ icon, label, value, sub, accent, theme }) => {
  return (
    <div className="hover:scale-[1.03] hover:shadow-lg transition-all duration-300 cursor-pointer" style={{ borderRadius: 20, transform: 'translateZ(0)', willChange: 'transform' }}>
      <div style={{
        background: `linear-gradient(135deg, ${accent}18, ${accent}05), ${theme.cardBg}`,
        border: `1.5px solid ${accent}30`,
        borderRadius: 20,
        padding: '22px',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(16px)',
        boxShadow: theme.isLight ? '0 8px 24px rgba(0,0,0,0.03)' : 'none',
        height: '100%',
        width: '100%'
      }} className="print-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
          <div>
            <p style={{ color: theme.subColor, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{label}</p>
            <p style={{ color: theme.titleColor, fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{value}</p>
            {sub && <p style={{ color: theme.subColor, fontSize: 11, marginTop: 6, fontWeight: 500 }}>{sub}</p>}
          </div>
          <div style={{ color: accent, opacity: 0.9, marginTop: 2 }}>
            <Icon d={KPI_ICONS[icon]} size={26} stroke={accent} />
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${accent}08`, zIndex: 1, pointerEvents: 'none' }} />
      </div>
    </div>
  );
};

const SectionCard = ({ title, icon, children, theme }) => {
  return (
    <div style={{
      background: theme.cardBg,
      border: `1px solid ${theme.cardBorder}`,
      borderRadius: 24,
      padding: '24px',
      boxShadow: theme.isLight ? '0 10px 30px rgba(0, 0, 0, 0.02)' : 'none',
      backdropFilter: 'blur(16px)',
      transition: 'all 0.3s ease'
    }} className="print-card print:backdrop-blur-none">
      <h2 style={{
        color: theme.titleColor,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        textTransform: 'uppercase',
        fontSize: '11px',
        letterSpacing: '0.08em'
      }}>
        <span style={{ color: theme.subColor, opacity: 0.8 }}><Icon d={icon} size={15} stroke="currentColor" /></span>
        {title}
      </h2>
      {children}
    </div>
  );
};

export default function EstadisticasPanel({ tickets, usuarios, themeMode = 'dark', user }) {
  const anioActual = new Date().getFullYear();
  const [mesSeleccionado, setMesSeleccionado] = useState('todos');
  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual.toString());
  const theme = getThemeColors(themeMode); // Para backward-compat
  const visualTheme = getVisualTheme(themeMode);

  const isJefe = user?.rol?.toLowerCase() === 'jefe de departamento';

  const aniosDisponibles = useMemo(() => {
    const anios = new Set(tickets.map(t => new Date(t.fecha_creacion).getFullYear()));
    if (anios.size === 0) anios.add(anioActual);
    return Array.from(anios).sort((a, b) => b - a).map(String);
  }, [tickets, anioActual]);

  const ticketsFiltrados = useMemo(() => {
    return tickets.filter(t => {
      const d = new Date(t.fecha_creacion);
      const anioMatch = d.getFullYear() === parseInt(anioSeleccionado);
      const mesMatch = mesSeleccionado === 'todos' || d.getMonth() === parseInt(mesSeleccionado);
      return anioMatch && mesMatch;
    });
  }, [tickets, mesSeleccionado, anioSeleccionado]);

  // KPIs
  const resueltos = ticketsFiltrados.filter(t => t.estado === 'Resuelto').length;
  const urgentes = ticketsFiltrados.filter(t => t.prioridad === 'Urgente').length;
  const enProceso = ticketsFiltrados.filter(t => t.estado === 'En proceso').length;
  const tasaResolucion = ticketsFiltrados.length ? Math.round((resueltos / ticketsFiltrados.length) * 100) : 0;

  // Tickets por mes (para vista anual)
  const ticketsPorMes = useMemo(() => MESES.map((mes, i) => ({
    mes,
    cantidad: tickets.filter(t => { const d = new Date(t.fecha_creacion); return d.getMonth() === i && d.getFullYear() === parseInt(anioSeleccionado); }).length,
    resueltos: tickets.filter(t => { const d = new Date(t.fecha_creacion); return d.getMonth() === i && d.getFullYear() === parseInt(anioSeleccionado) && t.estado === 'Resuelto'; }).length,
  })), [tickets, anioSeleccionado]);

  // Tickets por día (para vista de un mes específico)
  const ticketsPorDia = useMemo(() => {
    if (mesSeleccionado === 'todos') return [];
    const mes = parseInt(mesSeleccionado);
    const anio = parseInt(anioSeleccionado);
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    return Array.from({ length: diasEnMes }, (_, i) => {
      const dia = i + 1;
      const ticketsDia = ticketsFiltrados.filter(t => new Date(t.fecha_creacion).getDate() === dia);
      return {
        dia: `${dia}`,
        cantidad: ticketsDia.length,
        resueltos: ticketsDia.filter(t => t.estado === 'Resuelto').length,
      };
    });
  }, [ticketsFiltrados, mesSeleccionado, anioSeleccionado]);

  // Tendencia semanal
  const tendenciaSemanal = useMemo(() => {
    const hoy = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const inicio = new Date(hoy); inicio.setDate(hoy.getDate() - (7 * (7 - i)));
      const fin = new Date(inicio); fin.setDate(inicio.getDate() + 7);
      return {
        semana: `S${i + 1}`,
        nuevos: tickets.filter(t => { const d = new Date(t.fecha_creacion); return d >= inicio && d < fin; }).length,
        resueltos: tickets.filter(t => { const d = new Date(t.fecha_creacion); return d >= inicio && d < fin && t.estado === 'Resuelto'; }).length,
      };
    });
  }, [tickets]);

  // Por dependencia solicitante
  const porDependencia = useMemo(() => {
    const map = {};
    ticketsFiltrados.forEach(t => {
      const dep = t.seccion_solicitante?.trim();
      if (dep) map[dep] = (map[dep] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [ticketsFiltrados]);

  // Técnico responsable (quien más tickets resolvió en total)
  const topResolutores = useMemo(() => {
    const map = {};
    tickets.filter(t => t.estado === 'Resuelto').forEach(t => {
      if (t.responsable) {
        t.responsable.split(',').map(r => r.trim()).filter(Boolean).forEach(r => {
          map[r] = (map[r] || 0) + 1;
        });
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.split(' ').slice(0, 2).join(' '), value }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [tickets]);

  // Técnico con más tickets asignados (filtrado por período)
  const porResponsable = useMemo(() => {
    const map = {};
    ticketsFiltrados.forEach(t => {
      if (t.responsable) {
        t.responsable.split(',').map(r => r.trim()).filter(Boolean).forEach(r => {
          map[r] = (map[r] || 0) + 1;
        });
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.split(' ').slice(0, 2).join(' '), value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
  }, [ticketsFiltrados]);

  const ICONS = {
    calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    trend: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  };

  // ═══════════════════════════════════════════════════════════════
  // EXPORTAR PDF — genera ventana nueva con reporte HTML limpio
  // ═══════════════════════════════════════════════════════════════
  const exportarPDF = () => {
    const periodoLabel = mesSeleccionado === 'todos'
      ? `Año ${anioSeleccionado} — Todos los meses`
      : `${MESES[parseInt(mesSeleccionado)]} ${anioSeleccionado}`;
    const fechaEmision = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

    // ─── Helpers SVG (graficos sin librerias externas) ───────────
    const W = 740, H = 220, PAD = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const buildAreaChart = (data, xKey, series) => {
      const maxVal = Math.max(...data.flatMap(d => series.map(s => d[s.key] || 0)), 1);
      const xStep = innerW / (data.length - 1 || 1);
      const yScale = v => innerH - (v / maxVal) * innerH;

      const gradients = series.map(s => `
        <linearGradient id="grad_${s.key}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${s.color}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>
        </linearGradient>`).join('');

      const areas = series.map(s => {
        const pts = data.map((d, i) => `${PAD.left + i * xStep},${PAD.top + yScale(d[s.key] || 0)}`);
        const first = `${PAD.left},${PAD.top + innerH}`;
        const last = `${PAD.left + (data.length - 1) * xStep},${PAD.top + innerH}`;
        return `<path d="M${first} L${pts.join(' L')} L${last} Z" fill="url(#grad_${s.key})" />
                <polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
      }).join('');

      const dots = series.flatMap(s =>
        data.map((d, i) => `<circle cx="${PAD.left + i * xStep}" cy="${PAD.top + yScale(d[s.key] || 0)}" r="3" fill="${s.color}" stroke="white" stroke-width="1.5"/>`)
      ).join('');

      const xLabels = data.map((d, i) => {
        const every = data.length > 20 ? 3 : 1;
        if (i % every !== 0) return '';
        return `<text x="${PAD.left + i * xStep}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="600">${d[xKey]}</text>`;
      }).join('');

      const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => {
        const val = Math.round(maxVal * r);
        const y = PAD.top + innerH - r * innerH;
        return `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + innerW}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="4 4"/>
                <text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${val}</text>`;
      }).join('');

      const legend = series.map((s, i) =>
        `<circle cx="${PAD.left + i * 110}" cy="${H - 2}" r="5" fill="${s.color}"/>
         <text x="${PAD.left + 10 + i * 110}" y="${H - 2 + 4}" font-size="11" fill="#64748b" font-weight="600">${s.label}</text>`
      ).join('');

      return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>${gradients}</defs>
        ${yTicks}${areas}${dots}${xLabels}
        <g transform="translate(0, 10)">${legend}</g>
      </svg>`;
    };

    const buildBarChart = (data, xKey, series) => {
      const maxVal = Math.max(...data.flatMap(d => series.map(s => d[s.key] || 0)), 1);
      const groupW = innerW / data.length;
      const barW = Math.max(4, groupW / series.length - 4);
      const yScale = v => (v / maxVal) * innerH;

      const bars = data.flatMap((d, i) =>
        series.map((s, j) => {
          const x = PAD.left + i * groupW + j * (barW + 2) + (groupW - series.length * (barW + 2)) / 2;
          const bh = yScale(d[s.key] || 0);
          const y = PAD.top + innerH - bh;
          return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="${s.color}" rx="3"/>`;
        })
      ).join('');

      const xLabels = data.map((d, i) => {
        const every = data.length > 15 ? 2 : 1;
        if (i % every !== 0) return '';
        return `<text x="${PAD.left + i * groupW + groupW / 2}" y="${H - 10}" text-anchor="middle" font-size="9" fill="#94a3b8" font-weight="600">${d[xKey]}</text>`;
      }).join('');

      const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => {
        const val = Math.round(maxVal * r);
        const y = PAD.top + innerH - r * innerH;
        return `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + innerW}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="4 4"/>
                <text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${val}</text>`;
      }).join('');

      const legend = series.map((s, i) =>
        `<rect x="${PAD.left + i * 110}" y="${H - 8}" width="10" height="10" rx="3" fill="${s.color}"/>
         <text x="${PAD.left + 14 + i * 110}" y="${H - 2 + 4}" font-size="11" fill="#64748b" font-weight="600">${s.label}</text>`
      ).join('');

      return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        ${yTicks}${bars}${xLabels}
        <g transform="translate(0, 10)">${legend}</g>
      </svg>`;
    };

    // ─── Gráfico principal según filtro ───
    const mainChartSvg = mesSeleccionado === 'todos'
      ? buildAreaChart(ticketsPorMes, 'mes', [
        { key: 'cantidad', label: 'Creados', color: '#065E94' },
        { key: 'resueltos', label: 'Resueltos', color: '#00a2bb' },
      ])
      : buildBarChart(ticketsPorDia, 'dia', [
        { key: 'cantidad', label: 'Creados', color: '#065E94' },
        { key: 'resueltos', label: 'Resueltos', color: '#00a2bb' },
      ]);

    // ─── Tabla de tickets detallados ───
    const ticketRows = ticketsFiltrados.slice(0, 60).map(t => {
      const fecha = new Date(t.fecha_creacion).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const estadoColors = { 'Resuelto': '#10b981', 'En proceso': '#f59e0b', 'Solicitud': '#6366f1', 'Sin asignar': '#94a3b8' };
      const estadoColor = estadoColors[t.estado] || '#64748b';
      const prioridadColors = { 'Urgente': '#ef4444', 'Alta': '#f97316', 'Media': '#f59e0b', 'Baja': '#10b981' };
      const prioridadColor = prioridadColors[t.prioridad] || '#64748b';
      return `<tr>
        <td style="color:#1e293b;font-weight:700">#${t.id}</td>
        <td style="color:#334155;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.titulo || '—'}</td>
        <td><span style="background:${estadoColor}20;color:${estadoColor};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">${t.estado || '—'}</span></td>
        <td><span style="background:${prioridadColor}20;color:${prioridadColor};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">${t.prioridad || '—'}</span></td>
        <td style="color:#64748b">${t.seccion_solicitante || t.departamento || '—'}</td>
        <td style="color:#64748b">${(t.responsable || '—').split(',')[0].trim()}</td>
        <td style="color:#64748b">${fecha}</td>
      </tr>`;
    }).join('');

    // ─── Dependencias top ───
    const depRows = porDependencia.map((d, i) => {
      const pct = Math.round((d.value / (porDependencia[0]?.value || 1)) * 100);
      return `<tr>
        <td style="color:#64748b;font-size:11px">${i + 1}</td>
        <td style="color:#1e293b;font-weight:600">${d.name}</td>
        <td><div style="background:#e2e8f0;border-radius:99px;height:8px;width:140px"><div style="background:linear-gradient(90deg,#065E94,#00a2bb);width:${pct}%;height:100%;border-radius:99px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div></div></td>
        <td style="color:#065E94;font-weight:900;text-align:right">${d.value}</td>
      </tr>`;
    }).join('');

    // ─── Top resolutores ───
    const medals = ['🥇', '🥈', '🥉'];
    const resolRows = topResolutores.map((r, i) => {
      const pct = Math.round((r.value / (topResolutores[0]?.value || 1)) * 100);
      return `<tr>
        <td style="text-align:center;font-size:14px">${i < 3 ? medals[i] : i + 1}</td>
        <td style="color:#1e293b;font-weight:700">${r.name}</td>
        <td><div style="background:#e2e8f0;border-radius:99px;height:8px;width:140px"><div style="background:linear-gradient(90deg,#10b981,#065E94);width:${pct}%;height:100%;border-radius:99px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div></div></td>
        <td style="color:#10b981;font-weight:900;text-align:right">${r.value}</td>
      </tr>`;
    }).join('');

    // ─── HTML del reporte ───────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte CTI — ${periodoLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', 'Helvetica Neue', sans-serif; background: #f8fafc; color: #1e293b; }
    .page { max-width: 900px; margin: 0 auto; padding: 0 32px 48px; }

    /* Header */
    .header-band { background: #00ADC1; border-radius: 0 0 20px 20px; display: flex; align-items: center; height: 88px; margin-bottom: 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header-band img { height: 64px; margin: 0 0 0 20px; flex-shrink: 0; }
    .header-info { flex: 1; text-align: right; padding: 0 28px; }
    .header-info .title { color: #fff; font-size: 18px; font-weight: 800; }
    .header-info .sub { color: rgba(255,255,255,0.88); font-size: 12px; margin-top: 4px; }
    .header-info .meta { color: rgba(255,255,255,0.7); font-size: 11px; margin-top: 6px; }
    .header-info strong { color: #fff; }

    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 16px; border-left-width: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .kpi-label { color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
    .kpi-value { font-size: 38px; font-weight: 900; line-height: 1; margin-bottom: 4px; }
    .kpi-sub { color: #64748b; font-size: 10px; font-weight: 500; }

    /* Section */
    .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
    .section-accent { width: 4px; height: 18px; border-radius: 4px; background: linear-gradient(180deg, #065E94, #00a2bb); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section-title p { color: #1e293b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

    /* Eficiencia */
    .efficiency { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1px solid #bae6fd; border-radius: 14px; padding: 22px 28px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .efficiency-pct { color: #065E94; font-size: 44px; font-weight: 900; }
    .efficiency-label { color: #0369a1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .efficiency-sub { color: #0284c7; font-size: 11px; margin-top: 6px; }
    .progress-track { width: 200px; height: 8px; background: #bae6fd; border-radius: 99px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #065E94, #00a2bb); border-radius: 99px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* Tablas */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f8fafc; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.8px; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }

    /* Footer */
    .footer { border-top: 2px solid #e2e8f0; margin-top: 32px; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-left p { color: #94a3b8; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .footer-left p+p { color: #cbd5e1; font-size: 9px; margin-top: 2px; }
    .firma { text-align: center; }
    .firma-espacio { width: 200px; height: 48px; }
    .firma-linea { width: 200px; height: 1px; background: #94a3b8; margin-bottom: 6px; }
    .firma-nombre { color: #475569; font-size: 11px; font-weight: 700; }

    /* Dos columnas */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }

    @media print {
      body { background: #fff; }
      .page { padding: 0 24px 32px; }
      .no-print { display: none !important; }
      @page { margin: 12mm 10mm; size: A4; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER OFICIAL -->
  <div class="header-band">
    <img src="${window.location.origin}/logo-pba.png" alt="PBA" onerror="this.style.display='none'"/>
    <div class="header-info">
      <p class="title">Reporte Estadístico CTI</p>
      <p class="sub">Dirección de Informática — Delegación III</p>
      <p class="meta">Período: <strong>${periodoLabel}</strong> &nbsp;|&nbsp; Emitido: <strong>${fechaEmision}</strong></p>
    </div>
  </div>

  <!-- KPI CARDS -->
  <div class="kpi-grid">
    <div class="kpi-card" style="border-left-color:#065E94">
      <p class="kpi-label">Total Solicitudes</p>
      <p class="kpi-value" style="color:#065E94">${ticketsFiltrados.length}</p>
      <p class="kpi-sub">en el período</p>
    </div>
    <div class="kpi-card" style="border-left-color:#00a2bb">
      <p class="kpi-label">Resueltos</p>
      <p class="kpi-value" style="color:#00a2bb">${resueltos}</p>
      <p class="kpi-sub">${tasaResolucion}% del total</p>
    </div>
    <div class="kpi-card" style="border-left-color:#f59e0b">
      <p class="kpi-label">En Proceso</p>
      <p class="kpi-value" style="color:#f59e0b">${enProceso}</p>
      <p class="kpi-sub">tickets activos</p>
    </div>
    <div class="kpi-card" style="border-left-color:#ef4444">
      <p class="kpi-label">Urgentes</p>
      <p class="kpi-value" style="color:#ef4444">${urgentes}</p>
      <p class="kpi-sub">atención prioritaria</p>
    </div>
  </div>

  <!-- ÍNDICE DE EFICIENCIA -->
  <div class="efficiency">
    <div>
      <p class="efficiency-label">Índice de Eficiencia Operativa</p>
      <p class="efficiency-pct">${tasaResolucion}<span style="font-size:22px;font-weight:700">%</span></p>
      <p class="efficiency-sub">${resueltos} tickets resueltos de ${ticketsFiltrados.length} ingresados</p>
    </div>
    <div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${tasaResolucion}%"></div>
      </div>
      <p style="color:#0369a1;font-size:11px;font-weight:600">${enProceso} tickets aún en proceso</p>
      ${urgentes > 0 ? `<p style="color:#dc2626;font-size:11px;font-weight:700;margin-top:4px">⚠️ ${urgentes} ticket${urgentes > 1 ? 's' : ''} de carácter urgente</p>` : ''}
    </div>
  </div>

  <!-- GRÁFICO PRINCIPAL -->
  <div class="section">
    <div class="section-title">
      <div class="section-accent"></div>
      <p>${mesSeleccionado === 'todos' ? `Evolución Mensual de Incidentes — ${anioSeleccionado}` : `Distribución Diaria — ${MESES[parseInt(mesSeleccionado)]} ${anioSeleccionado}`}</p>
    </div>
    ${mainChartSvg}
  </div>

  <!-- DOS COLUMNAS: Dependencias + Productividad -->
  <div class="two-col">
    <div class="section" style="margin-bottom:0">
      <div class="section-title"><div class="section-accent"></div><p>Pedidos por Dependencia </p></div>
      ${porDependencia.length === 0
        ? '<p style="color:#94a3b8;text-align:center;padding:24px 0;font-size:12px">Sin datos de dependencias</p>'
        : `<table><thead><tr><th>#</th><th>Dependencia</th><th>Distribución</th><th style="text-align:right">Total</th></tr></thead><tbody>${depRows}</tbody></table>`
      }
    </div>
    ${!isJefe && topResolutores.length > 0 ? `
    <div class="section" style="margin-bottom:0">
      <div class="section-title"><div class="section-accent"></div><p>Productividad (Más Resueltos)</p></div>
      <table><thead><tr><th></th><th>Técnico</th><th>Desempeño</th><th style="text-align:right">Total</th></tr></thead><tbody>${resolRows}</tbody></table>
    </div>` : ''}
  </div>

  <!-- TABLA DETALLADA DE TICKETS -->
  ${ticketsFiltrados.length > 0 ? `
  <div class="section" style="page-break-before: always">
    <div class="section-title">
      <div class="section-accent"></div>
      <p>Detalle de Tickets — ${periodoLabel}${ticketsFiltrados.length > 60 ? ` (mostrando primeros 60 de ${ticketsFiltrados.length})` : ''}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Título</th><th>Estado</th><th>Prioridad</th><th>Dependencia</th><th>Responsable</th><th>Fecha</th>
        </tr>
      </thead>
      <tbody>${ticketRows}</tbody>
    </table>
  </div>` : ''}

  <!-- PIE DE PÁGINA -->
  <div class="footer">
    <div class="footer-left">
      <p>Sistema de Control de Tickets Informáticos — CTI</p>
      <p>Documento generado automáticamente. Confidencial de uso interno.</p>
    </div>
    <div class="firma">
      <div class="firma-espacio"></div>
      <div class="firma-linea"></div>
      <p class="firma-nombre">Dir. de Informática</p>
    </div>
  </div>

</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 600);
  };
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=960,height=800');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };
  return (
    <div style={{
      width: '100%',
      overflowY: 'auto',
      maxHeight: 'calc(100vh - 180px)',
      textShadow: themeMode === 'wallpaper' ? '0 2px 6px rgba(0,0,0,0.95)' : 'none'
    }} className="custom-scrollbar px-3 pb-6 printable-area">

      {/* ========================================================= */}
      {/* VISTA WEB (DASHBOARD INTERACTIVO)                         */}
      {/* ========================================================= */}
      <div className="print-hidden">
        {/* Header web */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ color: visualTheme.titleColor, fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.03em' }}>
              <span style={{ color: visualTheme.accentNuevos, display: 'flex', alignItems: 'center' }}>
                <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={24} stroke={visualTheme.accentNuevos} />
              </span>
              Estadísticas
            </h1>
            <p style={{ color: visualTheme.subColor, fontSize: 12, marginTop: 2, fontWeight: 550 }}>Información de productividad y cargas de trabajo</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0 sm:pr-10">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={anioSeleccionado}
                onChange={e => setAnioSeleccionado(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer outline-none border bg-white/95 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900/80 dark:border-neutral-800 dark:text-neutral-100 dark:focus:ring-indigo-500/30"
              >
                {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={mesSeleccionado}
                onChange={e => setMesSeleccionado(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer outline-none border bg-white/95 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900/80 dark:border-neutral-800 dark:text-neutral-100 dark:focus:ring-indigo-500/30"
              >
                <option value="todos">Todos los meses</option>
                {MESES.map((m, i) => <option key={i} value={i}>{m} {anioSeleccionado}</option>)}
              </select>
            </div>
            <button onClick={exportarPDF} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#065E94] to-[#043d63] dark:from-cyan-500 dark:to-cyan-600 hover:opacity-90 text-white shadow-[0_4px_15px_-3px_rgba(6,94,148,0.4)] dark:shadow-[0_4px_15px_-3px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Exportar a PDF
            </button>
          </div>
        </div>

        {/* KPI Cards web */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-2">
          <StatCard theme={visualTheme} icon="tickets" label="Total Tickets" value={ticketsFiltrados.length} sub="Período seleccionado" accent={visualTheme.accentNuevos} />
          <StatCard theme={visualTheme} icon="check" label="Resueltos" value={resueltos} sub={`${tasaResolucion}% resueltos`} accent={visualTheme.accentResueltos} />
          <StatCard theme={visualTheme} icon="urgent" label="Urgentes" value={urgentes} sub="Atención inmediata" accent={visualTheme.accentUrgentes} />
          <StatCard theme={visualTheme} icon="process" label="En Proceso" value={enProceso} sub="Tickets activos" accent={visualTheme.accentEnProceso} />
        </div>

        {/* Gráfico de área web */}
        <SectionCard title={`Flujo Mensual de Tickets (${anioSeleccionado})`} icon={ICONS.calendar} theme={visualTheme}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={ticketsPorMes} margin={{ left: -15, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="gNuevos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={visualTheme.accentNuevos} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={visualTheme.accentNuevos} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gResueltos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={visualTheme.accentResueltos} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={visualTheme.accentResueltos} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={visualTheme.gridColor} vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: visualTheme.axisColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: visualTheme.axisColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipCustom theme={visualTheme} />} cursor={{ stroke: visualTheme.gridColor, strokeWidth: 1.5 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: visualTheme.subColor, fontSize: 12, paddingTop: 10 }} />
              <Area type="monotone" dataKey="cantidad" name="Creados" stroke={visualTheme.accentNuevos} fill="url(#gNuevos)" strokeWidth={3} dot={{ fill: visualTheme.accentNuevos, r: 4, strokeWidth: 2, stroke: visualTheme.cardBg }} activeDot={{ r: 6 }} isAnimationActive={false} />
              <Area type="monotone" dataKey="resueltos" name="Resueltos" stroke={visualTheme.accentResueltos} fill="url(#gResueltos)" strokeWidth={3} dot={{ fill: visualTheme.accentResueltos, r: 4, strokeWidth: 2, stroke: visualTheme.cardBg }} activeDot={{ r: 6 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Fila: Por dependencia + Top resolutores */}
        <div className={`grid grid-cols-1 ${!isJefe ? 'lg:grid-cols-2' : ''} gap-4 mt-4`}>
          <SectionCard title="Pedidos por Dependencia " icon={ICONS.building} theme={visualTheme}>
            {porDependencia.length === 0 ? (
              <p style={{ color: visualTheme.subColor, textAlign: 'center', padding: '32px 0', fontSize: 13, fontWeight: 500 }}>Sin información de dependencias</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                {porDependencia.map((d, i) => {
                  const max = porDependencia[0].value;
                  const barColor = themeMode === 'light' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: barColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: visualTheme.titleColor, fontWeight: 600, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <div style={{ width: 100, height: 6, background: themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ width: `${Math.round((d.value / max) * 100)}%`, height: '100%', borderRadius: 10, background: barColor }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: visualTheme.titleColor, width: 22, textAlign: 'right', flexShrink: 0 }}>{d.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {!isJefe && (
            <SectionCard title="Productividad (por agente)" icon={ICONS.star} theme={visualTheme}>
              {topResolutores.length === 0 ? (
                <p style={{ color: visualTheme.subColor, textAlign: 'center', padding: '32px 0', fontSize: 13, fontWeight: 500 }}>Sin tickets resueltos en el sistema</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                  {topResolutores.map((r, i) => {
                    const max = topResolutores[0].value;
                    const pct = Math.round((r.value / max) * 100);
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="group">
                        <span style={{ fontSize: 15, width: 24, textAlign: 'center', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                          {i < 3 ? medals[i] : <span style={{ color: visualTheme.subColor, fontSize: 11, fontWeight: 800 }}>{i + 1}</span>}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: visualTheme.titleColor, minWidth: 90, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                        <div style={{ flex: 1, height: 8, background: themeMode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 10, background: `linear-gradient(90deg, ${visualTheme.accentResueltos}, ${visualTheme.accentNuevos})` }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: visualTheme.accentResueltos, width: 26, textAlign: 'right', flexShrink: 0 }}>{r.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          )}
        </div>

        {!isJefe && (
          <div style={{ marginTop: 16 }}>
            <SectionCard title="Tickets Asignados por Técnico " icon={ICONS.users} theme={visualTheme}>
              {porResponsable.length === 0 ? (
                <p style={{ color: visualTheme.subColor, textAlign: 'center', padding: '24px 0', fontSize: 13, fontWeight: 500 }}>Sin tickets asignados actualmente</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porResponsable} margin={{ left: -15, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={visualTheme.gridColor} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: visualTheme.axisColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: visualTheme.axisColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<TooltipCustom theme={visualTheme} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="value" name="Tickets" fill={visualTheme.subColor} radius={[6, 6, 0, 0]}>
                      {porResponsable.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={visualTheme.palette[index % visualTheme.palette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* VISTA IMPRESI├ôN — DISEÑO MODERNO PREMIUM v2               */}
      {/* ========================================================= */}
      <div className="hidden print:block w-full" style={{
        fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
        background: '#ffffff',
        color: '#1e293b',
        minHeight: '100vh',
      }}>

        {/* ÔöÇÔöÇ BANDA SUPERIOR: LOGO OFICIAL + META DEL REPORTE ÔöÇÔöÇ */}
        {/* Color #00ADC1 = color exacto sampleado del PNG con System.Drawing */}
        <div style={{
          background: '#00ADC1',
          borderRadius: '0 0 16px 16px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          height: '90px',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}>
          {/* Logo a tama├▒o natural, con padding para separar del borde */}
          <img
            src="/logo-pba.png"
            alt="Gobierno de la Provincia de Buenos Aires"
            style={{
              height: '70px',
              display: 'block',
              flexShrink: 0,
              margin: '10px 0 10px 16px',
            }}
          />
          {/* Texto del reporte a la derecha */}
          <div style={{
            flex: 1,
            textAlign: 'right',
            padding: '20px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <p style={{ color: '#ffffff', fontSize: '19px', fontWeight: 800, margin: 0 }}>
              Reporte Estadístico CTI
            </p>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: 500, margin: '4px 0 0' }}>
              Dirección de Informática — Delegación III
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', margin: '8px 0 0' }}>
              Período:&nbsp;<strong style={{ color: '#ffffff' }}>{anioSeleccionado}</strong>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              Emitido:&nbsp;<strong style={{ color: '#ffffff' }}>{new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
            </p>
          </div>
        </div>

        {/* ÔöÇÔöÇ KPI CARDS ÔöÇÔöÇ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px', padding: '0 4px' }}>
          {[
            { label: 'Total Solicitudes', value: ticketsFiltrados.length, color: '#065E94', sub: 'en el período' },
            { label: 'Resueltos', value: resueltos, color: '#00a2bb', sub: `${tasaResolucion}% del total` },
            { label: 'En Proceso', value: enProceso, color: '#f59e0b', sub: 'tickets activos' },
            { label: 'Urgentes', value: urgentes, color: '#ef4444', sub: 'atención prioritaria' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px 18px',
              borderLeft: `4px solid ${color}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}>
              <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
                {label}
              </p>
              <p style={{ color: color, fontSize: '40px', fontWeight: 900, lineHeight: 1, marginBottom: '6px' }}>
                {value}
              </p>
              <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* ÔöÇÔöÇ GR├üFICO: CONDICIONAL SEG├ÜN FILTRO ÔöÇÔöÇ */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          {/* Encabezado de sección */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '4px', height: '20px', borderRadius: '4px',
              background: 'linear-gradient(180deg, #065E94, #00a2bb)',
              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
            }} />
            <p style={{ color: '#1e293b', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {mesSeleccionado === 'todos'
                ? `Evolución Mensual de Incidentes — ${anioSeleccionado}`
                : `Distribución Diaria — ${MESES[parseInt(mesSeleccionado)]} ${anioSeleccionado}`
              }
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {mesSeleccionado === 'todos' ? (
              // Vista anual: AreaChart por mes
              <AreaChart data={ticketsPorMes} margin={{ left: -10, right: 10, top: 10, bottom: 0 }} width={680} height={210}>
                <defs>
                  <linearGradient id="pdfGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00a2bb" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00a2bb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pdfGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#065E94" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#065E94" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: '#64748b', fontSize: 12, paddingTop: 12, fontWeight: 600 }} />
                <Area type="monotone" dataKey="cantidad" name="Nuevos" stroke="#00a2bb" fill="url(#pdfGrad1)" strokeWidth={2.5} dot={{ fill: '#00a2bb', r: 3, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
                <Area type="monotone" dataKey="resueltos" name="Resueltos" stroke="#065E94" fill="url(#pdfGrad2)" strokeWidth={2.5} dot={{ fill: '#065E94', r: 3, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
              </AreaChart>
            ) : (
              // Vista mensual: BarChart por día
              <BarChart data={ticketsPorDia} margin={{ left: -10, right: 10, top: 10, bottom: 0 }} width={680} height={210}>
                <defs>
                  <linearGradient id="pdfBarGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00a2bb" stopOpacity={1} />
                    <stop offset="100%" stopColor="#00a2bb" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="pdfBarGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#065E94" stopOpacity={1} />
                    <stop offset="100%" stopColor="#065E94" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: '#64748b', fontSize: 12, paddingTop: 12, fontWeight: 600 }} />
                <Bar dataKey="cantidad" name="Nuevos" fill="url(#pdfBarGrad1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="resueltos" name="Resueltos" fill="url(#pdfBarGrad2)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            )}
          </div>
        </div>

        {/* ÔöÇÔöÇ BLOQUE TASA DE RESOLUCI├ôN VISUAL ÔöÇÔöÇ */}
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid #bae6fd',
          borderRadius: '16px',
          padding: '24px 32px',
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}>
          <div>
            <p style={{ color: '#0369a1', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
              ├ìndice de Eficiencia Operativa
            </p>
            <p style={{ color: '#065E94', fontSize: '48px', fontWeight: 900, lineHeight: 1 }}>
              {tasaResolucion}<span style={{ fontSize: '24px', fontWeight: 700 }}>%</span>
            </p>
            <p style={{ color: '#0284c7', fontSize: '12px', marginTop: '8px' }}>
              {resueltos} tickets resueltos de {ticketsFiltrados.length} ingresados
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {/* Barra de progreso visual */}
            <div style={{ width: '200px', height: '8px', background: '#bae6fd', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{
                width: `${tasaResolucion}%`, height: '100%',
                background: 'linear-gradient(90deg, #065E94, #00a2bb)',
                borderRadius: '999px',
                WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
              }} />
            </div>
            <p style={{ color: '#0369a1', fontSize: '11px', fontWeight: 600 }}>
              {enProceso} tickets aún en proceso
            </p>
            {urgentes > 0 && (
              <p style={{ color: '#dc2626', fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>
                ⚠️ {urgentes} ticket{urgentes > 1 ? 's' : ''} de carácter urgente
              </p>
            )}
          </div>
        </div>

        {/* ÔöÇÔöÇ PIE DE P├üGINA ÔöÇÔöÇ */}
        <div style={{
          borderTop: '2px solid #e2e8f0',
          marginTop: '32px',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Sistema de Control de Tickets Informáticos — CTI
            </p>
            <p style={{ color: '#cbd5e1', fontSize: '10px', marginTop: '2px' }}>
              Documento generado automáticamente. Confidencial de uso interno.
            </p>
          </div>
          {/* Firma con espacio amplio para firma manuscrita */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '240px', height: '52px' }} />
            <div style={{ width: '240px', height: '1px', background: '#94a3b8', marginBottom: '8px' }} />
            <p style={{ color: '#475569', fontSize: '12px', fontWeight: 700, letterSpacing: '0.3px' }}>Dir. de Informática</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BACKUP — DISEÑO ANTERIOR v1 (COMENTADO)                   */}
      {/* Para restaurar: descomentar este bloque y comentar el v2  */}
      {/* ========================================================= */}
      {/*
      <div className="hidden print:block w-full text-black bg-white" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        MEMBRETE OFICIAL PBA
        <div className="flex items-center justify-between mb-8 pb-4" style={{ borderBottom: '3px solid #00a2bb' }}>
          <div style={{ lineHeight: 1.1 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', display: 'block', color: '#555' }}>GOBIERNO DE LA PROVINCIA DE</span>
            <span style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px', display: 'block', fontFamily: 'Arial, sans-serif', color: '#00a2bb' }}>BUENOS AIRES</span>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '2px solid #00a2bb', paddingLeft: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'Arial, sans-serif', color: '#065E94' }}>Dirección de Informática Delegación III</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#555' }}>Sistema CTI - Reporte Oficial</p>
          </div>
        </div>
        ... (dise├▒o completo v1 preservado aquí) ...
      </div>
      */}
    </div>
  );
}

// Helper de fallback para backward-compat
function getThemeColors(themeMode) {
  if (themeMode === 'light') {
    return {
      cardBg: 'rgba(255,255,255,0.85)',
      cardBorder: 'rgba(203,213,225,0.8)',
      titleColor: '#1e293b',
      subColor: '#64748b',
      valueBg: 'rgba(241,245,249,0.9)',
      gridColor: 'rgba(148,163,184,0.2)',
      axisColor: '#94a3b8',
    };
  }
  return {
    cardBg: 'rgba(255,255,255,0.06)',
    cardBorder: 'rgba(255,255,255,0.1)',
    titleColor: 'rgba(255,255,255,0.9)',
    subColor: 'rgba(255,255,255,0.45)',
    valueBg: 'rgba(255,255,255,0.05)',
    gridColor: 'rgba(255,255,255,0.05)',
    axisColor: 'rgba(255,255,255,0.3)',
  };
}
