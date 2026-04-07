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

/**
 * Detecta si una URL es de YouTube y extrae el VIDEO_ID.
 * Soporta: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Devuelve la URL de embed de YouTube dado un VIDEO_ID.
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}
