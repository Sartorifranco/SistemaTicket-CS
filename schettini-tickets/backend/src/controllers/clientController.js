const axios = require('axios');

/** Cuitalizer API - 10 consultas gratis/mes. Registrar en https://cuitalizer.com.ar/register y configurar CUITALIZER_API_KEY en .env */
const CUITALIZER_API_URL = 'https://api.cuitalizer.com.ar/api/v1/contribuyente/consultar';
const MSG_AMIGABLE = 'El servicio de AFIP no está respondiendo temporalmente. Por favor, ingresá los datos manualmente.';

/**
 * GET /api/clients/afip/:cuit
 * Consulta datos del contribuyente en AFIP vía Cuitalizer API.
 * Requiere CUITALIZER_API_KEY en .env (10 consultas gratis en https://cuitalizer.com.ar/register)
 */
const getAfipByCuit = async (req, res) => {
  try {
    const cuit = (req.params.cuit || '').replace(/\D/g, '');
    if (cuit.length !== 11) {
      return res.status(400).json({ success: false, message: 'CUIT debe tener 11 dígitos' });
    }

    const apiKey = process.env.CUITALIZER_API_KEY?.trim();
    if (!apiKey) {
      console.error('ERROR REAL AFIP: CUITALIZER_API_KEY no configurada en .env. Registrate en https://cuitalizer.com.ar/register');
      return res.status(503).json({
        success: false,
        message: MSG_AMIGABLE,
      });
    }

    const response = await axios.post(
      CUITALIZER_API_URL,
      { cuit },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        timeout: 15000,
        validateStatus: () => true, // No lanzar en 4xx/5xx para manejarlo manualmente
      }
    );

    if (response.status !== 200 || !response.data?.success) {
      const errDetail = response.data?.detail || response.data?.title || response.statusText;
      console.error('ERROR REAL AFIP:', {
        status: response.status,
        detail: errDetail,
        data: response.data,
      });
      return res.status(503).json({
        success: false,
        message: MSG_AMIGABLE,
      });
    }

    const d = response.data?.data;
    if (!d || typeof d !== 'object') {
      console.error('ERROR REAL AFIP: respuesta sin data', response.data);
      return res.status(503).json({
        success: false,
        message: MSG_AMIGABLE,
      });
    }

    // Mapeo Cuitalizer -> formato esperado por el frontend (razonSocial, domicilio, condicionIVA, cuit)
    const razonSocial = d.razonSocial || d.denominacion || '';
    const partes = [
      d.domicilioCalle,
      d.domicilioNumero,
      [d.domicilioLocalidad, d.domicilioProvincia].filter(Boolean).join(', '),
      d.domicilioCp,
    ].filter(Boolean);
    const domicilio = partes.join(' ').trim() || (d.domicilios?.[0] ? [
      d.domicilios[0].calle,
      d.domicilios[0].numero,
      [d.domicilios[0].localidad, d.domicilios[0].provincia].filter(Boolean).join(', '),
    ].filter(Boolean).join(' ') : '');

    res.json({
      success: true,
      data: {
        razonSocial: String(razonSocial).trim() || null,
        domicilio: String(domicilio).trim() || null,
        condicionIVA: (d.estadoClave || d.actividadPrincipalDescripcion || '').trim() || null,
        cuit: d.cuit || cuit,
      },
    });
  } catch (error) {
    console.error('ERROR REAL AFIP:', error?.response?.data || error?.message || error);
    res.status(503).json({
      success: false,
      message: MSG_AMIGABLE,
    });
  }
};

module.exports = { getAfipByCuit };
