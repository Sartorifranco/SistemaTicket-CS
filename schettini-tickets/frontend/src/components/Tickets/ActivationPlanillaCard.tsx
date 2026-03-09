import React from 'react';
import { getImageUrl } from '../../utils/imageUrl';
import SectionCard from '../Common/SectionCard';

const FORM_LABELS: Record<string, string> = {
  invoice_number: 'N° Factura',
  tipo_instalacion: 'Tipo Instalación',
  tipo_rubro: 'Tipo Rubro',
  domicilio: 'Domicilio',
  punto_venta: 'N° Punto Venta',
  cuit: 'CUIT',
  razon_social: 'Razón Social',
  clave_fiscal: 'Clave Fiscal',
  no_brindar_clave_fiscal: 'No brindar clave fiscal',
  telefono: 'Teléfono',
  ingresos_brutos: 'Ingresos Brutos',
  inicio_actividades: 'Inicio Actividades',
  email: 'Email',
  razon_social_cuil: 'Razón Social / CUIL'
};

const FORM_TYPE_LABELS: Record<string, string> = {
  general: 'Planilla Estándar',
  alta_general: 'Planilla Estándar',
  controlador_fiscal: 'Controlador Fiscal',
  fiscal: 'Fiscal',
  no_fiscal: 'No Fiscal',
  none: 'Sin especificar'
};

function formatKey(key: string): string {
  return FORM_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isFilePath(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return val.includes('/uploads/') || val.startsWith('/uploads') || /\.(pdf|jpg|jpeg|png|gif|doc|docx)$/i.test(val);
}

export interface ActivationData {
  id: number;
  form_type: string;
  invoice_number?: string;
  form_data: Record<string, unknown>;
}

interface ActivationPlanillaCardProps {
  activationData: ActivationData;
}

const ActivationPlanillaCard: React.FC<ActivationPlanillaCardProps> = ({ activationData }) => {
  const { form_type, form_data } = activationData;
  const formTypeLabel = FORM_TYPE_LABELS[form_type] || form_type;

  const entries = Object.entries(form_data || {}).filter(
    ([k]) => k !== '_uploads' && !k.startsWith('_')
  );

  const uploads = (form_data?._uploads as Array<{ field?: string; path?: string; originalName?: string }>) || [];

  return (
    <SectionCard title={`📄 Planilla de Activación (${formTypeLabel})`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {entries.map(([key, val]) => {
          if (val === undefined || val === null || val === '') return null;
          const strVal = String(val);
          if (strVal === '1' && key.includes('no_brindar')) {
            return (
              <div key={key} className="sm:col-span-2">
                <span className="font-medium text-gray-600">{formatKey(key)}:</span>{' '}
                <span className="text-gray-800">Sí</span>
              </div>
            );
          }
          if (isFilePath(strVal)) {
            const fileUrl = getImageUrl(strVal.startsWith('/') ? strVal : `/${strVal}`);
            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="font-medium text-gray-600">{formatKey(key)}</span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 text-sm font-medium w-fit transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Ver / Descargar archivo
                </a>
              </div>
            );
          }
          return (
            <div key={key}>
              <span className="font-medium text-gray-600 block">{formatKey(key)}</span>
              <span className="text-gray-800 break-words">{strVal}</span>
            </div>
          );
        })}
      </div>

      {uploads.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="font-medium text-gray-600 mb-2">Archivos adjuntos</p>
          <div className="flex flex-wrap gap-3">
            {uploads.map((u, idx) => {
              const path = u.path || '';
              if (!path) return null;
              const fileUrl = getImageUrl(path.startsWith('/') ? path : `/${path}`);
              const label = u.originalName || u.field || `Archivo ${idx + 1}`;
              return (
                <a
                  key={idx}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {label}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default ActivationPlanillaCard;
