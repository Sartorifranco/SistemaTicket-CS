import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

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
 * Teclado: ↑↓ resaltan opciones, Enter elige, Escape cierra.
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
  const [inputValue, setInputValue] = useState<string>(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const query = (inputValue || '').trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter((o) => o.toLowerCase().includes(query));
  }, [options, query]);

  const showDropdown = open && (inputValue !== '' || filtered.length > 0);

  useEffect(() => {
    if (!showDropdown) setHighlightedIndex(-1);
  }, [showDropdown, filtered]);

  useEffect(() => {
    setHighlightedIndex((hi) => {
      if (hi < 0) return hi;
      if (filtered.length === 0) return -1;
      return Math.min(hi, filtered.length - 1);
    });
  }, [filtered]);

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
    const next = e.target.value;
    setInputValue(next);
    onChange(next);
    setOpen(true);
    setHighlightedIndex(-1);
  };
  const handleSelect = useCallback(
    (option: string) => {
      onChange(option);
      setInputValue(option);
      setOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      if (filtered.length === 0) return;
      setHighlightedIndex((i) => (i < 0 ? 0 : Math.min(i + 1, filtered.length - 1)));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      if (filtered.length === 0) return;
      setHighlightedIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
      return;
    }

    if (e.key === 'Enter') {
      if (open && filtered.length > 0) {
        const pick = highlightedIndex >= 0 ? filtered[highlightedIndex] : filtered[0];
        if (pick) {
          e.preventDefault();
          handleSelect(pick);
        }
      }
    }
  };

  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-option-index="${highlightedIndex}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

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
        onKeyDown={handleKeyDown}
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
          ref={listRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-500" role="option" aria-selected="false">
              Sin coincidencias — se guardará el texto tal cual
            </li>
          ) : (
            filtered.map((option, idx) => (
              <li
                key={option}
                data-option-index={idx}
                role="option"
                aria-selected={highlightedIndex === idx}
                className={highlightedIndex === idx ? 'bg-indigo-50' : ''}
              >
                <button
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
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
