/** URL de API externa AFIP - tangofactura puede estar deprecada ("Sistema desactualizado o fuera de soporte") */
const AFIP_API_URL = 'https://afip.tangofactura.com/Rest/GetContribuyenteFull';

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

    const url = `${AFIP_API_URL}?cuit=${cuit}`;
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('ERROR REAL AFIP:', {
        status: response.status,
        statusText: response.statusText,
        body: body?.slice?.(0, 500) || body
      });
      return res.status(503).json({
        success: false,
        message: 'El servicio de AFIP no está respondiendo temporalmente. Por favor, ingresá los datos manualmente.'
      });
    }

    const data = await response.json().catch((parseErr) => {
      console.error('ERROR REAL AFIP (parse JSON):', parseErr?.message || parseErr);
      return null;
    });
    if (!data || typeof data !== 'object') {
      return res.status(503).json({
        success: false,
        message: 'El servicio de AFIP no está respondiendo temporalmente. Por favor, ingresá los datos manualmente.'
      });
    }

    if (data.errorGetData || data.errorMessage) {
      console.error('ERROR REAL AFIP (API respondió con error):', {
        errorMessage: data.errorMessage,
        errorGetData: data.errorGetData,
        fullData: data
      });
      return res.status(503).json({
        success: false,
        message: 'El servicio de AFIP no está respondiendo temporalmente. Por favor, ingresá los datos manualmente.'
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
    console.error('ERROR REAL AFIP:', error?.response?.data || error?.message || error);
    res.status(503).json({
      success: false,
      message: 'El servicio de AFIP no está respondiendo temporalmente. Por favor, ingresá los datos manualmente.'
    });
  }
};

module.exports = { getAfipByCuit };
