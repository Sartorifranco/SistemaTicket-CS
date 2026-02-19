/**
 * Inserta el Acuerdo de Confidencialidad por defecto en system_settings si no existe.
 * Ejecutar: node scripts/seed-confidentiality-agreement.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');

const DEFAULT_AGREEMENT = `Acuerdo de Confidencialidad

El presente Acuerdo de Confidencialidad establece los términos bajo los cuales la información proporcionada por el usuario será tratada por nuestra empresa.

1. Información Confidencial

Se considerará Información Confidencial toda aquella información técnica, comercial, financiera, operativa o de cualquier otra naturaleza que el usuario proporcione a través de nuestro sitio web, formularios de registro, consultas o cualquier otro medio de contacto.

2. Uso de la Información

La información recopilada será utilizada exclusivamente para fines comerciales, administrativos, técnicos o de contacto vinculados con los servicios y productos ofrecidos por nuestra empresa. No será utilizada con fines distintos a los aquí establecidos.

3. Protección y Resguardo

Nos comprometemos a adoptar las medidas técnicas y organizativas necesarias para proteger la información contra accesos no autorizados, alteración, divulgación o destrucción indebida.

4. No Divulgación

La Información Confidencial no será divulgada a terceros, salvo obligación legal o cuando resultare necesario para la correcta prestación del servicio (por ejemplo, proveedores técnicos o administrativos), quienes estarán sujetos a iguales obligaciones de confidencialidad.

5. Vigencia

Las obligaciones de confidencialidad se mantendrán vigentes aun después de finalizada la relación comercial entre las partes.

6. Aceptación

El registro en nuestro sitio web implica la aceptación expresa de los términos del presente Acuerdo de Confidencialidad.`;

async function run() {
    try {
        const [rows] = await pool.query(
            'SELECT setting_value FROM system_settings WHERE setting_key = ?',
            ['confidentiality_agreement']
        );
        if (rows.length > 0) {
            console.log('El Acuerdo de Confidencialidad ya existe. No se modificó.');
            process.exit(0);
        }
        await pool.query(
            'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
            ['confidentiality_agreement', DEFAULT_AGREEMENT]
        );
        console.log('Acuerdo de Confidencialidad insertado correctamente.');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        pool.end();
    }
}
run();
