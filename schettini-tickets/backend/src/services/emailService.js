const nodemailer = require('nodemailer');
require('dotenv').config(); // Asegura que las variables de entorno se carguen

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true para 465, false para otros puertos
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

module.exports = {
    sendActivationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
};