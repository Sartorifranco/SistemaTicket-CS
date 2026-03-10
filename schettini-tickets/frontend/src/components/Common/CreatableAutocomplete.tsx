import React, { useState, useRef, useEffect, useMemo } from 'react';

export interface CreatableAutocompleteProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  /** Clase del contenedor (wrapper) para posicionar el dropdown */
  containerClassName?: string;
}

/**
 * Combobox / Typeahead: filtrado en vivo por proximidad (.includes) y texto libre.
 * Si el usuario escribe algo que no está en la lista, se guarda exactamente ese texto.
 */
const CreatableAutocomplete: React.FC<CreatableAutocompleteProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Escribir o elegir de la lista',
  disabled = false,
  name,
  id,
  className = '',
  containerClassName = ''
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = (value || '').trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter((o) => o.toLowerCase().includes(query));
  }, [options, query]);

  const showDropdown = open && (value !== '' || filtered.length > 0);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleFocus = () => setOpen(true);
  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setOpen(true);
  };
  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  const inputClassName =
    (className && className.trim()) ||
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
  const disabledClass = disabled ? 'bg-gray-100 cursor-not-allowed' : '';

  return (
    <div ref={containerRef} className={`relative ${containerClassName}`}>
      <input
        type="text"
        name={name}
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={`${inputClassName} ${disabledClass}`}
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        role="combobox"
      />
      {showDropdown && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-500" role="option" aria-selected="false">
              Sin coincidencias — se guardará el texto tal cual
            </li>
          ) : (
            filtered.map((option) => (
              <li key={option} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none border-0"
                >
                  {option}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default CreatableAutocomplete;
