// frontend/src/hooks/useReturnSettlementPreview.js
// Vista previa de cómo se liquidará una devolución (backend:
// services/returns/returnSettlement.js): cuánto baja la deuda, cuánto se
// reversa de retenciones y cuánto es dinero a devolver / saldo a favor. El
// modal muestra exactamente lo que el backend va a registrar.
import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function useReturnSettlementPreview(url, params, enabled = true) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params || {});

  useEffect(() => {
    if (!enabled || !url) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(url, { params })
      .then((res) => { if (!cancelled) setPreview(res.data?.data || null); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'No se pudo calcular la liquidación'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, enabled]);

  return { preview, loading, error };
}
