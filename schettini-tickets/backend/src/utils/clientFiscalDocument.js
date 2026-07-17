/**
 * Validación fiscal para clientes (comprobantes).
 * - Inscripto / Monotributista → CUIT (11 dígitos)
 * - Consumidor Final / Exento → DNI (7–8 dígitos)
 * El número se guarda en Users.cuit (campo fiscal unificado).
 */

const IVA_REQUIRES_CUIT = ['Inscripto', 'Monotributista', 'Responsable Inscripto', 'Monotributo'];
const IVA_REQUIRES_DNI = ['Consumidor Final', 'Exento'];

const IVA_OPTIONS = ['Inscripto', 'Monotributista', 'Exento', 'Consumidor Final'];

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeIvaCondition(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  const lower = v.toLowerCase();
  if (lower.includes('inscripto') || lower === 'ri') return 'Inscripto';
  if (lower.includes('monotribut')) return 'Monotributista';
  if (lower.includes('exento')) return 'Exento';
  if (lower.includes('consumidor')) return 'Consumidor Final';
  return v;
}

function documentKindForIva(ivaCondition) {
  const iva = normalizeIvaCondition(ivaCondition);
  if (IVA_REQUIRES_CUIT.some((x) => normalizeIvaCondition(x) === iva)) return 'cuit';
  if (IVA_REQUIRES_DNI.some((x) => normalizeIvaCondition(x) === iva)) return 'dni';
  return null;
}

function isValidCuit(value) {
  const d = digitsOnly(value);
  return d.length === 11;
}

function isValidDni(value) {
  const d = digitsOnly(value);
  return d.length >= 7 && d.length <= 8;
}

/**
 * @returns {{ ok: true, iva: string, document: string, kind: 'cuit'|'dni' } | { ok: false, message: string }}
 */
function validateClientFiscalDocument({ iva_condition, cuit, role }) {
  if (role && role !== 'client') return { ok: true, skipped: true };

  const iva = normalizeIvaCondition(iva_condition);
  if (!iva) {
    return {
      ok: false,
      message: 'Indicá la condición IVA (Inscripto, Monotributista, Exento o Consumidor Final).'
    };
  }

  const kind = documentKindForIva(iva);
  const doc = String(cuit || '').trim();

  if (!kind) {
    return {
      ok: false,
      message: 'Condición IVA no válida. Usá: Inscripto, Monotributista, Exento o Consumidor Final.'
    };
  }

  if (!doc) {
    return {
      ok: false,
      message:
        kind === 'cuit'
          ? 'El CUIT es obligatorio para Inscripto / Monotributista.'
          : 'El DNI es obligatorio para Consumidor Final / Exento.'
    };
  }

  if (kind === 'cuit' && !isValidCuit(doc)) {
    return { ok: false, message: 'CUIT inválido: deben ser 11 dígitos (con o sin guiones).' };
  }
  if (kind === 'dni' && !isValidDni(doc)) {
    return { ok: false, message: 'DNI inválido: deben ser 7 u 8 dígitos.' };
  }

  return { ok: true, iva, document: doc, kind };
}

function clientMissingFiscalDocument(user) {
  if (!user || user.role !== 'client') return false;
  const result = validateClientFiscalDocument({
    iva_condition: user.iva_condition,
    cuit: user.cuit,
    role: 'client'
  });
  return !result.ok;
}

module.exports = {
  IVA_OPTIONS,
  IVA_REQUIRES_CUIT,
  IVA_REQUIRES_DNI,
  digitsOnly,
  normalizeIvaCondition,
  documentKindForIva,
  isValidCuit,
  isValidDni,
  validateClientFiscalDocument,
  clientMissingFiscalDocument
};
