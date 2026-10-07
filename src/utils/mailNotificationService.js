import { formatFechaHora } from './date';

/**
 * Escapa caracteres HTML para prevenir inyecciones en el correo
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Construye la plantilla HTML para el mail de notificación (asignación o mención),
 * respetando el diseño institucional de plantilla_mail.html / plantilla_mail_n8n.html
 */
export function buildNotificationHtml({
  tipo, // 'asignacion' | 'mencion'
  destinatarioNombre,
  numeroTicket,
  titulo,
  autorNombre,
  comentario = '',
  area = '',
  prioridad = '',
  fecha = ''
}) {
  const esAsignacion = tipo === 'asignacion';
  const badgeTexto = esAsignacion
    ? `Fuiste asignado a #${numeroTicket}`
    : `Fuiste mencionado en los comentarios del ticket #${numeroTicket}`;

  const accionTexto = esAsignacion
    ? `Te informamos que has sido asignado/a como responsable en el siguiente ticket:`
    : `Te informamos que ${autorNombre ? `<strong>${escapeHtml(autorNombre)}</strong>` : 'un integrante del equipo'} te mencionó en los comentarios del siguiente ticket:`;

  const comentarioBloque = !esAsignacion && comentario ? `
    <!-- BLOQUE COMENTARIO DESTACADO -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-left:4px solid #00ADC1;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px;">
      <tr>
        <td style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#00ADC1;text-transform:uppercase;letter-spacing:1px;padding-bottom:6px;">
          💬 Comentario ${autorNombre ? `de ${escapeHtml(autorNombre)}` : ''}
        </td>
      </tr>
      <tr>
        <td style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;font-style:italic;">
          "${escapeHtml(comentario)}"
        </td>
      </tr>
    </table>
  ` : '';

  const fechaFinal = fecha || formatFechaHora(new Date());

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(badgeTexto)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;">
    <tr>
      <td align="center" style="padding:30px 15px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-collapse:collapse;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08);">
          
          <!-- CABECERA INSTITUCIONAL -->
          <tr>
            <td align="center" style="background-color:#00ADC1;padding:32px 30px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;letter-spacing:2px;text-transform:uppercase;padding-bottom:8px;">
                    GOBIERNO DE LA PROVINCIA DE BUENOS AIRES
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:4px 0 10px 0;">
                    <table width="70%" cellpadding="0" cellspacing="0" border="0" align="center">
                      <tr>
                        <td style="background-color:rgba(255,255,255,0.4);height:2px;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:4px;">
                    <span style="font-family:Arial,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;letter-spacing:1px;text-transform:uppercase;line-height:1.3;">DIRECCIÓN DE INFORMÁTICA<br>DELEGACIÓN III</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CUERPO DEL MENSAJE -->
          <tr>
            <td style="padding:35px 35px 25px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:#0d1b2a;padding-bottom:15px;">
                    Estimado/a ${escapeHtml(destinatarioNombre || 'usuario/a')},
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f8fafc;border-left:4px solid #00ADC1;padding:16px;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;border-radius:0 6px 6px 0;">
                    ${accionTexto}
                  </td>
                </tr>
              </table>

              <!-- AVISO DESTACADO (INSIGNIA PRINCIPAL) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:28px 0 24px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" align="center">
                      <tr>
                        <td style="background-color:#00ADC1;padding:16px 36px;border-radius:10px;text-align:center;">
                          <span style="font-family:'Courier New',Courier,monospace,sans-serif;font-size:19px;font-weight:bold;color:#ffffff;letter-spacing:1px;">
                            ${escapeHtml(badgeTexto)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${comentarioBloque}

              <!-- DETALLES DEL TICKET -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:14px;color:#334155;padding:4px 0;">
                    <strong>Número de Ticket:</strong> #${escapeHtml(String(numeroTicket))}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:14px;color:#334155;padding:4px 0;">
                    <strong>Asunto / Título:</strong> ${escapeHtml(titulo || 'Sin título')}
                  </td>
                </tr>
                ${area ? `
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:14px;color:#334155;padding:4px 0;">
                    <strong>Área / Sección:</strong> ${escapeHtml(area)}
                  </td>
                </tr>
                ` : ''}
                ${prioridad ? `
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:14px;color:#334155;padding:4px 0;">
                    <strong>Prioridad:</strong> ${escapeHtml(prioridad)}
                  </td>
                </tr>
                ` : ''}
                ${autorNombre ? `
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:14px;color:#334155;padding:4px 0;">
                    <strong>${esAsignacion ? 'Asignado por' : 'Mencionado por'}:</strong> ${escapeHtml(autorNombre)}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:14px;color:#334155;padding:4px 0;">
                    <strong>Fecha:</strong> ${escapeHtml(fechaFinal)}
                  </td>
                </tr>
              </table>

              <!-- AVISO DE SEGUIMIENTO -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:13px;color:#64748b;line-height:1.5;padding:5px 10px 15px 10px;">
                    <strong style="color:#00ADC1;">Aviso del Sistema:</strong> Podés acceder a la plataforma de gestión de soporte técnico para ver los detalles y actualizar el ticket.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- PIE DE PÁGINA INSTITUCIONAL -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 30px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:#0d1b2a;padding-bottom:4px;">
                    Dirección de Informática &mdash; Delegación III
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:12px;color:#64748b;padding-bottom:12px;">
                    Provincia de Buenos Aires
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;line-height:1.4;">
                    Este correo fue generado automáticamente por el sistema de tickets.<br>
                    <strong>Por favor, no responda directamente a este mensaje.</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envía una notificación por correo electrónico a un usuario destinatario específico
 * a través del webhook de n8n configurado en el sistema.
 */
export async function enviarNotificacionEmail({
  tipo, // 'asignacion' | 'mencion'
  usuario, // Objeto usuario ({ id, nombre, email })
  ticket, // Objeto ticket ({ id, titulo, area, prioridad, ... })
  autor, // Usuario autor de la acción ({ nombre, ... }) o string
  comentario = '',
  numeroTicket = null
}) {
  if (!usuario || !usuario.email || !usuario.email.trim()) {
    console.warn(`[Notificaciones] Usuario sin correo vinculado (id: ${usuario?.id || 'desconocido'}), omitiendo envío.`);
    return false;
  }

  const emailDestino = usuario.email.trim();
  const nombreDestino = usuario.nombre || 'Usuario';
  const autorNombre = typeof autor === 'object' ? (autor?.nombre || 'Usuario') : (autor || 'Usuario');
  const numTicketStr = numeroTicket != null ? String(numeroTicket) : String(ticket?.id || 'Ticket');

  const esAsignacion = tipo === 'asignacion';
  const badgeTexto = esAsignacion
    ? `Fuiste asignado a #${numTicketStr}`
    : `Fuiste mencionado en los comentarios del ticket #${numTicketStr}`;

  const fechaFormateada = formatFechaHora(new Date());

  const htmlContent = buildNotificationHtml({
    tipo,
    destinatarioNombre: nombreDestino,
    numeroTicket: numTicketStr,
    titulo: ticket?.titulo || '',
    autorNombre,
    comentario,
    area: ticket?.area || '',
    prioridad: ticket?.prioridad || '',
    fecha: fechaFormateada
  });

  const webhookUrl =
    import.meta.env.VITE_N8N_NOTIFICACIONES_WEBHOOK_URL ||
    'https://n8n.efectohost.com/webhook/notificaciones-ticket';

  const payload = {
    tipo, // 'asignacion' | 'mencion'
    destinatario_email: emailDestino,
    destinatario_nombre: nombreDestino,
    email: emailDestino,
    email_solicitante: emailDestino, // compatibilidad con workflows existentes de n8n
    asunto: badgeTexto,
    mensaje: badgeTexto,
    numero_ticket: `#${numTicketStr}`,
    titulo: ticket?.titulo || '',
    solicitante: nombreDestino,
    area: ticket?.area || 'General',
    prioridad: ticket?.prioridad || 'Media',
    autor: autorNombre,
    comentario: comentario || '',
    fecha: fechaFormateada,
    html: htmlContent
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`[Notificaciones] n8n respondió con status ${response.status} para ${emailDestino}`);
    }
    return true;
  } catch (error) {
    console.error(`[Notificaciones] Error al enviar notificación por mail a ${emailDestino}:`, error);
    return false;
  }
}

