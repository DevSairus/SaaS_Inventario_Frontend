import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ensambladoraTecnicosApi } from '../../api/ensambladora';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100';

/**
 * Input de técnico/asesor con sugerencias por cédula o nombre, contra el
 * registro local ya sincronizado con la Ensambladora (GET /ensambladora/
 * tecnicos) -- "sincronizado" = vinculado y con sync_estado 'confirmado'.
 * Sigue siendo texto libre (no fuerza a elegir de la lista): un técnico que
 * todavía no está en el registro local se puede escribir a mano igual,
 * mismo criterio que el resto de campos de esta pantalla.
 */
export default function TecnicoAutocomplete({ value, onChange, placeholder = 'Cédula o nombre', disabled = false, className }) {
  const [tecnicos, setTecnicos] = useState([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    ensambladoraTecnicosApi
      .list()
      .then((res) => {
        const todos = res.data?.data ?? [];
        setTecnicos(todos.filter((t) => t.vinculado && t.sync_estado === 'confirmado'));
      })
      .catch(() => {
        // Silencioso -- si falla, el campo sigue funcionando como texto libre.
      });
  }, []);

  const sugerencias = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return [];
    return tecnicos
      .filter((t) => t.documento_identidad.toLowerCase() !== q)
      .filter((t) => t.documento_identidad.toLowerCase().includes(q) || (t.nombre || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [value, tecnicos]);

  const seleccionado = tecnicos.find((t) => t.documento_identidad === value);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          placeholder={placeholder}
          className={`${inputCls} pl-7 ${className || ''}`}
        />
      </div>
      {seleccionado?.nombre && (
        <p className="text-xs text-gray-400 mt-1">{seleccionado.nombre}</p>
      )}
      {abierto && sugerencias.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg overflow-hidden">
          {sugerencias.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => { onChange(t.documento_identidad); setAbierto(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between gap-2"
            >
              <span className="text-gray-700 dark:text-gray-200 truncate">{t.nombre || '—'}</span>
              <span className="text-xs text-gray-400 font-mono shrink-0">{t.documento_identidad}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
