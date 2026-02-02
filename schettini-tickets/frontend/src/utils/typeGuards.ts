import { AxiosError } from 'axios';
// ✅ MEJORA: Se importa ApiResponseError desde el archivo central de tipos.
import { ApiResponseError } from '../types';

/**
 * Type guard para verificar si un error es una instancia de AxiosError.
 * @param error El objeto de error a verificar.
 * @returns true si el error es un AxiosError, false en caso contrario.
 */
export function isAxiosErrorTypeGuard<T = ApiResponseError>(error: unknown): error is AxiosError<T> {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error && (error as AxiosError).isAxiosError === true;
}

export type { ApiResponseError };

