const nodemailer = require('nodemailer');

// Configuración del servidor SMTP
// Se ajusta automáticamente a las variables de tu .env
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // false para puerto 587 (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendRouteReportEmail = async (routeData, technicianName) => {
    // 1. Generamos las filas de la tabla HTML
    const stopsHtml = routeData.stops.map(stop => {
        // Verificar si hay tareas (Array con elementos)
        const hasTasks = Array.isArray(stop.tasks_done) && stop.tasks_done.length > 0;
        
        // Color de la barra lateral (Verde si está hecho, Rojo si no)
        const statusColor = stop.status === 'Hecho' ? '#28a745' : '#dc3545';
        
        // Formatear tareas con un tick verde
        const tasksList = hasTasks 
            ? stop.tasks_done.map(t => `<div style="font-size: 11px; margin-bottom: 2px;">✅ ${t}</div>`).join('')
            : '<em style="color:#bbb; font-size: 11px;">Sin checklist registrado</em>';

        return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; border-left: 4px solid ${statusColor}; vertical-align: top;">
                <strong style="color: #333; font-size: 13px;">${stop.alias}</strong><br>
                <span style="font-size: 10px; color: #777;">S/N: ${stop.serial_number}</span>
            </td>
            <td style="padding: 10px; vertical-align: top;">
                ${tasksList}
            </td>
            <td style="padding: 10px; text-align: center; vertical-align: top;">
                <div style="background: #f8f9fa; padding: 4px; border-radius: 4px; border: 1px solid #eee;">
                    <span style="font-family: monospace; font-size: 14px; color: #0056b3; font-weight: bold;">
                        ${stop.bill_counter ? parseInt(stop.bill_counter).toLocaleString() : '-'}
                    </span>
                </div>
            </td>
            <td style="padding: 10px; font-size: 12px; color: #555; font-style: italic; vertical-align: top;">
                ${stop.observations || '-'}
            </td>
        </tr>
    `;
    }).join('');

    // 2. Diseño del Email (HTML Profesional)
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; color: #333; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            
            <div style="background-color: #002b55; color: white; padding: 25px; text-align: center;">
                <h2 style="margin: 0; font-size: 22px; font-weight: 600;">Reporte de Hoja de Ruta Finalizada</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.8;">Sistema de Gestión Técnica - Grupo Bacar</p>
            </div>
            
            <div style="padding: 20px; background-color: #f4f6f8; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; line-height: 1.6;">
                    <div><strong>👤 Técnico:</strong> ${technicianName}</div>
                    <div><strong>📅 Fecha:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
                </div>
                <div style="font-size: 13px; line-height: 1.6; text-align: right;">
                    <div><strong>🏁 Distancia:</strong> ${routeData.total_km} km</div>
                    <div><strong>⏱️ Tiempo:</strong> ${Math.floor(routeData.total_minutes / 60)}h ${routeData.total_minutes % 60}m</div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 0; background-color: white;">
                <thead style="background-color: #eef2f7; color: #495057; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                    <tr>
                        <th style="padding: 12px; text-align: left; width: 25%;">Equipo / Ubicación</th>
                        <th style="padding: 12px; text-align: left; width: 35%;">Tareas Realizadas</th>
                        <th style="padding: 12px; text-align: center; width: 15%;">Contador</th>
                        <th style="padding: 12px; text-align: left; width: 25%;">Observaciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${stopsHtml}
                </tbody>
            </table>

            <div style="padding: 15px; font-size: 11px; color: #999; text-align: center; background-color: #f9f9f9; border-top: 1px solid #e0e0e0;">
                Este es un mensaje automático generado por el sistema de tickets de Grupo Bacar.<br>
                Enviado desde: ${process.env.EMAIL_USER}
            </div>
        </div>
    `;

    // 3. Envío del correo
    try {
        await transporter.sendMail({
            // NOMBRE DEL REMITENTE ACTUALIZADO:
            from: `"Sistema de tickets Grupo Bacar" <${process.env.EMAIL_USER}>`, 
            to: "admin@bacarsa.com.ar, sistemas.ti@bacarsa.com.ar",
            subject: `✅ Ruta Finalizada - ${technicianName} - ${new Date().toLocaleDateString()}`,
            html: htmlContent
        });
        console.log(`📧 Email enviado correctamente.`);
    } catch (error) {
        console.error("❌ Error enviando email:", error);
    }
};

module.exports = { sendRouteReportEmail };