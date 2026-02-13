import { API_BASE_URL } from '../config/axiosConfig';

/**
 * Construye la URL completa para imágenes subidas.
 * Intenta primero la ruta directa /uploads, y en onError se puede probar /api/uploads.
 */
export function getImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

/**
 * URL alternativa para cuando /uploads no está proxeado (usa /api/uploads)
 */
export function getImageUrlFallback(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${API_BASE_URL}/api${path}`;
}
