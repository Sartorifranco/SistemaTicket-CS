/**
 * Servicio de envío de correos para notificaciones de tickets y comentarios.
 * Usa Nodemailer con variables de entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
 */
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        return null;
    }
    transporter = nodemailer.createTransport({
        host,
        port: Number.isNaN(port) ? 587 : port,
        secure: port === 465,
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
        const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost';
        await trans.sendMail({
            from,
            to: to.trim(),
            subject: subject || 'Notificación',
            html: htmlBody || '<p>Sin contenido.</p>'
        });
        return true;
    } catch (err) {
        console.error('[mailer] sendTicketEmail error:', err.message);
        return false;
    }
}

module.exports = { sendTicketEmail, getTransporter };