/**
 * Envía notificaciones por mail a una lista de usuarios (fire-and-forget).
 */
export function enviarNotificacionesBatch({
  tipo,
  usuarios = [],
  ticket,
  autor,
  comentario = '',
  numeroTicket = null
}) {
  if (!Array.isArray(usuarios) || usuarios.length === 0) return;

  // Filtrar duplicados por email
  const vistos = new Set();
  const usuariosUnicos = usuarios.filter(u => {
    const email = u?.email?.trim()?.toLowerCase();
    if (!email || vistos.has(email)) return false;
    vistos.add(email);
    return true;
  });

  // Disparar en paralelo sin bloquear la UI
  Promise.allSettled(
    usuariosUnicos.map(u =>
      enviarNotificacionEmail({
        tipo,
        usuario: u,
        ticket,
        autor,
        comentario,
        numeroTicket
      })
    )
  ).catch(err => console.error("[Notificaciones] Error en envío batch:", err));
}

/**
 * Construye la plantilla HTML para el mail al solicitante del ticket (alta de ticket),
 * respetando exactamente plantilla_mail.html / plantilla_mail_n8n.html
 */
export function buildSolicitanteHtml({
  solicitante,
  numeroTicket,
  titulo,
  area = '',
  seccion_solicitante = '',
  fecha_creacion = ''
}) {
  const fechaFinal = fecha_creacion || formatFechaHora(new Date());
  const areaTexto = area ? `${escapeHtml(area)}${seccion_solicitante ? ` (${escapeHtml(seccion_solicitante)})` : ''}` : 'General';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Notificación de Soporte Técnico</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;">
    <tr>
      <td align="center" style="padding:30px 15px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-collapse:collapse;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08);">
          
          <!-- CABECERA INSTITUCIONAL -->
          <tr>
            <td align="center" style="background-color:#00ADC1;padding:32px 30px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;letter-spacing:2px;text-transform:uppercase;padding-bottom:8px;">
                    GOBIERNO DE LA PROVINCIA DE BUENOS AIRES
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:4px 0 10px 0;">
                    <table width="70%" cellpadding="0" cellspacing="0" border="0" align="center">
                      <tr>
                        <td style="background-color:rgba(255,255,255,0.4);height:2px;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:4px;">
                    <span style="font-family:Arial,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;letter-spacing:1px;text-transform:uppercase;line-height:1.3;">DIRECCIÓN DE INFORMÁTICA<br>DELEGACIÓN III</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CUERPO DEL MENSAJE -->
          <tr>
            <td style="padding:35px 35px 25px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:#0d1b2a;padding-bottom:15px;">
                    Estimado/a ${escapeHtml(solicitante || 'usuario/a')},
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f8fafc;border-left:4px solid #00ADC1;padding:16px;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;border-radius:0 6px 6px 0;">
                    Le informamos que hemos registrado su solicitud en nuestro sistema de soporte técnico.
                  </td>
                </tr>
              </table>

              <!-- NÚMERO DE TICKET DESTACADO -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:28px 0 20px 0;">
                    <div style="font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:bold;letter-spacing:2px;padding-bottom:10px;">
                      NÚMERO DE TICKET
                    </div>
                    <table cellpadding="0" cellspacing="0" border="0" align="center">
                      <tr>
                        <td style="background-color:#00ADC1;padding:16px 40px;border-radius:10px;text-align:center;">
                          <span style="font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:2px;">${escapeHtml(String(numeroTicket))}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- DETALLES DE LA SOLICITUD -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:14px;color:#334155;padding:4px 0;">
                    <strong>Asunto / Título:</strong> ${escapeHtml(titulo || 'Sin título')}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:14px;color:#334155;padding:4px 0;">
                    <strong>Área / Sección:</strong> ${areaTexto}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:14px;color:#334155;padding:4px 0;">
                    <strong>Fecha de Registro:</strong> ${escapeHtml(fechaFinal)}
                  </td>
                </tr>
              </table>

              <!-- CANAL DE ATENCIÓN POR WHATSAPP -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:14px;color:#166534;line-height:1.5;">
                    💬 <strong>¿Tiene dudas o necesita hacer una consulta?</strong><br>
                    Comuníquese directamente con nuestro equipo por WhatsApp al<br>
                    <a href="https://wa.me/5492214548005" target="_blank" style="font-size:16px;font-weight:bold;color:#15803d;text-decoration:underline;display:inline-block;margin-top:6px;">221-454-8005</a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:13px;color:#64748b;line-height:1.5;">
                    <strong style="color:#00ADC1;">Importante:</strong> Conserve únicamente su número de ticket para cualquier consulta posterior.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PIE DE PÁGINA -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 30px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:#0d1b2a;padding-bottom:4px;">
                    Dirección de Informática &mdash; Delegación III
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:12px;color:#64748b;padding-bottom:12px;">
                    Provincia de Buenos Aires
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;line-height:1.4;">
                    Este correo fue generado automáticamente por el sistema de soporte técnico.<br>
                    <strong>Por favor, no responda directamente a este mensaje.</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

