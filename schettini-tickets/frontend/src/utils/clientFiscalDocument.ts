/**
 * Validación fiscal para clientes (espejo del backend).
 * - Inscripto / Monotributista → CUIT (11 dígitos)
 * - Consumidor Final / Exento → DNI (7–8 dígitos)
 */

export const IVA_OPTIONS = ['Inscripto', 'Monotributista', 'Exento', 'Consumidor Final'] as const;

export type IvaOption = (typeof IVA_OPTIONS)[number];

export function digitsOnly(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

export function normalizeIvaCondition(value: string | null | undefined): string {
  const v = String(value || '').trim();
  if (!v) return '';
  const lower = v.toLowerCase();
  if (lower.includes('inscripto') || lower === 'ri') return 'Inscripto';
  if (lower.includes('monotribut')) return 'Monotributista';
  if (lower.includes('exento')) return 'Exento';
  if (lower.includes('consumidor')) return 'Consumidor Final';
  return v;
}

export function documentKindForIva(ivaCondition: string | null | undefined): 'cuit' | 'dni' | null {
  const iva = normalizeIvaCondition(ivaCondition);
  if (iva === 'Inscripto' || iva === 'Monotributista') return 'cuit';
  if (iva === 'Exento' || iva === 'Consumidor Final') return 'dni';
  return null;
}

export function isValidCuit(value: string | null | undefined): boolean {
  return digitsOnly(value).length === 11;
}

export function isValidDni(value: string | null | undefined): boolean {
  const d = digitsOnly(value);
  return d.length >= 7 && d.length <= 8;
}

export function validateClientFiscalDocument(input: {
  iva_condition?: string | null;
  cuit?: string | null;
}): { ok: true; iva: string; kind: 'cuit' | 'dni' } | { ok: false; message: string } {
  const iva = normalizeIvaCondition(input.iva_condition);
  if (!iva) {
    return {
      ok: false,
      message: 'Indicá la condición IVA (Inscripto, Monotributista, Exento o Consumidor Final).'
    };
  }
  const kind = documentKindForIva(iva);
  const doc = String(input.cuit || '').trim();
  if (!kind) {
    return {
      ok: false,
      message: 'Condición IVA no válida.'
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
  return { ok: true, iva, kind };
}

export function clientMissingFiscalDocument(client: {
  role?: string;
  iva_condition?: string | null;
  cuit?: string | null;
}): boolean {
  if (client.role && client.role !== 'client') return false;
  return !validateClientFiscalDocument(client).ok;
}

export function documentFieldLabel(ivaCondition: string | null | undefined): string {
  const kind = documentKindForIva(ivaCondition);
  if (kind === 'dni') return 'DNI';
  if (kind === 'cuit') return 'CUIT';
  return 'CUIT / DNI';
}
