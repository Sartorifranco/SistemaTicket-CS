const nodemailer = require('nodemailer');
require('dotenv').config(); // Asegura que las variables de entorno se carguen

const emailPortNum = parseInt(process.env.EMAIL_PORT, 10);
const emailPort = Number.isNaN(emailPortNum) ? 587 : emailPortNum;
// 587 = STARTTLS → secure false; solo 465 usa SSL directo
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendActivationEmail = async (to, token) => {
    // ✅ Se utiliza la variable de entorno para construir el enlace correctamente
    const activationUrl = `${process.env.FRONTEND_URL}/activate-account?token=${token}`;

    const mailOptions = {
        from: `"Sistema de Tickets BACAR" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Activa tu cuenta en el Sistema de Tickets de Grupo Bacar',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>¡Bienvenido al Sistema de Tickets de Grupo Bacar!</h2>
                <p>Gracias por registrarte. Por favor, haz clic en el siguiente botón para activar tu cuenta:</p>
                <a href="${activationUrl}" style="background-color: #DC2626; color: white; padding: 12px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold;">
                    Activar Mi Cuenta
                </a>
                <p style="margin-top: 20px;">Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
                <p><a href="${activationUrl}">${activationUrl}</a></p>
                <p>Este enlace expirará en 8 horas.</p>
                <p>Si no te registraste en nuestro sistema, por favor ignora este correo.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Correo de activación enviado a ${to}`);
    } catch (error) {
        console.error('[EmailService] Error al enviar el correo de activación:', error);
        // En un entorno de producción, aquí podrías añadir un sistema de reintentos o logging más robusto.
    }
};

const sendWelcomeEmail = async (to, username) => {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;

    const mailOptions = {
        from: `"Sistema de Tickets de Grupo Bacar" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: '¡Tu cuenta ha sido activada!',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>¡Tu cuenta está lista!</h2>
                <p>Hola,</p>
                <p>Tu cuenta en el Sistema de Tickets de Grupo Bacar ha sido activada exitosamente.</p>
                <p>Tu nombre de usuario es: <strong>${username}</strong></p>
                <p>Ya puedes iniciar sesión con tu correo y la contraseña que elegiste.</p>
                <a href="${loginUrl}" style="background-color: #16A34A; color: white; padding: 12px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold;">
                    Iniciar Sesión
                </a>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Correo de bienvenida enviado a ${to}`);
    } catch (error) {
        console.error('[EmailService] Error al enviar el correo de bienvenida:', error);
    }
};

const sendPasswordResetEmail = async (to, token, fullName = '') => {
    const missing = [];
    if (!process.env.EMAIL_HOST) missing.push('EMAIL_HOST');
    if (!process.env.EMAIL_PORT) missing.push('EMAIL_PORT');
    if (!process.env.EMAIL_USER) missing.push('EMAIL_USER');
    if (!process.env.EMAIL_PASS) missing.push('EMAIL_PASS');
    if (missing.length > 0) {
        console.error('[EmailService] Faltan variables de entorno:', missing.join(', '));
        throw new Error(`Configuración de email incompleta. Faltan: ${missing.join(', ')}. Ver backend/CONFIGURAR-EMAIL.md`);
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const mailOptions = {
        from: `"Sistema de Tickets Schettini" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Recuperación de contraseña',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Recuperación de contraseña</h2>
                <p>${fullName ? `Hola ${fullName},` : 'Hola,'}</p>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                <p>Hacé clic en el botón para elegir una nueva contraseña:</p>
                <a href="${resetUrl}" style="background-color: #DC2626; color: white; padding: 12px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold;">
                    Restablecer contraseña
                </a>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">Si el botón no funciona, copiá y pegá esta URL en tu navegador:</p>
                <p style="font-size: 12px;"><a href="${resetUrl}">${resetUrl}</a></p>
                <p style="margin-top: 20px; font-size: 12px;">Este enlace expira en 1 hora.</p>
                <p style="font-size: 12px;">Si no solicitaste recuperar tu contraseña, ignorá este correo.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Correo de recuperación enviado a ${to}`);
    } catch (error) {
        console.error('[EmailService] Error al enviar correo de recuperación:', error);
        throw error;
    }
};

