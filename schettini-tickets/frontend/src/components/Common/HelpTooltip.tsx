import React, { useState, useRef, useEffect } from 'react';
import { FaQuestion } from 'react-icons/fa';

interface HelpTooltipProps {
  /** Texto que se muestra en el tooltip */
  text: string;
  /** Usar ícono "i" en lugar de "?" */
  useInfoIcon?: boolean;
  /** Clases adicionales para el contenedor del ícono */
  className?: string;
}

/**
 * Tooltip de ayuda reutilizable: ícono circular gris con "?" o "i".
 * Hover en desktop, tap en móvil para mostrar el recuadro explicativo.
 */
const HelpTooltip: React.FC<HelpTooltipProps> = ({ text, useInfoIcon, className = '' }) => {
  const [visible, setVisible] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!touchOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setTouchOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close, { passive: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [touchOpen]);

  const show = visible || touchOpen;

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center justify-center align-middle ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setTouchOpen((v) => !v);
        }}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-400 text-white text-xs font-bold hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 select-none"
        aria-label="Ayuda"
      >
        {useInfoIcon ? (
          <span className="text-[10px] font-bold leading-none">i</span>
        ) : (
          <FaQuestion className="text-[10px]" />
        )}
      </button>
      {show && (
        <span
          className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1.5 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-xl border border-gray-700 pointer-events-none text-left leading-snug"
          style={{
            width: 'max-content',
            maxWidth: 'min(360px, 90vw)',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default HelpTooltip;
