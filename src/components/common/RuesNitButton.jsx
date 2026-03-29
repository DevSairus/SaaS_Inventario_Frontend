// src/components/common/RuesNitButton.jsx
//
// Botón reutilizable que consulta el NIT de una empresa en RUES (Confecámaras).
// Solo aplica para personas jurídicas. Para personas naturales muestra
// un mensaje indicando que deben ingresar los datos manualmente.
//
// Uso:
//   <RuesNitButton
//     nit={formData.tax_id}
//     tipoCliente={formData.customer_type}
//     onResult={handleRuesResult}
//   />

import { useState } from 'react';
import axios from '../../api/axios';

export default function RuesNitButton({ nit = '', tipoCliente = 'individual', onResult, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const nitLimpio = nit.toString().replace(/[^0-9\-]/g, '').trim();
  const nitBase   = nitLimpio.split('-')[0];
  const esEmpresa = tipoCliente === 'company';
  const puedeConsultar = esEmpresa && nitBase.length >= 5 && !disabled && !loading;

  const handleConsultar = async () => {
    if (!puedeConsultar) return;
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await axios.get(`/customers/rues/${encodeURIComponent(nitLimpio)}`);
      if (res.data?.success && res.data?.data) {
        onResult(res.data.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('No se encontraron datos para este NIT.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error consultando RUES.');
    } finally {
      setLoading(false);
    }
  };

  // Persona natural — indicación de ingreso manual
  if (!esEmpresa) {
    return (
      <p className="text-xs text-gray-400 mt-1">
        💡 Para personas naturales ingresa los datos manualmente.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleConsultar}
        disabled={!puedeConsultar}
        title={
          nitBase.length < 5
            ? 'Ingresa al menos 5 dígitos del NIT'
            : 'Consultar empresa en RUES (Cámara de Comercio)'
        }
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
          border transition-all whitespace-nowrap
          ${!puedeConsultar
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : success
              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 active:scale-95'
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
            {/* Ícono edificio empresa */}
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm4 0h2v2h-2V5zM7 9h2v2H7V9zm4 0h2v2h-2V9zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z" clipRule="evenodd"/>
            </svg>
            Consultar RUES
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-600 leading-tight">{error}</p>
      )}
    </div>
  );
}