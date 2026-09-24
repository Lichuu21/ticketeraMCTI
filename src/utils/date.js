export const ARG_TIMEZONE = 'America/Argentina/Buenos_Aires';

/**
 * Formatea fecha y hora en formato compacto: "24 sept 2026, 12:06"
 */
export function formatFechaHora(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-ES', {
    timeZone: ARG_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Formatea fecha larga con hora: "24 de septiembre de 2026, 12:06"
 */
export function formatFechaHoraLarga(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-AR', {
    timeZone: ARG_TIMEZONE,
    dateStyle: 'long',
    timeStyle: 'short'
  });
}

/**
 * Formatea fecha corta: "24/09/2026"
 */
export function formatFechaCorta(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    timeZone: ARG_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatea fecha estándar: "24/9/2026"
 */
export function formatFecha(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    timeZone: ARG_TIMEZONE
  });
}
