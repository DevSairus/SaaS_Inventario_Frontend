// src/components/common/DianLookupButton.jsx
//
// Botón que consulta un cliente en la DIAN (GetAcquirer) por NIT o cédula.
// Solo se muestra si el tenant tiene SU PROPIO certificado digital cargado
// en Configuración DIAN (ver useDianLookupAvailability) -- la consulta sale
// firmada con ese certificado. La DIAN devuelve solo nombre y correo.
//
// Uso:
//   const dianLookupAvailable = useDianLookupAvailability();
//   {dianLookupAvailable && (
//     <DianLookupButton documentType={formData.document_type} number={formData.tax_id} onResult={handleDianResult} />
//   )}

import { useEffect, useState } from 'react';
import axios from '../../api/axios';

// Se consulta una vez al montar la página (no en cada apertura del modal):
// la disponibilidad solo cambia si alguien carga/quita el certificado en
// Configuración DIAN.
export function useDianLookupAvailability() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    axios.get('/customers/dian-lookup/availability')
      .then(res => { if (active) setAvailable(!!res.data?.data?.available); })
      .catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, []);

  return available;
}

export default function DianLookupButton({ documentType = '13', number = '', onResult, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const numberClean = number.toString().replace(/[^0-9A-Za-z-]/g, '').trim();
  const numberBase  = numberClean.split('-')[0];
  const canLookup   = numberBase.length >= 3 && !disabled && !loading;

  const handleLookup = async () => {
    if (!canLookup) return;
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await axios.get(`/customers/dian-lookup/${documentType}/${encodeURIComponent(numberClean)}`);
      if (res.data?.success && res.data?.data) {
        onResult(res.data.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('La DIAN no devolvió datos para este documento.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error consultando la DIAN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleLookup}
        disabled={!canLookup}
        title={numberBase.length < 3 ? 'Ingresa el número de identificación' : 'Consultar nombre y correo registrados en la DIAN'}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
          border transition-all whitespace-nowrap
          ${!canLookup
            ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10 cursor-not-allowed'
            : success
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/40 hover:bg-green-100 dark:hover:bg-green-900/40'
              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-95'
          }
        `}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Consultando…
          </>
        ) : success ? (
          <>
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            Datos cargados
          </>
        ) : (
          <>
            {/* Ícono documento */}
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
            </svg>
            Consultar DIAN
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 leading-tight">{error}</p>
      )}
    </div>
  );
}
