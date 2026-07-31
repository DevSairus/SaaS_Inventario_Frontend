import { useEffect, useState } from 'react';
import { useMovementsStore } from '../../store/movementsStore';
import { Activity } from 'lucide-react';

const REASON_LABELS = {
  sale: 'Venta',
  sale_reversal: 'Reversión Venta',
  purchase_receipt: 'Recepción Compra',
  purchase_reversal: 'Reversión Compra',
  adjustment_in: 'Ajuste Entrada',
  adjustment_out: 'Ajuste Salida',
  transfer_in: 'Transferencia Entrada',
  transfer_out: 'Transferencia Salida',
  internal_consumption: 'Consumo Interno',
  supplier_return: 'Devolución a Proveedor',
  customer_return: 'Devolución de Cliente',
  initial_stock: 'Stock Inicial'
};

const formatMovementDate = (value) => {
  if (!value) return 'Sin fecha';
  const datePart = String(value).split('T')[0].split(' ')[0];
  const date = new Date(`${datePart}T12:00:00`);
  return isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-CO');
};

const TypeBadge = ({ direction }) => {
  const badges = {
    in: 'bg-green-100 text-green-800',
    out: 'bg-red-100 text-red-800'
  };
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[direction] || 'bg-gray-100 text-gray-700'}`}>
      {direction === 'in' ? 'Entrada' : direction === 'out' ? 'Salida' : 'N/D'}
    </span>
  );
};

export default function MovementsSection({ productId }) {
  const { kardex, isLoading, fetchKardex, clearKardex } = useMovementsStore();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (productId) fetchKardex(productId, { page, limit: 25 });
    return () => clearKardex();
  }, [productId, page, fetchKardex, clearKardex]);

  if (isLoading && !kardex) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const movements = kardex?.movements || [];

  if (movements.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin movimientos registrados</p>
          <p className="text-sm text-gray-400 mt-1">Este producto aún no tiene entradas, salidas o ajustes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase">Total Movimientos</p>
          <p className="text-lg font-bold text-gray-900">{kardex?.summary?.total_movements ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Total Entradas</p>
          <p className="text-lg font-bold text-green-600">{kardex?.summary?.total_entradas ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Total Salidas</p>
          <p className="text-lg font-bold text-red-600">{kardex?.summary?.total_salidas ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Stock Actual</p>
          <p className="text-lg font-bold text-blue-600">{kardex?.summary?.stock_actual ?? 0}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Razón</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock Nuevo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((mov) => (
                <tr key={mov.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-600">{formatMovementDate(mov.movement_date)}</td>
                  <td className="px-4 py-2.5"><TypeBadge direction={mov.direction} /></td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">
                    {REASON_LABELS[mov.movement_reason] || mov.movement_reason}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-900">{mov.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold text-gray-900">{mov.new_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {kardex?.pagination && kardex.pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Página {kardex.pagination.page} de {kardex.pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <button
                disabled={page >= kardex.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
