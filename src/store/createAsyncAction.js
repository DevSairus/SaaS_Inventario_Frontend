/**
 * Helper para reducir la duplicación del patrón try/catch/set en stores Zustand.
 *
 * Uso:
 *   fetchSales: async (filters) => {
 *     await runAsync(set, get, {
 *       action: async () => {
 *         const res = await salesApi.getAll(filters);
 *         return { sales: res.data.data };
 *       },
 *       errorFallback: 'Error cargando ventas',
 *     });
 *   }
 *
 *  - Setea `loading: true` antes, `loading: false` después.
 *  - Si el action retorna un objeto, lo mergea al state.
 *  - Si falla, guarda `error` legible y re-lanza si `rethrow` es true (default).
 */
import toast from 'react-hot-toast';

export async function runAsync(set, _get, opts) {
  const {
    action,
    errorFallback = 'Ocurrió un error',
    showToastOnError = false,
    loadingKey = 'loading',
    errorKey = 'error',
    rethrow = true,
  } = opts;

  set({ [loadingKey]: true, [errorKey]: null });
  try {
    const result = await action();
    set({ [loadingKey]: false });
    if (result && typeof result === 'object') {
      set(result);
    }
    return result;
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || errorFallback;
    set({ [loadingKey]: false, [errorKey]: message });
    if (showToastOnError) toast.error(message);
    if (import.meta.env.DEV) {
      console.warn('[store] runAsync error:', error);
    }
    if (rethrow) throw error;
    return undefined;
  }
}
