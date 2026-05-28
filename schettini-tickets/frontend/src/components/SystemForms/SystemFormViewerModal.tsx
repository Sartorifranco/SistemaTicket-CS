import React, { useEffect, useMemo } from 'react';
import { FaTimes, FaExclamationTriangle, FaExternalLinkAlt } from 'react-icons/fa';

export interface SystemFormViewerData {
  id: number;
  title: string;
  description: string;
  external_url: string;
}

/** Mejora la carga en iframe para Google Forms (parámetro embedded). */
export function toFormEmbedUrl(url: string): string {
  const raw = (url || '').trim();
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    if (u.hostname.includes('docs.google.com') && u.pathname.includes('/forms')) {
      u.searchParams.set('embedded', 'true');
      return u.toString();
    }
  } catch {
    /* usar URL tal cual */
  }
  return raw;
}

interface SystemFormViewerModalProps {
  form: SystemFormViewerData | null;
  onClose: () => void;
}

/**
 * Visualizador interno de planilla externa (iframe a pantalla casi completa).
 */
const SystemFormViewerModal: React.FC<SystemFormViewerModalProps> = ({ form, onClose }) => {
  const embedSrc = useMemo(() => (form ? toFormEmbedUrl(form.external_url) : ''), [form]);

  useEffect(() => {
    if (!form) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [form, onClose]);

  if (!form) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/60 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-form-viewer-title"
    >
      <div className="flex flex-col flex-1 min-h-0 max-w-[96rem] w-full mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 id="system-form-viewer-title" className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {form.title}
            </h2>
            <div className="flex gap-2 mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 max-w-3xl">
              <FaExclamationTriangle className="text-amber-600 shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs sm:text-sm text-amber-950 whitespace-pre-wrap line-clamp-3 sm:line-clamp-none">
                {form.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={form.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50"
              title="Si el formulario no se ve bien aquí, abrilo en una pestaña nueva"
            >
              <FaExternalLinkAlt /> Abrir en pestaña
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <FaTimes /> Cerrar planilla
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 p-2 sm:p-4 bg-gray-100">
          <iframe
            title={form.title}
            src={embedSrc}
            className="w-full h-[80vh] min-h-[320px] rounded-lg border border-gray-300 bg-white"
            allow="fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            Si la planilla no carga, el proveedor puede bloquear la vista embebida. Usá &quot;Abrir en pestaña&quot; arriba.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemFormViewerModal;
