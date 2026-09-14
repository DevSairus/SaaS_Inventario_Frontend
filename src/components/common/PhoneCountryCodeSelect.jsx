import React, { memo, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Indicativos telefónicos más usados por la base de clientes (LatAm + los
// destinos más comunes de contacto internacional). Colombia va primero y es
// el valor por defecto -- Meta/WhatsApp Cloud API exige el número completo
// en E.164, por eso el celular del cliente necesita este indicativo
// explícito en vez de asumir siempre "57".
export const COUNTRY_CODES = [
  { code: '57', label: 'Colombia', flag: '🇨🇴' },
  { code: '1',  label: 'Estados Unidos / Canadá', flag: '🇺🇸' },
  { code: '52', label: 'México', flag: '🇲🇽' },
  { code: '507', label: 'Panamá', flag: '🇵🇦' },
  { code: '58', label: 'Venezuela', flag: '🇻🇪' },
  { code: '593', label: 'Ecuador', flag: '🇪🇨' },
  { code: '51', label: 'Perú', flag: '🇵🇪' },
  { code: '56', label: 'Chile', flag: '🇨🇱' },
  { code: '54', label: 'Argentina', flag: '🇦🇷' },
  { code: '55', label: 'Brasil', flag: '🇧🇷' },
  { code: '34', label: 'España', flag: '🇪🇸' },
  { code: '506', label: 'Costa Rica', flag: '🇨🇷' },
  { code: '502', label: 'Guatemala', flag: '🇬🇹' },
  { code: '503', label: 'El Salvador', flag: '🇸🇻' },
  { code: '504', label: 'Honduras', flag: '🇭🇳' },
  { code: '505', label: 'Nicaragua', flag: '🇳🇮' },
  { code: '598', label: 'Uruguay', flag: '🇺🇾' },
  { code: '595', label: 'Paraguay', flag: '🇵🇾' },
  { code: '591', label: 'Bolivia', flag: '🇧🇴' },
];

export const DEFAULT_COUNTRY_CODE = '57';

/**
 * Selector de indicativo telefónico (+57 Colombia por defecto), con
 * banderita de cada país. Es un dropdown propio (no un <select> nativo)
 * a propósito: dentro de un <option> nativo, Windows no dibuja los emoji de
 * bandera (regional indicators) -- los muestra como texto plano ("CO", "US",
 * etc.), así que las banderas solo se ven de verdad renderizadas como HTML
 * normal, no como parte del popup nativo del sistema operativo.
 *
 * Mantiene la misma forma de evento que un <select> (onChange recibe algo
 * con `.target.value`) para no tener que tocar los onChange={set('campo')}
 * que ya lo usan como si fuera un input nativo.
 */
const PhoneCountryCodeSelect = ({ value, onChange, disabled = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES[0];

  const handleSelect = (code) => {
    onChange({ target: { value: code } });
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        title="Indicativo de país"
        className={`flex items-center gap-1.5 border border-gray-300 rounded-lg pl-2.5 pr-2 py-2 text-sm dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 ${disabled ? 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span>+{selected.code}</span>
        <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-white dark:bg-graphite border border-gray-200 dark:border-white/10 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {COUNTRY_CODES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleSelect(c.code)}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition border-b border-gray-50 dark:border-white/5 last:border-0 text-sm ${
                c.code === selected.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <span className="text-base leading-none">{c.flag}</span>
              <span className="flex-1 truncate">{c.label}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs">+{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(PhoneCountryCodeSelect);
