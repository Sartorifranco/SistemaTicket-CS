// frontend/src/utils/dateFormatter.ts

/** Zona horaria del cliente: Córdoba, Argentina (UTC-3). Las fechas del servidor vienen en UTC. */
const ARGENTINA_TZ = 'America/Argentina/Cordoba';

/**
 * Interpreta un string de fecha/hora del API como UTC y devuelve un Date.
 * MySQL/backend suelen devolver "YYYY-MM-DD HH:mm:ss" sin Z; el navegador lo interpreta como hora local.
 * Forzamos interpretación UTC añadiendo Z cuando no hay indicador de zona.
 */
export function parseDateAsUTC(dateString: string | null | undefined): Date | null {
  if (dateString == null || String(dateString).trim() === '') return null;
  const s = String(dateString).trim();
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const isoLike = s.replace(' ', 'T');
  const withZ = /\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(isoLike)
    ? isoLike.replace(/T(\d):/, 'T0$1:').slice(0, 19) + 'Z'
    : isoLike.slice(0, 10) + 'T00:00:00.000Z';
  const date = new Date(withZ);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Para fechas solo-día (YYYY-MM-DD): interpreta como mediodía UTC para que al formatear
 * en cualquier timezone (ej. Argentina) siga siendo el mismo día (evita el "día anterior").
 */
function parseDateOnlyAsNoonUTC(dateString: string | null | undefined): Date | null {
  if (dateString == null || String(dateString).trim() === '') return null;
  const s = String(dateString).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10))) return null;
  const date = new Date(s.slice(0, 10) + 'T12:00:00.000Z');
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formatea fecha+hora para mostrar en Argentina (Córdoba).
 * Acepta strings del API (se interpretan como UTC) o Date.
 */
export function formatDateTimeArgentina(
  dateString: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateString === 'string' ? parseDateAsUTC(dateString) : dateString ?? null;
  if (!date || isNaN(date.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ARGENTINA_TZ,
    ...options
  };
  return new Intl.DateTimeFormat('es-AR', opts).format(date);
}

/**
 * Formatea solo fecha (sin hora) en zona Argentina (ej. "18/02/2025").
 * Si el valor es solo día (YYYY-MM-DD), usa mediodía UTC para evitar desfase de un día.
 */
export function formatDateArgentina(
  dateString: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  let date: Date | null;
  if (typeof dateString === 'string') {
    const s = String(dateString).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10)) && s.length <= 10) {
      date = parseDateOnlyAsNoonUTC(s);
    } else {
      date = parseDateAsUTC(dateString);
    }
  } else {
    date = dateString ?? null;
  }
  if (!date || isNaN(date.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ARGENTINA_TZ,
    ...options
  };
  return new Intl.DateTimeFormat('es-AR', opts).format(date);
}

/**
 * Devuelve la fecha como YYYY-MM-DD (para value de <input type="date">).
 * Para valores solo-día (YYYY-MM-DD del API) devuelve el substring para evitar desfase por timezone.
 */
export function formatDateForInput(dateString: string | Date | null | undefined): string {
  if (dateString == null) return '';
  if (typeof dateString === 'string') {
    const s = String(dateString).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  }
  const date = typeof dateString === 'string' ? parseDateAsUTC(dateString) : dateString;
  if (!date || isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: ARGENTINA_TZ }).format(date);
}

/**
 * Formatea fecha+hora con segundos (para logs o detalle).
 */
export function formatDateTimeArgentinaLong(
  dateString: string | Date | null | undefined
): string {
  return formatDateTimeArgentina(dateString, { second: '2-digit' });
}

/**
 * Formatea la fecha actual (ej. para "Generado el: ..." en PDFs) en zona Argentina.
 */
export function formatNowArgentina(options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ARGENTINA_TZ,
    ...options
  }).format(new Date());
}

/**
 * Normaliza a YYYY-MM-DD para enviar al backend (evita enviar hora que pueda corromperse).
 */
export function toDateOnly(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === '') return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

/** @deprecated Usar formatDateTimeArgentina o formatDateArgentina según corresponda. */
export const formatLocalDate = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? parseDateAsUTC(dateString) ?? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: ARGENTINA_TZ
    }).format(date);
  } catch {
    return 'Fecha inválida';
  }
};
