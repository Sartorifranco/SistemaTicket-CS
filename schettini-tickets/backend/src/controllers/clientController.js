/**
 * GET /api/clients/afip/:cuit
 * Consulta datos del contribuyente en API externa AFIP (ej. tangofactura) y devuelve razón social, domicilio, condición IVA.
 */
const getAfipByCuit = async (req, res) => {
  try {
    const cuit = (req.params.cuit || '').replace(/\D/g, '');
    if (cuit.length !== 11) {
      return res.status(400).json({ success: false, message: 'CUIT debe tener 11 dígitos' });
    }

    const url = `https://afip.tangofactura.com/Rest/GetContribuyenteFull?cuit=${cuit}`;
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));

    if (data.errorGetData || data.errorMessage) {
      return res.status(503).json({
        success: false,
        message: data.errorMessage || 'No se encontraron datos para ese CUIT o el servicio AFIP no está disponible.'
      });
    }

    const razonSocial = data.denominacion || data.razonSocial || data.razon_social || data.nombre || '';
    const domicilio = data.domicilio || data.direccion || data.address || '';
    const condicionIVA = data.condicionImpositiva || data.condicion_iva || data.iva || data.condicionIVA || '';

    res.json({
      success: true,
      data: {
        razonSocial: razonSocial.trim() || null,
        domicilio: domicilio.trim() || null,
        condicionIVA: condicionIVA.trim() || null,
        cuit: data.cuit || cuit
      }
    });
  } catch (error) {
    console.error('Error getAfipByCuit:', error);
    res.status(500).json({
      success: false,
      message: 'Error al consultar AFIP. Verificá el CUIT o intentá más tarde.'
    });
  }
};

module.exports = { getAfipByCuit };