/** Notifica al cliente que su equipo/software está listo para usar o retirar */
const sendEquipmentReadyEmail = async (to, clientName = '', invoiceNumber = '') => {
    const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/client` : 'http://localhost:3000/client';

    const mailOptions = {
        from: `"Sistema de Tickets" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Tu equipo/software está listo',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>¡Buenas noticias!</h2>
                <p>${clientName ? `Hola ${clientName},` : 'Hola,'}</p>
                <p>Te informamos que tu equipo/software ${invoiceNumber ? `(Factura/Pedido ${invoiceNumber})` : ''} está <strong>listo para usar o retirar</strong>.</p>
                <p>Podés ingresar al portal para más detalles o contactarnos si tenés consultas.</p>
                <a href="${loginUrl}" style="background-color: #16A34A; color: white; padding: 12px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold;">
                    Ir al portal
                </a>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Correo "equipo listo" enviado a ${to}`);
    } catch (error) {
        console.error('[EmailService] Error al enviar correo equipo listo:', error);
    }
};

const escHtml = (s) => {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

/**
 * Notifica por email un lead de oferta (Me interesa). No lanza si falla el envío.
 * @param {string} to - destinatario
 * @param {string} clientLabel - nombre visible del cliente
 * @param {string} offerTitle - título de la oferta
 * @param {{ email?: string, phone?: string, leadAt?: string }} [extra]
 */
const sendOfferLeadEmail = async (to, clientLabel, offerTitle, extra = {}) => {
    if (!to || !String(to).trim()) {
        console.warn('[EmailService] sendOfferLeadEmail: sin destinatario, se omite envío.');
        return false;
    }
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('[EmailService] sendOfferLeadEmail: falta configuración SMTP (EMAIL_*).');
        return false;
    }
    const subj = `Nuevo Lead: ${clientLabel} interesado en ${offerTitle}`;
    const mailOptions = {
        from: `"Sistema de Tickets" <${process.env.EMAIL_USER}>`,
        to: String(to).trim(),
        subject: subj.length > 255 ? subj.slice(0, 252) + '...' : subj,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color:#1e40af;">Nuevo interés en una oferta</h2>
                <p><strong>Cliente:</strong> ${escHtml(clientLabel)}</p>
                ${extra.email ? `<p><strong>Email:</strong> ${escHtml(extra.email)}</p>` : ''}
                ${extra.phone ? `<p><strong>Teléfono:</strong> ${escHtml(extra.phone)}</p>` : ''}
                <p><strong>Oferta:</strong> ${escHtml(offerTitle)}</p>
                ${extra.leadAt ? `<p><strong>Fecha:</strong> ${escHtml(extra.leadAt)}</p>` : ''}
                <p style="margin-top:16px;font-size:12px;color:#666;">Mensaje generado automáticamente desde el panel de ofertas.</p>
            </div>
        `,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Lead de oferta notificado a ${to}`);
        return true;
    } catch (error) {
        console.error('[EmailService] Error al enviar notificación de lead de oferta:', error);
        return false;
    }
};

/**
 * Notifica que un cliente subió comprobante de pago (transferencia).
 * @param {string} to
 * @param {string} clientDisplayName
 * @param {{ receiptUrl?: string, adminPaymentsUrl?: string, amount?: string|number, paymentId?: number }} [opts]
 */
const sendBillingReceiptUploadedEmail = async (to, clientDisplayName, opts = {}) => {
    if (!to || !String(to).trim()) {
        console.warn('[EmailService] sendBillingReceiptUploadedEmail: sin destinatario.');
        return false;
    }
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('[EmailService] sendBillingReceiptUploadedEmail: falta configuración SMTP.');
        return false;
    }
    const subject = `Nuevo Comprobante de Pago subido por ${clientDisplayName}`;
    const safeName = escHtml(clientDisplayName);
    const payId = opts.paymentId != null ? escHtml(String(opts.paymentId)) : '';
    const amt = opts.amount != null ? escHtml(String(opts.amount)) : '';
    const rec = opts.receiptUrl ? escHtml(opts.receiptUrl) : '';
    const adm = opts.adminPaymentsUrl ? escHtml(opts.adminPaymentsUrl) : '';

    const mailOptions = {
        from: `"Sistema de Tickets" <${process.env.EMAIL_USER}>`,
        to: String(to).trim(),
        subject: subject.length > 255 ? subject.slice(0, 252) + '...' : subject,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color:#0f766e;">Nuevo comprobante de pago</h2>
                <p>El cliente <strong>${safeName}</strong> informó un pago y adjuntó un comprobante.</p>
                ${payId ? `<p><strong>ID de pago:</strong> #${payId}</p>` : ''}
                ${amt !== '' ? `<p><strong>Monto informado:</strong> $${amt}</p>` : ''}
                ${rec ? `<p><a href="${rec}" style="color:#2563eb;font-weight:bold;">Ver comprobante (archivo)</a></p>` : ''}
                ${adm ? `<p><a href="${adm}" style="color:#4f46e5;font-weight:bold;">Abrir gestión de pagos del cliente en el panel</a></p>` : ''}
                <p style="margin-top:16px;font-size:12px;color:#666;">Mensaje automático del sistema.</p>
            </div>
        `,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Notificación de comprobante enviada a ${to}`);
        return true;
    } catch (error) {
        console.error('[EmailService] Error al enviar notificación de comprobante:', error);
        return false;
    }
};

module.exports = {
    sendActivationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendEquipmentReadyEmail,
    sendOfferLeadEmail,
    sendBillingReceiptUploadedEmail,
};