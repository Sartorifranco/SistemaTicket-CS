/**
 * GET /api/clients/afip/:cuit
 * Consulta datos del contribuyente en API externa AFIP (tangofactura) y devuelve razón social, domicilio, condición IVA.
 */
const getAfipByCuit = async (req, res) => {
  try {
    const cuit = (req.params.cuit || '').replace(/\D/g, '');
    if (cuit.length !== 11) {
      return res.status(400).json({ success: false, message: 'CUIT debe tener 11 dígitos' });
    }

    const url = `https://afip.tangofactura.com/Rest/GetContribuyenteFull?cuit=${cuit}`;
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });

    if (!response.ok) {
      return res.status(503).json({
        success: false,
        message: 'El servicio AFIP no está disponible en este momento. Intentá más tarde.'
      });
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      return res.status(503).json({
        success: false,
        message: 'No se pudieron obtener datos para ese CUIT.'
      });
    }

    if (data.errorGetData || data.errorMessage) {
      return res.status(503).json({
        success: false,
        message: data.errorMessage || 'No se encontraron datos para ese CUIT.'
      });
    }

    // Parsing flexible según distintas APIs AFIP (tangofactura y variantes)
    const razonSocial = [
      data.denominacion,
      data.razonSocial,
      data.razon_social,
      data.nombre,
      data.Nombre,
      data.contribuyente?.denominacion
    ].find(Boolean) || '';
    const domicilio = [
      data.domicilio,
      data.direccion,
      data.address,
      data.Domicilio,
      data.contribuyente?.domicilio
    ].find(Boolean) || '';
    const condicionIVA = [
      data.condicionImpositiva,
      data.condicion_iva,
      data.iva,
      data.condicionIVA,
      data.contribuyente?.condicionIVA
    ].find(Boolean) || '';

    res.json({
      success: true,
      data: {
        razonSocial: String(razonSocial).trim() || null,
        domicilio: String(domicilio).trim() || null,
        condicionIVA: String(condicionIVA).trim() || null,
        cuit: data.cuit || data.CUIT || cuit
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
