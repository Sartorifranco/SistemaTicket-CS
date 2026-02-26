import { API_BASE_URL } from '../config/axiosConfig';

/**
 * Construye la URL completa para imágenes y adjuntos.
 * Usa API_BASE_URL + /api + path para que las peticiones vayan al backend
 * (evita 404 cuando frontend y backend comparten dominio y solo /api/* se proxea).
 */
export function getImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  const base = (API_BASE_URL || '').replace(/\/$/, '');
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${base}/api${path}`;
}

/**
 * URL alternativa sin /api (para backends que sirven /uploads en raíz).
 */
export function getImageUrlFallback(imageUrl: string | null | undefined): string {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  const base = (API_BASE_URL || '').replace(/\/$/, '');
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${base}${path}`;
}
