/**
 * Servicio de envío de correos para notificaciones de tickets y comentarios.
 * Variables de entorno: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS.
 * Opcional: EMAIL_FROM (remitente visible; si no, se usa EMAIL_USER).
 */
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    const host = process.env.EMAIL_HOST;
    const portRaw = parseInt(process.env.EMAIL_PORT, 10);
    const port = Number.isNaN(portRaw) ? 587 : portRaw;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!host || !user || !pass) {
        console.warn('[mailer] Falta configuración EMAIL_HOST / EMAIL_USER / EMAIL_PASS. No se enviarán correos de tickets.');
        return null;
    }
    // 587 = STARTTLS → secure debe ser false. Solo 465 usa SSL implícito (secure: true).
    const secure = port === 465;
    transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });
    return transporter;
}

/**
 * Envía un correo de notificación de ticket.
 * @param {string} to - Email del destinatario
 * @param {string} subject - Asunto
 * @param {string} htmlBody - Cuerpo en HTML
 * @returns {Promise<boolean>} true si se envió, false si no hay config o falla (no lanza)
 */
async function sendTicketEmail(to, subject, htmlBody) {
    if (!to || typeof to !== 'string' || !to.includes('@')) return false;
    const trans = getTransporter();
    if (!trans) return false;
    try {
        const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@localhost';
        console.log('Intentando enviar email a:', to);
        await trans.sendMail({
            from,
            to: to.trim(),
            subject: subject || 'Notificación',
            html: htmlBody || '<p>Sin contenido.</p>'
        });
        console.log('✅ Email enviado correctamente a:', to);
        return true;
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return false;
    }
}

module.exports = { sendTicketEmail, getTransporter };
